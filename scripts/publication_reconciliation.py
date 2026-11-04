"""Reconcile externally discovered journal articles into the canonical catalog.

The module is deliberately network-free. DOI metadata resolution is injected by
the caller so reconciliation remains deterministic and unit-testable.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from typing import Callable, Mapping
import re
import unicodedata

from scripts import build_bibliometric_metrics as metrics_builder


ACADEMIC_SOURCES = (
    "google_scholar",
    "scopus",
    "web_of_science",
    "orcid",
)


@dataclass(frozen=True)
class ReconciliationResult:
    registry: dict
    source_links: dict
    changed: bool
    promoted: tuple[dict, ...]
    rejected: tuple[dict, ...]


def normalize_title(value: object) -> str:
    if not isinstance(value, str):
        return ""
    decomposed = unicodedata.normalize("NFKD", value)
    without_marks = "".join(
        char for char in decomposed if not unicodedata.combining(char)
    ).lower()
    normalized = "".join(
        char if char.isalnum() else " " for char in without_marks
    )
    return " ".join(normalized.split())


def successful_articles(results: Mapping[str, object], source: str) -> list[dict]:
    result = results.get(source)
    if getattr(result, "status", None) != "success":
        return []
    payload = getattr(result, "payload", None)
    if not isinstance(payload, dict):
        return []
    articles = payload.get("articles")
    if not isinstance(articles, list):
        return []
    return [article for article in articles if isinstance(article, dict)]


def _first_text(value: object) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        for item in value:
            if isinstance(item, str) and item.strip():
                return item.strip()
    return ""


def _crossref_year(metadata: dict) -> int | None:
    for key in ("published-print", "published-online", "published", "issued"):
        value = metadata.get(key)
        if not isinstance(value, dict):
            continue
        parts = value.get("date-parts")
        if (
            isinstance(parts, list)
            and parts
            and isinstance(parts[0], list)
            and parts[0]
        ):
            year = parts[0][0]
            if isinstance(year, int):
                return year
            if isinstance(year, str) and year.isdigit():
                return int(year)
    return None


def _author_label(author: dict) -> str:
    family = author.get("family")
    given = author.get("given")
    if not isinstance(family, str) or not family.strip():
        return ""
    initials = ""
    if isinstance(given, str):
        tokens = re.findall(r"[A-Za-zÀ-ÿ]+", given)
        initials = " ".join(f"{token[0].upper()}." for token in tokens if token)
    family = family.strip().upper()
    return f"{family}, {initials}".strip().rstrip(",")


def _slug(value: str) -> str:
    normalized = normalize_title(value)
    words = normalized.split()
    slug = "-".join(words[:10]) or "publication"
    return slug[:96].strip("-")


def _unique_publication_id(works: list[dict], year: int, title: str) -> str:
    base = f"journal-{year}-{_slug(title)}"
    existing = {
        work.get("id")
        for work in works
        if isinstance(work, dict) and isinstance(work.get("id"), str)
    }
    if base not in existing:
        return base
    suffix = 2
    while f"{base}-{suffix}" in existing:
        suffix += 1
    return f"{base}-{suffix}"


def _source_matches(
    articles: list[dict],
    *,
    doi: str,
    title: str,
) -> list[tuple[dict, str]]:
    target_title = normalize_title(title)
    matches: list[tuple[dict, str]] = []
    for article in articles:
        article_doi = metrics_builder.normalize_doi(article.get("doi"))
        if article_doi and article_doi == doi:
            matches.append((article, "doi"))
            continue
        if target_title and normalize_title(article.get("title")) == target_title:
            matches.append((article, "normalized_title"))
    return matches


def _ensure_source_links(
    links_payload: dict,
    *,
    source: str,
    publication_id: str,
    matches: list[tuple[dict, str]],
) -> None:
    sources = links_payload.setdefault("sources", {})
    definition = sources.setdefault(source, {"links": []})
    links = definition.setdefault("links", [])
    if not isinstance(links, list):
        raise ValueError(f"{source} links must be a list")

    existing_ids = {
        link.get("record_id")
        for link in links
        if isinstance(link, dict)
    }
    existing_for_publication = [
        link
        for link in links
        if isinstance(link, dict)
        and link.get("publication_id") == publication_id
    ]
    primary = next(
        (
            link.get("record_id")
            for link in existing_for_publication
            if link.get("role") == "primary"
        ),
        None,
    )

    candidates: list[tuple[str, str]] = []
    for article, match_basis in matches:
        record_id = metrics_builder.extract_record_id(source, article)
        if not record_id or record_id in existing_ids:
            continue
        candidates.append((record_id, match_basis))

    candidates.sort(key=lambda item: item[0])
    for record_id, match_basis in candidates:
        if primary is None:
            links.append(
                {
                    "record_id": record_id,
                    "publication_id": publication_id,
                    "role": "primary",
                    "match_basis": match_basis,
                }
            )
            primary = record_id
        else:
            links.append(
                {
                    "record_id": record_id,
                    "publication_id": publication_id,
                    "role": "alias",
                    "primary_record_id": primary,
                    "match_basis": match_basis,
                }
            )
        existing_ids.add(record_id)


def _refresh_summary(registry: dict) -> None:
    works = registry.get("works", [])
    if not isinstance(works, list):
        return

    summary = registry.setdefault("summary", {})
    if not isinstance(summary, dict):
        summary = {}
        registry["summary"] = summary

    summary["total_records"] = len(works)
    summary["published_journal_articles"] = sum(
        1
        for work in works
        if isinstance(work, dict)
        and work.get("type") == "journal_article"
        and work.get("status") == "published"
    )
    summary["published_preprints"] = sum(
        1
        for work in works
        if isinstance(work, dict)
        and work.get("type") == "preprint"
        and work.get("status") == "published"
    )
    summary["accepted_journal_articles"] = sum(
        1
        for work in works
        if isinstance(work, dict)
        and work.get("type") == "journal_article"
        and work.get("status") == "accepted"
    )
    summary["published_book_chapters"] = sum(
        1
        for work in works
        if isinstance(work, dict)
        and work.get("type") == "book_chapter"
        and work.get("status") == "published"
    )


def reconcile_publications(
    registry: object,
    source_links: object,
    results: Mapping[str, object],
    *,
    resolve_doi: Callable[[str], dict | None],
    updated_at: str,
) -> ReconciliationResult:
    """Promote new DOI-backed Crossref journal articles into the registry."""
    if not isinstance(registry, dict):
        raise ValueError("academic registry must be an object")
    if not isinstance(source_links, dict):
        raise ValueError("source links must be an object")

    reconciled_registry = deepcopy(registry)
    reconciled_links = deepcopy(source_links)
    works = reconciled_registry.get("works")
    if not isinstance(works, list):
        raise ValueError("academic registry works must be a list")

    known_dois = {
        metrics_builder.normalize_doi(work.get("doi"))
        for work in works
        if isinstance(work, dict)
        and metrics_builder.normalize_doi(work.get("doi"))
    }

    candidates: dict[str, dict[str, list[dict]]] = {}
    for source in ACADEMIC_SOURCES:
        for article in successful_articles(results, source):
            doi = metrics_builder.normalize_doi(article.get("doi"))
            if not doi or doi in known_dois:
                continue
            candidates.setdefault(doi, {}).setdefault(source, []).append(article)

    promoted: list[dict] = []
    rejected: list[dict] = []

    for doi in sorted(candidates):
        metadata = resolve_doi(doi)
        if not isinstance(metadata, dict):
            rejected.append({"doi": doi, "reason": "metadata_unavailable"})
            continue
        if metadata.get("type") != "journal-article":
            rejected.append(
                {
                    "doi": doi,
                    "reason": f"crossref_type:{metadata.get('type')}",
                }
            )
            continue

        title = _first_text(metadata.get("title"))
        container_title = _first_text(metadata.get("container-title"))
        year = _crossref_year(metadata)
        if not title or not container_title or year is None:
            rejected.append({"doi": doi, "reason": "incomplete_crossref_metadata"})
            continue

        publication_id = _unique_publication_id(works, year, title)
        authors = [
            label
            for label in (
                _author_label(author)
                for author in metadata.get("author", [])
                if isinstance(author, dict)
            )
            if label
        ]

        source_matches: dict[str, list[tuple[dict, str]]] = {}
        for source in ACADEMIC_SOURCES:
            source_matches[source] = _source_matches(
                successful_articles(results, source),
                doi=doi,
                title=title,
            )

        work = {
            "id": publication_id,
            "type": "journal_article",
            "status": "published",
            "title": title,
            "authors": authors,
            "year": year,
            "container_title": container_title,
            "doi": doi,
            "source_presence": {
                "lattes": False,
                "orcid": bool(source_matches["orcid"]),
                "google_scholar": bool(source_matches["google_scholar"]),
                "scopus": bool(source_matches["scopus"]),
                "web_of_science": bool(source_matches["web_of_science"]),
            },
            "relations": [],
            "source_notes": [
                "Automatically reconciled from external bibliographic sources "
                "after Crossref journal-article verification."
            ],
        }
        works.append(work)

        for source in ACADEMIC_SOURCES:
            _ensure_source_links(
                reconciled_links,
                source=source,
                publication_id=publication_id,
                matches=source_matches[source],
            )

        known_dois.add(doi)
        promoted.append(
            {
                "publication_id": publication_id,
                "doi": doi,
                "title": title,
                "year": year,
            }
        )

    changed = bool(promoted)
    if changed:
        reconciled_registry["updated_at"] = updated_at
        _refresh_summary(reconciled_registry)

    return ReconciliationResult(
        registry=reconciled_registry,
        source_links=reconciled_links,
        changed=changed,
        promoted=tuple(promoted),
        rejected=tuple(rejected),
    )
