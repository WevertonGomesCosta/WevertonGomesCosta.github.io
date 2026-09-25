from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
import unicodedata

from .core import Violation
from .html_rules import discover_audited_html, element_subject, parse_html

REQUIRED_FILES = (
    "index.html",
    "publicacoes.html",
    "projetos.html",
    "politica-de-privacidade.html",
    "404.html",
    "style.css",
    "utils.js",
    "translations.json",
    "profile.json",
    "academic-registry.json",
    "fallback-data.json",
    "robots.txt",
    "sitemap.xml",
)

REQUIRED_DATA_JSON = (
    "translations.json",
    "profile.json",
    "academic-registry.json",
    "fallback-data.json",
)

SUPPORTED_LANGUAGES = ("pt", "en")
TRANSLATION_ATTRIBUTES = (
    "data-key",
    "data-key-placeholder",
    "data-key-title",
    "data-key-aria-label",
)


def read_repository_json(root: Path, relative: str) -> tuple[object | None, str | None]:
    path = root / relative
    if not path.is_file():
        return None, None
    try:
        source = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        return None, f"unable to read JSON file: {exc}"
    try:
        return json.loads(source), None
    except json.JSONDecodeError as exc:
        return None, f"malformed JSON: {exc.msg} at line {exc.lineno} column {exc.colno}"


def _translation_maps(data: object) -> dict[str, dict[str, object]] | None:
    if not isinstance(data, dict):
        return None
    if set(data) != set(SUPPORTED_LANGUAGES):
        return None
    if not all(isinstance(data[language], dict) for language in SUPPORTED_LANGUAGES):
        return None
    return {language: data[language] for language in SUPPORTED_LANGUAGES}


def _audit_translations(root: Path, data: object) -> list[Violation]:
    violations: list[Violation] = []
    maps = _translation_maps(data)
    if maps is None:
        actual = sorted(data) if isinstance(data, dict) else []
        violations.append(
            Violation(
                "TRANSLATION_LANGUAGE_SET",
                "translations.json",
                "file:translations.json",
                f"Expected translation languages {list(SUPPORTED_LANGUAGES)!r}; found {actual!r}",
                metadata={
                    "expected_languages": list(SUPPORTED_LANGUAGES),
                    "actual_languages": actual,
                },
            )
        )
        return violations

    all_keys = set().union(*(set(mapping) for mapping in maps.values()))
    shared_keys = set.intersection(*(set(mapping) for mapping in maps.values()))
    for key in sorted(all_keys - shared_keys):
        missing = sorted(
            language for language, mapping in maps.items() if key not in mapping
        )
        violations.append(
            Violation(
                "TRANSLATION_KEY_PARITY",
                "translations.json",
                f"key:{key}",
                f"Translation key {key!r} is missing from: {', '.join(missing)}",
                metadata={"missing_languages": missing},
            )
        )

    for relative in discover_audited_html(root):
        target = root / relative
        try:
            document = parse_html(relative, target.read_text(encoding="utf-8"))
        except (OSError, UnicodeError):
            continue
        for element in document.elements:
            subject = element_subject(element)

            aria_label = element.attr("aria-label")
            if aria_label and not element.attr_values("data-key-aria-label"):
                violations.append(
                    Violation(
                        "I18N_FIXED_ARIA_LABEL",
                        relative,
                        f"{subject}@aria-label",
                        "aria-label is fixed text without data-key-aria-label",
                        line=element.line,
                    )
                )

            title = element.attr("title")
            if title and not element.attr_values("data-key-title"):
                violations.append(
                    Violation(
                        "I18N_FIXED_TITLE",
                        relative,
                        f"{subject}@title",
                        "title is fixed text without data-key-title",
                        line=element.line,
                    )
                )

            for attribute in TRANSLATION_ATTRIBUTES:
                key = element.attr(attribute)
                if not key:
                    continue
                missing = sorted(
                    language for language, mapping in maps.items() if key not in mapping
                )
                if missing:
                    violations.append(
                        Violation(
                            "I18N_REFERENCE_MISSING",
                            relative,
                            f"{subject}@{attribute}:{key}",
                            f"Translation reference {key!r} is missing from: {', '.join(missing)}",
                            line=element.line,
                            metadata={"missing_languages": missing},
                        )
                    )

    return violations


