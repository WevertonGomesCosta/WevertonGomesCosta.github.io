# Block 2 — Shared Site Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manually duplicated shared site chrome with deterministic canonical components, correct the markup/i18n debt owned by Block 2, and ratchet the protected audit baseline from 65 to exactly 11 entries without changing the site's factual content or visual design.

**Architecture:** A Python 3.13 standard-library renderer reads canonical fragments from `_site_components/` and rewrites only explicitly marked regions in four committed root HTML pages. Root HTML remains the exact static deploy artifact consumed by GitHub Pages and `python -m http.server`; CI adds `render_shared_site.py --check` before the existing repository audit, while the audit candidate baseline is reduced monotonically from 65 to 11.

**Tech Stack:** Python 3.13 standard library, HTML/CSS/vanilla JavaScript, `unittest`, GitHub Actions, existing GitHub Pages/Jekyll deployment.

**Spec:** `docs/superpowers/specs/2026-09-24-shared-site-architecture-design.md`

## Global Constraints

- Implementation starts on a new branch named `block2-shared-site-architecture-implementation` created from the final approved `block2-shared-site-architecture-design` HEAD; do not implement on `main` or on the design branch.
- No new dependency, framework, static-site generator, bundler, or package manager.
- `scripts/render_shared_site.py` is Python standard-library only; `--write` and `--check` are mutually exclusive and exactly one mode is required.
- Root HTML remains complete static HTML; nav/footer/back-to-top/language controls must exist without executing JavaScript.
- `write_all()` validates/renders every configured target before the first filesystem replacement; if prevalidation fails, it writes nothing.
- `index.html` preserves CRLF; `publicacoes.html`, `projetos.html`, and `politica-de-privacidade.html` preserve LF.
- `404.html` is never a renderer target and receives no shared nav/footer redesign.
- No factual profile/content changes, no PT/EN key removals, no page-title/nav-title behavior changes, and no `utils.js` refactor.
- Existing JavaScript selector contracts remain stable: `[data-cv-type]`, `#copy-email-link`, `#copy-email-footer`, `.back-to-top`, and `window.toggleLanguage`.
- `.audit/policy.json` remains exactly zero exceptions.
- Block 2 owns only `HTML_ACTION_HASH_LINK`, `HTML_BUTTON_MISSING_TYPE`, `I18N_FIXED_ARIA_LABEL`, and `I18N_REFERENCE_MISSING`; the final baseline is exactly 11 retained pre-existing violations.
- Every implementation task follows RED → GREEN → full relevant suite → atomic remote commit → mandatory user-local validation. Do not begin the next task until the user returns the local gate output and it passes.
- Use `python -B` for normal Python execution. `compileall` may create `__pycache__`; remove those directories immediately after the compile gate.
- Do not merge or push directly to `main`. Integration occurs only through the protected PR/check flow after whole-branch review.

## File Structure

The final Block 2 change set is expected to center on these files:

```text
_site_components/
  back-to-top.html                 canonical top-navigation anchor
  footer.html                      canonical shared footer shell
  footer-privacy-segment.html      canonical privacy link + trailing separator
  language-switcher.html           canonical PT/EN button markup
  nav-home.html                    canonical home navbar
  nav-inner.html                   canonical inner-page navbar

scripts/render_shared_site.py       renderer, validation, --write/--check CLI
tests/test_shared_site.py           renderer + production shared-site contract

index.html                          rendered home + non-shared semantic controls
publicacoes.html                    rendered inner chrome + semantic controls
projetos.html                       rendered inner chrome + semantic controls
politica-de-privacidade.html        rendered inner chrome + i18n reference
style.css                           narrowly scoped anchor→button equivalence
translations.json                   privacy-services-p2 in PT and EN

.audit/known-debt.json              65 → 11 candidate baseline
.github/workflows/repository-audit.yml
tests/test_audit_workflow.py        render-check CI contract

docs/superpowers/specs/2026-09-24-shared-site-architecture-design.md
docs/superpowers/plans/2026-09-24-shared-site-architecture.md
```

`utils.js`, `404.html`, academic datasets, and security/runtime detectors are not implementation targets for this block.

## Review Focus

These five failure modes are easy to miss even if the happy path passes. Each is pinned to an owning task below.

1. **Bytes outside generated regions change accidentally.** Task 1 adds a test proving render replacement preserves all prefix/suffix bytes around a region.
2. **A component is missing or contains an unknown/unresolved token.** Task 1 adds fatal-contract tests for missing components and unknown tokens, not only unresolved known tokens.
3. **`--check` mutates files while detecting drift.** Task 1 snapshots fixture bytes before/after a failing check and proves they are identical.
4. **Production pages gain duplicate/missing `#page-top` targets during semantic migration.** Task 2 asserts exactly one `id="page-top"` in each interactive page and zero internal-link-target violations.
5. **The 11-entry candidate baseline keeps the correct count but swaps an identity.** Task 4 compares exact retained fingerprints against the 65-entry `main` reference, not only rule counts.

---

### Task 1: Canonical components and deterministic renderer

**Files:**
- Create: `scripts/render_shared_site.py`
- Create: `tests/test_shared_site.py`
- Create: `_site_components/back-to-top.html`
- Create: `_site_components/language-switcher.html`
- Create: `_site_components/nav-home.html`
- Create: `_site_components/nav-inner.html`
- Create: `_site_components/footer.html`
- Create: `_site_components/footer-privacy-segment.html`
- Modify: `index.html`
- Modify: `publicacoes.html`
- Modify: `projetos.html`
- Modify: `politica-de-privacidade.html`

**Interfaces:**
- Consumes: approved Block 2 spec; existing four root HTML pages as the behavior-equivalent source to extract.
- Produces:
  - `RenderContractError(Exception)`
  - `PageConfig` frozen dataclass
  - `PAGE_CONFIGS: tuple[PageConfig, ...]`
  - `read_utf8_strict(path: Path, *, component: bool = False) -> str`
  - `detect_newline(text: str, path: Path) -> str`
  - `validate_region_markers(source: str, expected_regions: tuple[str, ...], path: Path) -> None`
  - `render_template(template: str, values: Mapping[str, str], source_name: str) -> str`
  - `render_page(root: Path, config: PageConfig) -> str`
  - `render_all(root: Path) -> dict[Path, str]`
  - `check_all(root: Path) -> tuple[Path, ...]`
  - `write_all(root: Path) -> tuple[Path, ...]`
  - `main(argv: Sequence[str] | None = None) -> int`

- [ ] **Step 1: Create the implementation branch from the approved design branch**

Execution-time branch creation must start from the final design/plan HEAD:

```bash
git fetch origin
git switch block2-shared-site-architecture-design
git pull --ff-only origin block2-shared-site-architecture-design
git switch -c block2-shared-site-architecture-implementation
```

Before writing code:

```bash
git status --short
git log -3 --oneline
```

Expected: clean tree; branch contains only the approved spec and plan relative to `main`.

- [ ] **Step 2: Write failing renderer contract tests**

Create `tests/test_shared_site.py`. Use only standard library/temp directories.

