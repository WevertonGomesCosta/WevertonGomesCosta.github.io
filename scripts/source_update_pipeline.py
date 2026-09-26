"""Pure transaction core for external-source snapshot updates.

This module performs no network access and loads no credentials. It reconciles
source collection results against the last published fallback snapshot, marks
preserved data stale, validates frozen bibliographic identities, builds derived
metrics from the exact candidate snapshot, and publishes staged JSON outputs
with rollback on process-level replacement failure.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime
import json
import os
from pathlib import Path
from typing import Callable, Mapping
import unicodedata

try:
    from scripts import build_bibliometric_metrics as metrics_builder
except ModuleNotFoundError:  # pragma: no cover - direct script/module execution
    import build_bibliometric_metrics as metrics_builder


SOURCE_NAMES = (
    "github",
    "google_scholar",
    "scopus",
    "web_of_science",
    "orcid",
)
ACADEMIC_SOURCES = frozenset(
    {"google_scholar", "scopus", "web_of_science", "orcid"}
)
SOURCE_RESULT_STATUSES = frozenset({"success", "failure", "skipped"})
SOURCE_STATE_STATUSES = frozenset({"current", "stale", "unavailable"})


class PipelineError(RuntimeError):
    """Raised when a transaction candidate or publication step is invalid."""


@dataclass(frozen=True)
class SourceResult:
    status: str
    payload: object = None
    error_code: str | None = None

    def __post_init__(self):
        if self.status not in SOURCE_RESULT_STATUSES:
            raise ValueError(f"Unsupported SourceResult status: {self.status}")
        if self.status == "success" and self.error_code is not None:
            raise ValueError("Successful SourceResult cannot contain error_code")
        if self.status != "success" and not self.error_code:
            raise ValueError(
                "Failed/skipped SourceResult requires a controlled error_code"
            )

    @classmethod
    def success(cls, payload: object) -> "SourceResult":
        return cls(status="success", payload=payload)

    @classmethod
    def failure(cls, error_code: str = "fetch_failed") -> "SourceResult":
        return cls(status="failure", error_code=error_code)

    @classmethod
    def skipped(cls, error_code: str = "not_configured") -> "SourceResult":
        return cls(status="skipped", error_code=error_code)


@dataclass(frozen=True)
class TransactionCandidate:
    fallback: dict
    metrics: dict
    changed: bool


def iso_timestamp(value: datetime) -> str:
    return value.replace(microsecond=0).isoformat()


def legacy_timestamp(value: datetime) -> str:
    return value.strftime("%d/%m/%Y %H:%M")


def parse_legacy_timestamp(value: object) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.strptime(value.strip(), "%d/%m/%Y %H:%M")
    except ValueError:
        return None
    return iso_timestamp(parsed)


def get_source_payload(snapshot: object, source: str) -> object:
    if not isinstance(snapshot, dict):
        return None
    if source == "github":
        return snapshot.get("githubRepos")
    academic = snapshot.get("academicData")
    if not isinstance(academic, dict):
        return None
    return academic.get(source)


def set_source_payload(snapshot: dict, source: str, payload: object) -> None:
    if source == "github":
        snapshot["githubRepos"] = deepcopy(payload)
        return
    academic = snapshot.setdefault("academicData", {})
    if not isinstance(academic, dict):
        raise PipelineError("academicData must be an object")
    academic[source] = deepcopy(payload)


def unavailable_payload(source: str) -> object:
    if source == "github":
        return []
    return None


def validate_source_payload(source: str, payload: object) -> None:
    if source == "github":
        if not isinstance(payload, list):
            raise PipelineError("GitHub payload must be a list")
        if any(not isinstance(repo, dict) for repo in payload):
            raise PipelineError("GitHub payload entries must be objects")
        return

    if source not in ACADEMIC_SOURCES:
        raise PipelineError(f"Unsupported source: {source}")

    if not isinstance(payload, dict):
        raise PipelineError(f"{source} payload must be an object")
    articles = payload.get("articles")
    if not isinstance(articles, list):
        raise PipelineError(f"{source} payload must contain an articles list")
    if any(not isinstance(article, dict) for article in articles):
        raise PipelineError(f"{source} article entries must be objects")


def is_valid_previous_payload(source: str, payload: object) -> bool:
    try:
        validate_source_payload(source, payload)
    except PipelineError:
        return False
    return True


def normalize_title(value: object) -> str:
    if not isinstance(value, str):
        return ""
    decomposed = unicodedata.normalize("NFKD", value)
    without_marks = "".join(
        char for char in decomposed if not unicodedata.combining(char)
    ).lower()
    normalized = "".join(
        char if char.isalnum() else " " for char in without_marks
    )
    return " ".join(normalized.split())


def registry_by_id(registry: object) -> dict[str, dict]:
    if not isinstance(registry, dict):
        raise PipelineError("academic registry must be an object")
    works = registry.get("works")
    if not isinstance(works, list):
        raise PipelineError("academic registry works must be a list")

    indexed: dict[str, dict] = {}
    for work in works:
        if not isinstance(work, dict):
            raise PipelineError("academic registry works must contain objects")
        publication_id = work.get("id")
        if not isinstance(publication_id, str) or not publication_id.strip():
            raise PipelineError("academic registry work has invalid id")
        publication_id = publication_id.strip()
        if publication_id in indexed:
            raise PipelineError(
                f"duplicate academic registry publication id: {publication_id}"
            )
        indexed[publication_id] = work
    return indexed


def validate_frozen_link_completeness(
    source: str,
    payload: object,
    source_links: object,
    registry: object,
) -> None:
    if source not in ACADEMIC_SOURCES:
        return
    validate_source_payload(source, payload)
    publications = registry_by_id(registry)

    sources = (
        source_links.get("sources")
        if isinstance(source_links, dict)
        else None
    )
    source_definition = (
        sources.get(source) if isinstance(sources, dict) else None
    )
    links = (
        source_definition.get("links")
        if isinstance(source_definition, dict)
        else None
    )
    if not isinstance(links, list):
        raise PipelineError(f"{source} source links must be a list")

    articles = payload["articles"]
    indexed: dict[str, list[dict]] = {}
    for article in articles:
        record_id = metrics_builder.extract_record_id(source, article)
        if record_id:
            indexed.setdefault(record_id, []).append(article)

    for link in links:
        if not isinstance(link, dict):
            raise PipelineError(f"{source} source link must be an object")
        record_id = link.get("record_id")
        publication_id = link.get("publication_id")
        match_basis = link.get("match_basis")
        if not isinstance(record_id, str) or not record_id.strip():
            raise PipelineError(f"{source} source link has invalid record_id")
        if (
            not isinstance(publication_id, str)
            or publication_id not in publications
        ):
            raise PipelineError(
                f"{source} source link has unknown publication_id"
            )

        matches = indexed.get(record_id.strip(), [])
        if len(matches) != 1:
            raise PipelineError(
                f"{source} frozen source record {record_id!r} must resolve "
                f"exactly once; found {len(matches)}"
            )

        article = matches[0]
        publication = publications[publication_id]

        if match_basis == "doi":
            source_doi = metrics_builder.normalize_doi(article.get("doi"))
            canonical_doi = metrics_builder.normalize_doi(
                publication.get("doi")
            )
            if (
                not source_doi
                or not canonical_doi
                or source_doi != canonical_doi
            ):
                raise PipelineError(
                    f"{source} frozen record {record_id!r} DOI evidence "
                    "does not match canonical publication"
                )
        elif match_basis in {
            "normalized_title",
            "manual_duplicate_reconciliation",
        }:
            source_title = normalize_title(article.get("title"))
            canonical_title = normalize_title(publication.get("title"))
            if (
                not source_title
                or not canonical_title
                or source_title != canonical_title
            ):
                raise PipelineError(
                    f"{source} frozen record {record_id!r} title evidence "
                    "does not match canonical publication"
                )
        else:
            raise PipelineError(
                f"{source} frozen record {record_id!r} has unsupported "
                f"match_basis {match_basis!r}"
            )


def previous_source_state(
    old_snapshot: object,
    source: str,
    old_payload: object,
) -> dict:
    if isinstance(old_snapshot, dict):
        states = old_snapshot.get("sourceStates")
        if isinstance(states, dict):
            state = states.get(source)
            if (
                isinstance(state, dict)
                and state.get("status") in SOURCE_STATE_STATUSES
            ):
                return {
                    "status": state.get("status"),
                    "last_valid_at": state.get("last_valid_at"),
                    "error_code": state.get("error_code"),
                }

    if is_valid_previous_payload(source, old_payload):
        snapshot_at = (
            parse_legacy_timestamp(old_snapshot.get("lastUpdated"))
            if isinstance(old_snapshot, dict)
            else None
        )
        return {
            "status": "current",
            "last_valid_at": snapshot_at,
            "error_code": None,
        }

    return {
        "status": "unavailable",
        "last_valid_at": None,
        "error_code": "no_previous_valid_snapshot",
    }


def _safe_error_code(value: object, fallback: str) -> str:
    if not isinstance(value, str):
        return fallback
    value = value.strip().lower()
    if not value:
        return fallback
    if not all(char.isalnum() or char in {"_", "-"} for char in value):
        return fallback
    return value[:80]


def reconcile_source(
    *,
    source: str,
    result: SourceResult,
    old_snapshot: object,
    source_links: object,
    registry: object,
    transaction_time: datetime,
) -> tuple[object, dict]:
    old_payload = get_source_payload(old_snapshot, source)
    old_state = previous_source_state(old_snapshot, source, old_payload)
    old_valid = (
        is_valid_previous_payload(source, old_payload)
        and old_state.get("status") in {"current", "stale"}
    )
    timestamp = iso_timestamp(transaction_time)

    effective_result = result
    if result.status == "success":
        try:
            validate_source_payload(source, result.payload)
            validate_frozen_link_completeness(
                source, result.payload, source_links, registry
            )
        except PipelineError:
            effective_result = SourceResult.failure("invalid_or_incomplete")

    if effective_result.status == "success":
        payload = deepcopy(effective_result.payload)
        unchanged_current = (
            old_valid
            and old_payload == payload
            and old_state.get("status") == "current"
        )
        if unchanged_current:
            state = old_state
        else:
            state = {
                "status": "current",
                "last_valid_at": timestamp,
                "error_code": None,
            }
        return payload, state

    error_code = _safe_error_code(
        effective_result.error_code,
        "fetch_failed",
    )
    if old_valid:
        return deepcopy(old_payload), {
            "status": "stale",
            "last_valid_at": old_state.get("last_valid_at"),
            "error_code": error_code,
        }

    return unavailable_payload(source), {
        "status": "unavailable",
        "last_valid_at": None,
        "error_code": error_code,
    }


def seed_snapshot(old_snapshot: object) -> dict:
    if isinstance(old_snapshot, dict):
        candidate = deepcopy(old_snapshot)
    else:
        candidate = {}

    candidate.setdefault("githubRepos", [])
    academic = candidate.setdefault("academicData", {})
    if not isinstance(academic, dict):
        raise PipelineError("academicData must be an object")
    for source in ACADEMIC_SOURCES:
        academic.setdefault(source, None)
    candidate.setdefault("lastUpdated", None)
    return candidate


def comparable_snapshot(snapshot: dict) -> dict:
    comparable = deepcopy(snapshot)
    comparable.pop("lastUpdated", None)
    return comparable


def validate_source_states(snapshot: object) -> None:
    if not isinstance(snapshot, dict):
        raise PipelineError("fallback candidate must be an object")
    states = snapshot.get("sourceStates")
    if not isinstance(states, dict):
        raise PipelineError("sourceStates must be an object")
    if set(states) != set(SOURCE_NAMES):
        raise PipelineError("sourceStates must contain exactly the supported sources")

    for source in SOURCE_NAMES:
        state = states[source]
        if not isinstance(state, dict):
            raise PipelineError(f"sourceStates.{source} must be an object")
        if set(state) != {"status", "last_valid_at", "error_code"}:
            raise PipelineError(
                f"sourceStates.{source} has invalid fields"
            )
        status = state.get("status")
        if status not in SOURCE_STATE_STATUSES:
            raise PipelineError(
                f"sourceStates.{source}.status is invalid"
            )
        last_valid_at = state.get("last_valid_at")
        if last_valid_at is not None:
            if not isinstance(last_valid_at, str):
                raise PipelineError(
                    f"sourceStates.{source}.last_valid_at must be string/null"
                )
            try:
                datetime.fromisoformat(last_valid_at)
            except ValueError as exc:
                raise PipelineError(
                    f"sourceStates.{source}.last_valid_at must be ISO-8601"
                ) from exc
        error_code = state.get("error_code")
        if error_code is not None and (
            not isinstance(error_code, str) or not error_code
        ):
            raise PipelineError(
                f"sourceStates.{source}.error_code must be string/null"
            )
        if status == "current" and error_code is not None:
            raise PipelineError(
                f"sourceStates.{source}: current requires error_code=null"
            )
        if status == "unavailable" and last_valid_at is not None:
            raise PipelineError(
                f"sourceStates.{source}: unavailable requires last_valid_at=null"
            )


def build_transaction_candidate(
    *,
    old_snapshot: object,
    results: Mapping[str, SourceResult],
    registry: object,
    source_links: object,
    transaction_time: datetime,
) -> TransactionCandidate:
    if set(results) != set(SOURCE_NAMES):
        raise PipelineError("results must contain exactly the supported sources")

    candidate = seed_snapshot(old_snapshot)
    states: dict[str, dict] = {}

    for source in SOURCE_NAMES:
        payload, state = reconcile_source(
            source=source,
            result=results[source],
            old_snapshot=old_snapshot,
            source_links=source_links,
            registry=registry,
            transaction_time=transaction_time,
        )
        set_source_payload(candidate, source, payload)
        states[source] = state

    candidate["sourceStates"] = states
    validate_source_states(candidate)

    old_comparable = (
        comparable_snapshot(old_snapshot)
        if isinstance(old_snapshot, dict)
        else None
    )
    changed = old_comparable != comparable_snapshot(candidate)

    if changed:
        candidate["lastUpdated"] = legacy_timestamp(transaction_time)
    elif isinstance(old_snapshot, dict):
        candidate["lastUpdated"] = old_snapshot.get("lastUpdated")

    metrics = metrics_builder.build_metrics(
        registry,
        source_links,
        candidate,
    )
    return TransactionCandidate(
        fallback=candidate,
        metrics=metrics,
        changed=changed,
    )


def serialize_fallback(payload: object) -> str:
    return json.dumps(
        payload,
        ensure_ascii=False,
        indent=4,
    ) + "\n"


def staged_publish_json(
    outputs: Mapping[Path, str],
    *,
    replace_func: Callable[[str | os.PathLike, str | os.PathLike], None] = os.replace,
) -> None:
    if not outputs:
        return

    staged: dict[Path, Path] = {}
    backups: dict[Path, bytes | None] = {}
    replaced: list[Path] = []

    try:
        for path, text in outputs.items():
            path = Path(path)
            path.parent.mkdir(parents=True, exist_ok=True)
            backups[path] = path.read_bytes() if path.exists() else None
            stage = path.with_name(path.name + ".writing")
            with stage.open("w", encoding="utf-8", newline="") as handle:
                handle.write(text)
                handle.flush()
                os.fsync(handle.fileno())
            staged[path] = stage

        for path, stage in staged.items():
            replace_func(stage, path)
            replaced.append(path)

    except Exception as exc:
        for path in reversed(replaced):
            backup = backups[path]
            rollback = path.with_name(path.name + ".rollback")
            try:
                if backup is None:
                    if path.exists():
                        path.unlink()
                else:
                    with rollback.open("wb") as handle:
                        handle.write(backup)
                        handle.flush()
                        os.fsync(handle.fileno())
                    os.replace(rollback, path)
            finally:
                if rollback.exists():
                    rollback.unlink()
        raise PipelineError(f"transactional publication failed: {exc}") from exc

    finally:
        for stage in staged.values():
            if stage.exists():
                stage.unlink()
        for path in outputs:
            rollback = Path(path).with_name(Path(path).name + ".rollback")
            if rollback.exists():
                rollback.unlink()


def publish_candidate(
    root: Path,
    candidate: TransactionCandidate,
) -> bool:
    if not candidate.changed:
        return False

    root = root.resolve()
    staged_publish_json(
        {
            root / "fallback-data.json": serialize_fallback(candidate.fallback),
            root / "bibliometric-metrics.json": (
                metrics_builder.serialize_metrics(candidate.metrics)
            ),
        }
    )
    return True
