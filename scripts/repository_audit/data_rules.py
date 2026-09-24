from __future__ import annotations

import json
from pathlib import Path

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
    "academic-registry.json",
    "fallback-data.json",
    "robots.txt",
    "sitemap.xml",
)

REQUIRED_DATA_JSON = (
    "translations.json",
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

    return sorted(
        violations,
        key=lambda item: (item.rule_id, item.path, item.subject),
    )