The test module imports the renderer from `scripts`:

```python
from pathlib import Path
import contextlib
import io
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]

import sys
sys.path.insert(0, str(ROOT / "scripts"))

import render_shared_site as shared
```

Add a fixture helper that writes bytes rather than `Path.write_text(..., newline=...)` so CRLF/LF behavior is explicit:

```python
def write_bytes(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(text.encode("utf-8"))
```

Pin the public contract with tests equivalent to:

```python
class TestRendererContract(unittest.TestCase):
    def test_detect_newline_distinguishes_lf_crlf_and_rejects_mixed(self):
        self.assertEqual(shared.detect_newline("a\nb\n", Path("x.html")), "\n")
        self.assertEqual(shared.detect_newline("a\r\nb\r\n", Path("x.html")), "\r\n")
        with self.assertRaises(shared.RenderContractError):
            shared.detect_newline("a\r\nb\n", Path("x.html"))

    def test_read_utf8_strict_rejects_bom_for_component_and_target(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "x.html"
            target.write_bytes(b"\xef\xbb\xbf<html></html>\n")
            with self.assertRaises(shared.RenderContractError):
                shared.read_utf8_strict(target)

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

    def test_render_template_rejects_unresolved_or_unknown_tokens(self):
        with self.assertRaises(shared.RenderContractError):
            shared.render_template("@@MISSING@@\n", {}, "x.html")
        with self.assertRaises(shared.RenderContractError):
            shared.render_template(
                "@@KNOWN@@\n",
                {"KNOWN": "ok", "UNUSED": "bad"},
                "x.html",
            )
```

The token renderer contract is:

- token grammar: `@@[A-Z0-9_]+@@`;
- a token occupying its own line inherits that line's indentation for every line of a multiline replacement;
- inline replacement values must be single-line;
- every token in the template must have one supplied value;
- every supplied value must be consumed;
- no token may remain after rendering.

Add marker-topology tests:

```python
def test_marker_validation_rejects_missing_duplicate_nested_and_unexpected(self):
    bad_sources = (
        "<!-- shared:nav:start -->\n",
        "<!-- shared:nav:start -->\nx\n<!-- shared:nav:start -->\n<!-- shared:nav:end -->\n",
        "<!-- shared:nav:start -->\n<!-- shared:footer:start -->\n"
        "<!-- shared:footer:end -->\n<!-- shared:nav:end -->\n",
        "<!-- shared:unknown:start -->\nx\n<!-- shared:unknown:end -->\n",
    )
    for source in bad_sources:
        with self.subTest(source=source):
            with self.assertRaises(shared.RenderContractError):
                shared.validate_region_markers(source, ("nav",), Path("index.html"))
```

Add Review Focus tests:

```python
def test_region_replacement_preserves_bytes_outside_region(self):
    source = "PREFIX\n<!-- shared:nav:start -->\nold\n<!-- shared:nav:end -->\nSUFFIX\n"
    result = shared.replace_region(
        source, "nav", "<nav>new</nav>", "\n", Path("index.html")
    )
    self.assertTrue(result.startswith("PREFIX\n<!-- shared:nav:start -->"))
    self.assertTrue(result.endswith("<!-- shared:nav:end -->\nSUFFIX\n"))

def test_check_mode_does_not_modify_drifted_page(self):
    root = self.make_complete_fixture()
    page = root / "index.html"
    before = page.read_bytes()
    page.write_bytes(before.replace(b"<nav>", b"<nav data-drift='1'>", 1))
    drifted = page.read_bytes()
    code = shared.main(["--root", str(root), "--check"])
    self.assertEqual(code, 1)
    self.assertEqual(page.read_bytes(), drifted)

def test_missing_component_is_fatal(self):
    root = self.make_complete_fixture()
    (root / "_site_components" / "footer.html").unlink()
    with self.assertRaises(shared.RenderContractError):
        shared.render_all(root)
```

Also add the spec-required tests:

- deterministic home rendering;
- all three inner nav title key/fallback pairs;
- privacy footer segment present on home/publications/projects and absent on privacy;
- fixed and navbar language-switcher variants rendered from one canonical file;
- CRLF target preserved;
- LF target preserved;
- second `write_all()` returns no changed paths;
- synchronized `check_all()` returns empty tuple;
- drift returns the drifted page from `check_all()`;
- missing/duplicate/end-before-start/nested/overlapping/unexpected markers are fatal;
- neither/both CLI modes return 2;
- component BOM and target BOM are fatal;
- no partial write: make page A require a valid change and page B malformed, call `write_all()`, assert page A bytes are unchanged;
- `404.html` is absent from `PAGE_CONFIGS` and remains byte-identical if placed in a fixture.

- [ ] **Step 3: Run Task 1 tests RED**

```bash
python -B -m unittest tests.test_shared_site.TestRendererContract -v
```

Expected: import failure because `scripts/render_shared_site.py` does not yet exist.

- [ ] **Step 4: Implement the renderer core**

Create `scripts/render_shared_site.py` with these top-level contracts:

```python
from __future__ import annotations

import argparse
from dataclasses import dataclass
import os
from pathlib import Path
import re
import sys
import tempfile
from typing import Mapping, Sequence


TOKEN_RE = re.compile(r"@@([A-Z0-9_]+)@@")
MARKER_RE = re.compile(
    r"<!-- shared:([a-z0-9-]+):(start|end) -->"
)


class RenderContractError(RuntimeError):
    pass


@dataclass(frozen=True)
class PageConfig:
    path: str
    regions: tuple[str, ...]
    nav_variant: str
    nav_title_key: str | None
    nav_title_fallback: str | None
    include_privacy_segment: bool
    include_fixed_language: bool = False


PAGE_CONFIGS = (
    PageConfig(
        "index.html",
        ("fixed-language", "back-to-top", "nav", "footer"),
        "home",
        None,
        None,
        True,
        True,
    ),
    PageConfig(
        "publicacoes.html",
        ("back-to-top", "nav", "footer"),
        "inner",
        "nav-title-publications",
        "Publicações Científicas",
        True,
    ),
    PageConfig(
        "projetos.html",
        ("back-to-top", "nav", "footer"),
        "inner",
        "nav-title-projects",
        "Todos os Projetos",
        True,
    ),
    PageConfig(
        "politica-de-privacidade.html",
        ("back-to-top", "nav", "footer"),
        "inner",
        "nav-title-privacy",
        "Política de Privacidade",
        False,
    ),
)
```

Implement strict UTF-8/BOM and EOL handling:

```python
def read_utf8_strict(path: Path, *, component: bool = False) -> str:
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise RenderContractError(f"Cannot read {path}: {exc}") from exc
    if raw.startswith(b"\xef\xbb\xbf"):
        raise RenderContractError(f"UTF-8 BOM is not allowed: {path}")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise RenderContractError(f"Invalid UTF-8: {path}") from exc
    if component and ("\r\n" in text or "\r" in text):
        raise RenderContractError(f"Component must use LF only: {path}")
    return text


def detect_newline(text: str, path: Path) -> str:
    crlf = text.count("\r\n")
    without_crlf = text.replace("\r\n", "")
    bare_lf = without_crlf.count("\n")
    bare_cr = without_crlf.count("\r")
    if bare_cr or (crlf and bare_lf):
        raise RenderContractError(f"Mixed/invalid line endings: {path}")
    return "\r\n" if crlf else "\n"
```

