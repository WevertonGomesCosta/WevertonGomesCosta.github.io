# Block 3C/3D — Bibliographic Identity and Metrics Reconciliation

**Repository:** `WevertonGomesCosta/WevertonGomesCosta.github.io`  
**Date:** 2026-09-25  
**Status:** Block 3C/3D complete and CI-validated through 3D.3; frozen for merge review  
**Base:** `main@4b55ec32ed20c33d98084340c844462fa341adfe`

## 1. Objective

Blocks 3C and 3D remove bibliometric identity decisions from the browser and make citation reconciliation deterministic by canonical `publication_id`.

The architecture must preserve four distinct responsibilities:

1. `academic-registry.json` — canonical publication catalog;
2. `bibliographic-source-links.json` — identity links from external source records to canonical `publication_id`;
3. `fallback-data.json` — raw/source-shaped observations and profile metrics;
4. `bibliometric-metrics.json` — deterministic reconciled per-publication metrics consumed by the frontend.

No citation values are stored in `academic-registry.json`.

No source records are silently summed.

## 2. Verified baseline

Block 3B merged as PR #15 at:

`4b55ec32ed20c33d98084340c844462fa341adfe`

Baseline:

- 114 Python unit tests passing;
- Node profile interpolation integration passing;
- shared-site renderer synchronized;
- known debt: 11;
- new violations: 0;
- resolved baseline entries: 0;
- baseline growth: 0.

The target debt for 3C/3D is exactly:

`BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE`

The final 3C/3D gate may legitimately move known debt from **11 to 10** only when the Scholar duplicate is explicitly reconciled and the frontend no longer chooses a Scholar record by title/order.

## 3. Current source inventory

### Google Scholar

- 35 raw article records;
- 28 records match canonical works by normalized title;
- 7 records are currently unmatched to the canonical registry;
- one canonical publication has two Scholar source records.

Duplicate canonical publication:

`journal-2021-genome-enabled-prediction-trait-complexity`

Scholar records:

- primary candidate:
  - `citation_for_view=eJNKcHsAAAAJ:qjMakFHDy7sC`
  - 18 citations in the current fallback snapshot;
- duplicate/alias candidate:
  - `citation_for_view=eJNKcHsAAAAJ:Se3iqnhoufwC`
  - citation value currently unavailable/null.

The current frontend uses normalized title plus `.find()`, so the effective value depends on source ordering. It does not currently sum the two records, but the selection is not explicit.

### Scopus

- 22 raw article records;
- all 22 match canonical works by DOI;
- each record exposes a stable `scopus_id`;
- no multiple-record canonical mappings were observed.

### Web of Science

- 21 raw article records;
- all 21 match canonical works by DOI;
- the current exported/fallback shape does not expose a WoS accession identifier;
- DOI is therefore the stable identity available to this pipeline.

### ORCID

- 29 raw work records;
- 27 match canonical works by DOI;
- 2 are not represented as canonical publications in the current registry;
- the current fallback shape does not expose ORCID work put-codes.

The two unmatched ORCID records are not to be auto-added to the canonical publication catalog during 3C/3D.

## 4. Why a separate source-link artifact

`academic-registry.json` must remain the canonical catalog and must not become a metrics cache.

`fallback-data.json` must remain source-shaped evidence and must not become the authority for publication identity.

A separate identity-link artifact makes the relationship explicit:

```text
external source record
        |
        v
bibliographic-source-links.json
        |
        v
canonical publication_id
        |
        +---- academic-registry.json
        |
        v
bibliometric-metrics.json
```

This also permits multiple source records to map to one canonical publication without pretending that the source records themselves are the same observation.

## 5. `bibliographic-source-links.json` contract

Conceptual schema:

```json
{
  "schema_version": "1.0.0",
  "sources": {
    "google_scholar": {
      "record_id_scheme": "citation_for_view",
      "links": [
        {
          "record_id": "eJNKcHsAAAAJ:qjMakFHDy7sC",
          "publication_id": "journal-2021-genome-enabled-prediction-trait-complexity",
          "role": "primary",
          "match_basis": "normalized_title"
        },
        {
          "record_id": "eJNKcHsAAAAJ:Se3iqnhoufwC",
          "publication_id": "journal-2021-genome-enabled-prediction-trait-complexity",
          "role": "alias",
          "primary_record_id": "eJNKcHsAAAAJ:qjMakFHDy7sC",
          "match_basis": "manual_duplicate_reconciliation"
        }
      ]
    },
    "scopus": {
      "record_id_scheme": "scopus_id",
      "links": []
    },
    "web_of_science": {
      "record_id_scheme": "doi",
      "links": []
    },
    "orcid": {
      "record_id_scheme": "doi",
      "links": []
    }
  }
}
```

