# Block 3E — Transactional Source Update Pipeline

**Repository:** `WevertonGomesCosta/WevertonGomesCosta.github.io`  
**Date:** 2026-09-25  
**Status:** Block 3E implemented and CI-validated; frozen for merge review  
**Base:** `main@51ed26271c4782de9963bbc91b05a90016633cf6`

## 1. Objective

Block 3E makes external-source refreshes transactional and failure-preserving.

The current `update_fallback.py` can overwrite valid source data with `[]` or `null` when GitHub, Scholar, ORCID, or WoS collection fails. Scopus contains an internal one-off previous-data fallback, while the other sources do not.

The target architecture centralizes that policy:

```text
collect
  -> normalize
  -> validate source snapshot
  -> reconcile with last valid source snapshot
  -> build derived bibliometric metrics
  -> validate complete candidate
  -> compare
  -> publish staged files with rollback
```

A source fetch function must never decide whether previous data are preserved. Fetchers report success/failure; the pipeline owns preservation.

## 2. Invariants

- A failed source refresh never overwrites a previous valid source payload.
- A successful empty result is distinct from a failed fetch.
- A partial Scholar pagination failure is a failed source refresh.
- A partial/incomplete Scopus result is a failed source refresh.
- A frozen bibliographic source record disappearing from a nominally successful source refresh makes that source refresh invalid and stale; it is not silently published.
- Each source is reconciled independently.
- One failed source does not discard valid successful updates from other sources when an older valid payload exists for the failed source.
- If a source has no previous valid payload and cannot be collected, it is `unavailable`, not `stale`.
- `fallback-data.json` and `bibliometric-metrics.json` are generated and validated from the same candidate snapshot before publication.
- Publication is staged before replacement and rollback-capable on process-level failure.
- No external API is used by tests.
- Importing `update_fallback.py` must not read `keys.json` or call `sys.exit`.
- Known repository debt remains 10 throughout Block 3E.

## 3. Source-state contract

`fallback-data.json` gains:

```json
{
  "sourceStates": {
    "github": {
      "status": "current",
      "last_valid_at": "2026-09-22T09:40:00",
      "error_code": null
    },
    "google_scholar": {
      "status": "stale",
      "last_valid_at": "2026-09-22T09:40:00",
      "error_code": "fetch_failed"
    }
  }
}
```

Supported source-state values:

- `current`: payload is the latest accepted valid candidate;
- `stale`: current refresh failed or was invalid, so the previous valid payload was preserved;
- `unavailable`: no valid payload exists to preserve.

`last_valid_at` means the time at which the currently published payload became the accepted valid snapshot. It does not change on a no-op successful refresh.

`error_code` is a controlled code, not a raw exception/API response, to avoid publishing secrets or unstable diagnostic text.

Sources:

- `github`;
- `google_scholar`;
- `scopus`;
- `web_of_science`;
- `orcid`.

## 4. Collection result contract

Collection is represented independently from publication policy:

```text
SourceResult
  status = success | failure | skipped
  payload
  error_code
```

Rules:

- `success` may legitimately contain an empty payload when the source contract permits it;
- `failure` never contains publishable replacement data;
- `skipped` means the source was not collectable by configuration/local availability and follows the same preservation policy as failure;
- raw exception strings are logged locally but are not persisted.

## 5. Reconciliation

For each source:

### Successful + valid

Use the new source payload.

If payload/state materially changed:

- state becomes `current`;
- `last_valid_at` becomes the transaction time;
- `error_code=null`.

If the accepted payload is unchanged and the previous state is already `current`, preserve the previous state metadata to avoid timestamp-only churn.

### Failed/invalid + previous valid payload

Preserve the previous payload.

Set:

- `status=stale`;
- preserve previous `last_valid_at`;
- set controlled `error_code`.

### Failed/invalid + no previous valid payload

Publish no invented source observations.

Set:

- `status=unavailable`;
- `last_valid_at=null`;
- controlled `error_code`.

## 6. Frozen-link completeness

For academic sources with frozen links, a successful candidate is valid only when every currently frozen source record for that source resolves exactly once in the new payload.