PROFILE_REQUIRED_TOP_LEVEL = frozenset(
    {"schema_version", "person", "profiles", "organizations", "affiliations", "education"}
)
PROFILE_REQUIRED_PERSON = frozenset(
    {"name", "display_name", "email", "website_url", "avatar_url", "location"}
)
PROFILE_REQUIRED_LOCATION = frozenset({"city", "region", "country_code"})
PROFILE_SOURCE_FIELDS = {
    "github": frozenset({"username", "url"}),
    "linkedin": frozenset({"url"}),
    "lattes": frozenset({"id", "url"}),
    "google_scholar": frozenset({"author_id", "url"}),
    "orcid": frozenset({"id", "url"}),
    "scopus": frozenset({"author_id", "url"}),
    "web_of_science": frozenset({"researcher_id", "url"}),
}
PROFILE_ORGANIZATION_FIELDS = frozenset({"name", "short_name", "url"})


def _profile_violation(subject: str, message: str) -> Violation:
    return Violation("PROFILE_STRUCTURE", "profile.json", subject, message)


def _profile_exact_keys(
    value: object,
    expected: frozenset[str],
    subject: str,
    label: str,
) -> list[Violation]:
    if not isinstance(value, dict):
        return [_profile_violation(subject, f"{label} must be an object")]
    actual = frozenset(value)
    if actual == expected:
        return []
    missing = sorted(expected - actual)
    unknown = sorted(actual - expected)
    details = []
    if missing:
        details.append(f"missing keys: {', '.join(missing)}")
    if unknown:
        details.append(f"unknown keys: {', '.join(unknown)}")
    return [_profile_violation(subject, f"{label} has invalid keys; {'; '.join(details)}")]


def _profile_nonempty_string(
    value: object, subject: str, label: str
) -> list[Violation]:
    if isinstance(value, str) and value.strip():
        return []
    return [_profile_violation(subject, f"{label} must be a non-empty string")]


def _profile_https(
    value: object, subject: str, label: str
) -> list[Violation]:
    violations = _profile_nonempty_string(value, subject, label)
    if violations:
        return violations
    if not str(value).startswith("https://"):
        return [_profile_violation(subject, f"{label} must use https://")]
    return []


def _iter_profile_strings(value: object, path: str = ""):
    if isinstance(value, dict):
        for key, item in value.items():
            child = f"{path}.{key}" if path else str(key)
            yield from _iter_profile_strings(item, child)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from _iter_profile_strings(item, f"{path}[{index}]")
    elif isinstance(value, str):
        yield path, value


