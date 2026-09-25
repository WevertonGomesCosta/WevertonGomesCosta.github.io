from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Callable

from .core import (
    AuditConfigError,
    Baseline,
    BaselineEntry,
    RULE_IDS,
    SCHEMA_VERSION,
    Violation,
    classify_violations,
    find_baseline_growth,
    load_baseline,
    load_policy,
)
from .data_rules import audit_academic_data, audit_repository_data
from .html_rules import audit_html_structure
from .runtime_rules import audit_runtime_policy

Rule = Callable[[Path], list[Violation]]

RULES: tuple[Rule, ...] = (
    audit_html_structure,
    audit_repository_data,
    audit_academic_data,
    audit_runtime_policy,
)

RULE_COVERAGE: dict[Rule, frozenset[str]] = {
    audit_html_structure: frozenset({
        "HTML_DUPLICATE_ID", "HTML_INTERNAL_LINK_TARGET",
        "HTML_TARGET_BLANK_NO_NOOPENER", "HTML_DUPLICATE_ATTRIBUTE",
        "HTML_SELF_LINK", "HTML_BUTTON_MISSING_TYPE", "HTML_ACTION_HASH_LINK",
    }),
    audit_repository_data: frozenset({
        "JSON_PARSE", "REQUIRED_FILE", "TRANSLATION_LANGUAGE_SET",
        "TRANSLATION_KEY_PARITY", "I18N_FIXED_ARIA_LABEL",
        "I18N_FIXED_TITLE", "I18N_REFERENCE_MISSING", "PROFILE_STRUCTURE",
        "PROFILE_FACT_CONTRACT",
    }),
    audit_academic_data: frozenset({
        "ACADEMIC_REGISTRY_STRUCTURE", "ACADEMIC_REGISTRY_DUPLICATE_ID",
        "ACADEMIC_REGISTRY_DUPLICATE_DOI", "ACADEMIC_REGISTRY_DUPLICATE_TITLE",
        "BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE",
    }),
    audit_runtime_policy: frozenset({
        "LEGACY_MAXIMIZED_REFERENCE", "A11Y_REDUCED_MOTION_POLICY",
        "SECURITY_EXTERNAL_SCRIPT_INTEGRITY", "SECURITY_CSP_POLICY",
    }),
}

_COVERED_RULE_IDS = frozenset().union(*RULE_COVERAGE.values())
if _COVERED_RULE_IDS != RULE_IDS or set(RULE_COVERAGE) != set(RULES):
    raise RuntimeError("RULE_COVERAGE must cover RULE_IDS exactly and match RULES")

BOOTSTRAP_REASON = "Pre-existing debt frozen before structural block 2"


def _identity_sort_key(item: object) -> tuple[str, str, str]:
    return (
        getattr(item, "rule_id"),
        getattr(item, "path"),
        getattr(item, "subject"),
    )


@dataclass(frozen=True)
class AuditReport:
    known: tuple[Violation, ...] = ()
    exempted: tuple[Violation, ...] = ()
    new: tuple[Violation, ...] = ()
    resolved: tuple[BaselineEntry, ...] = ()
    growth: tuple[BaselineEntry, ...] = ()

    @property
    def passed(self) -> bool:
        return not self.new and not self.resolved and not self.growth


def _collect_raw_violations(root: Path) -> tuple[Violation, ...]:
    root = root.resolve()
    violations: list[Violation] = []
    fingerprints: set[str] = set()
    for rule in RULES:
        for violation in rule(root):
            if violation.fingerprint in fingerprints:
                raise AuditConfigError(
                    "Duplicate emitted violation fingerprint: "
                    f"{violation.rule_id} {violation.path} {violation.subject}"
                )
            fingerprints.add(violation.fingerprint)
            violations.append(violation)
    return tuple(sorted(violations, key=_identity_sort_key))


def _apply_policy(
    raw: tuple[Violation, ...], policy_path: Path
) -> tuple[tuple[Violation, ...], tuple[Violation, ...]]:
    policy = load_policy(policy_path)
    raw_by_fingerprint = {item.fingerprint: item for item in raw}
    exempted: list[Violation] = []
    exempted_fingerprints: set[str] = set()

    for exception in policy.exceptions:
        match = raw_by_fingerprint.get(exception.fingerprint)
        if match is None:
            raise AuditConfigError(
                "Stale policy exception does not match a current raw violation: "
                f"{exception.rule_id} {exception.path} {exception.subject}"
            )
        exempted.append(match)
        exempted_fingerprints.add(exception.fingerprint)

    current = tuple(
        item for item in raw if item.fingerprint not in exempted_fingerprints
    )
    return current, tuple(sorted(exempted, key=_identity_sort_key))


def run_audit(
    root: Path,
    policy_path: Path,
    baseline_path: Path,
    reference_baseline_path: Path | None = None,
) -> AuditReport:
    root = root.resolve()
    policy_path = policy_path.resolve()
    baseline_path = baseline_path.resolve()
    reference_baseline_path = (
        reference_baseline_path.resolve()
        if reference_baseline_path is not None
        else None
    )

    candidate = load_baseline(baseline_path)
    raw = _collect_raw_violations(root)
    current, exempted = _apply_policy(raw, policy_path)
    comparison = classify_violations(current, candidate)

    growth: tuple[BaselineEntry, ...] = ()
    if reference_baseline_path is not None:
        reference = load_baseline(reference_baseline_path)
        growth = find_baseline_growth(candidate, reference)

    return AuditReport(
        known=tuple(sorted(comparison.known, key=_identity_sort_key)),
        exempted=exempted,
        new=tuple(sorted(comparison.new, key=_identity_sort_key)),
        resolved=tuple(sorted(comparison.resolved, key=_identity_sort_key)),
        growth=tuple(sorted(growth, key=_identity_sort_key)),
    )


def write_bootstrap_baseline(
    root: Path,
    policy_path: Path,
    output_path: Path,
) -> Baseline:
    root = root.resolve()
    policy_path = policy_path.resolve()
    output_path = output_path.resolve()

    if output_path.exists():
        raise AuditConfigError(
            f"Refusing to overwrite bootstrap baseline: {output_path}"
        )

    raw = _collect_raw_violations(root)
    current, _exempted = _apply_policy(raw, policy_path)
    entries = tuple(
        sorted(
            (
                BaselineEntry(
                    rule_id=item.rule_id,
                    path=item.path,
                    subject=item.subject,
                    fingerprint=item.fingerprint,
                    reason=BOOTSTRAP_REASON,
                )
                for item in current
            ),
            key=_identity_sort_key,
        )
    )
    baseline = Baseline(entries=entries)
    payload = {
        "schema_version": SCHEMA_VERSION,
        "entries": [
            {
                "rule_id": item.rule_id,
                "path": item.path,
                "subject": item.subject,
                "fingerprint": item.fingerprint,
                "reason": item.reason,
            }
            for item in entries
        ],
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return baseline
