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
MARKER_RE = re.compile(r"<!-- shared:([a-z0-9-]+):(start|end) -->")


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
    if component and ("{{" in text or "{%" in text):
        raise RenderContractError(
            f"Liquid/Jekyll syntax is not allowed in component: {path}"
        )
    return text


def detect_newline(text: str, path: Path) -> str:
    crlf = text.count("\r\n")
    without_crlf = text.replace("\r\n", "")
    bare_lf = without_crlf.count("\n")
    bare_cr = without_crlf.count("\r")
    if bare_cr or (crlf and bare_lf):
        raise RenderContractError(f"Mixed/invalid line endings: {path}")
    return "\r\n" if crlf else "\n"


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
            value_lines = value.split("\n") if value else [""]
            output.append(
                "\n".join(
                    (indent + item) if item else ""
                    for item in value_lines
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
        raise RenderContractError(f"Unresolved token remains: {source_name}")
    return rendered


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
        raise RenderContractError(f"Missing end marker for {active!r}: {path}")

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
    try:
        start = source.index(start_marker)
        end = source.index(end_marker, start + len(start_marker))
    except ValueError as exc:
        raise RenderContractError(
            f"Missing marker for {region!r}: {path}"
        ) from exc

    start_line_start = source.rfind(newline, 0, start) + len(newline)
    start_indent = source[start_line_start:start]
    if start_indent.strip():
        raise RenderContractError(
            f"Start marker is not line-aligned for {region!r}: {path}"
        )
    after_start = start + len(start_marker)
    if not source.startswith(newline, after_start):
        raise RenderContractError(
            f"Start marker must end its line for {region!r}: {path}"
        )

    end_line_start = source.rfind(newline, after_start, end) + len(newline)
    end_indent = source[end_line_start:end]
    if end_indent != start_indent:
        raise RenderContractError(
            f"Marker indentation mismatch for {region!r}: {path}"
        )

    fragment = rendered_fragment.rstrip("\n")
    if "\r" in fragment:
        raise RenderContractError(
            f"Rendered component contains CR characters: {region}"
        )
    indented_fragment = "\n".join(
        (start_indent + line) if line else ""
        for line in fragment.split("\n")
    )
    indented_fragment = indented_fragment.replace("\n", newline)

    return (
        source[:after_start]
        + newline
        + indented_fragment
        + newline
        + end_indent
        + source[end:]
    )


def _component(root: Path, name: str) -> str:
    return read_utf8_strict(root / "_site_components" / name, component=True)


def render_language_switcher(root: Path, extra_classes: str) -> str:
    return render_template(
        _component(root, "language-switcher.html"),
        {"EXTRA_CLASSES": extra_classes},
        "language-switcher.html",
    )


def read_privacy_segment(root: Path) -> str:
    value = _component(root, "footer-privacy-segment.html")
    if value.endswith("\n"):
        value = value[:-1]
    if "\n" in value or "\r" in value:
        raise RenderContractError(
            "footer-privacy-segment.html must contain one logical line"
        )
    if value.endswith((" ", "\t")):
        raise RenderContractError(
            "footer-privacy-segment.html must not end in whitespace"
        )
    return value


def _render_fragments(root: Path, config: PageConfig) -> dict[str, str]:
    navbar_switcher = render_language_switcher(root, "")
    fragments: dict[str, str] = {
        "back-to-top": render_template(
            _component(root, "back-to-top.html"),
            {},
            "back-to-top.html",
        ),
    }

    if config.include_fixed_language:
        fragments["fixed-language"] = render_language_switcher(
            root, " lang-fixed"
        )

    if config.nav_variant == "home":
        fragments["nav"] = render_template(
            _component(root, "nav-home.html"),
            {"LANGUAGE_SWITCHER": navbar_switcher},
            "nav-home.html",
        )
    elif config.nav_variant == "inner":
        if config.nav_title_key is None or config.nav_title_fallback is None:
            raise RenderContractError(
                f"Inner nav title configuration missing: {config.path}"
            )
        fragments["nav"] = render_template(
            _component(root, "nav-inner.html"),
            {
                "NAV_TITLE_KEY": config.nav_title_key,
                "NAV_TITLE_TEXT": config.nav_title_fallback,
                "LANGUAGE_SWITCHER": navbar_switcher,
            },
            "nav-inner.html",
        )
    else:
        raise RenderContractError(
            f"Unknown nav variant {config.nav_variant!r}: {config.path}"
        )

    privacy_segment = ""
    if config.include_privacy_segment:
        privacy_segment = read_privacy_segment(root) + " "
    fragments["footer"] = render_template(
        _component(root, "footer.html"),
        {"PRIVACY_SEGMENT": privacy_segment},
        "footer.html",
    )
    return fragments


def render_page(root: Path, config: PageConfig) -> str:
    path = root / config.path
    source = read_utf8_strict(path)
    newline = detect_newline(source, path)
    validate_region_markers(source, config.regions, path)
    fragments = _render_fragments(root, config)
    if set(fragments) != set(config.regions):
        raise RenderContractError(
            f"Rendered regions do not match configuration for {config.path}: "
            f"{sorted(fragments)} != {sorted(config.regions)}"
        )
    rendered = source
    for region in config.regions:
        rendered = replace_region(
            rendered,
            region,
            fragments[region],
            newline,
            path,
        )
    return rendered


def render_all(root: Path) -> dict[Path, str]:
    root = root.resolve()
    rendered: dict[Path, str] = {}
    for config in PAGE_CONFIGS:
        rendered[root / config.path] = render_page(root, config)
    return rendered


def check_all(root: Path) -> tuple[Path, ...]:
    root = root.resolve()
    expected = render_all(root)
    drift: list[Path] = []
    for path, rendered in expected.items():
        current = read_utf8_strict(path)
        if current != rendered:
            drift.append(path)
    return tuple(drift)


def atomic_write_text(path: Path, text: str) -> None:
    payload = text.encode("utf-8")
    fd, temp_name = tempfile.mkstemp(
        dir=path.parent,
        prefix=f".{path.name}.",
        suffix=".tmp",
    )
    temp_path = Path(temp_name)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_path, path)
    finally:
        if temp_path.exists():
            temp_path.unlink()


def write_all(root: Path) -> tuple[Path, ...]:
    root = root.resolve()
    expected = render_all(root)
    changed: list[Path] = []
    for path, rendered in expected.items():
        if read_utf8_strict(path) != rendered:
            changed.append(path)
    for path in changed:
        atomic_write_text(path, expected[path])
    return tuple(changed)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root")
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)

    if args.write == args.check:
        print(
            "Shared-site render error: exactly one of --write/--check is required",
            file=sys.stderr,
        )
        return 2

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
