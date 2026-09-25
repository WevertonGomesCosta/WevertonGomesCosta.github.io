import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import repository_audit as audit
from repository_audit import engine
import audit_repository


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def baseline_item(
    rule_id: str, path: str, subject: str, reason: str = "known"
) -> dict[str, str]:
    return {
        "rule_id": rule_id,
        "path": path,
        "subject": subject,
        "fingerprint": audit.make_fingerprint(rule_id, path, subject),
        "reason": reason,
    }


def make_clean_repo(root: Path) -> None:
    csp = (
        '<meta http-equiv="Content-Security-Policy" '
        'content="default-src \'self\'; script-src \'self\'">'
    )
    for name in (
        "index.html",
        "publicacoes.html",
        "projetos.html",
        "politica-de-privacidade.html",
        "404.html",
    ):
        (root / name).write_text(
            f"<html><head>{csp}</head><body></body></html>",
            encoding="utf-8",
        )
    (root / "style.css").write_text(
        "@media (prefers-reduced-motion: reduce) "
        "{ * { animation: none; } }",
        encoding="utf-8",
    )
    (root / "utils.js").write_text(
        "window.matchMedia('(prefers-reduced-motion: reduce)');",
        encoding="utf-8",
    )
    (root / "profile-interpolation.js").write_text(
        "window.ProfileTranslationInterpolator = {};",
        encoding="utf-8",
    )
    write_json(root / "translations.json", {"pt": {}, "en": {}})
    write_json(
        root / "profile.json",
        {
            "schema_version": "1.0.0",
            "person": {
                "name": "Example Person",
                "display_name": "Example P.",
                "email": "person@example.org",
                "website_url": "https://example.org/",
                "avatar_url": "https://example.org/avatar.png",
                "location": {
                    "city": "Viçosa",
                    "region": "MG",
                    "country_code": "BR",
                },
            },
            "profiles": {
                "github": {
                    "username": "example",
                    "url": "https://github.com/example",
                },
                "linkedin": {"url": "https://www.linkedin.com/in/example/"},
                "lattes": {
                    "id": "1234567890123456",
                    "url": "https://lattes.cnpq.br/1234567890123456",
                },
                "google_scholar": {
                    "author_id": "ScholarId",
                    "url": "https://scholar.google.com/citations?user=ScholarId",
                },
                "orcid": {
                    "id": "0000-0002-1825-0097",
                    "url": "https://orcid.org/0000-0002-1825-0097",
                },
                "scopus": {
                    "author_id": "1234567890",
                    "url": "https://www.scopus.com/authid/detail.uri?authorId=1234567890",
                },
                "web_of_science": {
                    "researcher_id": "ABC-1234-2026",
                    "url": "https://www.webofscience.com/wos/author/record/ABC-1234-2026",
                },
            },
            "organizations": {},
            "affiliations": [],
            "education": [],
        },
    )
    write_json(
        root / "academic-registry.json",
        {
            "schema_version": "1.0.0",
            "updated_at": "2026-09-24",
            "source_basis": {},
            "summary": {},
            "works": [],
        },
    )
    write_json(root / "fallback-data.json", {"academicData": {}})
    (root / "robots.txt").write_text("", encoding="utf-8")
    (root / "sitemap.xml").write_text("", encoding="utf-8")
    (root / ".audit").mkdir()
    write_json(
        root / ".audit" / "policy.json",
        {"schema_version": 1, "exceptions": []},
    )
    write_json(
        root / ".audit" / "known-debt.json",
        {"schema_version": 1, "entries": []},
    )


class FixtureCase(unittest.TestCase):
    def repo(self) -> Path:
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        make_clean_repo(root)
        return root

    def add_missing_type_button(self, root: Path, identifier: str = "x") -> None:
        path = root / "index.html"
        path.write_text(
            path.read_text(encoding="utf-8").replace(
                "</body>",
                f'<button id="{identifier}">X</button></body>',
            ),
            encoding="utf-8",
        )


