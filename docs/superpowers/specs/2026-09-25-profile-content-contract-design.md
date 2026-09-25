# Block 3B — Canonical Profile and Content Contract

**Repository:** `WevertonGomesCosta/WevertonGomesCosta.github.io`  
**Date:** 2026-09-25  
**Status:** Block 3B complete and CI-validated through 3B.4; frozen for merge review  
**Base:** `main@581dd700fa772e2b012fd5fcd006ba6aa2318cce`

## 1. Purpose

Block 3B defines the canonical contract for personal/profile facts and editorial content before any migration is performed.

The goal is not to move all content into a single JSON file. The goal is to make three responsibilities explicit:

1. **structured facts** — machine-readable facts with one canonical source;
2. **localized/editorial text** — PT/EN copy whose wording may legitimately differ by language;
3. **markup** — HTML structure, classes, IDs, accessibility hooks, icons, and layout.

No production fact, visible copy, PT/EN wording, public URL, or visual behavior is intentionally changed by this design task.

The known-debt baseline remains **11**. The Block 3 debt target remains the single
`BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE`, to be removed only in Blocks 3C/3D.

## 2. Scope boundaries

### In scope

- canonical identity/contact facts;
- stable external profile identifiers and URLs;
- organization identities used by profile/career data;
- structured career, affiliation, and education facts;
- deterministic projection of canonical profile facts into static HTML and runtime consumers;
- separation of factual atoms from translated/editorial prose;
- validation rules preventing new duplication and drift.

### Explicitly out of scope

- bibliographic identity in `academic-registry.json`;
- citation metrics and external-source observations in `fallback-data.json`;
- Scholar duplicate reconciliation;
- legacy `maximized` cleanup;
- `utils.js` general refactor;
- reduced-motion work;
- CSP and SRI;
- editorial rewriting or factual updating of the current site;
- visual redesign.

## 3. Current architecture observed in Block 3A

The current repository mixes the same personal facts across several sinks:

- `index.html` head metadata;
- `index.html` JSON-LD;
- hero/nav markup;
- `_site_components/footer.html`;
- rendered inner pages;
- `translations.json`;
- hard-coded values in `utils.js`, including CV/PDF and copy-email behavior;
- `README.md`.

At the same time:

- `translations.json` is already the PT/EN editorial catalog;
- `academic-registry.json` is already the canonical bibliographic catalog;
- `fallback-data.json` is an external-observation/cache artifact;
- `scripts/render_shared_site.py` already provides a deterministic build-time projection mechanism for shared markup.

Block 3B must build on these existing responsibilities instead of replacing them.

## 4. Canonical ownership model

### 4.1 Structured facts: `profile.json`

A new root-level `profile.json` is the canonical source for language-independent personal facts.

It must contain facts, identifiers, relationships, dates, and stable URLs. It must not contain paragraphs, presentation HTML, icons, CSS classes, bibliometric metrics, or duplicated PT/EN prose.

Conceptual schema:

```json
{
  "schema_version": "1.0.0",
  "person": {
    "name": "...",
    "display_name": "...",
    "email": "...",
    "website_url": "...",
    "avatar_url": "...",
    "location": {
      "city": "...",
      "region": "...",
      "country_code": "..."
    }
  },
  "profiles": {
    "github": {
      "username": "...",
      "url": "..."
    },
    "linkedin": {
      "url": "..."
    },
    "lattes": {
      "id": "...",
      "url": "..."
    },
    "google_scholar": {
      "author_id": "...",
      "url": "..."
    },
    "orcid": {
      "id": "...",
      "url": "..."
    },
    "scopus": {
      "author_id": "...",
      "url": "..."
    },
    "web_of_science": {
      "researcher_id": "...",
      "url": "..."
    }
  },
  "organizations": {
    "organization-id": {
      "name": "...",
      "short_name": "...",
      "url": null
    }
  },
  "affiliations": [],
  "education": []
}
```

The schema above defines ownership, not the first migration batch. Implementation may populate the
contract incrementally, but there must never be two canonical sources for the same fact.

