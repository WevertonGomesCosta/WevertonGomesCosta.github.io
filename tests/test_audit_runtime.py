from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from repository_audit import runtime_rules


class TestRuntimePolicyRules(unittest.TestCase):
    def _root(self, files: dict[str, str]):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        for name, source in files.items():
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(source, encoding="utf-8")
        return root

    @staticmethod
    def _keys(violations):
        return {(v.rule_id, v.path, v.subject) for v in violations}

    def test_comment_stripper_preserves_url_strings_and_removes_comments(self):
        source = (
            'const url = "https://example.test//path"; // prefers-reduced-motion\n'
            "const quoted = '/* not a comment */'; /* acad.maximized */\n"
            "const tpl = `https://example.test//template`;\n"
        )
        stripped = runtime_rules.strip_c_style_comments(source)
        self.assertIn('"https://example.test//path"', stripped)
        self.assertIn("'/* not a comment */'", stripped)
        self.assertIn("`https://example.test//template`", stripped)
        self.assertNotIn("prefers-reduced-motion", stripped)
        self.assertNotIn("acad.maximized", stripped)
        self.assertEqual(stripped.count("\n"), source.count("\n"))

    def test_two_narrow_maximized_patterns_are_distinct_and_comments_do_not_count(self):
        root = self._root(
            {
                "utils.js": """
                    processPlatformData(records, 'maximized');
                    const legacy = acad.maximized;
                    // processPlatformData(records, 'maximized');
                    /* const ignored = acad.maximized; */
                """,
                "style.css": "@media (prefers-reduced-motion: reduce) { * { animation: none; } }",
                "index.html": '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'">',
                "motion.js": "window.matchMedia('(prefers-reduced-motion: reduce)');",
            }
        )
        violations = runtime_rules.audit_runtime_policy(root)
        keys = self._keys(violations)
        self.assertIn(
            ("LEGACY_MAXIMIZED_REFERENCE", "utils.js", "processPlatformData:maximized"),
            keys,
        )
        self.assertIn(
            ("LEGACY_MAXIMIZED_REFERENCE", "utils.js", "property:acad.maximized"),
            keys,
        )
        self.assertEqual(
            len([v for v in violations if v.rule_id == "LEGACY_MAXIMIZED_REFERENCE"]),
            2,
        )

    def test_reduced_motion_requires_active_css_and_javascript(self):
        clean_root = self._root(
            {
                "style.css": "@media (prefers-reduced-motion: reduce) { * { animation: none; } }",
                "utils.js": "const mq = window.matchMedia('(prefers-reduced-motion: reduce)');",
            }
        )
        clean = runtime_rules.audit_runtime_policy(clean_root)
        self.assertFalse(
            [v for v in clean if v.rule_id == "A11Y_REDUCED_MOTION_POLICY"],
            clean,
        )

        commented_root = self._root(
            {
                "style.css": "/* @media (prefers-reduced-motion: reduce) {} */",
                "utils.js": "// window.matchMedia('(prefers-reduced-motion: reduce)');\n",
            }
        )
        commented = runtime_rules.audit_runtime_policy(commented_root)
        matches = [v for v in commented if v.rule_id == "A11Y_REDUCED_MOTION_POLICY"]
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0].path, "style.css")
        self.assertEqual(matches[0].subject, "site:prefers-reduced-motion")

    def test_external_script_integrity_contract(self):
        root = self._root(
            {
                "style.css": "@media (prefers-reduced-motion: reduce) {}",
                "utils.js": "matchMedia('(prefers-reduced-motion: reduce)');",
                "index.html": """
                    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://cdn.example.test">
                    <script src="https://cdn.example.test/no-integrity.js"></script>
                    <script src="https://cdn.example.test/malformed.js" integrity="sha384-%%%" crossorigin="anonymous"></script>
                    <script src="//cdn.example.test/no-crossorigin.js" integrity="sha384-YWJj"></script>
                    <script src="https://cdn.example.test/good.js" integrity="sha384-YWJj" crossorigin="anonymous"></script>
                    <script src="utils.js"></script>
                """,
            }
        )
        violations = runtime_rules.audit_runtime_policy(root)
        sri = [v for v in violations if v.rule_id == "SECURITY_EXTERNAL_SCRIPT_INTEGRITY"]
        self.assertEqual(
            {(v.path, v.subject) for v in sri},
            {
                ("index.html", "https://cdn.example.test/no-integrity.js"),
                ("index.html", "https://cdn.example.test/malformed.js"),
                ("index.html", "//cdn.example.test/no-crossorigin.js"),
            },
        )

    def test_csp_requires_nonempty_default_and_script_src_on_each_page(self):
        root = self._root(
            {
                "style.css": "@media (prefers-reduced-motion: reduce) {}",
                "utils.js": "matchMedia('(prefers-reduced-motion: reduce)');",
                "good.html": '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'">',
                "missing.html": "<main>No policy</main>",
                "partial.html": '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src">',
            }
        )
        violations = runtime_rules.audit_runtime_policy(root)
        csp = [v for v in violations if v.rule_id == "SECURITY_CSP_POLICY"]
        self.assertEqual(
            {(v.path, v.subject) for v in csp},
            {
                ("missing.html", "document:csp-meta"),
                ("partial.html", "document:csp-meta"),
            },
        )


if __name__ == "__main__":
    unittest.main()