This prevents transient source pagination/API truncation from deleting the evidence used by canonical publications.

New unmatched records are allowed; they remain raw evidence until a future explicit identity reconciliation.

## 7. Derived metric semantics

Block 3D statuses remain:

- `observed`;
- `value_unavailable`;
- `record_absent`;
- `source_unavailable`.

Block 3E adds:

- `stale`.

When an academic source state is `stale`:

- the preserved primary `record_id` and aliases remain;
- the preserved citation value remains an integer or null;
- publication metric status becomes `stale`.

The frontend treats an integer stale citation as the last valid display/sort value while retaining `cited_by.status = stale`.

An unavailable source remains `source_unavailable`.

## 8. Transaction boundary

Candidate generation uses one transaction timestamp and the same in-memory fallback snapshot for both:

- `fallback-data.json`;
- `bibliometric-metrics.json`.

Before any final file is replaced:

1. source payloads are validated;
2. frozen-link completeness is checked;
3. the fallback candidate is structurally validated;
4. metrics are built from that exact fallback candidate;
5. metrics are structurally validated;
6. all output bytes are staged.

Replacement is rollback-capable if a process-level error occurs during multi-file replacement.

Git itself remains the repository-level atomic publication mechanism when both generated files are committed together.

## 9. Change detection

`lastUpdated` must not cause unconditional file churn.

The pipeline compares the material candidate before changing `lastUpdated`.

If source payloads and source states are unchanged:

- keep the existing `lastUpdated`;
- do not rewrite files.

If any accepted payload or source state changes:

- set `lastUpdated` to the transaction time;
- regenerate metrics using that same timestamp;
- publish both outputs together.

## 10. Import safety

Configuration loading and validation move under explicit runtime entrypoints.

Importing the module for tests must:

- not require `keys.json`;
- not perform network access;
- not terminate the interpreter.

Configuration failures return a normal CLI exit code from `main()`.

## 11. Required offline tests

At minimum:

- module import without `keys.json`;
- old data missing does not crash;
- GitHub failure preserves old repository list and marks stale;
- Scholar failure preserves old payload and marks stale;
- ORCID failure preserves old payload and marks stale;
- WoS unavailable preserves old payload and marks stale;
- Scopus incomplete refresh preserves old payload through central reconciliation, not fetcher-internal fallback;
- successful empty result is not mistaken for failure;
- partial Scholar pagination fails the source refresh;
- frozen primary record missing from a nominally successful candidate marks source stale;
- independent source reconciliation: one stale source plus another successful changed source publishes both correctly;
- stale metrics preserve last valid integer citation;
- zero remains zero/current when source is current;
- unavailable with no prior payload remains unavailable;
- no-op refresh does not change `lastUpdated`;
- changed refresh updates `lastUpdated`;
- candidate metrics use the same fallback timestamp;
- staged multi-file publication rolls back on simulated replacement failure;
- tests perform no live API requests.

## 12. Protected scope

Block 3E must not:

- alter canonical publication identity;
- add OpenAlex/Crossref;
- change source-link mappings without a separate reconciliation decision;
- alter the 10-item known-debt baseline;
- address legacy `maximized`, reduced motion, CSP, or SRI;
- make source failure look like zero citations;
- discard last valid source data.

## 13. Sequencing

### 3E.1 — Import-safe transaction core

Add source result/state contracts, reconciliation, material comparison, and staged publication primitives.

### 3E.2 — Fetcher semantics

Make GitHub/Scholar/Scopus/WoS/ORCID distinguish failure from successful empty data and remove source-specific previous-data policy.

### 3E.3 — Stale metrics integration

Extend the deterministic metrics builder/auditor/frontend to carry `stale` without losing the last valid value.

### 3E.4 — Migration, tests, and final gate

Bootstrap current source states, integrate the runtime entrypoint, add complete offline failure-path tests, and verify:

- source update tests pass;
- bibliometric metrics `--check` passes;
- renderer remains synchronized;
- known debt: 10;
- new violations: 0;
- resolved baseline entries: 0;
- baseline growth: 0.


## 14. Implementation status after Block 3E

Block 3E is implemented end-to-end.

### Transaction core