class TestAuditOrchestration(FixtureCase):
    def test_rule_coverage_matches_exact_rule_registry(self):
        covered = frozenset().union(*engine.RULE_COVERAGE.values())
        self.assertEqual(covered, audit.RULE_IDS)
        self.assertEqual(set(engine.RULE_COVERAGE), set(engine.RULES))

    def test_clean_fixture_passes(self):
        root = self.repo()
        report = engine.run_audit(
            root,
            root / ".audit" / "policy.json",
            root / ".audit" / "known-debt.json",
        )
        self.assertTrue(report.passed)
        self.assertEqual(report.known, ())
        self.assertEqual(report.exempted, ())
        self.assertEqual(report.new, ())
        self.assertEqual(report.resolved, ())
        self.assertEqual(report.growth, ())

    def test_exact_policy_exception_is_visible_and_nonblocking(self):
        root = self.repo()
        self.add_missing_type_button(root)
        write_json(
            root / ".audit" / "policy.json",
            {
                "schema_version": 1,
                "exceptions": [{
                    "rule_id": "HTML_BUTTON_MISSING_TYPE",
                    "path": "index.html",
                    "subject": "button#x",
                    "reason": "fixture policy",
                }],
            },
        )
        report = engine.run_audit(
            root,
            root / ".audit" / "policy.json",
            root / ".audit" / "known-debt.json",
        )
        self.assertTrue(report.passed)
        self.assertEqual(len(report.exempted), 1)
        self.assertEqual(report.exempted[0].subject, "button#x")

    def test_stale_policy_exception_is_fatal(self):
        root = self.repo()
        write_json(
            root / ".audit" / "policy.json",
            {
                "schema_version": 1,
                "exceptions": [{
                    "rule_id": "HTML_BUTTON_MISSING_TYPE",
                    "path": "index.html",
                    "subject": "button#gone",
                    "reason": "stale",
                }],
            },
        )
        with self.assertRaises(audit.AuditConfigError):
            engine.run_audit(
                root,
                root / ".audit" / "policy.json",
                root / ".audit" / "known-debt.json",
            )

    def test_new_violation_fails(self):
        root = self.repo()
        self.add_missing_type_button(root)
        report = engine.run_audit(
            root,
            root / ".audit" / "policy.json",
            root / ".audit" / "known-debt.json",
        )
        self.assertFalse(report.passed)
        self.assertEqual(
            [(x.rule_id, x.subject) for x in report.new],
            [("HTML_BUTTON_MISSING_TYPE", "button#x")],
        )

    def test_stale_baseline_entry_is_resolved_and_fails(self):
        root = self.repo()
        write_json(
            root / ".audit" / "known-debt.json",
            {
                "schema_version": 1,
                "entries": [
                    baseline_item(
                        "HTML_BUTTON_MISSING_TYPE",
                        "index.html",
                        "button#x",
                    )
                ],
            },
        )
        report = engine.run_audit(
            root,
            root / ".audit" / "policy.json",
            root / ".audit" / "known-debt.json",
        )
        self.assertFalse(report.passed)
        self.assertEqual(len(report.resolved), 1)

    def test_reference_blocks_growth_but_genesis_does_not(self):
        root = self.repo()
        self.add_missing_type_button(root)
        entry = baseline_item(
            "HTML_BUTTON_MISSING_TYPE", "index.html", "button#x"
        )
        write_json(
            root / ".audit" / "known-debt.json",
            {"schema_version": 1, "entries": [entry]},
        )
        reference = root / ".audit" / "reference.json"
        write_json(reference, {"schema_version": 1, "entries": []})

        guarded = engine.run_audit(
            root,
            root / ".audit" / "policy.json",
            root / ".audit" / "known-debt.json",
            reference,
        )
        self.assertFalse(guarded.passed)
        self.assertEqual(len(guarded.growth), 1)

        genesis = engine.run_audit(
            root,
            root / ".audit" / "policy.json",
            root / ".audit" / "known-debt.json",
        )
        self.assertTrue(genesis.passed)
        self.assertEqual(genesis.growth, ())


