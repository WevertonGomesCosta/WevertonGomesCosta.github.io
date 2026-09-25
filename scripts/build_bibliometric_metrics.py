#!/usr/bin/env python3
"""Build deterministic publication-level bibliometric metrics.

Inputs:
- academic-registry.json
- bibliographic-source-links.json
- fallback-data.json

Output:
- bibliometric-metrics.json

No external APIs are called.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_FILENAME = "bibliometric-metrics.json"
SCHEMA_VERSION = "1.0.0"
SOURCES = (
    "google_scholar",
    "scopus",
    "web_of_science",
    "orcid",
)
STATUSES = frozenset(
    {
        "observed",
        "value_unavailable",
        "record_absent",
        "source_unavailable",
    }
)


class BuildError(RuntimeError):
    """Raised when deterministic metric reconciliation cannot be completed."""


def read_json(path: Path) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise BuildError(f"Missing required input: {path}") from exc
    except json.JSONDecodeError as exc:
        raise BuildError(
            f"Malformed JSON in {path}: line {exc.lineno}, column {exc.colno}"
        ) from exc


def normalize_doi(value: object) -> str:
    if not isinstance(value, str):
        return ""
    doi = value.strip().lower()
    for prefix in (
        "https://dx.doi.org/",
        "http://dx.doi.org/",
        "https://doi.org/",
        "http://doi.org/",
        "doi:",
    ):
        if doi.startswith(prefix):
            doi = doi[len(prefix):].strip()
            break
    return doi


def extract_record_id(source: str, article: dict) -> str:
    if source == "google_scholar":
        link = article.get("link")
        if not isinstance(link, str):
            return ""
        match = re.search(r"[?&]citation_for_view=([^&]+)", link)
        return unquote(match.group(1)) if match else ""

    if source == "scopus":
        value = article.get("scopus_id")
        if isinstance(value, (str, int)) and not isinstance(value, bool):
            return str(value).strip()
        return ""

    if source in {"web_of_science", "orcid"}:
        doi = normalize_doi(article.get("doi"))
        return f"doi:{doi}" if doi else ""

    raise BuildError(f"Unsupported source: {source}")


def canonical_publication_ids(registry: object) -> list[str]:
    if not isinstance(registry, dict):
        raise BuildError("academic-registry.json must contain an object")
    works = registry.get("works")
    if not isinstance(works, list):
        raise BuildError("academic-registry.json works must be a list")

    identifiers: list[str] = []
    for index, work in enumerate(works):
        if not isinstance(work, dict):
            raise BuildError(f"Registry work {index} must be an object")
        identifier = work.get("id")
        if not isinstance(identifier, str) or not identifier.strip():
            raise BuildError(f"Registry work {index} has invalid id")
        identifiers.append(identifier.strip())

    if len(identifiers) != len(set(identifiers)):
        raise BuildError("academic-registry.json contains duplicate publication IDs")

    return sorted(identifiers)


def source_articles(
    fallback: object,
    source: str,
) -> tuple[bool, list[dict]]:
    if not isinstance(fallback, dict):
        return False, []
    academic_data = fallback.get("academicData")
    if not isinstance(academic_data, dict):
        return False, []
    payload = academic_data.get(source)
    if not isinstance(payload, dict):
        return False, []
    articles = payload.get("articles")
    if not isinstance(articles, list):
        return False, []
    if any(not isinstance(article, dict) for article in articles):
        raise BuildError(f"{source} articles must contain objects only")
    return True, articles


def index_source_articles(
    fallback: object,
    source: str,
) -> tuple[bool, dict[str, list[dict]]]:
    available, articles = source_articles(fallback, source)
    if not available:
        return False, {}

    indexed: dict[str, list[dict]] = {}
    for article in articles:
        record_id = extract_record_id(source, article)
        if record_id:
            indexed.setdefault(record_id, []).append(article)
    return True, indexed


def source_relationships(
    source_links: object,
    publication_ids: set[str],
    source: str,
) -> dict[str, dict]:
    if not isinstance(source_links, dict):
        raise BuildError("bibliographic-source-links.json must contain an object")
    sources = source_links.get("sources")
    if not isinstance(sources, dict):
        raise BuildError("bibliographic-source-links.json sources must be an object")
    payload = sources.get(source)
    if not isinstance(payload, dict):
        raise BuildError(f"Missing source-link definition for {source}")
    links = payload.get("links")
    if not isinstance(links, list):
        raise BuildError(f"{source} source links must be a list")

    grouped: dict[str, list[dict]] = {}
    record_ids: set[str] = set()

    for index, link in enumerate(links):
        if not isinstance(link, dict):
            raise BuildError(f"{source} link {index} must be an object")

        record_id = link.get("record_id")
        publication_id = link.get("publication_id")
        role = link.get("role")

        if not isinstance(record_id, str) or not record_id.strip():
            raise BuildError(f"{source} link {index} has invalid record_id")
        record_id = record_id.strip()
        if record_id in record_ids:
            raise BuildError(f"{source} duplicate record_id: {record_id}")
        record_ids.add(record_id)

        if (
            not isinstance(publication_id, str)
            or publication_id not in publication_ids
        ):
            raise BuildError(
                f"{source} link {record_id} has unknown publication_id "
                f"{publication_id!r}"
            )
        if role not in {"primary", "alias"}:
            raise BuildError(f"{source} link {record_id} has invalid role {role!r}")

        grouped.setdefault(publication_id, []).append(link)

    relationships: dict[str, dict] = {}
    for publication_id, links_for_publication in grouped.items():
        primaries = [
            link for link in links_for_publication if link.get("role") == "primary"
        ]
        if len(primaries) != 1:
            raise BuildError(
                f"{source}/{publication_id} must have exactly one primary; "
                f"found {len(primaries)}"
            )

        primary = primaries[0]
        primary_record_id = primary["record_id"].strip()
        aliases: list[str] = []

        for link in links_for_publication:
            if link.get("role") != "alias":
                continue
            alias_primary = link.get("primary_record_id")
            if alias_primary != primary_record_id:
                raise BuildError(
                    f"{source} alias {link['record_id']!r} does not reference "
                    f"primary {primary_record_id!r}"
                )
            aliases.append(link["record_id"].strip())

        relationships[publication_id] = {
            "record_id": primary_record_id,
            "alias_record_ids": sorted(aliases),
        }

    return relationships


def citation_value(article: dict, *, source: str, record_id: str) -> int | None:
    cited_by = article.get("cited_by")
    if cited_by is None:
        return None
    if not isinstance(cited_by, dict):
        raise BuildError(
            f"{source} record {record_id!r} cited_by must be an object or null"
        )
    value = cited_by.get("value")
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise BuildError(
            f"{source} record {record_id!r} citation value must be "
            "a non-negative integer or null"
        )
    return value


def metric_entry(
    *,
    source: str,
    publication_id: str,
    relationship: dict | None,
    source_available: bool,
    article_index: dict[str, list[dict]],
) -> dict:
    if relationship is None:
        return {
            "alias_record_ids": [],
            "citations": None,
            "record_id": None,
            "status": (
                "record_absent" if source_available else "source_unavailable"
            ),
        }

    record_id = relationship["record_id"]
    aliases = relationship["alias_record_ids"]

    if not source_available:
        return {
            "alias_record_ids": aliases,
            "citations": None,
            "record_id": record_id,
            "status": "source_unavailable",
        }

    matches = article_index.get(record_id, [])
    if len(matches) != 1:
        raise BuildError(
            f"{source}/{publication_id} primary record {record_id!r} "
            f"must resolve to exactly one snapshot article; found {len(matches)}"
        )

    citations = citation_value(
        matches[0],
        source=source,
        record_id=record_id,
    )
    return {
        "alias_record_ids": aliases,
        "citations": citations,
        "record_id": record_id,
        "status": "observed" if citations is not None else "value_unavailable",
    }


def build_metrics(
    registry: object,
    source_links: object,
    fallback: object,
) -> dict:
    publication_ids = canonical_publication_ids(registry)
    publication_id_set = set(publication_ids)

    relationships = {
        source: source_relationships(
            source_links,
            publication_id_set,
            source,
        )
        for source in SOURCES
    }
    snapshot_indexes = {
        source: index_source_articles(fallback, source)
        for source in SOURCES
    }

    publications: dict[str, dict] = {}
    for publication_id in publication_ids:
        source_metrics: dict[str, dict] = {}
        for source in SOURCES:
            available, article_index = snapshot_indexes[source]
            source_metrics[source] = metric_entry(
                source=source,
                publication_id=publication_id,
                relationship=relationships[source].get(publication_id),
                source_available=available,
                article_index=article_index,
            )
        publications[publication_id] = source_metrics

    registry_updated_at = (
        registry.get("updated_at") if isinstance(registry, dict) else None
    )
    fallback_last_updated = (
        fallback.get("lastUpdated") if isinstance(fallback, dict) else None
    )
    source_links_schema_version = (
        source_links.get("schema_version")
        if isinstance(source_links, dict)
        else None
    )

    return {
        "schema_version": SCHEMA_VERSION,
        "source_snapshot": {
            "fallback_last_updated": fallback_last_updated,
            "registry_updated_at": registry_updated_at,
            "source_links_schema_version": source_links_schema_version,
        },
        "publications": publications,
    }


def serialize_metrics(payload: object) -> str:
    return json.dumps(
        payload,
        ensure_ascii=False,
        indent=2,
        sort_keys=True,
    ) + "\n"


def load_inputs(root: Path) -> tuple[object, object, object]:
    return (
        read_json(root / "academic-registry.json"),
        read_json(root / "bibliographic-source-links.json"),
        read_json(root / "fallback-data.json"),
    )


def build_from_root(root: Path) -> dict:
    registry, source_links, fallback = load_inputs(root)
    return build_metrics(registry, source_links, fallback)


def check_output(root: Path) -> bool:
    expected = serialize_metrics(build_from_root(root))
    output_path = root / OUTPUT_FILENAME
    try:
        actual = output_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return False
    return actual == expected


def write_output(root: Path) -> Path:
    output_path = root / OUTPUT_FILENAME
    output_path.write_text(
        serialize_metrics(build_from_root(root)),
        encoding="utf-8",
    )
    return output_path


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build deterministic bibliometric publication metrics."
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument(
        "--write",
        action="store_true",
        help="Write bibliometric-metrics.json from current inputs.",
    )
    mode.add_argument(
        "--check",
        action="store_true",
        help="Fail if bibliometric-metrics.json differs from current inputs.",
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=ROOT,
        help="Repository root (defaults to script parent repository).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    root = args.root.resolve()
    try:
        if args.write:
            path = write_output(root)
            print(f"bibliometric metrics write: PASS ({path.name})")
            return 0

        if check_output(root):
            print("bibliometric metrics check: PASS")
            return 0

        print(
            "bibliometric metrics check: DRIFT "
            "(run scripts/build_bibliometric_metrics.py --write)",
            file=sys.stderr,
        )
        return 1
    except BuildError as exc:
        print(f"bibliometric metrics build: ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
