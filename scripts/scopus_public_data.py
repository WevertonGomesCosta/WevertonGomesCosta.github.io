"""Publish Scopus author aggregates and permitted annual citation history.

The annual history contains only aggregated year/citation/publication totals.
Document-level Scopus records and citation counts remain private, used in-memory
for reconciliation. Public distribution of the annual aggregates is contingent
on the site's authorized Elsevier use.
"""
from copy import deepcopy


SCOPUS_PUBLIC_DISTRIBUTION = "author_summary_only"


def is_public_author_summary(snapshot: object) -> bool:
    if not isinstance(snapshot, dict):
        return False
    academic = snapshot.get("academicData")
    scopus = academic.get("scopus") if isinstance(academic, dict) else None
    return isinstance(scopus, dict) and scopus.get("distribution") == SCOPUS_PUBLIC_DISTRIBUTION


def sanitize_annual_history(graph: object) -> list[dict]:
    """Allow only year-level, nonnegative integer aggregates; reject other fields."""
    if not isinstance(graph, list) or len(graph) > 150:
        return []

    result: list[dict] = []
    years: set[int] = set()
    required = {"year", "citations", "publications"}
    for point in graph:
        if not isinstance(point, dict) or set(point) != required:
            return []
        if any(
            not isinstance(point[field], int) or isinstance(point[field], bool)
            for field in required
        ):
            return []
        year = point["year"]
        if not 1900 <= year <= 2200 or year in years:
            return []
        if point["citations"] < 0 or point["publications"] < 0:
            return []
        years.add(year)
        result.append({
            "year": year,
            "citations": point["citations"],
            "publications": point["publications"],
        })
    return sorted(result, key=lambda point: point["year"])


def sanitize_fallback(snapshot: dict) -> dict:
    """Remove document-level payloads while retaining approved annual aggregates."""
    public = deepcopy(snapshot)
    academic = public.get("academicData")
    if not isinstance(academic, dict):
        return public
    old = academic.get("scopus")
    if not isinstance(old, dict):
        return public

    profile = deepcopy(old.get("profile")) if isinstance(old.get("profile"), dict) else {}
    cited = profile.get("cited_by")
    history = []
    if isinstance(cited, dict):
        history = sanitize_annual_history(cited.get("graph"))
        cited["graph"] = history
    history_status = old.get("history_status", "unavailable")
    if not history:
        history_status = "unavailable"

    academic["scopus"] = {
        "source_name": "Scopus",
        "distribution": SCOPUS_PUBLIC_DISTRIBUTION,
        "profile": profile,
        "articles": [],
        "history_status": history_status,
    }
    return public