Rules:

- every linked `publication_id` must exist in `academic-registry.json`;
- record IDs are unique within a source;
- one source record cannot map to two canonical publications;
- for a given source/publication pair there is exactly one `primary` record;
- zero or more aliases may point to that primary;
- aliases never contribute additional citations;
- an alias must reference the primary record of the same source and publication;
- source links contain identity metadata only, never citation values;
- unmatched source records remain raw evidence and do not become canonical works automatically.

## 6. Source record identity

### Scholar

Extract the full `citation_for_view` value from the record URL.

Example:

`eJNKcHsAAAAJ:qjMakFHDy7sC`

No title matching is allowed after the initial migration has frozen the mapping.

### Scopus

Use `scopus_id`.

### Web of Science

Use normalized DOI as:

`doi:<normalized-doi>`

This is a source-link identity for the current export pipeline, not a claim that DOI is a WoS-native accession number.

### ORCID

Use normalized DOI as:

`doi:<normalized-doi>`

Works without a DOI remain unmatched unless a stable ORCID work identifier is added to the source collection in a later block.

## 7. Initial migration policy

The initial link map may be generated from the current validated snapshot using deterministic evidence:

1. DOI exact match where source DOI and registry DOI are both available;
2. stable source ID plus exact normalized-title match only for the one-time Scholar migration;
3. no fuzzy matching;
4. no creation of canonical publications;
5. all multiple-source-record mappings require explicit review.

Once committed, the source-link file becomes the canonical reconciliation contract. Runtime and future builds use record IDs/DOI links, not title matching.

## 8. Scholar duplicate reconciliation

For:

`journal-2021-genome-enabled-prediction-trait-complexity`

the explicit mapping is:

```text
primary
  eJNKcHsAAAAJ:qjMakFHDy7sC
  current citation observation = 18

alias
  eJNKcHsAAAAJ:Se3iqnhoufwC
  current citation observation = null
```

Reconciliation policy:

- both records are preserved as source evidence;
- both records map to the same canonical `publication_id`;
- only the primary record is eligible to provide the publication-level Scholar citation value;
- aliases are never summed with the primary;
- source ordering has no effect;
- a missing primary observation is not replaced by summing aliases;
- any future policy for substituting an alias when the primary is unavailable requires an explicit contract change.

This preserves the current effective value of 18 while making the rule deterministic.

## 9. `bibliometric-metrics.json` contract

This is a deterministic derived artifact.

Conceptual shape:

```json
{
  "schema_version": "1.0.0",
  "source_snapshot": {
    "fallback_last_updated": "...",
    "registry_updated_at": "..."
  },
  "publications": {
    "journal-2021-genome-enabled-prediction-trait-complexity": {
      "google_scholar": {
        "record_id": "eJNKcHsAAAAJ:qjMakFHDy7sC",
        "citations": 18,
        "status": "observed"
      },
      "scopus": {
        "record_id": "85104263465",
        "citations": 14,
        "status": "observed"
      },
      "web_of_science": {
        "record_id": "doi:10.1002/csc2.20488",
        "citations": 11,
        "status": "observed"
      }
    }
  }
}
```

The artifact must distinguish in 3D.1:

- citation value `0` through `status: observed` and `citations: 0`;
- citation value `null` through `status: value_unavailable`;
- source record absent through `status: record_absent`;
- source unavailable through `status: source_unavailable`.

A stale-preserved observation is intentionally not emitted yet because 3D.1 has no transactional last-valid-state mechanism. Block 3E will extend this state model when per-source preservation is implemented, without collapsing stale data into current observations.

## 10. Deterministic builder

Add a deterministic offline builder/checker, conceptually:

`scripts/build_bibliometric_metrics.py`

Inputs:

- `academic-registry.json`;
- `bibliographic-source-links.json`;
- `fallback-data.json`.

Outputs:

- `bibliometric-metrics.json`.

Required modes:

- `--write`;
- `--check`.

The builder must not call external APIs.

## 11. Frontend migration

Current behavior to remove:

```text
canonical work title
     |
normalize title
     |
scholarArticles.find(...)
```

Target:

```text
publication_id
     |
bibliometric-metrics.json
     |
source metric
```

Publication cards and publication-level citation displays must use `publication_id` only.

Profile-level source totals/h-index can continue to use source profile summaries from `fallback-data.json`; those are source-level metrics and are not publication identity joins.

## 12. Audit behavior and debt reduction

The current raw-source duplicate rule must not simply be deleted.

It becomes reconciliation-aware:

- duplicate normalized source titles remain an error when unresolved;
- a duplicate is considered resolved only when all involved stable source records are explicitly linked to the same canonical `publication_id`, exactly one is primary, and all others are aliases to that primary.

Only after:

1. the explicit Scholar mapping exists;
2. the derived metrics artifact is valid;
3. the frontend uses `publication_id`;
4. the duplicate audit recognizes that explicit reconciliation;

may the baseline entry:

`BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE`

be removed.

Expected final baseline:

`11 -> 10`

No other debt entry is modified in 3C/3D.

## 13. Required offline tests

At minimum:

- valid source-link contract;
- source link to unknown `publication_id`;
- duplicate source record ID;
- two primary records for one source/publication;
- alias without a primary;
- alias pointing to a different publication;
- Scholar record ID extraction;
- Scopus ID extraction;
- DOI normalization for WoS/ORCID;
- zero citations distinct from null;
- missing primary observation;
- duplicate Scholar records in reversed source order;
- duplicate Scholar primary=18 and alias=null resolves to 18;
- duplicate Scholar records are never summed;
- unmatched Scholar records are not promoted to canonical publications;
- builder `--check` detects drift;
- frontend publication metric lookup uses `publication_id`;
- tests do not require APIs.

## 14. Sequencing

### 3C.1 — Source-link schema and validator

Add and validate `bibliographic-source-links.json`. No frontend change. Known debt remains 11.

### 3C.2 — Freeze current source identities

Generate/review deterministic links for current matched records. Explicitly encode the Scholar primary/alias pair. Known debt remains 11 until the consumer migration is complete.

### 3D.1 — Derived publication metrics

Add deterministic builder and `bibliometric-metrics.json`.

### 3D.2 — Frontend migration

Replace title/order based publication citation joins with `publication_id` lookups.

### 3D.3 — Reconciliation-aware audit

Make the duplicate-title rule recognize explicitly resolved source duplicates and remove exactly the corresponding baseline entry.

Final expected gate:

- all tests pass;
- source-link and metrics builders synchronized;
- renderer synchronized;
- known debt: 10;
- new violations: 0;
- baseline growth: 0.

## 14.1 Implementation status after 3C.1

The source-link contract is now implemented without freezing any real source mappings.

Current artifact state:

- `bibliographic-source-links.json` exists and is required by the repository audit;
- the four supported sources are declared with fixed record-ID schemes;
- all four `links` arrays remain empty;
- no publication/source association has been committed yet;
- no citation value is stored in the identity artifact.

The validator enforces:

- exact top-level/source/link schemas;
- supported source set and record-ID scheme per source;
- source-specific record ID format;
- `publication_id` references to the canonical registry;
- unique record IDs within each source;
- exactly one primary record for every linked source/publication pair;
- alias references to a primary record of the same source and publication;
- approved match-basis values only;
- rejection of metric fields such as `citations`.

Verified 3C.1 gate:

- profile translation Node integration: PASS;
- JavaScript syntax checks: PASS;
- 122 Python unit tests: PASS;
- shared-site renderer synchronized;
- known debt: 11;
- new violations: 0;
- resolved baseline entries: 0;
- baseline growth: 0.

Protected production/data files remain unchanged:

- `academic-registry.json`;
- `fallback-data.json`;
- `.audit/known-debt.json`;
- all HTML pages;
- `utils.js`.

Therefore 3C.1 is frozen with no debt reduction. 3C.2 is the first step allowed to populate real source links.

## 14.2 Implementation status after 3C.2

The current source identities are now frozen in `bibliographic-source-links.json`.

Frozen mapping counts:

- Google Scholar: 28 linked source records representing 27 canonical publications;
- Scopus: 22 linked source records;
- Web of Science: 21 linked source records;
- ORCID: 27 linked source records.

