"""Readable old/new comparisons for each academic data source.

Pure formatter: no files, network access, or credentials.
"""
from __future__ import annotations


SOURCES = (
    ("github", "GitHub"),
    ("google_scholar", "Google Scholar"),
    ("scopus", "Scopus"),
    ("web_of_science", "Web of Science"),
    ("orcid", "ORCID"),
)

MEASURES = (
    ("citations", "Citações totais", "all"),
    ("citations", "Citações desde 2021", "since_2021"),
    ("h_index", "Índice h", "all"),
    ("h_index", "Índice h desde 2021", "since_2021"),
    ("i10_index", "Índice i10", "all"),
    ("i10_index", "Índice i10 desde 2021", "since_2021"),
)


def _value(value: object) -> str:
    if value is None or isinstance(value, bool):
        return "n/d"
    if isinstance(value, int) and value >= 0:
        return str(value)
    if isinstance(value, str) and value.isdigit():
        return str(int(value))
    return "n/d"


def _payload(snapshot: object, source: str) -> object:
    if not isinstance(snapshot, dict):
        return None
    if source == "github":
        return snapshot.get("githubRepos")
    academic = snapshot.get("academicData")
    return academic.get(source) if isinstance(academic, dict) else None


def _count(payload: object, source: str) -> object:
    if source == "github":
        return len(payload) if isinstance(payload, list) else None
    if not isinstance(payload, dict):
        return None
    profile = payload.get("profile")
    publications = profile.get("total_publications") if isinstance(profile, dict) else None
    if isinstance(publications, int) and not isinstance(publications, bool):
        return publications
    articles = payload.get("articles")
    return len(articles) if isinstance(articles, list) else None


def _metrics(payload: object) -> dict:
    if not isinstance(payload, dict):
        return {}
    profile = payload.get("profile")
    cited = profile.get("cited_by") if isinstance(profile, dict) else None
    rows = cited.get("table") if isinstance(cited, dict) else None
    if not isinstance(rows, list):
        return {}
    values = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        for metric, entry in row.items():
            if isinstance(entry, dict) and metric in {"citations", "h_index", "i10_index"}:
                values[metric] = entry
    return values


def _state(snapshot: object, source: str) -> str:
    if not isinstance(snapshot, dict):
        return "n/d"
    states = snapshot.get("sourceStates")
    entry = states.get(source) if isinstance(states, dict) else None
    if not isinstance(entry, dict):
        return "n/d"
    status = entry.get("status")
    if status not in {"current", "stale", "unavailable"}:
        return "n/d"
    if status == "stale":
        return "stale (dados anteriores preservados)"
    if status == "unavailable":
        return "unavailable (sem dados válidos)"
    return status


def _pair(old: object, new: object) -> str:
    return f"{_value(old)} -> {_value(new)}"


def _registry_total(registry: object) -> object:
    if not isinstance(registry, dict):
        return None
    works = registry.get("works")
    return len(works) if isinstance(works, list) else None


def render_source_comparison(
    old_snapshot: object,
    new_snapshot: object,
    *,
    old_registry: object = None,
    new_registry: object = None,
) -> str:
    """Return a complete source-by-source old/new report, even with no changes."""
    lines = [
        "",
        "=" * 68,
        "COMPARAÇÃO DE FONTES — VALOR ANTERIOR -> VALOR ATUAL",
        "=" * 68,
    ]
    for source, label in SOURCES:
        before = _payload(old_snapshot, source)
        after = _payload(new_snapshot, source)
        lines.append(f"\n{label}  [estado: {_state(old_snapshot, source)} -> {_state(new_snapshot, source)}]")
        noun = "Repositórios" if source == "github" else "Publicações/registros"
        lines.append(f"  {noun}: {_pair(_count(before, source), _count(after, source))}")
        if source not in {"github", "orcid"}:
            old_metrics, new_metrics = _metrics(before), _metrics(after)
            for metric, title, period in MEASURES:
                old_entry = old_metrics.get(metric, {})
                new_entry = new_metrics.get(metric, {})
                old_value = old_entry.get(period) if isinstance(old_entry, dict) else None
                new_value = new_entry.get(period) if isinstance(new_entry, dict) else None
                lines.append(f"  {title}: {_pair(old_value, new_value)}")
        if source == "scopus":
            old_history = before.get("history_status") if isinstance(before, dict) else None
            new_history = after.get("history_status") if isinstance(after, dict) else None
            lines.append(f"  Histórico anual: {old_history or 'n/d'} -> {new_history or 'n/d'}")
        if _state(new_snapshot, source).startswith("stale"):
            lines.append("  AVISO: coleta falhou; os números atuais foram preservados do snapshot anterior.")

    lines.extend([
        "",
        f"Catálogo canônico (registros): {_pair(_registry_total(old_registry), _registry_total(new_registry))}",
        "=" * 68,
        "",
    ])
    return "\n".join(lines)
