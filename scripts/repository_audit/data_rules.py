from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
import unicodedata
from urllib.parse import unquote

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
    "profile-interpolation.js",
    "translations.json",
    "profile.json",
    "academic-registry.json",
    "bibliographic-source-links.json",
    "fallback-data.json",
    "robots.txt",
    "sitemap.xml",
)

REQUIRED_DATA_JSON = (
    "translations.json",
    "profile.json",
    "academic-registry.json",
    "bibliographic-source-links.json",
    "fallback-data.json",
)

SUPPORTED_LANGUAGES = ("pt", "en")
TRANSLATION_ATTRIBUTES = (
    "data-key",
    "data-key-placeholder",
    "data-key-title",
    "data-key-aria-label",
)

PROFILE_TRANSLATION_PLACEHOLDER_RE = re.compile(r"\{(profile_[a-z0-9_]+)\}")
PROFILE_FACT_PLACEHOLDERS = frozenset(
    {
        "profile_person_name",
        "profile_display_name",
        "profile_email",
        "profile_city",
        "profile_region",
        "profile_org_ufv_name",
        "profile_org_ufv_short",
        "profile_org_embrapa_name",
        "profile_org_embrapa_short",
        "profile_org_cnpq_name",
        "profile_org_cnpq_short",
        "profile_org_fapemig_name",
        "profile_org_fapemig_short",
        "profile_org_conecta_name",
        "profile_edu_phd_stat_start_year",
        "profile_edu_phd_stat_end_label",
        "profile_edu_phd_gen_start_year",
        "profile_edu_phd_gen_end_year",
        "profile_edu_msc_start_year",
        "profile_edu_msc_end_year",
        "profile_edu_bsc_start_year",
        "profile_edu_bsc_end_year",
        "profile_aff_postdoc_cnpq_2025_start_year",
        "profile_aff_postdoc_cnpq_2025_end_year",
        "profile_aff_postdoc_fapemig_start_year",
        "profile_aff_postdoc_fapemig_end_year",
        "profile_aff_postdoc_cnpq_2022_start_year",
        "profile_aff_postdoc_cnpq_2022_end_year",
        "profile_aff_postdoc_embrapa_start_year",
        "profile_aff_postdoc_embrapa_end_year",
        "profile_aff_conecta_start_year",
        "profile_aff_conecta_end_label",
        "profile_postdoc_history_start_year",
        "profile_postdoc_history_end_year",
        "profile_mentor_phd_stat_advisor",
        "profile_mentor_postdoc_fapemig_advisor",
        "profile_mentor_postdoc_cnpq_2022_advisor",
        "profile_mentor_postdoc_embrapa_advisor",
        "profile_mentor_phd_gen_advisor",
        "profile_mentor_phd_gen_coadvisor",
        "profile_mentor_msc_advisor",
        "profile_mentor_msc_coadvisor",
        "profile_mentor_bsc_advisor",
    }
)

PROFILE_REQUIRED_PLACEHOLDERS_BY_KEY = {
    "page-title": frozenset({"profile_display_name"}),
    "projects-page-title": frozenset({"profile_person_name"}),
    "publications-page-title": frozenset({"profile_person_name"}),
    "privacy-page-title": frozenset({"profile_person_name"}),
    "projects-meta-description": frozenset({"profile_person_name"}),
    "publications-meta-description": frozenset({"profile_person_name"}),
    "privacy-meta-description": frozenset({"profile_person_name"}),
    "footer-title": frozenset({"profile_display_name"}),
    "footer-location": frozenset({"profile_city", "profile_region"}),
    "privacy-rights-p": frozenset({"profile_email"}),
    "privacy-contact-p": frozenset({"profile_email"}),
    "edu-date1": frozenset(
        {"profile_edu_phd_stat_start_year", "profile_edu_phd_stat_end_label"}
    ),
    "edu-date2": frozenset(
        {
            "profile_aff_postdoc_fapemig_start_year",
            "profile_aff_postdoc_fapemig_end_year",
        }
    ),
    "edu-date3": frozenset(
        {
            "profile_aff_postdoc_cnpq_2022_start_year",
            "profile_aff_postdoc_cnpq_2022_end_year",
        }
    ),
    "edu-date-postdoc-cnpq-2025": frozenset(
        {"profile_aff_postdoc_cnpq_2025_start_year"}
    ),
    "edu-advisor1": frozenset({"profile_mentor_phd_stat_advisor"}),
    "edu-advisor2": frozenset({"profile_mentor_postdoc_fapemig_advisor"}),
    "edu-advisor3": frozenset({"profile_mentor_postdoc_cnpq_2022_advisor"}),
    "edu-advisor4": frozenset({"profile_mentor_postdoc_embrapa_advisor"}),
    "edu-advisor5": frozenset(
        {"profile_mentor_phd_gen_advisor", "profile_mentor_phd_gen_coadvisor"}
    ),
    "edu-advisor6": frozenset(
        {"profile_mentor_msc_advisor", "profile_mentor_msc_coadvisor"}
    ),
    "edu-advisor7": frozenset({"profile_mentor_bsc_advisor"}),
    "pdf-location": frozenset({"profile_city"}),
    "lattes_summary": frozenset(
        {
            "profile_edu_bsc_end_year",
            "profile_edu_msc_end_year",
            "profile_edu_phd_gen_end_year",
        }
    ),
}


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


