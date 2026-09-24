from __future__ import annotations

from dataclasses import dataclass, field
from html.parser import HTMLParser
from collections import Counter
from pathlib import Path, PurePosixPath
import posixpath
from typing import Iterable
from urllib.parse import unquote, urlsplit

from .core import AuditConfigError, Violation, normalize_repo_path


VOID_ELEMENTS = frozenset(
    {
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr",
    }
)


@dataclass(frozen=True)
class HtmlElement:
    tag: str
    attrs: tuple[tuple[str, str | None], ...]
    line: int
    dom_path: str

    def attr_values(self, name: str) -> tuple[str | None, ...]:
        target = name.lower()
        return tuple(value for key, value in self.attrs if key == target)

    def attr(self, name: str) -> str | None:
        values = self.attr_values(name)
        return values[0] if values else None


@dataclass(frozen=True)
class HtmlDocument:
    path: str
    elements: tuple[HtmlElement, ...]

    @property
    def ids(self) -> frozenset[str]:
        return frozenset(
            value
            for element in self.elements
            for value in element.attr_values("id")
            if value
        )


@dataclass
class _OpenElement:
    tag: str
    full_segments: tuple[str, ...]
    anchor_index: int
    child_tag_counts: dict[str, int] = field(default_factory=dict)


class _Collector(HTMLParser):
    def __init__(self, path: str) -> None:
        super().__init__(convert_charrefs=True)
        self.path = normalize_repo_path(path)
        self.elements: list[HtmlElement] = []
        self._stack: list[_OpenElement] = []
        self._root_tag_counts: dict[str, int] = {}

    def _next_index(self, tag: str) -> int:
        counts = (
            self._stack[-1].child_tag_counts
            if self._stack
            else self._root_tag_counts
        )
        counts[tag] = counts.get(tag, 0) + 1
        return counts[tag]

    @staticmethod
    def _first_id(attrs: Iterable[tuple[str, str | None]]) -> str | None:
        for key, value in attrs:
            if key == "id" and value:
                return value
        return None

    def _record(
        self,
        tag: str,
        attrs: list[tuple[str, str | None]],
        *,
        push: bool,
    ) -> None:
        tag = tag.lower()
        normalized_attrs = tuple((key.lower(), value) for key, value in attrs)
        sibling_index = self._next_index(tag)
        element_id = self._first_id(normalized_attrs)
        segment = (
            f"{tag}#{element_id}"
            if element_id
            else f"{tag}:nth-of-type({sibling_index})"
        )

        parent_segments = self._stack[-1].full_segments if self._stack else ()
        full_segments = parent_segments + (segment,)
        if element_id:
            anchor_index = len(full_segments) - 1
        elif self._stack:
            anchor_index = self._stack[-1].anchor_index
        else:
            anchor_index = 0

        dom_path = ">".join(full_segments[anchor_index:])
        self.elements.append(
            HtmlElement(
                tag=tag,
                attrs=normalized_attrs,
                line=self.getpos()[0],
                dom_path=dom_path,
            )
        )

        if push and tag not in VOID_ELEMENTS:
            self._stack.append(
                _OpenElement(
                    tag=tag,
                    full_segments=full_segments,
                    anchor_index=anchor_index,
                )
            )

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        self._record(tag, attrs, push=True)

    def handle_startendtag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        self._record(tag, attrs, push=False)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        for index in range(len(self._stack) - 1, -1, -1):
            if self._stack[index].tag == tag:
                del self._stack[index:]
                return


def discover_audited_html(root: Path) -> tuple[str, ...]:
    return tuple(
        sorted(path.name for path in root.glob("*.html") if path.is_file())
    )


def parse_html(path: str, source: str) -> HtmlDocument:
    collector = _Collector(path)
    collector.feed(source)
    collector.close()
    return HtmlDocument(path=collector.path, elements=tuple(collector.elements))


def element_subject(element: HtmlElement) -> str:
    return element.dom_path


def _violation(
    rule_id: str,
    document: HtmlDocument,
    subject: str,
    message: str,
    *,
    line: int | None = None,
) -> Violation:
    return Violation(
        rule_id=rule_id,
        path=document.path,
        subject=subject,
        message=message,
        line=line,
    )


def _load_document(root: Path, relative_path: str) -> HtmlDocument | None:
    target = root / PurePosixPath(relative_path)
    if not target.is_file():
        return None
    try:
        source = target.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        return None
    return parse_html(relative_path, source)


def _resolve_local_target(source_path: str, raw_path: str) -> str | None:
    decoded = unquote(raw_path).replace("\\", "/")
    if not decoded:
        return source_path

    trailing_slash = decoded.endswith("/")
    if decoded.startswith("/"):
        candidate = decoded.lstrip("/")
    else:
        candidate = (PurePosixPath(source_path).parent / decoded).as_posix()

    normalized = posixpath.normpath(candidate)
    if normalized == ".":
        normalized = ""
    if normalized == ".." or normalized.startswith("../") or normalized.startswith("/"):
        return None

    if trailing_slash:
        normalized = f"{normalized.rstrip('/')}/index.html" if normalized else "index.html"
    if not normalized:
        normalized = "index.html"

    try:
        return normalize_repo_path(normalized)
    except AuditConfigError:
        return None