def _audit_profile(data: object) -> list[Violation]:
    violations: list[Violation] = []
    if not isinstance(data, dict):
        return [_profile_violation("profile:top-level", "Profile must be a JSON object")]

    violations.extend(
        _profile_exact_keys(
            data, PROFILE_REQUIRED_TOP_LEVEL, "profile:top-level", "Profile"
        )
    )

    if data.get("schema_version") != "1.0.0":
        violations.append(
            _profile_violation(
                "profile:schema_version",
                "profile schema_version must equal '1.0.0'",
            )
        )

    person = data.get("person")
    violations.extend(
        _profile_exact_keys(person, PROFILE_REQUIRED_PERSON, "profile:person", "person")
    )
    if isinstance(person, dict):
        for field in ("name", "display_name"):
            violations.extend(
                _profile_nonempty_string(
                    person.get(field), f"profile:person.{field}", f"person.{field}"
                )
            )
        violations.extend(
            _profile_nonempty_string(
                person.get("email"), "profile:person.email", "person.email"
            )
        )
        email = person.get("email")
        if isinstance(email, str) and email.strip() and not re.fullmatch(
            r"[^@\s]+@[^@\s]+\.[^@\s]+", email
        ):
            violations.append(
                _profile_violation("profile:person.email", "person.email is invalid")
            )
        for field in ("website_url", "avatar_url"):
            violations.extend(
                _profile_https(
                    person.get(field),
                    f"profile:person.{field}",
                    f"person.{field}",
                )
            )

        location = person.get("location")
        violations.extend(
            _profile_exact_keys(
                location,
                PROFILE_REQUIRED_LOCATION,
                "profile:person.location",
                "person.location",
            )
        )
        if isinstance(location, dict):
            for field in ("city", "region", "country_code"):
                violations.extend(
                    _profile_nonempty_string(
                        location.get(field),
                        f"profile:person.location.{field}",
                        f"person.location.{field}",
                    )
                )
            country = location.get("country_code")
            if isinstance(country, str) and country.strip() and not re.fullmatch(
                r"[A-Z]{2}", country
            ):
                violations.append(
                    _profile_violation(
                        "profile:person.location.country_code",
                        "person.location.country_code must be ISO-like two-letter uppercase code",
                    )
                )

    profiles = data.get("profiles")
    if not isinstance(profiles, dict):
        violations.append(
            _profile_violation("profile:profiles", "profiles must be an object")
        )
    else:
        expected_sources = frozenset(PROFILE_SOURCE_FIELDS)
        if frozenset(profiles) != expected_sources:
            missing = sorted(expected_sources - frozenset(profiles))
            unknown = sorted(frozenset(profiles) - expected_sources)
            details = []
            if missing:
                details.append(f"missing sources: {', '.join(missing)}")
            if unknown:
                details.append(f"unknown sources: {', '.join(unknown)}")
            violations.append(
                _profile_violation(
                    "profile:profiles",
                    f"profiles has invalid sources; {'; '.join(details)}",
                )
            )

        urls: list[str] = []
        for source, expected_fields in PROFILE_SOURCE_FIELDS.items():
            entry = profiles.get(source)
            subject = f"profile:profiles.{source}"
            violations.extend(
                _profile_exact_keys(entry, expected_fields, subject, f"profiles.{source}")
            )
            if not isinstance(entry, dict):
                continue
            for field in expected_fields - {"url"}:
                violations.extend(
                    _profile_nonempty_string(
                        entry.get(field),
                        f"{subject}.{field}",
                        f"profiles.{source}.{field}",
                    )
                )
            violations.extend(
                _profile_https(
                    entry.get("url"), f"{subject}.url", f"profiles.{source}.url"
                )
            )
            if isinstance(entry.get("url"), str) and entry["url"].strip():
                urls.append(entry["url"])

        for url, count in Counter(urls).items():
            if count > 1:
                violations.append(
                    _profile_violation(
                        f"profile:profiles.url:{url}",
                        f"external profile URL is duplicated {count} times",
                    )
                )

        orcid = profiles.get("orcid")
        if isinstance(orcid, dict):
            identifier = orcid.get("id")
            if isinstance(identifier, str) and identifier.strip() and not re.fullmatch(
                r"\d{4}-\d{4}-\d{4}-[\dX]{4}", identifier
            ):
                violations.append(
                    _profile_violation(
                        "profile:profiles.orcid.id",
                        "ORCID id has invalid structural format",
                    )
                )

    organizations = data.get("organizations")
    if not isinstance(organizations, dict):
        violations.append(
            _profile_violation("profile:organizations", "organizations must be an object")
        )
    else:
        for identifier, organization in sorted(organizations.items()):
            subject = f"profile:organizations.{identifier}"
            if not isinstance(identifier, str) or not identifier.strip():
                violations.append(
                    _profile_violation(subject, "organization id must be non-empty")
                )
                continue
            violations.extend(
                _profile_exact_keys(
                    organization,
                    PROFILE_ORGANIZATION_FIELDS,
                    subject,
                    f"organization {identifier}",
                )
            )
            if not isinstance(organization, dict):
                continue
            for field in ("name", "short_name"):
                violations.extend(
                    _profile_nonempty_string(
                        organization.get(field),
                        f"{subject}.{field}",
                        f"organization {identifier}.{field}",
                    )
                )
            url = organization.get("url")
            if url is not None:
                violations.extend(
                    _profile_https(
                        url, f"{subject}.url", f"organization {identifier}.url"
                    )
                )

    for field in ("affiliations", "education"):
        value = data.get(field)
        if not isinstance(value, list):
            violations.append(
                _profile_violation(f"profile:{field}", f"{field} must be a list")
            )
        elif any(not isinstance(item, dict) for item in value):
            violations.append(
                _profile_violation(
                    f"profile:{field}",
                    f"{field} entries must be objects",
                )
            )

    for path, value in _iter_profile_strings(data):
        if re.search(r"<[^>]+>", value):
            violations.append(
                _profile_violation(
                    f"profile:string:{path}",
                    "structured profile strings must not contain HTML markup",
                )
            )

    return violations


