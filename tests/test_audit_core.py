import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import repository_audit as audit


def write_json(root: Path, name: str, payload: object) -> Path:
    path = root / name
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def baseline_entry(rule_id: str, path: str, subject: str, reason: str = "known"):
    return audit.BaselineEntry(
        rule_id=rule_id,
        path=path,
        subject=subject,
        fingerprint=audit.make_fingerprint(rule_id, path, subject),
        reason=reason,
    )


def baseline_payload(entry: audit.BaselineEntry) -> dict[str, str]:
    return {
        "rule_id": entry.rule_id,
        "path": entry.path,
        "subject": entry.subject,
        "fingerprint": entry.fingerprint,
        "reason": entry.reason,
    }


class TestIdentityAndBaseline(unittest.TestCase):
    def test_fingerprint_ignores_line_and_message(self):
        first = audit.Violation(
            "HTML_BUTTON_MISSING_TYPE", "index.html", "button#x", "one", line=10
        )
        moved = audit.Violation(
            "HTML_BUTTON_MISSING_TYPE", "./index.html", "button#x", "two", line=900
        )
        self.assertEqual(first.fingerprint, moved.fingerprint)

    def test_path_separator_normalization_and_subject_identity(self):
        windows = audit.make_fingerprint(
            "HTML_BUTTON_MISSING_TYPE", r"pages\index.html", "button#x"
        )
        posix = audit.make_fingerprint(
            "HTML_BUTTON_MISSING_TYPE", "pages/index.html", "button#x"
        )
        other = audit.make_fingerprint(
            "HTML_BUTTON_MISSING_TYPE", "pages/index.html", "button#other"
        )
        self.assertEqual(windows, posix)
        self.assertNotEqual(posix, other)

    def test_only_error_severity_is_supported_in_v1(self):
        with self.assertRaises(audit.AuditConfigError):
            audit.Violation(
                "HTML_BUTTON_MISSING_TYPE",
                "index.html",
                "button#x",
                "bad severity",
                severity="warning",
            )