def _anchor_href(element: HtmlElement) -> str | None:
    if element.tag != "a":
        return None
    return element.attr("href")


def _audit_document_structure(document: HtmlDocument) -> list[Violation]:
    violations: list[Violation] = []

    id_elements: dict[str, list[HtmlElement]] = {}
    for element in document.elements:
        for value in element.attr_values("id"):
            if value:
                id_elements.setdefault(value, []).append(element)
    for value, elements in id_elements.items():
        if len(elements) > 1:
            violations.append(
                _violation(
                    "HTML_DUPLICATE_ID",
                    document,
                    f"id:{value}",
                    f"Duplicate HTML id {value!r}",
                    line=elements[1].line,
                )
            )

    for element in document.elements:
        counts = Counter(name for name, _ in element.attrs)
        for name, count in counts.items():
            if count > 1:
                violations.append(
                    _violation(
                        "HTML_DUPLICATE_ATTRIBUTE",
                        document,
                        f"{element_subject(element)}@attr:{name}",
                        f"Duplicate HTML attribute {name!r}",
                        line=element.line,
                    )
                )

        if element.tag == "button" and not element.attr_values("type"):
            violations.append(
                _violation(
                    "HTML_BUTTON_MISSING_TYPE",
                    document,
                    element_subject(element),
                    "Button is missing an explicit type attribute",
                    line=element.line,
                )
            )

        href = _anchor_href(element)
        if href == "#":
            violations.append(
                _violation(
                    "HTML_ACTION_HASH_LINK",
                    document,
                    element_subject(element),
                    'Bare href="#" is not explicit navigation',
                    line=element.line,
                )
            )

        if element.tag == "a":
            target = element.attr("target")
            if target and target.lower() == "_blank":
                rel_tokens = {
                    token.lower()
                    for value in element.attr_values("rel")
                    if value
                    for token in value.split()
                }
                if "noopener" not in rel_tokens:
                    violations.append(
                        _violation(
                            "HTML_TARGET_BLANK_NO_NOOPENER",
                            document,
                            f"{element_subject(element)}@target:_blank",
                            'target="_blank" link is missing rel="noopener"',
                            line=element.line,
                        )
                    )

    return violations


def _audit_links(
    root: Path,
    document: HtmlDocument,
    document_cache: dict[str, HtmlDocument | None],
) -> list[Violation]:
    violations: list[Violation] = []
    for element in document.elements:
        href = _anchor_href(element)
        if href is None:
            continue

        parsed = urlsplit(href)
        if parsed.scheme or parsed.netloc:
            continue

        resolved = _resolve_local_target(document.path, parsed.path)
        subject = element_subject(element)
        if resolved is None:
            violations.append(
                _violation(
                    "HTML_INTERNAL_LINK_TARGET",
                    document,
                    f"{subject}@href:{href}",
                    f"Internal link escapes the repository root: {href!r}",
                    line=element.line,
                )
            )
            continue

        target_path = root / PurePosixPath(resolved)
        if not target_path.is_file():
            violations.append(
                _violation(
                    "HTML_INTERNAL_LINK_TARGET",
                    document,
                    f"{subject}@href:{href}",
                    f"Internal link target does not exist: {href!r}",
                    line=element.line,
                )
            )
            continue

        fragment = unquote(parsed.fragment)
        if fragment and target_path.suffix.lower() in {".html", ".htm"}:
            if resolved not in document_cache:
                document_cache[resolved] = _load_document(root, resolved)
            target_document = document_cache[resolved]
            if target_document is None or fragment not in target_document.ids:
                violations.append(
                    _violation(
                        "HTML_INTERNAL_LINK_TARGET",
                        document,
                        f"{subject}@href:{href}",
                        f"HTML fragment target does not exist: {href!r}",
                        line=element.line,
                    )
                )
                continue

        if (
            resolved == document.path
            and not parsed.query
            and not parsed.fragment
            and href != "#"
        ):
            violations.append(
                _violation(
                    "HTML_SELF_LINK",
                    document,
                    f"{subject}@self:{href}",
                    f"Redundant link to current document: {href!r}",
                    line=element.line,
                )
            )

    return violations


def audit_html_structure(root: Path) -> list[Violation]:
    root = root.resolve()
    document_cache: dict[str, HtmlDocument | None] = {}
    violations: list[Violation] = []

    for relative_path in discover_audited_html(root):
        document = _load_document(root, relative_path)
        if document is None:
            continue
        document_cache[relative_path] = document
        violations.extend(_audit_document_structure(document))
        violations.extend(_audit_links(root, document, document_cache))

    return sorted(
        violations,
        key=lambda item: (item.rule_id, item.path, item.subject),
    )