def audit_repository_data(root: Path) -> list[Violation]:
    root = root.resolve()
    violations: list[Violation] = []
    parsed: dict[str, object | None] = {}

    for relative in REQUIRED_FILES:
        if not (root / relative).is_file():
            violations.append(
                Violation(
                    "REQUIRED_FILE",
                    relative,
                    f"file:{relative}",
                    f"Required repository file is missing: {relative}",
                )
            )

    for relative in REQUIRED_DATA_JSON:
        if not (root / relative).is_file():
            parsed[relative] = None
            continue
        data, error = read_repository_json(root, relative)
        parsed[relative] = data
        if error is not None:
            violations.append(
                Violation(
                    "JSON_PARSE",
                    relative,
                    f"file:{relative}",
                    error,
                )
            )

    translations = parsed.get("translations.json")
    if translations is not None:
        violations.extend(_audit_translations(root, translations))

    profile = parsed.get("profile.json")
    if profile is not None:
        violations.extend(_audit_profile(profile))

    return sorted(
        violations,
        key=lambda item: (item.rule_id, item.path, item.subject),
    )

ACADEMIC_REQUIRED_TOP_LEVEL = frozenset(
    {"schema_version", "updated_at", "source_basis", "summary", "works"}
)


def normalize_title(value: str | None) -> str:
    if value is None:
        return ""
    decomposed = unicodedata.normalize("NFKD", value)
    without_marks = "".join(
        ch for ch in decomposed if not unicodedata.combining(ch)
    ).lower()
    normalized = "".join(ch if ch.isalnum() else " " for ch in without_marks)
    return " ".join(normalized.split())


def normalize_doi(value: str | None) -> str:
    if value is None:
        return ""
    normalized = value.strip().lower()
    for prefix in (
        "https://dx.doi.org/",
        "http://dx.doi.org/",
        "https://doi.org/",
        "http://doi.org/",
        "doi:",
    ):
        if normalized.startswith(prefix):
            normalized = normalized[len(prefix):].strip()
            break
    return normalized