def _iter_translation_strings(value: object, path: str = ""):
    if isinstance(value, dict):
        for key, item in value.items():
            child = f"{path}.{key}" if path else str(key)
            yield from _iter_translation_strings(item, child)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from _iter_translation_strings(item, f"{path}[{index}]")
    elif isinstance(value, str):
        yield path, value


def _profile_protected_translation_literals(profile: object) -> frozenset[str]:
    if not isinstance(profile, dict):
        return frozenset()

    values: set[str] = set()
    person = profile.get("person")
    if isinstance(person, dict):
        for key in ("name", "display_name", "email"):
            value = person.get(key)
            if isinstance(value, str) and len(value) >= 3:
                values.add(value)

    organizations = profile.get("organizations")
    if isinstance(organizations, dict):
        for organization in organizations.values():
            if not isinstance(organization, dict):
                continue
            for key in ("name", "short_name"):
                value = organization.get(key)
                if isinstance(value, str) and len(value) >= 3:
                    values.add(value)

    for collection in ("education", "affiliations"):
        records = profile.get(collection)
        if not isinstance(records, list):
            continue
        for record in records:
            if not isinstance(record, dict):
                continue
            mentors: list[object] = [record.get("advisor")]
            coadvisors = record.get("coadvisors")
            if isinstance(coadvisors, list):
                mentors.extend(coadvisors)
            for mentor in mentors:
                if not isinstance(mentor, dict):
                    continue
                name = mentor.get("name")
                if isinstance(name, str) and len(name) >= 3:
                    values.add(name)

    return frozenset(values)


def _audit_profile_translation_contract(
    maps: dict[str, dict[str, object]],
    profile: object,
) -> list[Violation]:
    violations: list[Violation] = []
    protected_literals = _profile_protected_translation_literals(profile)

    for language, mapping in maps.items():
        for path, value in _iter_translation_strings(mapping):
            placeholders = frozenset(
                PROFILE_TRANSLATION_PLACEHOLDER_RE.findall(value)
            )
            unknown = sorted(placeholders - PROFILE_FACT_PLACEHOLDERS)
            if unknown:
                violations.append(
                    Violation(
                        "PROFILE_FACT_CONTRACT",
                        "translations.json",
                        f"{language}:{path}:placeholder",
                        "Unknown profile interpolation placeholder(s): "
                        + ", ".join(unknown),
                        metadata={"unknown_placeholders": unknown},
                    )
                )

            top_level_key = path.split(".", 1)[0].split("[", 1)[0]
            required = PROFILE_REQUIRED_PLACEHOLDERS_BY_KEY.get(top_level_key)
            if required is not None:
                missing = sorted(required - placeholders)
                if missing:
                    violations.append(
                        Violation(
                            "PROFILE_FACT_CONTRACT",
                            "translations.json",
                            f"{language}:{top_level_key}:required",
                            "Required canonical profile placeholder(s) missing: "
                            + ", ".join(missing),
                            metadata={"missing_placeholders": missing},
                        )
                    )

            for literal in sorted(protected_literals, key=lambda item: (-len(item), item)):
                if literal in value:
                    violations.append(
                        Violation(
                            "PROFILE_FACT_CONTRACT",
                            "translations.json",
                            f"{language}:{path}:literal:{literal}",
                            "Canonical profile fact is duplicated literally in translations; "
                            "use an approved profile placeholder",
                            metadata={"literal": literal},
                        )
                    )

    return violations


