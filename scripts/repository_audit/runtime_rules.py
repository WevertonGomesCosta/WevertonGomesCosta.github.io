from __future__ import annotations

import base64
import binascii
from pathlib import Path
import re
from urllib.parse import urlsplit

from .core import Violation
from .html_rules import discover_audited_html, parse_html

MAXIMIZED_PATTERNS = (
    (
        "processPlatformData:maximized",
        re.compile(r"processPlatformData\s*\([^\n;]*['\"]maximized['\"]"),
    ),
    (
        "property:acad.maximized",
        re.compile(r"\bacad\.maximized\b"),
    ),
)

_CSS_REDUCED_MOTION = re.compile(
    r"@media\s*\([^)]*prefers-reduced-motion\s*:\s*reduce[^)]*\)",
    re.IGNORECASE,
)
_JS_REDUCED_MOTION = re.compile(
    r"\bmatchMedia\s*\([^)]*prefers-reduced-motion\s*:\s*reduce[^)]*\)",
    re.IGNORECASE,
)
_SRI_TOKEN = re.compile(r"^(sha256|sha384|sha512)-([A-Za-z0-9+/]+={0,2})$")


def strip_c_style_comments(source: str) -> str:
    NORMAL = "normal"
    SINGLE_QUOTE = "single"
    DOUBLE_QUOTE = "double"
    TEMPLATE_QUOTE = "template"
    LINE_COMMENT = "line_comment"
    BLOCK_COMMENT = "block_comment"

    state = NORMAL
    out: list[str] = []
    i = 0
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ""

        if state == NORMAL:
            if ch == "'":
                state = SINGLE_QUOTE
                out.append(ch)
            elif ch == '"':
                state = DOUBLE_QUOTE
                out.append(ch)
            elif ch == "`":
                state = TEMPLATE_QUOTE
                out.append(ch)
            elif ch == "/" and nxt == "/":
                state = LINE_COMMENT
                out.extend((" ", " "))
                i += 1
            elif ch == "/" and nxt == "*":
                state = BLOCK_COMMENT
                out.extend((" ", " "))
                i += 1
            else:
                out.append(ch)
        elif state in {SINGLE_QUOTE, DOUBLE_QUOTE, TEMPLATE_QUOTE}:
            out.append(ch)
            quote = {
                SINGLE_QUOTE: "'",
                DOUBLE_QUOTE: '"',
                TEMPLATE_QUOTE: "`",
            }[state]
            if ch == "\\" and i + 1 < len(source):
                out.append(source[i + 1])
                i += 1
            elif ch == quote:
                state = NORMAL
        elif state == LINE_COMMENT:
            if ch == "\n":
                out.append("\n")
                state = NORMAL
            else:
                out.append(" ")
        elif state == BLOCK_COMMENT:
            if ch == "*" and nxt == "/":
                out.extend((" ", " "))
                i += 1
                state = NORMAL
            elif ch == "\n":
                out.append("\n")
            else:
                out.append(" ")
        i += 1

    return "".join(out)


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        return ""


def _valid_sri(integrity: str | None) -> bool:
    if not integrity:
        return False
    for token in integrity.split():
        match = _SRI_TOKEN.fullmatch(token)
        if not match:
            continue
        digest = match.group(2)
        try:
            base64.b64decode(digest, validate=True)
        except (binascii.Error, ValueError):
            continue
        return True
    return False


def _csp_is_valid(document) -> bool:
    for element in document.elements:
        if element.tag != "meta":
            continue
        equiv = element.attr("http-equiv")
        if not equiv or equiv.strip().lower() != "content-security-policy":
            continue
        content = element.attr("content")
        if not content or not content.strip():
            continue
        directives: dict[str, list[str]] = {}
        for raw in content.split(";"):
            parts = raw.strip().split()
            if not parts:
                continue
            directives[parts[0].lower()] = parts[1:]
        if directives.get("default-src") and directives.get("script-src"):
            return True
    return False


def _runtime_html_violations(root: Path) -> list[Violation]:
    violations: list[Violation] = []
    for relative in discover_audited_html(root):
        path = root / relative
        source = _read_text(path)
        if not source and not path.is_file():
            continue
        document = parse_html(relative, source)

        if not _csp_is_valid(document):
            violations.append(
                Violation(
                    "SECURITY_CSP_POLICY",
                    relative,
                    "document:csp-meta",
                    "Audited HTML page is missing a CSP meta with non-empty default-src and script-src",
                )
            )

        seen_external: set[str] = set()
        for element in document.elements:
            if element.tag != "script":
                continue
            src = element.attr("src")
            if not src:
                continue
            parsed = urlsplit(src)
            external = parsed.scheme.lower() in {"http", "https"} or bool(parsed.netloc)
            if not external or src in seen_external:
                continue
            seen_external.add(src)
            crossorigin = element.attr("crossorigin")
            if not _valid_sri(element.attr("integrity")) or (
                crossorigin is None or crossorigin.strip().lower() != "anonymous"
            ):
                violations.append(
                    Violation(
                        "SECURITY_EXTERNAL_SCRIPT_INTEGRITY",
                        relative,
                        src,
                        "External script requires syntactically valid SRI and crossorigin=\"anonymous\"",
                        line=element.line,
                    )
                )
    return violations


def audit_runtime_policy(root: Path) -> list[Violation]:
    root = root.resolve()
    violations: list[Violation] = []

    stripped_js_by_path: dict[str, str] = {}
    for path in sorted(root.glob("*.js")):
        if not path.is_file():
            continue
        relative = path.name
        stripped = strip_c_style_comments(_read_text(path))
        stripped_js_by_path[relative] = stripped
        for subject, pattern in MAXIMIZED_PATTERNS:
            if pattern.search(stripped):
                violations.append(
                    Violation(
                        "LEGACY_MAXIMIZED_REFERENCE",
                        relative,
                        subject,
                        f"Active legacy runtime reference detected: {subject}",
                    )
                )

    css_source = strip_c_style_comments(_read_text(root / "style.css"))
    has_css_policy = bool(_CSS_REDUCED_MOTION.search(css_source))
    has_js_policy = any(
        _JS_REDUCED_MOTION.search(source) is not None
        for source in stripped_js_by_path.values()
    )
    if not (has_css_policy and has_js_policy):
        violations.append(
            Violation(
                "A11Y_REDUCED_MOTION_POLICY",
                "style.css",
                "site:prefers-reduced-motion",
                "Reduced-motion policy requires active CSS @media handling and JavaScript matchMedia detection",
            )
        )

    violations.extend(_runtime_html_violations(root))
    return sorted(
        violations,
        key=lambda item: (item.rule_id, item.path, item.subject),
    )