Implement marker validation as a single-pass ordered event scan. Exactly one start/end pair is required for each configured region; no stack depth greater than one is allowed; any marker whose region is not in `expected_regions` is fatal.

Use this concrete shape:

```python
def validate_region_markers(
    source: str,
    expected_regions: tuple[str, ...],
    path: Path,
) -> None:
    expected = set(expected_regions)
    counts = {
        region: {"start": 0, "end": 0}
        for region in expected_regions
    }
    active: str | None = None

    for match in MARKER_RE.finditer(source):
        region, edge = match.groups()
        if region not in expected:
            raise RenderContractError(
                f"Unexpected shared region {region!r}: {path}"
            )
        counts[region][edge] += 1
        if counts[region][edge] > 1:
            raise RenderContractError(
                f"Duplicate {edge} marker for {region!r}: {path}"
            )

        if edge == "start":
            if active is not None:
                raise RenderContractError(
                    f"Nested/overlapping shared regions in {path}"
                )
            active = region
        else:
            if active != region:
                raise RenderContractError(
                    f"Out-of-order shared marker for {region!r}: {path}"
                )
            active = None

    if active is not None:
        raise RenderContractError(
            f"Missing end marker for {active!r}: {path}"
        )

    missing = [
        region
        for region in expected_regions
        if counts[region] != {"start": 1, "end": 1}
    ]
    if missing:
        raise RenderContractError(
            f"Missing shared marker pair(s) {missing!r}: {path}"
        )


def replace_region(
    source: str,
    region: str,
    rendered_fragment: str,
    newline: str,
    path: Path,
) -> str:
    start_marker = f"<!-- shared:{region}:start -->"
    end_marker = f"<!-- shared:{region}:end -->"
    start = source.index(start_marker)
    end = source.index(end_marker, start + len(start_marker))

    end_line_start = source.rfind(newline, start, end) + len(newline)
    end_indent = source[end_line_start:end]
    if end_indent.strip():
        raise RenderContractError(
            f"End marker is not line-aligned for {region!r}: {path}"
        )

    fragment = rendered_fragment.rstrip("\n")
    if "\r" in fragment:
        raise RenderContractError(
            f"Rendered component contains CR characters: {region}"
        )
    fragment = fragment.replace("\n", newline)

    return (
        source[: start + len(start_marker)]
        + newline
        + fragment
        + newline
        + end_indent
        + source[end:]
    )
```

`replace_region()` keeps both marker comments and replaces only the bytes between them, using exactly one target newline after the start marker and before the end marker.

Implement token rendering with line-aware block indentation using this algorithm:

```python
def render_template(
    template: str,
    values: Mapping[str, str],
    source_name: str,
) -> str:
    used: set[str] = set()
    output: list[str] = []
    block_re = re.compile(
        r"^(?P<indent>[ \t]*)@@(?P<name>[A-Z0-9_]+)@@(?P<eol>\n?)$"
    )

    for line in template.splitlines(keepends=True):
        block = block_re.match(line)
        if block:
            name = block.group("name")
            if name not in values:
                raise RenderContractError(
                    f"Missing token {name!r}: {source_name}"
                )
            value = values[name].rstrip("\n")
            if "\r" in value:
                raise RenderContractError(
                    f"CR is not allowed in component token {name!r}"
                )
            indent = block.group("indent")
            lines = value.split("\n") if value else [""]
            output.append(
                "\n".join(
                    (indent + item) if item else ""
                    for item in lines
                )
                + block.group("eol")
            )
            used.add(name)
            continue

        def replace_inline(match: re.Match[str]) -> str:
            name = match.group(1)
            if name not in values:
                raise RenderContractError(
                    f"Missing token {name!r}: {source_name}"
                )
            value = values[name]
            if "\n" in value or "\r" in value:
                raise RenderContractError(
                    f"Inline token {name!r} must be single-line"
                )
            used.add(name)
            return value

        output.append(TOKEN_RE.sub(replace_inline, line))

    unused = set(values) - used
    if unused:
        raise RenderContractError(
            f"Unused token value(s) {sorted(unused)!r}: {source_name}"
        )

    rendered = "".join(output)
    if TOKEN_RE.search(rendered):
        raise RenderContractError(
            f"Unresolved token remains: {source_name}"
        )
    return rendered
```

Build components in this order:

1. render `language-switcher.html` with `EXTRA_CLASSES`;
2. inject that result into `nav-home.html` or `nav-inner.html`;
3. render `footer-privacy-segment.html` or use empty string;
4. inject `PRIVACY_SEGMENT` into `footer.html`;
5. render `back-to-top.html`;
6. replace configured page regions.

Implement all-target prevalidation:

```python
def render_all(root: Path) -> dict[Path, str]:
    rendered = {}
    for config in PAGE_CONFIGS:
        rendered[root / config.path] = render_page(root, config)
    return rendered


def check_all(root: Path) -> tuple[Path, ...]:
    expected = render_all(root)
    drift = []
    for path, rendered in expected.items():
        current = read_utf8_strict(path)
        if current != rendered:
            drift.append(path)
    return tuple(drift)
```

`write_all()` must call `render_all()` before writing anything. For each changed page, encode the fully rendered string to UTF-8, write to a temporary file in the same directory, flush/fsync, then `os.replace(temp_path, path)`. Clean any remaining temp file in `finally`.

CLI contract:

```python
def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root")
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--write", action="store_true")
    modes.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)

    root = (
        Path(args.root).resolve()
        if args.root
        else Path(__file__).resolve().parents[1]
    )
    try:
        if args.write:
            changed = write_all(root)
            for path in changed:
                print(path.relative_to(root).as_posix())
            return 0
        drift = check_all(root)
        for path in drift:
            print(f"DRIFT {path.relative_to(root).as_posix()}")
        return 1 if drift else 0
    except RenderContractError as exc:
        print(f"Shared-site render error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
```

Do not catch arbitrary `Exception` inside library functions; tests must receive `RenderContractError` for contract/configuration failures.

- [ ] **Step 5: Extract canonical components without semantic changes yet**

This task is a composition-only migration. Preserve the existing tags/attributes that currently produce Block 2 debt; Task 2 owns semantic changes.

Create:

`_site_components/back-to-top.html`

```html
<a href="#" class="back-to-top" data-key-aria-label="back-to-top-label">↑</a>
```

Create `_site_components/language-switcher.html` from the existing switcher markup using only the class token:

```html
<button class="lang-switcher@@EXTRA_CLASSES@@" onclick="toggleLanguage()" data-key-title="change-lang-title">
    <span class="lang-pt active">PT</span> | <span class="lang-en">EN</span>
</button>
```

At Task 1, deliberately do **not** add `type="button"`; that belongs to Task 2 and keeps the Task 1 debt inventory at 65.