def _audit_translations(
    root: Path,
    data: object,
    profile: object | None = None,
) -> list[Violation]:
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

    if profile is not None:
        violations.extend(_audit_profile_translation_contract(maps, profile))

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
PROFILE_AFFILIATION_FIELDS = frozenset(
    {
        "id",
        "organization_id",
        "role_codes",
        "start_year",
        "end_year",
        "current",
        "funder_ids",
        "advisor",
        "coadvisors",
    }
)
PROFILE_EDUCATION_FIELDS = frozenset(
    {
        "id",
        "degree_code",
        "organization_id",
        "start_year",
        "end_year",
        "current",
        "advisor",
        "coadvisors",
    }
)
PROFILE_MENTOR_FIELDS = frozenset({"name", "title_code"})
PROFILE_ROLE_CODES = frozenset({"postdoctoral_researcher", "cofounder", "ceo"})
PROFILE_DEGREE_CODES = frozenset({"doctorate", "masters", "bachelors"})
PROFILE_MENTOR_TITLE_CODES = frozenset({"professor", "researcher"})
PROFILE_ID_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


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


def _profile_year(
    value: object,
    subject: str,
    label: str,
    *,
    allow_none: bool = False,
) -> list[Violation]:
    if allow_none and value is None:
        return []
    if isinstance(value, bool) or not isinstance(value, int):
        return [_profile_violation(subject, f"{label} must be an integer year")]
    if not 1900 <= value <= 2100:
        return [_profile_violation(subject, f"{label} must be between 1900 and 2100")]
    return []


def _audit_profile_mentor(
    value: object,
    subject: str,
    *,
    allow_none: bool = False,
) -> list[Violation]:
    if allow_none and value is None:
        return []
    violations = _profile_exact_keys(
        value, PROFILE_MENTOR_FIELDS, subject, "mentor"
    )
    if not isinstance(value, dict):
        return violations
    violations.extend(
        _profile_nonempty_string(value.get("name"), f"{subject}.name", "mentor.name")
    )
    title_code = value.get("title_code")
    if (
        not isinstance(title_code, str)
        or title_code not in PROFILE_MENTOR_TITLE_CODES
    ):
        violations.append(
            _profile_violation(
                f"{subject}.title_code",
                "mentor.title_code must be one of "
                f"{sorted(PROFILE_MENTOR_TITLE_CODES)!r}",
            )
        )
    return violations


def _audit_profile_period(
    item: dict,
    subject: str,
) -> list[Violation]:
    violations: list[Violation] = []
    violations.extend(
        _profile_year(item.get("start_year"), f"{subject}.start_year", "start_year")
    )
    violations.extend(
        _profile_year(
            item.get("end_year"),
            f"{subject}.end_year",
            "end_year",
            allow_none=True,
        )
    )
    current = item.get("current")
    if not isinstance(current, bool):
        violations.append(
            _profile_violation(f"{subject}.current", "current must be boolean")
        )
        return violations

    start_year = item.get("start_year")
    end_year = item.get("end_year")
    if current and end_year is not None:
        violations.append(
            _profile_violation(
                f"{subject}.end_year",
                "current records must have end_year=null",
            )
        )
    if not current and end_year is None:
        violations.append(
            _profile_violation(
                f"{subject}.end_year",
                "non-current records must have an end_year",
            )
        )
    if (
        isinstance(start_year, int)
        and not isinstance(start_year, bool)
        and isinstance(end_year, int)
        and not isinstance(end_year, bool)
        and end_year < start_year
    ):
        violations.append(
            _profile_violation(
                f"{subject}.end_year",
                "end_year cannot be earlier than start_year",
            )
        )
    return violations