The Scholar duplicate is encoded explicitly:

- primary: `eJNKcHsAAAAJ:qjMakFHDy7sC`;
- alias: `eJNKcHsAAAAJ:Se3iqnhoufwC`;
- publication: `journal-2021-genome-enabled-prediction-trait-complexity`;
- alias basis: `manual_duplicate_reconciliation`.

The seven currently unmatched Scholar records and the two unmatched ORCID records remain outside the canonical link map.

The validator now also verifies frozen identity evidence against the current fallback snapshot:

- every linked record ID must resolve to exactly one raw source record;
- DOI-based links must match the canonical publication DOI;
- Scholar title-based links must match the canonical normalized title;
- aliases must use `manual_duplicate_reconciliation`;
- Scholar primaries must use `normalized_title`;
- Scopus/WoS/ORCID primaries must use `doi`.

A snapshot test freezes both the link count and a deterministic signature of each complete `record_id -> publication_id` mapping, preventing silent identity-map drift.

Verified 3C.2 gate:

- profile translation Node integration: PASS;
- JavaScript syntax checks: PASS;
- 130 Python unit tests: PASS;
- shared-site renderer synchronized;
- known debt: 11;
- new violations: 0;
- resolved baseline entries: 0;
- baseline growth: 0.

The `BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE` entry remains deliberately active. 3C.2 encodes the identity reconciliation but does not yet change the frontend consumer or duplicate-title audit semantics.

The next step is 3D.1: build the deterministic `bibliometric-metrics.json` artifact from the frozen source links and current source observations.

## 14.3 Implementation status after 3D.1

The deterministic publication-level metrics artifact is now implemented.

Inputs:

- `academic-registry.json`;
- `bibliographic-source-links.json`;
- `fallback-data.json`.

Output:

- `bibliometric-metrics.json`.

The builder is `scripts/build_bibliometric_metrics.py` and supports:

- `--write` to regenerate the artifact;
- `--check` to fail on drift.

It is fully offline and performs no external API calls.

The artifact contains every canonical `publication_id` from the academic registry and exactly four source entries per publication. Each source entry contains only:

- `record_id`;
- `alias_record_ids`;
- `citations`;
- `status`.

Status semantics are explicit:

- `observed` — a primary source record exists and citation value is a non-negative integer; zero remains zero;
- `value_unavailable` — the primary source record exists but citation value is null/unavailable;
- `record_absent` — no frozen source-link relationship exists for that canonical publication while the source payload is available;
- `source_unavailable` — the source payload itself is unavailable.

A frozen link whose primary record disappears from an otherwise available source causes a build error; it is not silently converted into `record_absent`.

Current snapshot status counts:

- Google Scholar: 22 `observed`, 5 `value_unavailable`, 5 `record_absent`;
- Scopus: 22 `observed`, 10 `record_absent`;
- Web of Science: 21 `observed`, 11 `record_absent`;
- ORCID: 27 `value_unavailable`, 5 `record_absent`.

The explicitly reconciled Scholar duplicate produces:

- primary record `eJNKcHsAAAAJ:qjMakFHDy7sC`;
- alias record `eJNKcHsAAAAJ:Se3iqnhoufwC`;
- publication citation value 18.

Tests mutate the alias to 999 citations and reverse Scholar source order; the derived publication metric remains 18 from the primary record, proving that aliases are never summed and source order is irrelevant.

The repository audit now requires and validates the derived artifact through `BIBLIOMETRIC_METRICS_STRUCTURE`, including exact publication/source sets, status/value semantics, source snapshot metadata, and identity consistency with the frozen source-link map.

CI now runs `python scripts/build_bibliometric_metrics.py --check` before the Python unit suite.

Verified 3D.1 gate:

- profile translation Node integration: PASS;
- bibliometric metrics deterministic build check: PASS;
- JavaScript syntax checks: PASS;
- 138 Python unit tests: PASS;
- shared-site renderer synchronized;
- known debt: 11;
- new violations: 0;
- resolved baseline entries: 0;
- baseline growth: 0.

The frontend remains unchanged and still performs its legacy Scholar title-based lookup. Therefore `BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE` remains intentionally active. The next step is 3D.2: migrate publication-level metric consumption to `publication_id`.

## 14.4 Implementation status after 3D.2