def _academic_structure_violations(data: object) -> tuple[list[Violation], list[dict]]:
    violations: list[Violation] = []
    if not isinstance(data, dict):
        return [
            Violation(
                "ACADEMIC_REGISTRY_STRUCTURE",
                "academic-registry.json",
                "registry:top-level",
                "Academic registry must be a JSON object",
            )
        ], []

    missing = sorted(ACADEMIC_REQUIRED_TOP_LEVEL - set(data))
    works = data.get("works")
    if missing or not isinstance(works, list):
        details = []
        if missing:
            details.append(f"missing required keys: {', '.join(missing)}")
        if not isinstance(works, list):
            details.append("works must be a list")
        violations.append(
            Violation(
                "ACADEMIC_REGISTRY_STRUCTURE",
                "academic-registry.json",
                "registry:top-level",
                "; ".join(details),
            )
        )
        if not isinstance(works, list):
            return violations, []

    valid_works: list[dict] = []
    for index, work in enumerate(works):
        problems: list[str] = []
        if not isinstance(work, dict):
            problems.append("work must be an object")
        else:
            for field in ("id", "type", "status", "title"):
                value = work.get(field)
                if not isinstance(value, str) or not value.strip():
                    problems.append(f"{field} must be a non-empty string")
            authors = work.get("authors")
            if (
                not isinstance(authors, list)
                or not authors
                or any(
                    not isinstance(author, str) or not author.strip()
                    for author in authors
                )
            ):
                problems.append(
                    "authors must be a non-empty list of non-empty strings"
                )
            year = work.get("year")
            if type(year) is not int:
                problems.append("year must be an integer")
            doi = work.get("doi")
            if doi is not None and not isinstance(doi, str):
                problems.append("doi must be a string or null")

        if problems:
            violations.append(
                Violation(
                    "ACADEMIC_REGISTRY_STRUCTURE",
                    "academic-registry.json",
                    f"work:{index}",
                    "; ".join(problems),
                )
            )
        elif isinstance(work, dict):
            valid_works.append(work)

    return violations, valid_works


def _duplicate_violations(works: list[dict]) -> list[Violation]:
    violations: list[Violation] = []

    ids = Counter(work["id"].strip() for work in works)
    for identifier, count in ids.items():
        if count > 1:
            violations.append(
                Violation(
                    "ACADEMIC_REGISTRY_DUPLICATE_ID",
                    "academic-registry.json",
                    f"id:{identifier}",
                    f"Academic registry contains duplicate id {identifier!r}",
                )
            )

    dois = Counter(
        normalized
        for work in works
        for normalized in (normalize_doi(work.get("doi")),)
        if normalized
    )
    for doi, count in dois.items():
        if count > 1:
            violations.append(
                Violation(
                    "ACADEMIC_REGISTRY_DUPLICATE_DOI",
                    "academic-registry.json",
                    f"doi:{doi}",
                    f"Academic registry contains duplicate DOI {doi!r}",
                )
            )

    titles = Counter(normalize_title(work["title"]) for work in works)
    for title, count in titles.items():
        if title and count > 1:
            violations.append(
                Violation(
                    "ACADEMIC_REGISTRY_DUPLICATE_TITLE",
                    "academic-registry.json",
                    f"title:{title}",
                    f"Academic registry contains duplicate normalized title {title!r}",
                )
            )

    return violations


def _bibliometric_duplicate_violations(data: object) -> list[Violation]:
    if not isinstance(data, dict):
        return []
    academic_data = data.get("academicData")
    if not isinstance(academic_data, dict):
        return []

    violations: list[Violation] = []
    for source, payload in academic_data.items():
        if not isinstance(payload, dict):
            continue
        articles = payload.get("articles")
        if not isinstance(articles, list):
            continue
        titles = Counter(
            normalized
            for article in articles
            if isinstance(article, dict)
            and isinstance(article.get("title"), str)
            for normalized in (normalize_title(article["title"]),)
            if normalized
        )
        for title, count in titles.items():
            if count > 1:
                violations.append(
                    Violation(
                        "BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE",
                        "fallback-data.json",
                        f"source:{source}|title:{title}",
                        (
                            f"Bibliometric source {source!r} contains duplicate "
                            f"normalized title {title!r}"
                        ),
                    )
                )
    return violations


def audit_academic_data(root: Path) -> list[Violation]:
    root = root.resolve()
    violations: list[Violation] = []

    registry, registry_error = read_repository_json(root, "academic-registry.json")
    if registry is not None and registry_error is None:
        structure, works = _academic_structure_violations(registry)
        violations.extend(structure)
        violations.extend(_duplicate_violations(works))

    fallback, fallback_error = read_repository_json(root, "fallback-data.json")
    if fallback is not None and fallback_error is None:
        violations.extend(_bibliometric_duplicate_violations(fallback))

    return sorted(
        violations,
        key=lambda item: (item.rule_id, item.path, item.subject),
    )