### 4.2 Localized/editorial text: `translations.json`

`translations.json` remains the canonical source for language-dependent presentation copy.

Examples:

- page and section titles;
- explanatory paragraphs;
- role/degree labels;
- descriptions;
- buttons and interaction labels;
- privacy-policy copy;
- accessibility labels that are language-dependent;
- CV narrative text.

It must not become a second source for canonical identifiers, email addresses, external profile URLs,
or other structured facts.

Where editorial sentences need a structured fact, the long-term contract is **named interpolation**,
not factual duplication.

Example:

```json
{
  "projects-page-title": "Projetos | {profile_person_name}"
}
```

The exact first migration may preserve existing strings temporarily. The auditor must distinguish
legacy frozen duplication from new duplication so the migration can be incremental and reviewable.

### 4.3 Markup: HTML and `_site_components/`

HTML/components own structure only:

- elements and semantic hierarchy;
- classes and IDs;
- SVG/icon markup;
- shared-region markers;
- accessibility hooks;
- `data-key` references;
- layout and interaction hooks.

Markup may contain generated projections of facts in committed output, but those projections are not
authoritative and must be reproducible from the canonical source.

## 5. Fact classification rules

A value is a **structured fact** when changing the underlying fact should require exactly one source
edit and all projections should follow mechanically.

Typical structured facts:

- canonical and display names;
- email address;
- city/region/country code;
- website and avatar URLs;
- external profile IDs and URLs;
- organization identities;
- education dates/status/institutions;
- affiliation dates/status/organizations;
- advisor/co-advisor names where represented as data.

A value is **editorial/localized content** when two languages may legitimately express it differently
without changing the underlying fact.

Typical editorial values:

- biography/about paragraphs;
- descriptions of expertise and services;
- page descriptions and SEO prose;
- degree/role display labels;
- button text;
- privacy-policy prose;
- CV narrative prose.

A value is **markup** when it exists to define presentation or behavior rather than meaning.

## 6. Projection strategy

### 6.1 Build-time is authoritative for static/SEO output

Facts required by static HTML must be projected at render time. They must not depend exclusively on a
browser `fetch()`.

This includes, where applicable:

- `<meta name="author">`;
- canonical person names appearing in metadata;
- OpenGraph/Twitter image/profile fields;
- JSON-LD `Person` identity and `sameAs`;
- hero/nav/footer identity;
- shared profile links;
- static email display;
- static fallbacks required before JavaScript runs.

`scripts/render_shared_site.py` is the preferred projection boundary because it already has:

- deterministic rendering;
- strict token validation;
- atomic writes;
- drift checks;
- renderer synchronization tests.

The renderer should read `profile.json` once and pass explicit values into templates/regions. No
component should read files independently.

### 6.2 Runtime consumers receive generated profile data

Interactive code such as CV/PDF generation and copy-email behavior must not retain independent
hard-coded personal facts.

The implementation should expose the same canonical profile to runtime code through a generated,
non-authoritative projection. Preferred approach:

```html
<script id="site-profile-data" type="application/json">...</script>
```

This block is generated by the renderer from `profile.json` and parsed by `utils.js`. It introduces
no second source and avoids an additional network dependency for identity data.

The exact projection must escape JSON safely for HTML and remain non-executable.

## 7. Translation interpolation contract

Interpolation is allowed only through explicit named placeholders.

Requirements:

- placeholders must be deterministic;
- every placeholder must resolve from an approved structured fact or caller-supplied UI value;
- unresolved placeholders are fatal in tests/build;
- interpolation must not evaluate code or arbitrary property paths;
- interpolation must preserve current PT/EN rendered text during migration.

The implemented placeholder namespace is closed and uses the `profile_` prefix. Representative examples are:

- `{profile_person_name}`;
- `{profile_display_name}`;
- `{profile_email}`;
- `{profile_city}`;
- `{profile_region}`;
- `{profile_org_ufv_name}`;
- `{profile_edu_phd_stat_start_year}`;
- `{profile_mentor_phd_gen_advisor}`.

