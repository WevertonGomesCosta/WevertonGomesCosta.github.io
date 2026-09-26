from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
import json
from pathlib import Path, PurePosixPath
from typing import Any, Sequence

SCHEMA_VERSION = 1

RULE_IDS = frozenset(
    {
        "JSON_PARSE",
        "REQUIRED_FILE",
        "TRANSLATION_LANGUAGE_SET",
        "TRANSLATION_KEY_PARITY",
        "HTML_DUPLICATE_ID",
        "HTML_INTERNAL_LINK_TARGET",
        "HTML_TARGET_BLANK_NO_NOOPENER",
        "HTML_DUPLICATE_ATTRIBUTE",
        "HTML_SELF_LINK",
        "HTML_BUTTON_MISSING_TYPE",
        "HTML_ACTION_HASH_LINK",
        "I18N_FIXED_ARIA_LABEL",
        "I18N_FIXED_TITLE",
        "I18N_REFERENCE_MISSING",
        "PROFILE_STRUCTURE",
        "PROFILE_FACT_CONTRACT",
        "ACADEMIC_REGISTRY_STRUCTURE",
        "ACADEMIC_REGISTRY_DUPLICATE_ID",
        "ACADEMIC_REGISTRY_DUPLICATE_DOI",
        "ACADEMIC_REGISTRY_DUPLICATE_TITLE",
        "BIBLIOGRAPHIC_SOURCE_LINKS_STRUCTURE",
        "BIBLIOMETRIC_METRICS_STRUCTURE",
        "SOURCE_UPDATE_STATE_STRUCTURE",
        "BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE",
        "LEGACY_MAXIMIZED_REFERENCE",
        "A11Y_REDUCED_MOTION_POLICY",
        "SECURITY_EXTERNAL_SCRIPT_INTEGRITY",
        "SECURITY_CSP_POLICY",
    }
)

REQUIRED_HTML = (
    "index.html",
    "publicacoes.html",
    "projetos.html",
    "politica-de-privacidade.html",
    "404.html",
)

_POLICY_TOP_LEVEL_KEYS = frozenset({"schema_version", "exceptions"})
_POLICY_ENTRY_KEYS = frozenset({"rule_id", "path", "subject", "reason"})
_BASELINE_TOP_LEVEL_KEYS = frozenset({"schema_version", "entries"})
_BASELINE_ENTRY_KEYS = frozenset(
    {"rule_id", "path", "subject", "fingerprint", "reason"}
)


class AuditConfigError(ValueError):
    """Raised when audit configuration or identity input is invalid."""


def normalize_repo_path(value: str) -> str:
    if not isinstance(value, str):
        raise AuditConfigError("Repository path must be a string")
    normalized = value.replace("\\", "/")
    if normalized.startswith("/"):
        raise AuditConfigError(f"Invalid repository-relative path: {value!r}")
    parts = PurePosixPath(normalized).parts
    while parts and parts[0] == ".":
        parts = parts[1:]
    if not parts or ".." in parts:
        raise AuditConfigError(f"Invalid repository-relative path: {value!r}")
    return PurePosixPath(*parts).as_posix()


def _require_rule_id(value: object) -> str:
    if not isinstance(value, str) or value not in RULE_IDS:
        raise AuditConfigError(f"Unknown rule id: {value!r}")
    return value