`scripts/source_update_pipeline.py` now owns:

- explicit `SourceResult(success|failure|skipped)` outcomes;
- source payload validation;
- frozen bibliographic-link completeness checks;
- previous-snapshot reconciliation;
- `current`, `stale`, and `unavailable` source-state transitions;
- material change detection independent of `lastUpdated`;
- one in-memory fallback candidate used to derive metrics;
- staged two-file publication with process-level rollback.

### Updater entrypoint

`update_fallback.py` is import-safe:

- importing it does not read `keys.json`;
- importing it does not call `sys.exit`;
- importing it does not require the optional `requests` package to be installed;
- credential validation occurs only at runtime.

Fetcher semantics are no longer ambiguous:

- GitHub returns `None` on failure and `[]` only for a successful empty result;
- Scholar rejects partial pagination;
- Scholar preserves absent citation values as `null`, never implicit zero;
- ORCID returns `None` on collection failure;
- Scopus no longer accepts or returns `previous_data`; incomplete collection returns `None`;
- WoS local-source absence is represented as a skipped collection result.

Previous-data preservation is no longer implemented inside any fetcher.

### Published source state

The existing fallback snapshot was bootstrapped with five explicit `current` states using its existing accepted snapshot timestamp:

`2026-09-22T09:40:00`

The source-state contract is enforced by `SOURCE_UPDATE_STATE_STRUCTURE`.

A failed refresh with previous valid data:

```text
new fetch fails
  -> previous payload preserved
  -> status = stale
  -> last_valid_at preserved
  -> controlled error_code stored
```

A failed refresh with no previous valid payload becomes `unavailable`.

A repeated failure of an already unavailable placeholder remains unavailable; an empty placeholder is not promoted to stale merely because its container type is structurally valid.

### Stale bibliometric semantics

`bibliometric-metrics.json` supports `status: stale`.

For a frozen linked publication from a stale source:

- primary/alias identity is preserved;
- the last valid integer citation remains available;
- a null citation remains null;
- the frontend uses the preserved integer value for display/sorting while retaining `cited_by.status = stale`.

An unlinked publication in a stale source remains `record_absent`; a source with no valid snapshot remains `source_unavailable`.

The current checked-in metrics artifact remains byte-synchronized because all bootstrapped source states are `current`.

### Identity/audit interaction

Frozen source links continue to require exact snapshot evidence for `current` and `stale` sources.

When a source is explicitly `unavailable`, the identity link remains valid but the audit does not require the unavailable raw observation to exist in `fallback-data.json`.

No source-link mappings changed in Block 3E.

### Offline failure-path coverage

The test suite now covers:

- import without configuration side effects;
- missing `keys.json` as a normal exception;
- GitHub failure versus successful empty result;
- Scholar partial pagination rejection;
- Scholar null citation preservation;
- Scopus fetcher independence from previous data;
- initial generation with no previous fallback snapshot;
- per-source failure preservation for GitHub, Scholar, Scopus, WoS, and ORCID;
- stale recovery to current;
- unavailable source with no previous snapshot;
- repeated unavailable-source failure;
- frozen record missing from a nominally successful refresh;
- independent reconciliation of stale and successfully changed sources;
- no-op refresh without `lastUpdated` churn;
- fallback/metrics transaction timestamp parity;
- stale metric value preservation;
- rollback when the second staged replacement fails;
- source-link audit behavior for unavailable sources.

No test performs live API access.

### Final gate

Verified at the final implementation HEAD:

- profile translation interpolation: PASS;
- Python updater syntax: PASS;
- deterministic bibliometric metrics check: PASS;
- JavaScript syntax: PASS;
- 170 Python unit tests: PASS;
- shared-site renderer synchronized;
- known debt: 10;
- new violations: 0;
- resolved baseline entries: 0;
- baseline growth: 0.

Protected artifacts remain unchanged:

- `academic-registry.json`;
- `bibliographic-source-links.json`;
- `bibliometric-metrics.json`;
- `.audit/known-debt.json`;
- all HTML pages;
- `style.css`.

Block 3E therefore changes update semantics and source-state metadata without changing canonical bibliographic identity or the known-debt count.