The complete approved set is enforced by `profile-interpolation.js` and `PROFILE_FACT_CONTRACT`. Additional `{profile_*}` placeholders require an explicit contract change and matching tests.

## 8. Relationship to bibliography and metrics

The following boundaries are strict:

```text
profile.json
    personal/profile facts

academic-registry.json
    canonical bibliographic identity

fallback-data.json
    external observations and source metrics

translations.json
    localized/editorial presentation

HTML/components
    markup and generated projections
```

`profile.json` must never absorb publication records or citation counts.

`academic-registry.json` must never become a profile/content store.

`fallback-data.json` must never become authoritative for personal identity.

## 9. Validation contract

The repository auditor should eventually enforce at least:

### Structure

- `profile.json` parses as JSON;
- required top-level fields are present;
- required fact fields have the expected types;
- arrays/objects use stable IDs where required.

### Identity

- email is syntactically valid;
- ORCID has a valid structural format;
- external profile URLs are HTTPS where applicable;
- profile URLs are not duplicated under conflicting identities;
- organization references resolve.

### Separation

- no HTML markup in structured factual fields;
- no citation metrics in `profile.json`;
- no publication catalog embedded in `profile.json`;
- no new hard-coded copies of protected profile facts in runtime JavaScript;
- generated HTML projections match `profile.json`.

### Rendering

- renderer output is deterministic;
- `--check` detects profile projection drift;
- no unresolved profile tokens/placeholders remain;
- bytes outside controlled/generated regions remain unchanged.

## 10. Migration sequence inside Block 3B

### 3B.1 — Contract and validator

- add `profile.json` with the smallest useful factual nucleus;
- add schema/semantic validation;
- add tests using isolated fixtures;
- no consumer migration yet.

### 3B.2 — Identity/contact/profile links

Canonicalize:

- person name/display name;
- email;
- website/avatar;
- academic/professional profile IDs and URLs;
- structured location atoms.

Project them into:

- shared footer/nav;
- home identity elements;
- metadata/JSON-LD;
- runtime copy-email/CV header consumers.

Visible output must remain byte-equivalent where practical and text-equivalent everywhere.

### 3B.3 — Organizations, affiliations, and education facts

Move only factual atoms:

- institution/organization identity;
- start/end dates and status;
- funder relationships;
- advisor/co-advisor names where applicable.

Keep titles/descriptions and localized narrative in `translations.json`.

### 3B.4 — Translation interpolation and duplicate-fact audit

Replace remaining translated factual duplication with named placeholders where doing so reduces
independent sources without rewriting copy.

Freeze an audit rule preventing reintroduction of duplicated profile facts.

## 11. Tests required before Block 3B can pass

At minimum:

1. existing test suite remains green;
2. renderer remains synchronized;
3. `profile.json` contract tests pass without network access;
4. malformed/partial profile fixtures fail deterministically;
5. generated profile data is identical across all rendered pages that embed it;
6. HTML/JSON-LD/profile links match the canonical profile;
7. runtime code contains no independent canonical email/profile URL constants after their migration;
8. PT/EN visible text is preserved;
9. public URLs are preserved;
10. known-debt count remains **11** throughout Block 3B.

## 12. Non-goals and protected invariants

Block 3B must not:

- reduce the known-debt count by deleting unrelated debt;
- reconcile the Scholar duplicate;
- remove either `LEGACY_MAXIMIZED_REFERENCE`;
- change publication identity;
- change citation values;
- change the visual design;
- rewrite biography/career claims;
- introduce OpenAlex/Crossref;
- make normal tests depend on any external API.

## 12.1 Implementation status after 3B.2

The first two migration stages are complete:

- **3B.1 — Contract and validator:** `profile.json` exists, is required by the repository audit, and is validated offline through `PROFILE_STRUCTURE`.
- **3B.2 — Identity/contact/profile links:** canonical identity is projected by the renderer into shared navigation/footer, selected static metadata, the home JSON-LD block, and an identical non-executable runtime profile payload on every rendered page. Runtime CV/clipboard identity consumers derive from that payload instead of independent hard-coded profile constants.