Extract the complete current home `<nav>` element, from its opening tag through its matching closing tag, into `nav-home.html`. Replace only the complete language-switcher button block with a whole-line:

```text
@@LANGUAGE_SWITCHER@@
```

Extract the complete current inner-page `<nav>` element into `nav-inner.html`. The publications page is the canonical source; verify the projects/privacy variants differ only in the page-title key/text before extraction. Replace the title element with:

```html
<h1 class="nav-title" data-key="@@NAV_TITLE_KEY@@">@@NAV_TITLE_TEXT@@</h1>
```

and replacing its switcher with the same whole-line `@@LANGUAGE_SWITCHER@@`.

Extract the current `index.html` footer into `footer.html`. Replace only this exact logical segment:

```html
<a href="politica-de-privacidade.html" data-key="privacy-policy">Política de Privacidade</a> |
```

with:

```text
@@PRIVACY_SEGMENT@@
```

Store that removed segment in `footer-privacy-segment.html` as one LF-terminated line. The fragment consists of the privacy anchor, one ASCII space, `|`, and one ASCII space before the following license anchor. No footer HTML may be hardcoded in Python.

- [ ] **Step 6: Add generated-region markers to the four pages**

Use these exact region names:

```text
fixed-language
back-to-top
nav
footer
```

`index.html` gets all four; each inner page gets `back-to-top`, `nav`, and `footer`.

Wrap the existing matching markup without changing its contents: insert `<!-- shared:nav:start -->` immediately before the existing opening `<nav>` line and `<!-- shared:nav:end -->` immediately after the matching closing `</nav>` line. Apply the same rule to the exact existing fixed-language button, back-to-top anchor, and footer element using their configured region names. Preserve the target file's existing line ending.

Run:

```bash
python -B scripts/render_shared_site.py --write
python -B scripts/render_shared_site.py --check
```

Expected: first command may report the four configured pages only as needed to normalize generated regions; second command exits 0 with no DRIFT lines.

- [ ] **Step 7: Run Task 1 GREEN gates**

```bash
python -B -m unittest tests.test_shared_site -v
python -B -m unittest discover -s tests -p "test_*.py"
python -B scripts/render_shared_site.py --check
python -B scripts/audit_repository.py
git diff --check
```

Expected repository audit remains exactly:

```text
KNOWN      65 baseline violations
EXEMPTED   0 active policy exceptions
NEW        0
RESOLVED   0
GROWTH     0
Result: PASS
```

Task 1 must not reduce or grow debt.

- [ ] **Step 8: Commit Task 1 remotely**

Commit only Task 1 files:

```bash
git add _site_components scripts/render_shared_site.py tests/test_shared_site.py   index.html publicacoes.html projetos.html politica-de-privacidade.html
git commit -m "feat: add deterministic shared site renderer"
```

Push/update only `block2-shared-site-architecture-implementation`.

- [ ] **Step 9: Mandatory user-local Task 1 gate**

The user runs after pulling the remote commit:

```bash
python -B -m unittest tests.test_shared_site -v
python -B -m unittest discover -s tests -p "test_*.py"
python -B scripts/render_shared_site.py --check
python -B scripts/audit_repository.py
python -m compileall scripts tests
find scripts tests -type d -name '__pycache__' -prune -exec rm -rf {} +
git diff --check origin/main...HEAD
git status --short
```

Expected: all tests pass; renderer check exits 0; audit remains KNOWN 65 with zero NEW/RESOLVED/GROWTH; diff check clean; final status empty.

**STOP. Do not begin Task 2 until the user returns this gate and it passes.**

---

### Task 2: Semantic controls and visual CSS equivalence

**Files:**
- Modify: `_site_components/back-to-top.html`
- Modify: `_site_components/language-switcher.html`
- Modify: `_site_components/footer.html`
- Modify: `index.html`
- Modify: `publicacoes.html`
- Modify: `projetos.html`
- Modify: `politica-de-privacidade.html`
- Modify: `style.css`
- Modify: `tests/test_shared_site.py`

**Interfaces:**
- Consumes: Task 1 renderer, component markers, and unchanged existing JS selectors.
- Produces: zero `HTML_ACTION_HASH_LINK`; zero `HTML_BUTTON_MISSING_TYPE`; real `#page-top` target on all four interactive pages; current raw debt reduced from 65 to exactly 31 while the committed baseline intentionally remains 65 until Task 4.

- [ ] **Step 1: Write failing production semantic-control tests**

Add to `tests/test_shared_site.py`:

```python
from repository_audit import html_rules


class TestProductionSemanticControls(unittest.TestCase):
    def test_block2_html_control_rules_are_clean(self):
        violations = html_rules.audit_html_structure(ROOT)
        blocked = {
            "HTML_ACTION_HASH_LINK",
            "HTML_BUTTON_MISSING_TYPE",
        }
        remaining = [v for v in violations if v.rule_id in blocked]
        self.assertEqual(remaining, [])

    def test_each_interactive_page_has_exactly_one_page_top(self):
        for name in (
            "index.html",
            "publicacoes.html",
            "projetos.html",
            "politica-de-privacidade.html",
        ):
            source = (ROOT / name).read_text(encoding="utf-8")
            document = html_rules.parse_html(name, source)
            page_top = [
                element
                for element in document.elements
                if element.attr("id") == "page-top"
            ]
            with self.subTest(name=name):
                self.assertEqual(len(page_top), 1)
                self.assertEqual(page_top[0].tag, "html")

    def test_migrated_action_hooks_are_preserved(self):
        source = (ROOT / "index.html").read_text(encoding="utf-8")
        document = html_rules.parse_html("index.html", source)
        cv_buttons = [
            e for e in document.elements
            if e.tag == "button" and e.attr("data-cv-type")
        ]
        self.assertEqual(len(cv_buttons), 4)
        self.assertEqual(
            {e.attr("data-cv-type") for e in cv_buttons},
            {"pro", "academic"},
        )
        ids = {e.attr("id"): e for e in document.elements if e.attr("id")}
        self.assertEqual(ids["copy-email-link"].tag, "button")
        self.assertEqual(ids["copy-email-link"].attr("type"), "button")
```

The first test also exercises Review Focus #4 because `HTML_INTERNAL_LINK_TARGET` must remain clean for `#page-top`.

Add a footer production assertion:

```python
def test_footer_copy_email_is_native_button_on_all_rendered_pages(self):
    for name in (
        "index.html",
        "publicacoes.html",
        "projetos.html",
        "politica-de-privacidade.html",
    ):
        document = html_rules.parse_html(
            name, (ROOT / name).read_text(encoding="utf-8")
        )
        element = next(
            e for e in document.elements if e.attr("id") == "copy-email-footer"
        )
        with self.subTest(name=name):
            self.assertEqual(element.tag, "button")
            self.assertEqual(element.attr("type"), "button")
```

- [ ] **Step 2: Run semantic tests RED**

```bash
python -B -m unittest tests.test_shared_site.TestProductionSemanticControls -v
```

Expected: failures because current action anchors and missing button types remain.

- [ ] **Step 3: Change shared controls semantically**

Update `back-to-top.html`:

```html
<a href="#page-top" class="back-to-top" data-key-aria-label="back-to-top-label">↑</a>
```

Update `language-switcher.html`:

```html
<button type="button" class="lang-switcher@@EXTRA_CLASSES@@" onclick="toggleLanguage()" data-key-title="change-lang-title">
    <span class="lang-pt active">PT</span> | <span class="lang-en">EN</span>
</button>
```

In `footer.html`, change only the opening and closing tags of `#copy-email-footer`. Replace the existing opening anchor tag with:

```html
<button type="button" id="copy-email-footer" class="footer-copy-email" title="Copiar e-mail" data-key-title="copy-email-title">
```

Replace its matching `</a>` with `</button>`. Leave every byte of the existing SVG/path and visible `wevertonufv@gmail.com` content between those tags unchanged.

Run:

```bash
python -B scripts/render_shared_site.py --write
```

- [ ] **Step 4: Change non-generated action controls in `index.html`**

Add `id="page-top"` to the existing root `<html lang="pt-BR">` element:

```html
<html id="page-top" lang="pt-BR">
```

Do the same on the three inner pages while preserving their existing `lang` attributes.

Convert all four existing `[data-cv-type]` anchors to `<button type="button">` while preserving:

- class list;
- `data-cv-type`;
- existing SVG;
- existing translated child span/text.

For `#copy-email-link`, replace only the existing opening anchor tag with:

```html
<button type="button" id="copy-email-link" class="contact-link">
```

and replace its matching `</a>` with `</button>`. Leave the existing SVG/path and `<span data-key="contact-email-text">Email</span>` content unchanged.

For every existing non-submit button missing a type, add `type="button"`. This includes:

- home fixed/navbar language switchers through the component;
- eight timeline detail toggles;
- home project clear/show-more;
- home publication clear/show-more;
- publications-page language switcher, publication clear, publication show-more;
- projects-page language switcher, project clear, project show-more;
- privacy-page language switcher.

Preserve the existing contact form button exactly as `type="submit"`.

Do not add `role="button"`, `tabindex`, or custom keyboard handlers.

- [ ] **Step 5: Add narrowly scoped CSS equivalence**

Do not add a global `button` reset.

Extend the current classes with semantic-button-specific declarations:

```css
button.cta-btn {
    font: inherit;
}

button.contact-link {
    width: 100%;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.footer-column ul li button.footer-copy-email {
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.footer-column ul li button.footer-copy-email:hover {
    color: var(--primary);
}

.footer-column ul li button.footer-copy-email svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}
```

Do not add `outline: none` or otherwise suppress native focus visibility. If existing selectors already provide one of these properties, merge rather than duplicate declarations.

- [ ] **Step 6: Render and run Task 2 GREEN**

```bash
python -B scripts/render_shared_site.py --write
python -B scripts/render_shared_site.py --check
python -B -m unittest tests.test_shared_site.TestProductionSemanticControls -v
python -B -m unittest discover -s tests -p "test_*.py"
```

Expected: semantic-control tests clean.

- [ ] **Step 7: Verify the intermediate debt is exactly 31**

Do not modify `.audit/known-debt.json` yet.

```bash
rm -f .audit/current-task2.json
python -B scripts/audit_repository.py --emit-current-debt .audit/current-task2.json

python -B - <<'PY'
import json
from collections import Counter
from pathlib import Path

path = Path(".audit/current-task2.json")
data = json.loads(path.read_text(encoding="utf-8"))
counts = Counter(item["rule_id"] for item in data["entries"])
expected = {
    "A11Y_REDUCED_MOTION_POLICY": 1,
    "BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE": 1,
    "I18N_FIXED_ARIA_LABEL": 19,
    "I18N_REFERENCE_MISSING": 1,
    "LEGACY_MAXIMIZED_REFERENCE": 2,
    "SECURITY_CSP_POLICY": 5,
    "SECURITY_EXTERNAL_SCRIPT_INTEGRITY": 2,
}
assert counts == expected, (counts, expected)
assert len(data["entries"]) == 31
print("Task 2 current debt verified: 31")
PY

rm -f .audit/current-task2.json
```

Normal `python scripts/audit_repository.py` is intentionally not a PASS gate in Task 2 because the committed 65-entry baseline still contains 34 now-resolved entries.

- [ ] **Step 8: Automated local site smoke test before commit**

```bash
python -B -m http.server 8000 >/tmp/block2-task2-http.log 2>&1 &
SERVER_PID=$!
sleep 2
for path in / /publicacoes.html /projetos.html /politica-de-privacidade.html /404.html
do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000docs/superpowers/plans/2026-09-24-shared-site-architecture.md")
  echo "$code  $path"
done
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null || true
```

Expected: five HTTP 200 responses.

- [ ] **Step 9: Commit Task 2 remotely**

```bash
git add _site_components/back-to-top.html   _site_components/language-switcher.html   _site_components/footer.html   index.html publicacoes.html projetos.html politica-de-privacidade.html   style.css tests/test_shared_site.py
git commit -m "fix: normalize shared site controls"
```

- [ ] **Step 10: Mandatory user-local Task 2 gate, including visual/interaction matrix**

Automated gate:

```bash
python -B -m unittest tests.test_shared_site -v
python -B -m unittest discover -s tests -p "test_*.py"
python -B scripts/render_shared_site.py --check

rm -f .audit/current-task2.json
python -B scripts/audit_repository.py --emit-current-debt .audit/current-task2.json
python -B - <<'PY'
import json
from collections import Counter
data = json.load(open(".audit/current-task2.json", encoding="utf-8"))
counts = Counter(x["rule_id"] for x in data["entries"])
assert len(data["entries"]) == 31, counts
assert counts.get("HTML_ACTION_HASH_LINK", 0) == 0
assert counts.get("HTML_BUTTON_MISSING_TYPE", 0) == 0
print("semantic debt removed; current debt = 31")
PY
rm -f .audit/current-task2.json

git diff --check origin/main...HEAD
git status --short
```

Then use the local browser at `http://localhost:8000` and explicitly validate:

- home desktop and mobile;
- all three inner pages desktop; at least one inner page mobile;
- PT↔EN on home and one inner page;
- back-to-top appears after scrolling and lands at the real top target;
- both CV buttons in hero and both CV actions in contact section still initiate the same generator behavior;
- contact `#copy-email-link` and footer email copy still work;
- timeline toggles, clear/show-more controls, publication controls, and contact-form submit remain functional;
- footer has privacy link on home/publications/projects and no privacy self-link or orphan `|` on privacy page;
- no unapproved change in spacing, typography, color, borders, icon alignment, cursor, hover, focus, or responsive layout.

**STOP. Do not begin Task 3 until the user confirms both automated and visual Task 2 gates.**

---

### Task 3: Accessibility and translation normalization

**Files:**
- Modify: `_site_components/footer.html`
- Modify: `index.html`
- Modify: `translations.json`
- Modify: `tests/test_shared_site.py`
- Rendered by Task 1 script: `publicacoes.html`, `projetos.html`, `politica-de-privacidade.html`

