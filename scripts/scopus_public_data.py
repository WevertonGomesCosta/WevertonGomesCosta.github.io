"""Limit Scopus public artifacts to author-level metrics and source links.

No Scopus document-level citation counts or article-list dataset is published.
Private per-document API responses are only used in-memory for reconciliation.
"""
from copy import deepcopy


SCOPUS_PUBLIC_DISTRIBUTION = "author_summary_only"


def is_public_author_summary(snapshot: object) -> bool:
    if not isinstance(snapshot, dict):
        return False
    academic = snapshot.get("academicData")
    scopus = academic.get("scopus") if isinstance(academic, dict) else None
    return isinstance(scopus, dict) and scopus.get("distribution") == SCOPUS_PUBLIC_DISTRIBUTION


def sanitize_fallback(snapshot: dict) -> dict:
    """Remove document-level Scopus payload and citation-by-year dataset."""
    public = deepcopy(snapshot)
    academic = public.get("academicData")
    if not isinstance(academic, dict):
        return public
    old = academic.get("scopus")
    if not isinstance(old, dict):
        return public

    profile = deepcopy(old.get("profile")) if isinstance(old.get("profile"), dict) else {}
    cited = profile.get("cited_by")
    if isinstance(cited, dict):
        # Small aggregate author-level table is required for the dashboard;
        # an annual citation matrix is a downloadable data series.
        cited["graph"] = []
    academic["scopus"] = {
        "source_name": "Scopus",
        "distribution": SCOPUS_PUBLIC_DISTRIBUTION,
        "profile": profile,
        "articles": [],
        "history_status": old.get("history_status", "unavailable"),
    }
    return public
