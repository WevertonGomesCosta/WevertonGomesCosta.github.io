"""Decide whether a public academic snapshot requires a GitHub publication.

Volatile collection timestamps and GitHub activity timestamps must not cause
a PR when the actual public academic values are unchanged. Scopus data are
licensed: a successful refresh needs to be published at least weekly so the
public cache's verified timestamp remains within the seven-day display limit.
"""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta
from typing import Mapping


# Publish before the current Scopus cache reaches its seven-day expiry.
SCOPUS_REFRESH_INTERVAL = timedelta(days=6)


def comparable_public_data(snapshot: object) -> object:
    """Remove only refresh metadata, never citations, status or source content."""
    if not isinstance(snapshot, dict):
        return snapshot

    normalized = deepcopy(snapshot)
    normalized.pop("lastUpdated", None)

    states = normalized.get("sourceStates")
    if isinstance(states, dict):
        for state in states.values():
            if isinstance(state, dict):
                state.pop("last_valid_at", None)

    repos = normalized.get("githubRepos")
    if isinstance(repos, list):
        for item in repos:
            if isinstance(item, dict):
                # GitHub mutates this field on almost every commit to this site,
                # even when no relevant academic information has changed.
                item.pop("updated_at", None)
    return normalized


def has_material_change(old: object, current: object) -> bool:
    if not isinstance(old, dict):
        return True
    return comparable_public_data(old) != comparable_public_data(current)


def scopus_refresh_due(
    old: object,
    current: object,
    results: Mapping[str, object],
    transaction_time: datetime,
) -> bool:
    """Refresh a still-current author-summary cache once every six days.

    Never renew the cache timestamp when Scopus collection failed or the
    reconciled candidate was not validated as current.
    """
    scopus_result = results.get("scopus")
    if getattr(scopus_result, "status", None) != "success":
        return False
    if not isinstance(current, dict):
        return False
    current_states = current.get("sourceStates")
    state = current_states.get("scopus") if isinstance(current_states, dict) else None
    if not isinstance(state, dict) or state.get("status") != "current":
        return False

    old_states = old.get("sourceStates") if isinstance(old, dict) else None
    previous = old_states.get("scopus") if isinstance(old_states, dict) else None
    last_valid_at = (
        previous.get("last_valid_at") if isinstance(previous, dict) else None
    )
    if not isinstance(last_valid_at, str):
        return True

    try:
        previous_date = datetime.fromisoformat(last_valid_at)
        now = transaction_time
        if previous_date.tzinfo is not None:
            if now.tzinfo is None:
                return True
            now = now.astimezone(previous_date.tzinfo)
        elif now.tzinfo is not None:
            return True
    except (ValueError, TypeError):
        return True

    return now - previous_date >= SCOPUS_REFRESH_INTERVAL