def _require_nonempty_string(value: object, field_name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise AuditConfigError(f"{field_name} must be a non-empty string")
    return value


def make_fingerprint(rule_id: str, path: str, subject: str) -> str:
    rule_id = _require_rule_id(rule_id)
    subject = _require_nonempty_string(subject, "subject")
    canonical = "\x1f".join((rule_id, normalize_repo_path(path), subject))
    return sha256(canonical.encode("utf-8")).hexdigest()


def _identity_sort_key(value: object) -> tuple[str, str, str]:
    return (
        getattr(value, "rule_id"),
        getattr(value, "path"),
        getattr(value, "subject"),
    )


@dataclass(frozen=True)
class Violation:
    rule_id: str
    path: str
    subject: str
    message: str
    severity: str = "error"
    line: int | None = None
    metadata: dict[str, Any] | None = field(default=None, compare=False)

    def __post_init__(self) -> None:
        if self.severity != "error":
            raise AuditConfigError(
                f"Unsupported violation severity for schema v1: {self.severity!r}"
            )
        _require_rule_id(self.rule_id)
        _require_nonempty_string(self.subject, "subject")
        _require_nonempty_string(self.message, "message")
        object.__setattr__(self, "path", normalize_repo_path(self.path))

    @property
    def fingerprint(self) -> str:
        return make_fingerprint(self.rule_id, self.path, self.subject)


@dataclass(frozen=True)
class PolicyException:
    rule_id: str
    path: str
    subject: str
    reason: str

    def __post_init__(self) -> None:
        _require_rule_id(self.rule_id)
        _require_nonempty_string(self.subject, "subject")
        _require_nonempty_string(self.reason, "reason")
        object.__setattr__(self, "path", normalize_repo_path(self.path))

    @property
    def fingerprint(self) -> str:
        return make_fingerprint(self.rule_id, self.path, self.subject)


@dataclass(frozen=True)
class AuditPolicy:
    exceptions: tuple[PolicyException, ...] = ()


@dataclass(frozen=True)
class BaselineEntry:
    rule_id: str
    path: str
    subject: str
    fingerprint: str
    reason: str

    def __post_init__(self) -> None:
        _require_rule_id(self.rule_id)
        _require_nonempty_string(self.subject, "subject")
        _require_nonempty_string(self.reason, "reason")
        if not isinstance(self.fingerprint, str) or len(self.fingerprint) != 64:
            raise AuditConfigError("fingerprint must be a 64-character SHA-256 hex string")
        try:
            int(self.fingerprint, 16)
        except ValueError as exc:
            raise AuditConfigError("fingerprint must be hexadecimal") from exc
        object.__setattr__(self, "path", normalize_repo_path(self.path))


@dataclass(frozen=True)
class Baseline:
    entries: tuple[BaselineEntry, ...] = ()


@dataclass(frozen=True)
class AuditComparison:
    known: tuple[Violation, ...] = ()
    new: tuple[Violation, ...] = ()
    resolved: tuple[BaselineEntry, ...] = ()


def _load_json_object(path: Path, label: str) -> dict[str, Any]:
    try:
        raw = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        raise AuditConfigError(f"Unable to read {label} {path}: {exc}") from exc
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AuditConfigError(f"Malformed {label} JSON at {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise AuditConfigError(f"{label} must be a JSON object")
    return payload


def _require_exact_keys(
    payload: dict[str, Any], expected: frozenset[str], label: str
) -> None:
    actual = frozenset(payload)
    if actual != expected:
        unknown = sorted(actual - expected)
        missing = sorted(expected - actual)
        detail: list[str] = []
        if unknown:
            detail.append(f"unknown keys={unknown}")
        if missing:
            detail.append(f"missing keys={missing}")
        raise AuditConfigError(f"Invalid {label} schema: {', '.join(detail)}")


def _require_schema_version(value: object, label: str) -> None:
    if type(value) is not int or value != SCHEMA_VERSION:
        raise AuditConfigError(
            f"Unsupported {label} schema_version: {value!r}; expected {SCHEMA_VERSION}"
        )


def load_policy(path: Path) -> AuditPolicy:
    payload = _load_json_object(path, "policy")
    _require_exact_keys(payload, _POLICY_TOP_LEVEL_KEYS, "policy")
    _require_schema_version(payload["schema_version"], "policy")
    raw_entries = payload["exceptions"]
    if not isinstance(raw_entries, list):
        raise AuditConfigError("policy exceptions must be a JSON array")

    exceptions: list[PolicyException] = []
    fingerprints: set[str] = set()
    for index, raw in enumerate(raw_entries):
        if not isinstance(raw, dict):
            raise AuditConfigError(f"policy exception {index} must be an object")
        _require_exact_keys(raw, _POLICY_ENTRY_KEYS, f"policy exception {index}")
        item = PolicyException(
            rule_id=raw["rule_id"],
            path=raw["path"],
            subject=raw["subject"],
            reason=raw["reason"],
        )
        if item.fingerprint in fingerprints:
            raise AuditConfigError(
                f"Duplicate policy exception identity: {item.rule_id} {item.path} {item.subject}"
            )
        fingerprints.add(item.fingerprint)
        exceptions.append(item)

    return AuditPolicy(exceptions=tuple(sorted(exceptions, key=_identity_sort_key)))


def load_baseline(path: Path) -> Baseline:
    payload = _load_json_object(path, "baseline")
    _require_exact_keys(payload, _BASELINE_TOP_LEVEL_KEYS, "baseline")
    _require_schema_version(payload["schema_version"], "baseline")
    raw_entries = payload["entries"]
    if not isinstance(raw_entries, list):
        raise AuditConfigError("baseline entries must be a JSON array")

    entries: list[BaselineEntry] = []
    fingerprints: set[str] = set()
    for index, raw in enumerate(raw_entries):
        if not isinstance(raw, dict):
            raise AuditConfigError(f"baseline entry {index} must be an object")
        _require_exact_keys(raw, _BASELINE_ENTRY_KEYS, f"baseline entry {index}")
        item = BaselineEntry(
            rule_id=raw["rule_id"],
            path=raw["path"],
            subject=raw["subject"],
            fingerprint=raw["fingerprint"],
            reason=raw["reason"],
        )
        expected = make_fingerprint(item.rule_id, item.path, item.subject)
        if item.fingerprint != expected:
            raise AuditConfigError(
                f"Baseline fingerprint mismatch for {item.rule_id} {item.path} {item.subject}"
            )
        if item.fingerprint in fingerprints:
            raise AuditConfigError(
                f"Duplicate baseline identity: {item.rule_id} {item.path} {item.subject}"
            )
        fingerprints.add(item.fingerprint)
        entries.append(item)

    return Baseline(entries=tuple(sorted(entries, key=_identity_sort_key)))


def classify_violations(
    current: Sequence[Violation], baseline: Baseline
) -> AuditComparison:
    baseline_by_fingerprint = {entry.fingerprint: entry for entry in baseline.entries}
    current_fingerprints = {violation.fingerprint for violation in current}

    known = tuple(
        sorted(
            (v for v in current if v.fingerprint in baseline_by_fingerprint),
            key=_identity_sort_key,
        )
    )
    new = tuple(
        sorted(
            (v for v in current if v.fingerprint not in baseline_by_fingerprint),
            key=_identity_sort_key,
        )
    )
    resolved = tuple(
        sorted(
            (
                entry
                for entry in baseline.entries
                if entry.fingerprint not in current_fingerprints
            ),
            key=_identity_sort_key,
        )
    )
    return AuditComparison(known=known, new=new, resolved=resolved)


def find_baseline_growth(
    candidate: Baseline, reference: Baseline
) -> tuple[BaselineEntry, ...]:
    reference_fingerprints = {entry.fingerprint for entry in reference.entries}
    return tuple(
        sorted(
            (
                entry
                for entry in candidate.entries
                if entry.fingerprint not in reference_fingerprints
            ),
            key=_identity_sort_key,
        )
    )