Publication-level frontend citation consumption now uses canonical `publication_id` lookups.

Removed production path:

```text
canonical work title
  -> normalizeIdentityTitle()
  -> Scholar articles .find(...)
  -> citation value
```

Implemented path:

```text
canonical work.id
  -> bibliometric-metrics.json
  -> publications[publication_id].google_scholar
  -> citation value/status
```

The academic UI loads `bibliometric-metrics.json` alongside translations and the canonical academic registry before normalizing canonical publications.

Runtime behavior:

- `observed` metrics expose the integer citation value, including zero;
- non-observed metric states retain their status while the existing card/sort representation continues to use zero as the display/sort fallback;
- if the entire derived metrics artifact is unavailable, canonical citation state is `source_unavailable`;
- there is no fallback from a canonical publication to title-based Scholar matching;
- the raw Scholar article fallback remains only for the pre-existing degraded path where the canonical academic registry itself is unavailable.

The normalized frontend work object now carries both citation value and metric status:

```text
cited_by.value
cited_by.status
```

Regression tests enforce:

- `normalizeIdentityTitle` is absent from `utils.js`;
- `scholarCitationCount` is absent from `utils.js`;
- `scholarArticles.find(...)` is absent from the production citation path;
- the metrics artifact is fetched;
- canonical works call the metric lookup with `rawArt.id`;
- all current citable canonical works produce exactly the same visible Scholar count as the legacy join for the frozen snapshot.

Verified 3D.2 gate:

- profile translation Node integration: PASS;
- bibliometric metrics deterministic build check: PASS;
- JavaScript syntax checks: PASS;
- 142 Python unit tests: PASS;
- shared-site renderer synchronized;
- known debt: 11;
- new violations: 0;
- resolved baseline entries: 0;
- baseline growth: 0.

The duplicate-title baseline entry remains deliberately active. The next step, 3D.3, will make the duplicate-source-title audit reconciliation-aware and remove exactly the explicitly reconciled Scholar duplicate debt.

## 14.5 Implementation status after 3D.3

The source duplicate-title audit is now reconciliation-aware.

A duplicate normalized title is suppressed only when every raw duplicate record:

1. has a stable source record ID;
2. has exactly one source-link entry;
3. maps to the same canonical `publication_id`;
4. forms a group with exactly one `primary`;
5. has every remaining record as an `alias` of that primary;
6. uses `manual_duplicate_reconciliation` for each alias.

If any of those conditions fails, `BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE` is still emitted.

Tests explicitly cover:

- unresolved duplicate titles;
- reconciled primary/alias duplicate groups;
- duplicate records split across different canonical publications;
- two-primary groups;
- aliases pointing to the wrong primary.

For the frozen Google Scholar duplicate:

- primary: `eJNKcHsAAAAJ:qjMakFHDy7sC`;
- alias: `eJNKcHsAAAAJ:Se3iqnhoufwC`;
- publication: `journal-2021-genome-enabled-prediction-trait-complexity`;

the duplicate rule now recognizes the explicit reconciliation and emits no violation.

The corresponding baseline entry was removed by exact fingerprint:

`29b65b9160637b5e0f2813162e29d0f4abb9d862a5912d8142604eb4e82d5240`

No other baseline entry changed.

Verified final 3C/3D gate:

- profile translation Node integration: PASS;
- bibliometric metrics deterministic build check: PASS;
- JavaScript syntax checks: PASS;
- 146 Python unit tests: PASS;
- shared-site renderer synchronized;
- known debt: 10;
- new violations: 0;
- resolved baseline entries: 0;
- baseline growth: 0.

The known-debt transition is therefore exactly:

`11 -> 10`

and is attributable solely to the explicitly reconciled Scholar duplicate.

Block 3C/3D is now frozen for final PR audit and merge review.

## 15. Protected scope

3C/3D must not:

- add OpenAlex or Crossref;
- alter profile/content architecture from Block 3B;
- modify unrelated legacy `maximized` debt;
- change reduced-motion, CSP, or SRI debt;
- auto-add the 7 unmatched Scholar records to the canonical publication registry;
- auto-add the 2 unmatched ORCID records to the canonical publication registry;
- sum duplicate Scholar records;
- make tests depend on live APIs.

Block 3E will subsequently make source updates transactional and preserve the last valid source state on failures.