**Interfaces:**
- Consumes: Task 1 canonical footer and renderer; existing `audit_repository_data` i18n/accessibility rules.
- Produces: zero `I18N_FIXED_ARIA_LABEL`; zero `I18N_REFERENCE_MISSING`; raw current debt exactly 11 while committed baseline remains 65 until Task 4.

- [ ] **Step 1: Write failing accessibility/i18n production tests**

Add to `tests/test_shared_site.py`:

```python
from repository_audit import data_rules


class TestProductionAccessibilityI18n(unittest.TestCase):
    def test_block2_i18n_accessibility_rules_are_clean(self):
        violations = data_rules.audit_repository_data(ROOT)
        blocked = {
            "I18N_FIXED_ARIA_LABEL",
            "I18N_REFERENCE_MISSING",
        }
        remaining = [v for v in violations if v.rule_id in blocked]
        self.assertEqual(remaining, [])

    def test_decorative_shared_profile_icons_are_hidden(self):
        for name in (
            "index.html",
            "publicacoes.html",
            "projetos.html",
            "politica-de-privacidade.html",
        ):
            source = (ROOT / name).read_text(encoding="utf-8")
            document = html_rules.parse_html(name, source)
            icons = [
                e for e in document.elements
                if e.tag == "span"
                and (e.attr("class") or "").find("icon-img") >= 0
                and (
                    (e.attr("class") or "").find("icon-licae") >= 0
                    or (e.attr("class") or "").find("icon-conectagem") >= 0
                )
            ]
            with self.subTest(name=name):
                self.assertEqual(len(icons), 2)
                self.assertTrue(all(e.attr("aria-hidden") == "true" for e in icons))
                self.assertTrue(all(e.attr("aria-label") is None for e in icons))
```

Also assert `translations.json` contains the exact approved PT/EN strings for `privacy-services-p2`.

- [ ] **Step 2: Run Task 3 tests RED**

```bash
python -B -m unittest tests.test_shared_site.TestProductionAccessibilityI18n -v
```

Expected: failures from 19 fixed ARIA labels and the missing translation key.

- [ ] **Step 3: Normalize decorative accessibility in `index.html`**

For each of the six expertise emoji spans and three service emoji spans, change attributes only: keep `class="icon"` and the existing emoji text node, remove `role="img"` and the fixed `aria-label`, and add `aria-hidden="true"`.

For LICAE and Conecta GEM feature-logo wrappers, preserve all visible/image markup but change the wrapper to:

```html
<div class="feature-logo" aria-hidden="true">
```

Remove the wrapper `role="img"` and `aria-label`.

Do not change visible headings/text or image files.

- [ ] **Step 4: Normalize decorative footer profile icons canonically**

In `_site_components/footer.html`, change the two icon spans to:

```html
<span class="icon-img icon-licae" aria-hidden="true"></span>
<span class="icon-img icon-conectagem" aria-hidden="true"></span>
```

The adjacent visible link text remains `LICAE/UFV` and `Conecta GEM`.

Run:

```bash
python -B scripts/render_shared_site.py --write
```

This propagates the canonical footer change to all four configured pages.

- [ ] **Step 5: Add the missing bilingual translation**

In `translations.json`, add the same key to both language objects:

```json
"privacy-services-p2": "Recomendo que você revise as políticas de privacidade desses serviços para entender como eles tratam suas informações."
```

for `pt`, and:

```json
"privacy-services-p2": "I recommend that you review the privacy policies of these services to understand how they handle your information."
```

for `en`.

Preserve all other keys and values exactly.

- [ ] **Step 6: Run Task 3 GREEN**

```bash
python -B scripts/render_shared_site.py --check
python -B -m unittest tests.test_shared_site.TestProductionAccessibilityI18n -v
python -B -m unittest discover -s tests -p "test_*.py"
```

- [ ] **Step 7: Verify current raw debt is exactly 11**

```bash
rm -f .audit/current-task3.json
python -B scripts/audit_repository.py --emit-current-debt .audit/current-task3.json

python -B - <<'PY'
import json
from collections import Counter

data = json.load(open(".audit/current-task3.json", encoding="utf-8"))
counts = Counter(x["rule_id"] for x in data["entries"])
expected = {
    "A11Y_REDUCED_MOTION_POLICY": 1,
    "BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE": 1,
    "LEGACY_MAXIMIZED_REFERENCE": 2,
    "SECURITY_CSP_POLICY": 5,
    "SECURITY_EXTERNAL_SCRIPT_INTEGRITY": 2,
}
assert counts == expected, (counts, expected)
assert len(data["entries"]) == 11
print("Task 3 current debt verified: 11")
PY

rm -f .audit/current-task3.json
```

Also verify the four removed Block 2 rule IDs have zero current findings.

- [ ] **Step 8: Commit Task 3 remotely**

```bash
git add _site_components/footer.html   index.html publicacoes.html projetos.html politica-de-privacidade.html   translations.json tests/test_shared_site.py
git commit -m "fix: normalize shared accessibility and translations"
```

- [ ] **Step 9: Mandatory user-local Task 3 gate**

```bash
python -B -m unittest tests.test_shared_site -v
python -B -m unittest discover -s tests -p "test_*.py"
python -B scripts/render_shared_site.py --check

rm -f .audit/current-task3.json
python -B scripts/audit_repository.py --emit-current-debt .audit/current-task3.json
python -B - <<'PY'
import json
from collections import Counter
data = json.load(open(".audit/current-task3.json", encoding="utf-8"))
counts = Counter(x["rule_id"] for x in data["entries"])
assert len(data["entries"]) == 11, counts
for rule in (
    "HTML_ACTION_HASH_LINK",
    "HTML_BUTTON_MISSING_TYPE",
    "I18N_FIXED_ARIA_LABEL",
    "I18N_REFERENCE_MISSING",
):
    assert counts.get(rule, 0) == 0, (rule, counts)
print("Block 2 owned debt is zero; current debt = 11")
PY
rm -f .audit/current-task3.json

git diff --check origin/main...HEAD
git status --short
```

Run the five-page HTTP 200 smoke test again. No visual change is expected from Task 3; inspect home and footer once to confirm decorative-icon changes did not affect rendering.

**STOP. Do not begin Task 4 until the user returns this gate and it passes.**

---

### Task 4: Baseline ratchet and CI render enforcement

**Files:**
- Modify: `.audit/known-debt.json`
- Modify: `.github/workflows/repository-audit.yml`
- Modify: `tests/test_audit_workflow.py`

**Interfaces:**
- Consumes: Task 3 current raw violation set of exactly 11; Block 1 65-entry `main` baseline; Task 1 `render_shared_site.py --check`.
- Produces: candidate baseline of exactly 11 identities; CI runs renderer check after unit tests and before reference-baseline audit; normal repository audit returns PASS with KNOWN 11.

- [ ] **Step 1: Write the failing workflow contract test**

Modify `tests/test_audit_workflow.py` so the required literals include:

```python
"Run shared site render check",
"python -B scripts/render_shared_site.py --check",
```

Also assert ordering by source index:

```python
self.assertLess(
    source.index("Run unit tests"),
    source.index("Run shared site render check"),
)
self.assertLess(
    source.index("Run shared site render check"),
    source.index("Resolve reference baseline"),
)
```

- [ ] **Step 2: Run workflow test RED**

```bash
python -B -m unittest tests.test_audit_workflow.TestWorkflowContract -v
```

Expected: failure because the workflow does not yet contain the render-check step.

- [ ] **Step 3: Add render enforcement inside the existing required `audit` job**

Insert immediately after `Run unit tests`:

```yaml
      - name: Run shared site render check
        run: python -B scripts/render_shared_site.py --check
```

Do not create a new GitHub status context. The required status remains `Repository audit / audit`.

- [ ] **Step 4: Regenerate the 11-entry candidate baseline to a temporary file**

```bash
rm -f .audit/known-debt.block2.json
python -B scripts/audit_repository.py   --emit-current-debt .audit/known-debt.block2.json
```

Verify exact counts:

```bash
python -B - <<'PY'
import json
from collections import Counter

candidate = json.load(open(".audit/known-debt.block2.json", encoding="utf-8"))
counts = Counter(x["rule_id"] for x in candidate["entries"])
expected = {
    "A11Y_REDUCED_MOTION_POLICY": 1,
    "BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE": 1,
    "LEGACY_MAXIMIZED_REFERENCE": 2,
    "SECURITY_CSP_POLICY": 5,
    "SECURITY_EXTERNAL_SCRIPT_INTEGRITY": 2,
}
assert counts == expected, (counts, expected)
assert len(candidate["entries"]) == 11
print("candidate baseline count: 11")
PY
```

- [ ] **Step 5: Verify exact retained fingerprint identity against `main`**

Materialize the protected reference baseline without modifying tracked files:

```bash
git show origin/main:.audit/known-debt.json > .audit/reference-main-65.json
```

Then compare exact identity/fingerprint tuples:

```bash
python -B - <<'PY'
import json

ref = json.load(open(".audit/reference-main-65.json", encoding="utf-8"))
cand = json.load(open(".audit/known-debt.block2.json", encoding="utf-8"))

ref_by_fp = {x["fingerprint"]: x for x in ref["entries"]}
assert len(ref["entries"]) == 65
assert len(cand["entries"]) == 11

for item in cand["entries"]:
    fp = item["fingerprint"]
    assert fp in ref_by_fp, item
    old = ref_by_fp[fp]
    assert (
        item["rule_id"],
        item["path"],
        item["subject"],
    ) == (
        old["rule_id"],
        old["path"],
        old["subject"],
    ), (item, old)

removed_owned = {
    "HTML_ACTION_HASH_LINK",
    "HTML_BUTTON_MISSING_TYPE",
    "I18N_FIXED_ARIA_LABEL",
    "I18N_REFERENCE_MISSING",
}
assert not any(x["rule_id"] in removed_owned for x in cand["entries"])
print("retained fingerprint identity: 11/11 exact subset of main")
PY
```

This is the Review Focus #5 gate. Count-only equality is not sufficient.

- [ ] **Step 6: Promote the candidate baseline and verify reference-aware PASS**

```bash
mv .audit/known-debt.block2.json .audit/known-debt.json

python -B scripts/audit_repository.py
python -B scripts/audit_repository.py   --reference-baseline .audit/reference-main-65.json

rm -f .audit/reference-main-65.json
```

Both audit runs must report:

```text
KNOWN      11 baseline violations
EXEMPTED   0 active policy exceptions
NEW        0
RESOLVED   0
GROWTH     0
Result: PASS
```

The reference-aware run proves 65 → 11 is a monotonic reduction and not candidate-baseline growth.

Confirm policy remains zero exceptions:

```bash
python -B - <<'PY'
import json
data = json.load(open(".audit/policy.json", encoding="utf-8"))
assert data == {"schema_version": 1, "exceptions": []}, data
print("policy exceptions: 0")
PY
```

- [ ] **Step 7: Run complete Task 4 GREEN gates**

```bash
python -B -m unittest tests.test_audit_workflow.TestWorkflowContract -v
python -B -m unittest discover -s tests -p "test_*.py"
python -B scripts/render_shared_site.py --check
python -B scripts/audit_repository.py
python -m compileall scripts tests
find scripts tests -type d -name '__pycache__' -prune -exec rm -rf {} +
git diff --check
git status --short
```

Expected: green tests; renderer synchronized; audit PASS with 11; no temp files or pycache.

- [ ] **Step 8: Commit Task 4 remotely**

```bash
git add .audit/known-debt.json   .github/workflows/repository-audit.yml   tests/test_audit_workflow.py
git commit -m "ci: ratchet shared site structural debt"
```

- [ ] **Step 9: Mandatory user-local Task 4 gate**

After pulling the remote commit:

```bash
python -B -m unittest discover -s tests -p "test_*.py"
python -B scripts/render_shared_site.py --check
python -B scripts/audit_repository.py

git show origin/main:.audit/known-debt.json > .audit/reference-main-65.json
python -B scripts/audit_repository.py   --reference-baseline .audit/reference-main-65.json
rm -f .audit/reference-main-65.json

python -m compileall scripts tests
find scripts tests -type d -name '__pycache__' -prune -exec rm -rf {} +
git diff --check origin/main...HEAD
git status --short
```

Expected: both audits PASS with KNOWN 11 / EXEMPTED 0 / NEW 0 / RESOLVED 0 / GROWTH 0; clean status.

**STOP. Do not begin Task 5 until the user returns this gate and it passes.**

---

### Task 5: Whole-branch review, local acceptance, and PR CI proof

**Files:**
- No planned production changes.
- Any Critical/Important review finding must first add a failing regression test to the owning Task 1–4 test file, then apply the minimum fix in the same branch.
- Documentation changes are permitted only if the review exposes a real contradiction in the already-approved contract.

**Interfaces:**
- Consumes: completed Tasks 1–4.
- Produces: independently reviewed implementation branch, complete local acceptance evidence, and a PR whose required `Repository audit / audit` check proves reference-baseline monotonicity against `main`'s 65 entries.

- [ ] **Step 1: Invoke whole-branch code review**

Use the requesting-code-review process against:

```text
base: main
head: block2-shared-site-architecture-implementation
```

Review specifically for:

- renderer path/marker/token escape bugs;
- partial writes or EOL normalization;
- duplicated/shared markup reintroduced outside `_site_components`;
- selector/behavior regressions caused by anchor→button migration;
- CSS broadening beyond the narrowly scoped equivalence contract;
- accidental factual/content changes;
- baseline identity substitution;
- CI ordering/reference-baseline regressions.

Any Critical/Important finding requires RED → GREEN regression evidence before a fix is committed.

- [ ] **Step 2: Verify the final expected file set**

Run:

```bash
git diff --name-only origin/main...HEAD
```

Expected implementation files are restricted to:

```text
.audit/known-debt.json
.github/workflows/repository-audit.yml
_site_components/back-to-top.html
_site_components/footer-privacy-segment.html
_site_components/footer.html
_site_components/language-switcher.html
_site_components/nav-home.html
_site_components/nav-inner.html
docs/superpowers/plans/2026-09-24-shared-site-architecture.md
docs/superpowers/specs/2026-09-24-shared-site-architecture-design.md
index.html
politica-de-privacidade.html
projetos.html
publicacoes.html
scripts/render_shared_site.py
style.css
tests/test_audit_workflow.py
tests/test_shared_site.py
translations.json
```

`utils.js`, `404.html`, academic datasets, `.audit/policy.json`, and repository-audit detector code must not appear unless a whole-branch review found a directly evidenced Block 2 bug and a regression test justifies the change.

- [ ] **Step 3: Run the complete automated acceptance gate**

```bash
python -B -m unittest discover -s tests -p "test_*.py"
python -B scripts/render_shared_site.py --check
python -B scripts/audit_repository.py

git show origin/main:.audit/known-debt.json > .audit/reference-main-65.json
python -B scripts/audit_repository.py   --reference-baseline .audit/reference-main-65.json
rm -f .audit/reference-main-65.json

python -m compileall scripts tests
find scripts tests -type d -name '__pycache__' -prune -exec rm -rf {} +

git diff --check origin/main...HEAD
git status --short
```

Required audit result, both normal and reference-aware:

```text
KNOWN      11 baseline violations
EXEMPTED   0 active policy exceptions
NEW        0
RESOLVED   0
GROWTH     0
Result: PASS
```

- [ ] **Step 4: Verify exact final debt distribution**

```bash
python -B - <<'PY'
import json
from collections import Counter

data = json.load(open(".audit/known-debt.json", encoding="utf-8"))
counts = Counter(x["rule_id"] for x in data["entries"])
expected = {
    "A11Y_REDUCED_MOTION_POLICY": 1,
    "BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE": 1,
    "LEGACY_MAXIMIZED_REFERENCE": 2,
    "SECURITY_CSP_POLICY": 5,
    "SECURITY_EXTERNAL_SCRIPT_INTEGRITY": 2,
}
assert counts == expected, (counts, expected)
assert len(data["entries"]) == 11
print("Block 2 baseline verified: 11")
PY
```

- [ ] **Step 5: Run five-page local HTTP validation**

```bash
python -B -m http.server 8000 >/tmp/block2-final-http.log 2>&1 &
SERVER_PID=$!
sleep 2

for path in / /publicacoes.html /projetos.html /politica-de-privacidade.html /404.html
do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000docs/superpowers/plans/2026-09-24-shared-site-architecture.md")
  echo "$code  $path"
done

kill $SERVER_PID
wait $SERVER_PID 2>/dev/null || true
```

Expected: five HTTP 200 responses.

- [ ] **Step 6: Complete the final visual/interaction acceptance matrix**

With the local server running, validate and record:

1. home desktop;
2. home mobile;
3. publications desktop;
4. projects desktop;
5. privacy desktop;
6. one inner page mobile;
7. PT↔EN on home and one inner page;
8. back-to-top visibility/navigation;
9. four CV actions;
10. contact email copy;
11. footer email copy on all rendered page types;
12. timeline toggles;
13. project/publication clear and show-more controls;
14. contact-form submit semantics;
15. privacy link present on non-privacy pages;
16. privacy self-link and orphan separator absent on privacy page;
17. focus, hover, cursor, spacing, typography, icon alignment, borders, colors, and responsive layout unchanged.

Any discrepancy is a failure, not a cosmetic follow-up.

- [ ] **Step 7: Mandatory user-local final Block 2 gate**

The user repeats Steps 3–6 locally after pulling the final review commit. The implementation branch remains frozen until the user confirms:

- complete suite green;
- renderer check green;
- normal/reference audit both PASS at 11;
- five HTTP 200;
- visual/interaction matrix accepted;
- `git diff --check` clean;
- working tree clean.

- [ ] **Step 8: Open the implementation PR only after local acceptance**

Open:

```text
block2-shared-site-architecture-implementation → main
```

The PR description must state:

- Block 2 removes exactly 54 known violations;
- candidate baseline is 11;
- policy exceptions remain 0;
- shared chrome is canonical and render-checked;
- no `utils.js` refactor or Blocks 3–5 hardening is included.

- [ ] **Step 9: Prove the real protected CI uses the 65-entry reference**

On the PR's real `Repository audit / audit` workflow:

- `Run unit tests` must succeed;
- `Run shared site render check` must succeed;
- `Resolve reference baseline` must succeed;
- `Audit with reference` must **run and succeed**;
- `Audit bootstrap genesis` must be **skipped**.

This PR is the first post-bootstrap proof that the protected quality gate accepts a monotonic baseline reduction against a `main` commit that already contains `.audit/known-debt.json`.

Do not merge the PR until this CI state has been inspected and the user explicitly authorizes the integration step.

---

## Final Whole-Branch Review Checklist

1. Shared nav/footer/language/back-to-top markup has one canonical editable source; root-page copies are generated artifacts guarded by `--check`.
2. Renderer markers are complete, unique, non-overlapping, and limited to the configured page/region set.
3. Renderer rejects BOM, mixed EOL, missing components, malformed markers, unknown/unresolved tokens, and invalid CLI mode combinations.
4. Renderer validates every target before writing any target, and each actual file replacement is safe.
5. CRLF/LF target styles are preserved exactly and bytes outside generated regions remain unchanged.
6. `404.html` is not rendered and remains unchanged.
7. No shared HTML fragment is hidden as a Python string; footer privacy markup lives in `footer-privacy-segment.html`.
8. All 13 bare-hash actions are removed semantically, not suppressed by policy.
9. All 21 missing button types are removed; the contact form remains `type="submit"`.
10. Native buttons preserve selector hooks, keyboard behavior, accessible names, focus visibility, cursor, and visual layout.
11. All four interactive pages have exactly one valid `#page-top` target.
12. All 19 fixed decorative ARIA labels are removed with correct `aria-hidden="true"` treatment.
13. `privacy-services-p2` exists in PT and EN with translation parity intact.
14. The final baseline contains exactly 11 entries, each an exact fingerprint subset of `main`'s 65-entry baseline.
15. `.audit/policy.json` remains unchanged with zero exceptions.
16. CI runs the shared-site render check inside the existing required `audit` job before reference-baseline auditing.
17. Normal and reference-aware local audits both PASS with KNOWN 11 and zero EXEMPTED/NEW/RESOLVED/GROWTH.
18. No deferred Block 3/4/5 issue is silently changed: bibliometric duplicate, `maximized`, reduced motion, CSP, and SRI remain exactly the 11 intentional residual entries.
19. No factual content or `utils.js` architecture change entered the branch.
20. Final user-local browser/HTTP validation passes before PR creation.

## Execution Handoff

The five tasks are sequential because Task 2 and Task 3 mutate canonical components introduced by Task 1, while Task 4 can only ratchet the baseline after Task 3 proves the exact 11-entry raw set. A shipped renderer or semantic-control regression would affect all four interactive pages, so task-by-task local gates are mandatory.

Implementation must not begin until this plan is reviewed and explicitly approved.