class TestPolicyAndBaselineLoading(unittest.TestCase):
    def test_malformed_json_and_unsupported_schema_fail(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for loader, key in (
                (audit.load_policy, "exceptions"),
                (audit.load_baseline, "entries"),
            ):
                with self.subTest(loader=loader.__name__, case="malformed"):
                    path = root / f"{loader.__name__}-malformed.json"
                    path.write_text("{not json", encoding="utf-8")
                    with self.assertRaises(audit.AuditConfigError):
                        loader(path)
                with self.subTest(loader=loader.__name__, case="schema"):
                    path = write_json(
                        root,
                        f"{loader.__name__}-schema.json",
                        {"schema_version": 2, key: []},
                    )
                    with self.assertRaises(audit.AuditConfigError):
                        loader(path)

    def test_policy_schema_is_strict_and_rules_are_known(self):
        valid = {
            "rule_id": "I18N_FIXED_ARIA_LABEL",
            "path": "index.html",
            "subject": "span#brand",
            "reason": "intentional",
        }
        cases = [
            {"schema_version": 1, "exceptions": [], "audited_html": []},
            {"schema_version": 1, "exceptions": [{**valid, "extra": True}]},
            {
                "schema_version": 1,
                "exceptions": [{**valid, "rule_id": "NOT_A_RULE"}],
            },
        ]
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for index, payload in enumerate(cases):
                with self.subTest(index=index):
                    path = write_json(root, f"policy-{index}.json", payload)
                    with self.assertRaises(audit.AuditConfigError):
                        audit.load_policy(path)

    def test_baseline_schema_is_strict_and_rules_are_known(self):
        entry = baseline_entry("HTML_BUTTON_MISSING_TYPE", "index.html", "button#x")
        valid = baseline_payload(entry)
        cases = [
            {"schema_version": 1, "entries": [], "extra": True},
            {"schema_version": 1, "entries": [{**valid, "extra": True}]},
            {
                "schema_version": 1,
                "entries": [{**valid, "rule_id": "NOT_A_RULE"}],
            },
        ]
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for index, payload in enumerate(cases):
                with self.subTest(index=index):
                    path = write_json(root, f"baseline-{index}.json", payload)
                    with self.assertRaises(audit.AuditConfigError):
                        audit.load_baseline(path)

    def test_duplicate_identities_fail(self):
        policy_item = {
            "rule_id": "I18N_FIXED_ARIA_LABEL",
            "path": "index.html",
            "subject": "span#brand",
            "reason": "intentional",
        }
        entry = baseline_entry("HTML_BUTTON_MISSING_TYPE", "index.html", "button#x")
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            policy = write_json(
                root,
                "policy.json",
                {"schema_version": 1, "exceptions": [policy_item, policy_item]},
            )
            baseline = write_json(
                root,
                "baseline.json",
                {
                    "schema_version": 1,
                    "entries": [baseline_payload(entry), baseline_payload(entry)],
                },
            )
            with self.assertRaises(audit.AuditConfigError):
                audit.load_policy(policy)
            with self.assertRaises(audit.AuditConfigError):
                audit.load_baseline(baseline)

    def test_baseline_fingerprint_is_recomputed(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = write_json(
                Path(tmp),
                "baseline.json",
                {
                    "schema_version": 1,
                    "entries": [
                        {
                            "rule_id": "HTML_BUTTON_MISSING_TYPE",
                            "path": "index.html",
                            "subject": "button#x",
                            "fingerprint": "0" * 64,
                            "reason": "known",
                        }
                    ],
                },
            )
            with self.assertRaises(audit.AuditConfigError):
                audit.load_baseline(path)

    def test_subject_reason_and_path_validation(self):
        policy_base = {
            "rule_id": "I18N_FIXED_ARIA_LABEL",
            "path": "index.html",
            "subject": "span#brand",
            "reason": "intentional",
        }
        baseline_base = baseline_payload(
            baseline_entry("HTML_BUTTON_MISSING_TYPE", "index.html", "button#x")
        )
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for kind, loader, base, collection in (
                ("policy", audit.load_policy, policy_base, "exceptions"),
                ("baseline", audit.load_baseline, baseline_base, "entries"),
            ):
                for field, value in (
                    ("subject", "   "),
                    ("reason", "   "),
                    ("path", "../index.html"),
                ):
                    with self.subTest(kind=kind, field=field):
                        item = dict(base)
                        item[field] = value
                        if kind == "baseline":
                            item["fingerprint"] = "0" * 64
                        path = write_json(
                            root,
                            f"{kind}-{field}.json",
                            {"schema_version": 1, collection: [item]},
                        )
                        with self.assertRaises(audit.AuditConfigError):
                            loader(path)

    def test_valid_entries_are_sorted(self):
        policy_items = [
            {
                "rule_id": "I18N_FIXED_TITLE",
                "path": "z.html",
                "subject": "button#z",
                "reason": "z",
            },
            {
                "rule_id": "HTML_SELF_LINK",
                "path": "a.html",
                "subject": "a#home",
                "reason": "a",
            },
        ]
        baseline_items = [
            baseline_payload(baseline_entry("I18N_FIXED_TITLE", "z.html", "button#z")),
            baseline_payload(baseline_entry("HTML_SELF_LINK", "a.html", "a#home")),
        ]
        expected = [
            ("HTML_SELF_LINK", "a.html", "a#home"),
            ("I18N_FIXED_TITLE", "z.html", "button#z"),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            policy = audit.load_policy(
                write_json(
                    root,
                    "policy.json",
                    {"schema_version": 1, "exceptions": policy_items},
                )
            )
            baseline = audit.load_baseline(
                write_json(
                    root,
                    "baseline.json",
                    {"schema_version": 1, "entries": baseline_items},
                )
            )
        self.assertEqual(
            [(x.rule_id, x.path, x.subject) for x in policy.exceptions], expected
        )
        self.assertEqual(
            [(x.rule_id, x.path, x.subject) for x in baseline.entries], expected
        )


class TestBaselineComparison(unittest.TestCase):
    def test_exact_match_is_known(self):
        violation = audit.Violation(
            "HTML_BUTTON_MISSING_TYPE", "index.html", "button#x", "missing type"
        )
        baseline = audit.Baseline(
            entries=(baseline_entry(violation.rule_id, violation.path, violation.subject),)
        )
        result = audit.classify_violations([violation], baseline)
        self.assertEqual(result.known, (violation,))
        self.assertEqual(result.new, ())
        self.assertEqual(result.resolved, ())

    def test_absent_baseline_entry_is_resolved(self):
        entry = baseline_entry("HTML_BUTTON_MISSING_TYPE", "index.html", "button#x")
        result = audit.classify_violations([], audit.Baseline(entries=(entry,)))
        self.assertEqual(result.resolved, (entry,))

    def test_replacement_with_same_count_is_new_and_resolved(self):
        old = baseline_entry("HTML_BUTTON_MISSING_TYPE", "index.html", "button#old")
        current = audit.Violation(
            "HTML_BUTTON_MISSING_TYPE", "index.html", "button#new", "missing type"
        )
        result = audit.classify_violations([current], audit.Baseline(entries=(old,)))
        self.assertEqual(result.new, (current,))
        self.assertEqual(result.resolved, (old,))

    def test_growth_detects_additions_but_not_removals(self):
        old = baseline_entry("HTML_BUTTON_MISSING_TYPE", "index.html", "button#old")
        new = baseline_entry("HTML_BUTTON_MISSING_TYPE", "index.html", "button#new")
        self.assertEqual(
            audit.find_baseline_growth(
                audit.Baseline(entries=(new,)), audit.Baseline(entries=())
            ),
            (new,),
        )
        self.assertEqual(
            audit.find_baseline_growth(
                audit.Baseline(entries=()), audit.Baseline(entries=(old,))
            ),
            (),
        )
