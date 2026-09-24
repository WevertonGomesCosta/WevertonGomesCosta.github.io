from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from repository_audit import html_rules


REQUIRED_FIXTURES = (
    "404.html",
    "index.html",
    "politica-de-privacidade.html",
    "projetos.html",
    "publicacoes.html",
)


class TestHtmlParserIdentity(unittest.TestCase):
    def test_discovers_all_root_html_in_sorted_order_and_ignores_nested_html(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in REQUIRED_FIXTURES:
                (root / name).write_text("<html></html>", encoding="utf-8")
            (root / "docs").mkdir()
            (root / "docs" / "example.html").write_text("<html></html>", encoding="utf-8")

            self.assertEqual(
                html_rules.discover_audited_html(root),
                REQUIRED_FIXTURES,
            )

            (root / "extra.html").write_text("<html></html>", encoding="utf-8")
            self.assertEqual(
                html_rules.discover_audited_html(root),
                (
                    "404.html",
                    "extra.html",
                    "index.html",
                    "politica-de-privacidade.html",
                    "projetos.html",
                    "publicacoes.html",
                ),
            )

    def test_repeated_no_id_elements_get_distinct_structural_subjects(self):
        document = html_rules.parse_html(
            "index.html",
            """
            <section id="education">
              <div><button class="toggle">A</button></div>
              <div><button class="toggle">B</button></div>
            </section>
            """,
        )
        buttons = [element for element in document.elements if element.tag == "button"]

        self.assertEqual(
            [html_rules.element_subject(element) for element in buttons],
            [
                "section#education>div:nth-of-type(1)>button:nth-of-type(1)",
                "section#education>div:nth-of-type(2)>button:nth-of-type(1)",
            ],
        )

    def test_blank_line_movement_does_not_change_subject(self):
        compact = html_rules.parse_html(
            "index.html",
            '<section id="x"><div><button>Go</button></div></section>',
        )
        expanded = html_rules.parse_html(
            "index.html",
            """
            <section id="x">

              <div>

                <button>Go</button>

              </div>

            </section>
            """,
        )
        compact_button = next(x for x in compact.elements if x.tag == "button")
        expanded_button = next(x for x in expanded.elements if x.tag == "button")

        self.assertNotEqual(compact_button.line, expanded_button.line)
        self.assertEqual(
            html_rules.element_subject(compact_button),
            html_rules.element_subject(expanded_button),
        )

    def test_moving_element_to_different_dom_structure_changes_subject(self):
        in_section = html_rules.parse_html(
            "index.html",
            '<main id="content"><section><button>Go</button></section></main>',
        )
        in_aside = html_rules.parse_html(
            "index.html",
            '<main id="content"><aside><button>Go</button></aside></main>',
        )

        section_button = next(x for x in in_section.elements if x.tag == "button")
        aside_button = next(x for x in in_aside.elements if x.tag == "button")

        self.assertNotEqual(
            html_rules.element_subject(section_button),
            html_rules.element_subject(aside_button),
        )


class TestHtmlRules(unittest.TestCase):
    def _audit(self, files: dict[str, str]):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        for name, source in files.items():
            target = root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(source, encoding="utf-8")
        return html_rules.audit_html_structure(root)

    @staticmethod
    def _keys(violations):
        return {(v.rule_id, v.path, v.subject) for v in violations}

    def test_duplicate_ids_and_duplicate_attributes(self):
        violations = self._audit(
            {
                "index.html": """
                    <div id="dup"></div>
                    <span id="dup"></span>
                    <a id="license" href="https://example.test"
                       rel="noopener" rel="noreferrer">x</a>
                """
            }
        )
        keys = self._keys(violations)
        self.assertIn(("HTML_DUPLICATE_ID", "index.html", "id:dup"), keys)
        self.assertIn(
            (
                "HTML_DUPLICATE_ATTRIBUTE",
                "index.html",
                "a#license@attr:rel",
            ),
            keys,
        )

    def test_button_type_and_bare_hash_action(self):
        violations = self._audit(
            {
                "index.html": """
                    <button id="missing">Go</button>
                    <button id="ok" type="button">Ok</button>
                    <a id="action" href="#">Action</a>
                    <div id="contact"></div>
                    <a id="nav" href="#contact">Contact</a>
                """
            }
        )
        keys = self._keys(violations)
        self.assertIn(
            ("HTML_BUTTON_MISSING_TYPE", "index.html", "button#missing"),
            keys,
        )
        self.assertNotIn(
            ("HTML_BUTTON_MISSING_TYPE", "index.html", "button#ok"),
            keys,
        )
        self.assertIn(
            ("HTML_ACTION_HASH_LINK", "index.html", "a#action"),
            keys,
        )
        self.assertNotIn(
            ("HTML_ACTION_HASH_LINK", "index.html", "a#nav"),
            keys,
        )

    def test_target_blank_requires_noopener(self):
        violations = self._audit(
            {
                "index.html": """
                    <a id="bad" href="https://example.test" target="_blank">bad</a>
                    <a id="good" href="https://example.test" target="_blank"
                       rel="external noopener">good</a>
                """
            }
        )
        keys = self._keys(violations)
        self.assertIn(
            (
                "HTML_TARGET_BLANK_NO_NOOPENER",
                "index.html",
                "a#bad@target:_blank",
            ),
            keys,
        )
        self.assertNotIn(
            (
                "HTML_TARGET_BLANK_NO_NOOPENER",
                "index.html",
                "a#good@target:_blank",
            ),
            keys,
        )

    def test_self_link_requires_empty_query_and_fragment(self):
        violations = self._audit(
            {
                "index.html": """
                    <div id="contact"></div>
                    <a id="self" href="index.html">self</a>
                    <a id="fragment" href="index.html#contact">fragment</a>
                    <a id="query" href="?view=full">query</a>
                """
            }
        )
        keys = self._keys(violations)
        self.assertIn(
            ("HTML_SELF_LINK", "index.html", "a#self@self:index.html"),
            keys,
        )
        self.assertNotIn(
            (
                "HTML_SELF_LINK",
                "index.html",
                "a#fragment@self:index.html#contact",
            ),
            keys,
        )
        self.assertNotIn(
            ("HTML_SELF_LINK", "index.html", "a#query@self:?view=full"),
            keys,
        )

    def test_valid_relative_root_and_external_links(self):
        violations = self._audit(
            {
                "index.html": '<div id="home"></div>',
                "about.html": '<div id="bio"></div>',
                "publicacoes.html": """
                    <a href="/">home</a>
                    <a href="/about.html#bio">bio root</a>
                    <a href="about.html?x=1#bio">bio relative</a>
                    <a href="mailto:test@example.test">mail</a>
                    <a href="tel:+550000000000">phone</a>
                    <a href="https://example.test/path">https</a>
                    <a href="//cdn.example.test/file.js">cdn</a>
                """,
            }
        )
        self.assertFalse(
            [v for v in violations if v.rule_id == "HTML_INTERNAL_LINK_TARGET"],
            violations,
        )

    def test_missing_files_fragments_and_path_escape_are_invalid(self):
        violations = self._audit(
            {
                "index.html": """
                    <div id="contact"></div>
                    <a id="local-fragment" href="#missing">missing local id</a>
                    <a id="other-fragment" href="about.html#missing">missing other id</a>
                    <a id="missing-file" href="missing.html">missing file</a>
                    <a id="escape" href="../outside.html">escape</a>
                """,
                "about.html": '<div id="bio"></div>',
            }
        )
        keys = self._keys(violations)
        expected = {
            (
                "HTML_INTERNAL_LINK_TARGET",
                "index.html",
                "a#local-fragment@href:#missing",
            ),
            (
                "HTML_INTERNAL_LINK_TARGET",
                "index.html",
                "a#other-fragment@href:about.html#missing",
            ),
            (
                "HTML_INTERNAL_LINK_TARGET",
                "index.html",
                "a#missing-file@href:missing.html",
            ),
            (
                "HTML_INTERNAL_LINK_TARGET",
                "index.html",
                "a#escape@href:../outside.html",
            ),
        }
        self.assertTrue(expected <= keys, keys)


if __name__ == "__main__":
    unittest.main()