def _audit_profile_relation_records(
    data: dict,
    organizations: dict,
) -> list[Violation]:
    violations: list[Violation] = []
    seen_ids: set[str] = set()

    affiliations = data.get("affiliations")
    if not isinstance(affiliations, list):
        violations.append(
            _profile_violation("profile:affiliations", "affiliations must be a list")
        )
        affiliations = []

    education = data.get("education")
    if not isinstance(education, list):
        violations.append(
            _profile_violation("profile:education", "education must be a list")
        )
        education = []

    def audit_common(
        item: object,
        *,
        collection: str,
        index: int,
        fields: frozenset[str],
    ) -> tuple[dict | None, str]:
        subject = f"profile:{collection}[{index}]"
        violations.extend(
            _profile_exact_keys(item, fields, subject, f"{collection} record")
        )
        if not isinstance(item, dict):
            return None, subject

        identifier = item.get("id")
        if not isinstance(identifier, str) or not PROFILE_ID_RE.fullmatch(identifier):
            violations.append(
                _profile_violation(
                    f"{subject}.id",
                    "record id must use lowercase kebab-case",
                )
            )
        elif identifier in seen_ids:
            violations.append(
                _profile_violation(
                    f"{subject}.id",
                    f"duplicate profile record id: {identifier}",
                )
            )
        else:
            seen_ids.add(identifier)

        organization_id = item.get("organization_id")
        if not isinstance(organization_id, str) or organization_id not in organizations:
            violations.append(
                _profile_violation(
                    f"{subject}.organization_id",
                    "organization_id must reference organizations",
                )
            )

        violations.extend(_audit_profile_period(item, subject))
        violations.extend(
            _audit_profile_mentor(
                item.get("advisor"),
                f"{subject}.advisor",
                allow_none=True,
            )
        )

        coadvisors = item.get("coadvisors")
        if not isinstance(coadvisors, list):
            violations.append(
                _profile_violation(
                    f"{subject}.coadvisors",
                    "coadvisors must be a list",
                )
            )
        else:
            mentor_names: list[str] = []
            advisor = item.get("advisor")
            advisor_name = (
                advisor.get("name")
                if isinstance(advisor, dict)
                else None
            )
            for mentor_index, mentor in enumerate(coadvisors):
                mentor_subject = f"{subject}.coadvisors[{mentor_index}]"
                violations.extend(
                    _audit_profile_mentor(mentor, mentor_subject)
                )
                if isinstance(mentor, dict) and isinstance(mentor.get("name"), str):
                    mentor_names.append(mentor["name"])
            if len(mentor_names) != len(set(mentor_names)):
                violations.append(
                    _profile_violation(
                        f"{subject}.coadvisors",
                        "coadvisor names must be unique",
                    )
                )
            if advisor_name and advisor_name in mentor_names:
                violations.append(
                    _profile_violation(
                        f"{subject}.coadvisors",
                        "advisor cannot also be listed as coadvisor",
                    )
                )
        return item, subject

    for index, raw_item in enumerate(affiliations):
        item, subject = audit_common(
            raw_item,
            collection="affiliations",
            index=index,
            fields=PROFILE_AFFILIATION_FIELDS,
        )
        if item is None:
            continue

        role_codes = item.get("role_codes")
        role_codes_valid = (
            isinstance(role_codes, list)
            and bool(role_codes)
            and all(
                isinstance(code, str) and code in PROFILE_ROLE_CODES
                for code in role_codes
            )
        )
        if role_codes_valid:
            role_codes_valid = len(role_codes) == len(set(role_codes))
        if not role_codes_valid:
            violations.append(
                _profile_violation(
                    f"{subject}.role_codes",
                    "role_codes must be a unique non-empty list of approved codes",
                )
            )

        funder_ids = item.get("funder_ids")
        if not isinstance(funder_ids, list):
            violations.append(
                _profile_violation(
                    f"{subject}.funder_ids",
                    "funder_ids must be a list",
                )
            )
        else:
            string_funders = [
                funder_id
                for funder_id in funder_ids
                if isinstance(funder_id, str)
            ]
            if len(string_funders) != len(funder_ids):
                violations.append(
                    _profile_violation(
                        f"{subject}.funder_ids",
                        "funder_ids entries must be strings",
                    )
                )
            elif len(string_funders) != len(set(string_funders)):
                violations.append(
                    _profile_violation(
                        f"{subject}.funder_ids",
                        "funder_ids must not contain duplicates",
                    )
                )
            for funder_id in string_funders:
                if funder_id not in organizations:
                    violations.append(
                        _profile_violation(
                            f"{subject}.funder_ids",
                            f"unknown funder organization: {funder_id!r}",
                        )
                    )

    for index, raw_item in enumerate(education):
        item, subject = audit_common(
            raw_item,
            collection="education",
            index=index,
            fields=PROFILE_EDUCATION_FIELDS,
        )
        if item is None:
            continue
        degree_code = item.get("degree_code")
        if (
            not isinstance(degree_code, str)
            or degree_code not in PROFILE_DEGREE_CODES
        ):
            violations.append(
                _profile_violation(
                    f"{subject}.degree_code",
                    "degree_code must be one of "
                    f"{sorted(PROFILE_DEGREE_CODES)!r}",
                )
            )

    return violations


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
            if not isinstance(identifier, str) or not PROFILE_ID_RE.fullmatch(identifier):
                violations.append(
                    _profile_violation(
                        subject,
                        "organization id must use lowercase kebab-case",
                    )
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

    if isinstance(organizations, dict):
        violations.extend(_audit_profile_relation_records(data, organizations))

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

    profile = parsed.get("profile.json")

    translations = parsed.get("translations.json")
    if translations is not None:
        violations.extend(_audit_translations(root, translations, profile))

    if profile is not None:
        violations.extend(_audit_profile(profile))

    return sorted(
        violations,
        key=lambda item: (item.rule_id, item.path, item.subject),
    )

ACADEMIC_REQUIRED_TOP_LEVEL = frozenset(
    {"schema_version", "updated_at", "source_basis", "summary", "works"}
)

BIBLIOGRAPHIC_SOURCE_LINKS_SCHEMA_VERSION = "1.0.0"
BIBLIOGRAPHIC_SOURCE_SCHEMES = {
    "google_scholar": "citation_for_view",
    "scopus": "scopus_id",
    "web_of_science": "doi",
    "orcid": "doi",
}
BIBLIOGRAPHIC_SOURCE_LINK_TOP_LEVEL = frozenset({"schema_version", "sources"})
BIBLIOGRAPHIC_SOURCE_ENTRY_FIELDS = frozenset({"record_id_scheme", "links"})
BIBLIOGRAPHIC_PRIMARY_LINK_FIELDS = frozenset(
    {"record_id", "publication_id", "role", "match_basis"}
)
BIBLIOGRAPHIC_ALIAS_LINK_FIELDS = frozenset(
    {
        "record_id",
        "publication_id",
        "role",
        "primary_record_id",
        "match_basis",
    }
)
BIBLIOGRAPHIC_LINK_ROLES = frozenset({"primary", "alias"})
BIBLIOGRAPHIC_MATCH_BASES = frozenset(
    {"doi", "normalized_title", "manual_duplicate_reconciliation"}
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


def _bibliographic_source_link_violation(
    subject: str,
    message: str,
    *,
    metadata: dict | None = None,
) -> Violation:
    return Violation(
        "BIBLIOGRAPHIC_SOURCE_LINKS_STRUCTURE",
        "bibliographic-source-links.json",
        subject,
        message,
        metadata=metadata,
    )


def _valid_bibliographic_record_id(source: str, record_id: str) -> bool:
    if source == "google_scholar":
        return bool(re.fullmatch(r"[^\s:]+:[^\s:]+", record_id))
    if source == "scopus":
        return bool(re.fullmatch(r"\d+", record_id))
    if source in {"web_of_science", "orcid"}:
        if not record_id.startswith("doi:"):
            return False
        doi = record_id[4:]
        return bool(doi) and doi == normalize_doi(doi)
    return False


def _bibliographic_snapshot_record_id(source: str, article: dict) -> str:
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
    return ""


def _bibliographic_snapshot_records(
    fallback: object,
    source: str,
) -> dict[str, list[dict]]:
    if not isinstance(fallback, dict):
        return {}
    academic_data = fallback.get("academicData")
    if not isinstance(academic_data, dict):
        return {}
    payload = academic_data.get(source)
    if not isinstance(payload, dict):
        return {}
    articles = payload.get("articles")
    if not isinstance(articles, list):
        return {}

    records: dict[str, list[dict]] = {}
    for article in articles:
        if not isinstance(article, dict):
            continue
        record_id = _bibliographic_snapshot_record_id(source, article)
        if record_id:
            records.setdefault(record_id, []).append(article)
    return records


def _academic_publications_by_id(registry: object) -> dict[str, dict]:
    if not isinstance(registry, dict):
        return {}
    works = registry.get("works")
    if not isinstance(works, list):
        return {}
    return {
        work["id"].strip(): work
        for work in works
        if isinstance(work, dict)
        and isinstance(work.get("id"), str)
        and work["id"].strip()
    }


def _academic_publication_ids(registry: object) -> frozenset[str]:
    if not isinstance(registry, dict):
        return frozenset()
    works = registry.get("works")
    if not isinstance(works, list):
        return frozenset()
    return frozenset(
        work["id"].strip()
        for work in works
        if isinstance(work, dict)
        and isinstance(work.get("id"), str)
        and work["id"].strip()
    )


def _audit_bibliographic_source_links(
    data: object,
    registry: object,
    fallback: object,
) -> list[Violation]:
    violations: list[Violation] = []
    path_prefix = "source-links"

    if not isinstance(data, dict):
        return [
            _bibliographic_source_link_violation(
                f"{path_prefix}:top-level",
                "Bibliographic source links must be a JSON object",
            )
        ]

    actual_top = frozenset(data)
    if actual_top != BIBLIOGRAPHIC_SOURCE_LINK_TOP_LEVEL:
        missing = sorted(BIBLIOGRAPHIC_SOURCE_LINK_TOP_LEVEL - actual_top)
        unknown = sorted(actual_top - BIBLIOGRAPHIC_SOURCE_LINK_TOP_LEVEL)
        details: list[str] = []
        if missing:
            details.append(f"missing keys: {', '.join(missing)}")
        if unknown:
            details.append(f"unknown keys: {', '.join(unknown)}")
        violations.append(
            _bibliographic_source_link_violation(
                f"{path_prefix}:top-level",
                "Invalid bibliographic source link top-level schema; "
                + "; ".join(details),
            )
        )

    if data.get("schema_version") != BIBLIOGRAPHIC_SOURCE_LINKS_SCHEMA_VERSION:
        violations.append(
            _bibliographic_source_link_violation(
                f"{path_prefix}:schema-version",
                "schema_version must be "
                f"{BIBLIOGRAPHIC_SOURCE_LINKS_SCHEMA_VERSION!r}",
            )
        )

    sources = data.get("sources")
    if not isinstance(sources, dict):
        violations.append(
            _bibliographic_source_link_violation(
                f"{path_prefix}:sources",
                "sources must be an object",
            )
        )
        return violations

    expected_sources = frozenset(BIBLIOGRAPHIC_SOURCE_SCHEMES)
    actual_sources = frozenset(sources)
    if actual_sources != expected_sources:
        missing = sorted(expected_sources - actual_sources)
        unknown = sorted(actual_sources - expected_sources)
        details = []
        if missing:
            details.append(f"missing sources: {', '.join(missing)}")
        if unknown:
            details.append(f"unknown sources: {', '.join(unknown)}")
        violations.append(
            _bibliographic_source_link_violation(
                f"{path_prefix}:sources",
                "Invalid bibliographic sources; " + "; ".join(details),
            )
        )

    publication_ids = _academic_publication_ids(registry)
    publications_by_id = _academic_publications_by_id(registry)

    for source in sorted(BIBLIOGRAPHIC_SOURCE_SCHEMES):
        expected_scheme = BIBLIOGRAPHIC_SOURCE_SCHEMES[source]
        entry = sources.get(source)
        source_subject = f"{path_prefix}:{source}"

        if not isinstance(entry, dict):
            violations.append(
                _bibliographic_source_link_violation(
                    source_subject,
                    f"{source} source definition must be an object",
                )
            )
            continue

        actual_fields = frozenset(entry)
        if actual_fields != BIBLIOGRAPHIC_SOURCE_ENTRY_FIELDS:
            missing = sorted(BIBLIOGRAPHIC_SOURCE_ENTRY_FIELDS - actual_fields)
            unknown = sorted(actual_fields - BIBLIOGRAPHIC_SOURCE_ENTRY_FIELDS)
            details = []
            if missing:
                details.append(f"missing keys: {', '.join(missing)}")
            if unknown:
                details.append(f"unknown keys: {', '.join(unknown)}")
            violations.append(
                _bibliographic_source_link_violation(
                    source_subject,
                    f"Invalid {source} source definition; " + "; ".join(details),
                )
            )

        scheme = entry.get("record_id_scheme")
        if scheme != expected_scheme:
            violations.append(
                _bibliographic_source_link_violation(
                    f"{source_subject}:record-id-scheme",
                    f"{source} record_id_scheme must be {expected_scheme!r}",
                )
            )

        links = entry.get("links")
        if not isinstance(links, list):
            violations.append(
                _bibliographic_source_link_violation(
                    f"{source_subject}:links",
                    f"{source} links must be a list",
                )
            )
            continue

        valid_links: list[dict] = []
        record_ids: Counter[str] = Counter()
        snapshot_records = _bibliographic_snapshot_records(fallback, source)

        for index, raw_link in enumerate(links):
            subject = f"{source_subject}:link:{index}"
            if not isinstance(raw_link, dict):
                violations.append(
                    _bibliographic_source_link_violation(
                        subject,
                        "source link must be an object",
                    )
                )
                continue

            role = raw_link.get("role")
            expected_fields = (
                BIBLIOGRAPHIC_ALIAS_LINK_FIELDS
                if role == "alias"
                else BIBLIOGRAPHIC_PRIMARY_LINK_FIELDS
            )
            actual_link_fields = frozenset(raw_link)
            if actual_link_fields != expected_fields:
                missing = sorted(expected_fields - actual_link_fields)
                unknown = sorted(actual_link_fields - expected_fields)
                details = []
                if missing:
                    details.append(f"missing keys: {', '.join(missing)}")
                if unknown:
                    details.append(f"unknown keys: {', '.join(unknown)}")
                violations.append(
                    _bibliographic_source_link_violation(
                        subject,
                        "Invalid source link fields; " + "; ".join(details),
                    )
                )

            record_id = raw_link.get("record_id")
            if not isinstance(record_id, str) or not record_id.strip():
                violations.append(
                    _bibliographic_source_link_violation(
                        f"{subject}:record-id",
                        "record_id must be a non-empty string",
                    )
                )
            else:
                normalized_record_id = record_id.strip()
                record_ids[normalized_record_id] += 1
                if not _valid_bibliographic_record_id(
                    source, normalized_record_id
                ):
                    violations.append(
                        _bibliographic_source_link_violation(
                            f"{subject}:record-id",
                            f"record_id does not match {source} "
                            f"{expected_scheme!r} scheme",
                        )
                    )

            publication_id = raw_link.get("publication_id")
            if not isinstance(publication_id, str) or not publication_id.strip():
                violations.append(
                    _bibliographic_source_link_violation(
                        f"{subject}:publication-id",
                        "publication_id must be a non-empty string",
                    )
                )
            elif publication_id.strip() not in publication_ids:
                violations.append(
                    _bibliographic_source_link_violation(
                        f"{subject}:publication-id",
                        f"Unknown publication_id {publication_id!r}",
                    )
                )

            if role not in BIBLIOGRAPHIC_LINK_ROLES:
                violations.append(
                    _bibliographic_source_link_violation(
                        f"{subject}:role",
                        f"role must be one of {sorted(BIBLIOGRAPHIC_LINK_ROLES)!r}",
                    )
                )

            match_basis = raw_link.get("match_basis")
            if match_basis not in BIBLIOGRAPHIC_MATCH_BASES:
                violations.append(
                    _bibliographic_source_link_violation(
                        f"{subject}:match-basis",
                        "match_basis must be one of "
                        f"{sorted(BIBLIOGRAPHIC_MATCH_BASES)!r}",
                    )
                )
            elif role == "alias" and match_basis != "manual_duplicate_reconciliation":
                violations.append(
                    _bibliographic_source_link_violation(
                        f"{subject}:match-basis",
                        "alias links must use manual_duplicate_reconciliation",
                    )
                )
            elif role == "primary":
                expected_basis = (
                    "normalized_title"
                    if source == "google_scholar"
                    else "doi"
                )
                if match_basis != expected_basis:
                    violations.append(
                        _bibliographic_source_link_violation(
                            f"{subject}:match-basis",
                            f"{source} primary links must use "
                            f"{expected_basis!r}",
                        )
                    )

            if (
                isinstance(record_id, str)
                and record_id.strip()
                and isinstance(publication_id, str)
                and publication_id.strip()
                and publication_id.strip() in publication_ids
                and role in BIBLIOGRAPHIC_LINK_ROLES
                and match_basis in BIBLIOGRAPHIC_MATCH_BASES
            ):
                valid_links.append(raw_link)

        for record_id, count in sorted(record_ids.items()):
            if count > 1:
                violations.append(
                    _bibliographic_source_link_violation(
                        f"{source_subject}:record-id:{record_id}",
                        f"record_id {record_id!r} is duplicated {count} times",
                    )
                )

        by_publication: dict[str, list[dict]] = {}
        by_record_id: dict[str, dict] = {}
        for link in valid_links:
            by_publication.setdefault(link["publication_id"], []).append(link)
            by_record_id[link["record_id"]] = link

        for publication_id, publication_links in sorted(by_publication.items()):
            primaries = [
                link for link in publication_links if link["role"] == "primary"
            ]
            if len(primaries) != 1:
                violations.append(
                    _bibliographic_source_link_violation(
                        f"{source_subject}:publication:{publication_id}:primary",
                        "Each linked source/publication pair must have exactly "
                        f"one primary record; found {len(primaries)}",
                    )
                )

        for link in valid_links:
            if link["role"] != "alias":
                continue
            subject = f"{source_subject}:record-id:{link['record_id']}:alias"
            primary_record_id = link.get("primary_record_id")
            if not isinstance(primary_record_id, str) or not primary_record_id.strip():
                violations.append(
                    _bibliographic_source_link_violation(
                        subject,
                        "alias primary_record_id must be a non-empty string",
                    )
                )
                continue
            primary = by_record_id.get(primary_record_id)
            if primary is None:
                violations.append(
                    _bibliographic_source_link_violation(
                        subject,
                        f"alias primary_record_id {primary_record_id!r} does not exist",
                    )
                )
                continue
            if primary.get("role") != "primary":
                violations.append(
                    _bibliographic_source_link_violation(
                        subject,
                        "alias primary_record_id must reference a primary record",
                    )
                )
            if primary.get("publication_id") != link.get("publication_id"):
                violations.append(
                    _bibliographic_source_link_violation(
                        subject,
                        "alias and primary must reference the same publication_id",
                    )
                )

        for link in valid_links:
            record_id = link["record_id"].strip()
            publication_id = link["publication_id"].strip()
            evidence_subject = (
                f"{source_subject}:record-id:{record_id}:snapshot"
            )
            matches = snapshot_records.get(record_id, [])
            if len(matches) != 1:
                violations.append(
                    _bibliographic_source_link_violation(
                        evidence_subject,
                        "Frozen source record must resolve to exactly one "
                        f"fallback snapshot record; found {len(matches)}",
                    )
                )
                continue

            publication = publications_by_id.get(publication_id)
            if publication is None:
                continue

            article = matches[0]
            basis = link.get("match_basis")
            if basis == "doi":
                source_doi = normalize_doi(article.get("doi"))
                canonical_doi = normalize_doi(publication.get("doi"))
                if (
                    not source_doi
                    or not canonical_doi
                    or source_doi != canonical_doi
                ):
                    violations.append(
                        _bibliographic_source_link_violation(
                            evidence_subject,
                            "DOI evidence does not match canonical publication",
                        )
                    )
            elif basis in {
                "normalized_title",
                "manual_duplicate_reconciliation",
            }:
                source_title = (
                    normalize_title(article.get("title"))
                    if isinstance(article.get("title"), str)
                    else ""
                )
                canonical_title = normalize_title(publication.get("title"))
                if (
                    not source_title
                    or not canonical_title
                    or source_title != canonical_title
                ):
                    violations.append(
                        _bibliographic_source_link_violation(
                            evidence_subject,
                            "Title evidence does not match canonical publication",
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

    source_links, source_links_error = read_repository_json(
        root, "bibliographic-source-links.json"
    )
    if source_links is not None and source_links_error is None:
        violations.extend(
            _audit_bibliographic_source_links(
                source_links,
                registry,
                fallback if fallback_error is None else None,
            )
        )

    if fallback is not None and fallback_error is None:
        violations.extend(_bibliometric_duplicate_violations(fallback))

    return sorted(
        violations,
        key=lambda item: (item.rule_id, item.path, item.subject),
    )
