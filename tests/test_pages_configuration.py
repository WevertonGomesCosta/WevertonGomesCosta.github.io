from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
INTERNAL_DOCS = ROOT / "docs" / "superpowers"


class TestPagesConfiguration(unittest.TestCase):
    def test_internal_engineering_docs_are_excluded_from_jekyll(self):
        config = (ROOT / "_config.yml").read_text(encoding="utf-8")
        lines = {
            line.strip()
            for line in config.splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        }
        self.assertIn("exclude:", lines)
        self.assertIn("- docs/superpowers", lines)

    def test_rendered_markdown_outside_internal_docs_has_no_liquid_tokens(self):
        violations = []
        for path in ROOT.rglob("*.md"):
            try:
                path.relative_to(INTERNAL_DOCS)
            except ValueError:
                pass
            else:
                continue

            text = path.read_text(encoding="utf-8")
            for token in ("{{", "{%"):
                if token in text:
                    violations.append(
                        f"{path.relative_to(ROOT)} contains {token!r}"
                    )

        self.assertEqual(violations, [])


if __name__ == "__main__":
    unittest.main()
