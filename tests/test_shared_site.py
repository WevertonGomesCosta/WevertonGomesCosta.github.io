from pathlib import Path
import contextlib
import io
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import render_shared_site as shared


PAGES = (
    "index.html",
    "publicacoes.html",
    "projetos.html",
    "politica-de-privacidade.html",
)


def write_bytes(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(text.encode("utf-8"))


class FixtureMixin:
    def make_complete_fixture(self) -> Path:
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        components = root / "_site_components"
        components.mkdir()

        write_bytes(
            components / "language-switcher.html",
            '<button class="lang-switcher@@EXTRA_CLASSES@@">\n'
            '    <span class="lang-pt active">PT</span> | '
            '<span class="lang-en">EN</span>\n'
            '</button>\n',
        )
        write_bytes(
            components / "nav-home.html",
            '<nav>\n'
            '    <div class="home">Home</div>\n'
            '    @@LANGUAGE_SWITCHER@@\n'
            '</nav>\n',
        )
        write_bytes(
            components / "nav-inner.html",
            '<nav>\n'
            '    <h1 class="nav-title" data-key="@@NAV_TITLE_KEY@@">'
            '@@NAV_TITLE_TEXT@@</h1>\n'
            '    @@LANGUAGE_SWITCHER@@\n'
            '</nav>\n',
        )
        write_bytes(
            components / "footer-privacy-segment.html",
            '<a href="politica-de-privacidade.html" data-key="privacy-policy">'
            'Política de Privacidade</a> |\n',
        )
        write_bytes(
            components / "footer.html",
            '<footer>\n'
            '    <p>@@PRIVACY_SEGMENT@@<a href="license">License</a></p>\n'
            '</footer>\n',
        )
        write_bytes(
            components / "back-to-top.html",
            '<a href="#" class="back-to-top">↑</a>\n',
        )

        def page(regions: tuple[str, ...]) -> str:
            body = ['<html lang="pt-BR">', '<body>', '<main>content</main>']
            for region in regions:
                body.extend(
                    [
                        f'    <!-- shared:{region}:start -->',
                        f'    <div data-old="{region}">old</div>',
                        f'    <!-- shared:{region}:end -->',
                    ]
                )
            body.extend(['</body>', '</html>', ''])
            return "\n".join(body)

        configs = {
            "index.html": ("fixed-language", "back-to-top", "nav", "footer"),
            "publicacoes.html": ("back-to-top", "nav", "footer"),
            "projetos.html": ("back-to-top", "nav", "footer"),
            "politica-de-privacidade.html": ("back-to-top", "nav", "footer"),
        }
        for name, regions in configs.items():
            source = page(regions)
            if name == "index.html":
                source = source.replace("\n", "\r\n")
            write_bytes(root / name, source)
        write_bytes(root / "404.html", "<html><body>404</body></html>\n")
        return root


class TestRendererContract(FixtureMixin, unittest.TestCase):
    def test_detect_newline_distinguishes_lf_crlf_and_rejects_mixed(self):
        self.assertEqual(shared.detect_newline("a\nb\n", Path("x.html")), "\n")
        self.assertEqual(shared.detect_newline("a\r\nb\r\n", Path("x.html")), "\r\n")
        with self.assertRaises(shared.RenderContractError):
            shared.detect_newline("a\r\nb\n", Path("x.html"))

    def test_read_utf8_strict_rejects_bom_for_component_and_target(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "x.html"
            target.write_bytes(b"\xef\xbb\xbf<html></html>\n")
            with self.assertRaises(shared.RenderContractError):
                shared.read_utf8_strict(target)
            with self.assertRaises(shared.RenderContractError):
                shared.read_utf8_strict(target, component=True)

    def test_component_rejects_crlf(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "x.html"
            target.write_bytes(b"a\r\nb\r\n")
            with self.assertRaises(shared.RenderContractError):
                shared.read_utf8_strict(target, component=True)

    def test_render_template_indents_multiline_block_token(self):
        template = "<nav>\n    @@LANGUAGE_SWITCHER@@\n</nav>\n"
        rendered = shared.render_template(
            template,
            {"LANGUAGE_SWITCHER": "<button>\n  <span>PT</span>\n</button>"},
            "nav-home.html",
        )
        self.assertEqual(
            rendered,
            "<nav>\n    <button>\n      <span>PT</span>\n    </button>\n</nav>\n",
        )

    def test_render_template_rejects_unresolved_and_unused_tokens(self):
        with self.assertRaises(shared.RenderContractError):
            shared.render_template("@@MISSING@@\n", {}, "x.html")
        with self.assertRaises(shared.RenderContractError):
            shared.render_template(
                "@@KNOWN@@\n",
                {"KNOWN": "ok", "UNUSED": "bad"},
                "x.html",
            )

    def test_inline_token_rejects_multiline_value(self):
        with self.assertRaises(shared.RenderContractError):
            shared.render_template(
                "<p>@@VALUE@@</p>\n",
                {"VALUE": "a\nb"},
                "x.html",
            )

    def test_marker_validation_rejects_missing_duplicate_nested_and_unexpected(self):
        bad_sources = (
            "<!-- shared:nav:start -->\n",
            "<!-- shared:nav:start -->\nx\n<!-- shared:nav:start -->\n<!-- shared:nav:end -->\n",
            "<!-- shared:nav:start -->\n<!-- shared:footer:start -->\n"
            "<!-- shared:footer:end -->\n<!-- shared:nav:end -->\n",
            "<!-- shared:unknown:start -->\nx\n<!-- shared:unknown:end -->\n",
            "<!-- shared:nav:end -->\n<!-- shared:nav:start -->\n",
        )
        for source in bad_sources:
            with self.subTert(source=source):
                with self.assertRaises(shared.RenderContractError):
                    shared.validate_region_markers(source, ("nav",), Path("index.html"))

    def test_region_replacement_preserves_bytes_outside_region(self):
        source = "PREFIX\n<!-- shared:nav:start -->\nold\n<!-- shared:nav:end -->\nSUFFIX\n"
        result = shared.replace_region(
            source, "nav", "<nav>new</nav>", "\n", Path("index.html")
        )
        self.assertTrue(result.startswith("PREFIX\n<!-- shared:nav:start -->"))
        self.assertTrue(result.endswith("<!-- shared:nav:end -->\nSUFFIX\n"))

    def test_region_replacement_inherits_marker_indentation(self):
        source = (
            "  <!-- shared:nav:start -->\n"
            "  old\n"
            "  <!-- shared:nav:end -->\n"
        )
        result = shared.replace_region(
            source, "nav",
            "<nav>\n    <span>x</span>\n</nav>",
            "\n",
            Path("index.html"),
        )
        self.assertEqual(
            result,
            "  <!-- shared:nav:start -->\n"
            "  <nav>\n"
            "      <span>x</span>\n"
            "  </nav>\n"
            "  <!-- shared:nav:end -->\n",
        )

    def test_missing_component_is_fatal(self):
        root = self.make_complete_fixture()
        (root / "_site_components" / "footer.html").unlink()
        with self.assertRaises(shared.RenderContractError):
            shared.render_all(root)

    def test_privacy_segment_rejects_trailing_whitespace(self):
        root = self.make_complete_fixture()
        write_bytes(
            root / "_site_components" / "footer-privacy-segment.html",
            '<a href="privacy">Privacy</a> | \n',
        )
        with self.assertRaises(shared.RenderContractError):
            shared.read_privacy_segment(root)

    def test_render_all_is_deterministic_and_has_expected_variants(self):
        root = self.make_complete_fixture()
        first = shared.render_all(root)
        second = shared.render_all(root)
        self.assertEqual(first, second)

        index = first[root / "index.html"]
        self.assertIn('class="lang-switcher lang-fixed"', index)
        self.assertIn('class="lang-switcher"', index)
        self.assertIn("Política de Privacidade</a> | <a", index)

        expected_titles = {
            "publicacoes.html": ("nav-title-publications", "Publicações Científicas"),
            "projetos.html": ("nav-title-projects", "Todos os Projetos"),
            "politica-de-privacidade.html": ("nav-title-privacy", "Política de Privacidade"),
        }
        for name, (key, text) in expected_titles.items():
            rendered = first[root / name]
            with self.subTest(name=name):
                self.assertIn(f'data-key="{key}"', rendered)
                self.assertIn(f">{text}</h1>", rendered)
                self.assertIn('class="lang-switcher"', rendered)
                self.assertNotIn('class="lang-switcher lang-fixed"', rendered)

        privacy = first[root / "politica-de-privacidade.html"]
        self.assertNotIn("privacy-policy", privacy)
        self.assertNotIn("| <a", privacy)

    def test_render_preserves_target_line_endings(self):
        root = self.make_complete_fixture()
        rendered = shared.render_all(root)
        index = rendered[root / "index.html"]
        publications = rendered[root / "publicacoes.html"]
        self.assertIn("\r\n", index)
        self.assertNotIn("\n", index.replace("\r\n", ""))
        self.assertNotIn("\r", publications)
        self.assertIn("\n", publications)

    def test_write_is_idempotent_and_check_reports_no_drift(self):
        root = self.make_complete_fixture()
        first = shared.write_all(root)
        self.assertTrue(first)
        self.assertEqual(shared.check_all(root), ())
        self.assertEqual(shared.write_all(root), ())

    def test_check_detects_drift_without_modifying_page(self):
        root = self.make_complete_fixture()
        shared.write_all(root)
        page = root / "index.html"
        page.write_bytes(page.read_bytes().replace(b"<nav>", b"<nav data-drift='1'>", 1))
        drifted = page.read_bytes()
        self.assertEqual(shared.check_all(root), (page,))
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            code = shared.main(["--root", str(root), "--check"])
        self.assertEqual(code, 1)
        self.assertEqual(page.read_bytes(), drifted)

    def test_cli_invalid_mode_combinations_return_2(self):
        stderr = io.StringIO()
        with contextib.redirect_stderr(stderr):
            self.assertEqual(shared.main([]), 2)
        with contextlib.redirect_stderr(stderr):
            self.assertEqual(shared.main(["--write", "--check"]), 2)

    def test_no_partial_write_when_later_target_is_invalid(self):
        root = self.make_complete_fixture()
        page_a = root / "index.html"
        before = page_a.read_bytes()
        # Page A needs a valid write, but page B is malformed. No target may be written.
        (root / "_site_components" / "nav-home.html").write_text(
            '<nav class="changed">\n    @@LANGUAGE_SWITCHER@@\n</nav>\n',
            encoding="utf-8",
            newline="\n",
        )
        bad = root / "publicacoes.html"
        bad.write_text(
            bad.read_text(encoding="utf-8").replace(
                "<!-- shared:footer:end -->", ""
            ),
            encoding="utf-8",
            newline="\n",
        )
        with self.assertRaises(shared.RenderContractError):
            shared.write_all(root)
        self.assertEqual(page_a.read_bytes(), before)

    def test_404_is_not_a_target_and_is_unchanged(self):
        root = self.make_complete_fixture()
        target = root / "404.html"
        before = target.read_bytes()
        self.assertNotIn("404.html", {config.path for config in shared.PAGE_CONFIGS})
        shared.write_all(root)
        self.assertEqual(target.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