The verified gate after 3B.2 is:

- 102 unit tests passing;
- shared-site renderer synchronized;
- known debt: 11;
- new violations: 0;
- resolved baseline entries: 0;
- baseline growth: 0.

No bibliographic, citation-metric, translation/editorial, reduced-motion, CSP, SRI, or legacy `maximized` work is included in 3B.2.

## 12.2 Implementation status after 3B.3

The structured academic relationship layer is now populated and enforced:

- `organizations` owns the organization/funder identities required by the migrated academic facts;
- `education` owns the four degree records currently represented by the site;
- `affiliations` owns four postdoctoral appointments plus the Conecta GEM professional affiliation;
- each academic record has a stable ID, organization reference, period state, and canonical advisor/co-advisor facts where applicable;
- postdoctoral funders are organization references rather than text embedded in runtime code;
- the CV generator derives institution, period, funder, advisor, and co-advisor facts from the generated canonical profile payload while keeping degree titles and descriptive prose in `translations.json`;
- the home academic timeline derives institution/funder labels from `profile.json`; localized date/advisor strings remain temporarily in `translations.json` for the explicit 3B.4 interpolation migration;
- home JSON-LD organization names and the Conecta footer URL now derive from the organization registry;
- CI now includes `node --check utils.js` after a duplicate `const lang` declaration introduced during 3B.2 was discovered and corrected.

The verified gate after 3B.3 is:

- JavaScript syntax check passing;
- 107 unit tests passing;
- shared-site renderer synchronized;
- known debt: 11;
- new violations: 0;
- resolved baseline entries: 0;
- baseline growth: 0.

The remaining profile/content work is 3B.4: controlled interpolation and duplicate-fact auditing. It must remove the remaining translated factual duplication without turning titles or descriptions into structured data.

## 12.3 Implementation status after 3B.4

Controlled interpolation and duplicate-fact protection are complete:

- `translations.json` now uses approved `{profile_*}` placeholders for canonical personal identity, contact data, organization identities/acronyms, active academic periods, and advisor/co-advisor facts;
- `profile-interpolation.js` is a DOM-independent resolver used before translation consumers and tested directly in Node;
- unknown `{profile_*}` placeholders fail loudly;
- non-profile runtime placeholders such as `{shown}`, `{total}`, and `{count}` remain untouched;
- `PROFILE_FACT_CONTRACT` rejects protected canonical literals reintroduced into translated content and enforces required placeholders for active identity/contact/academic translation keys;
- all four rendered pages load the interpolation module before `utils.js`;
- the stale unused aggregate postdoctoral period `2022 – Present` in the translation data was reconciled to the canonical affiliation history `2022 – 2025`; this did not change rendered output because the field was not consumed;
- CRLF/LF policy remains enforced after the new script insertion.

Final Block 3B gate:

- profile translation interpolation Node integration: PASS;
- JavaScript syntax checks: PASS;
- 111 Python unit tests: PASS;
- shared-site renderer synchronized;
- known debt: 11;
- new violations: 0;
- resolved baseline entries: 0;
- baseline growth: 0.

Block 3B is now frozen. The next structural work is Block 3C/3D: canonical bibliographic-source links and metric reconciliation by `publication_id`. Only that work may legitimately remove the single `BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE` baseline entry and move known debt from 11 to 10.

## 13. Exit criteria

Block 3B passes when:

- canonical ownership of profile facts is explicit and enforced;
- migrated facts have one source of truth;
- generated/static and runtime consumers derive from that source;
- translations remain editorial/localized rather than a parallel fact database;
- markup remains presentation-only;
- all existing behavior is preserved;
- tests and renderer are clean;
- the known-debt baseline is still **11**.

Only after this gate should Block 3C formalize bibliographic-source identity links and Block 3D
reconcile Scholar observations by `publication_id`, enabling the legitimate **11 → 10** reduction.