class TestCli(FixtureCase):
    def test_emit_current_debt_without_candidate_baseline(self):
        root = self.repo()
        (root / ".audit" / "known-debt.json").unlink()
        self.add_missing_type_button(root, "z")
        path = root / ".audit" / "generated.json"

        code = audit_repository.main([
            "--root", str(root),
            "--emit-current-debt", ".audit/generated.json",
        ])
        self.assertEqual(code, 0)
        payload = json.loads(path.read_text(encoding="utf-8"))
        identities = [
            (x["rule_id"], x["path"], x["subject"])
            for x in payload["entries"]
        ]
        self.assertEqual(identities, sorted(identities))
        self.assertEqual(len(identities), 1)
        for item in payload["entries"]:
            self.assertEqual(
                item["fingerprint"],
                audit.make_fingerprint(
                    item["rule_id"], item["path"], item["subject"]
                ),
            )
            self.assertEqual(
                item["reason"],
                "Pre-existing debt frozen before structural block 2",
            )

    def test_bootstrap_refuses_overwrite(self):
        root = self.repo()
        output = root / ".audit" / "generated.json"
        output.write_text("sentinel", encoding="utf-8")
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            code = audit_repository.main([
                "--root", str(root),
                "--emit-current-debt", ".audit/generated.json",
            ])
        self.assertEqual(code, 2)
        self.assertEqual(output.read_text(encoding="utf-8"), "sentinel")

    def test_missing_baseline_is_fatal(self):
        root = self.repo()
        (root / ".audit" / "known-debt.json").unlink()
        with contextlib.redirect_stderr(io.StringIO()):
            code = audit_repository.main(["--root", str(root)])
        self.assertEqual(code, 2)

    def test_main_exit_codes_zero_one_two(self):
        root = self.repo()
        self.assertEqual(audit_repository.main(["--root", str(root)]), 0)
        self.add_missing_type_button(root)
        self.assertEqual(audit_repository.main(["--root", str(root)]), 1)
        (root / ".audit" / "policy.json").write_text(
            "{broken", encoding="utf-8"
        )
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(
                audit_repository.main(["--root", str(root)]),
                2,
            )

    def test_unexpected_internal_error_is_fatal_exit_2(self):
        root = self.repo()
        stderr = io.StringIO()
        with mock.patch.object(
            audit_repository,
            "run_audit",
            side_effect=RuntimeError("boom"),
        ):
            with contextlib.redirect_stderr(stderr):
                code = audit_repository.main(["--root", str(root)])

        self.assertEqual(code, 2)
        self.assertIn(
            "Audit internal error: RuntimeError: boom",
            stderr.getvalue(),
        )

    def test_json_output_parses(self):
        root = self.repo()
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            code = audit_repository.main(
                ["--root", str(root), "--json"]
            )
        self.assertEqual(code, 0)
        payload = json.loads(stdout.getvalue())
        self.assertTrue(payload["passed"])
        self.assertEqual(payload["counts"]["new"], 0)

    def test_human_output_counts_exempted(self):
        root = self.repo()
        self.add_missing_type_button(root)
        write_json(
            root / ".audit" / "policy.json",
            {
                "schema_version": 1,
                "exceptions": [{
                    "rule_id": "HTML_BUTTON_MISSING_TYPE",
                    "path": "index.html",
                    "subject": "button#x",
                    "reason": "fixture policy",
                }],
            },
        )
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            code = audit_repository.main(["--root", str(root)])
        self.assertEqual(code, 0)
        self.assertIn("EXEMPTED   1", stdout.getvalue())


if __name__ == "__main__":
    unittest.main()
