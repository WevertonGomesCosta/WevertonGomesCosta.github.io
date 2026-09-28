# Block 3 Final Closeout — 3F/3G/3H

**Repository:** `WevertonGomesCosta/WevertonGomesCosta.github.io`  
**Date:** 2026-09-28  
**Base:** `main@e19f33e8d0b22a84d2802001f3443ea2aeed6fbe`  
**Status:** 3F and 3G absorbed by earlier Block 3 work; 3H final gate in progress

## 1. Purpose

The original Block 3 sequencing reserved three final stages after the profile/content, bibliographic identity, metrics reconciliation, and transactional updater work:

- 3F — fixtures/offline tests;
- 3G — migration + audit;
- 3H — final gate.

This closeout audits whether those stages still require independent implementation.

## 2. 3F — absorbed

3F no longer requires a standalone implementation branch.

The repository already has dedicated offline coverage for:

- repository audit core/CLI/data/HTML/runtime/workflow;
- shared-site rendering;
- profile interpolation;
- bibliographic source links;
- deterministic bibliometric metrics;
- frontend publication-ID metric consumption;
- transactional source update reconciliation;
- updater import/failure semantics.

The Repository audit workflow runs the Python/Node checks without live source APIs.

At `main@e19f33e`, the suite contains 173 Python unit tests plus the Node interpolation integration.

**Decision:** 3F is complete by absorption into 3B–3E.

## 3. 3G — absorbed

3G also no longer requires a standalone data migration.

The migrations originally expected for the final Block 3 stage have already occurred incrementally:

- profile/content facts migrated to the canonical profile contract;
- source records frozen into `bibliographic-source-links.json`;
- publication metrics derived into `bibliometric-metrics.json`;
- frontend publication citations migrated from normalized-title matching to `publication_id`;
- the Scholar duplicate explicitly reconciled;
- `fallback-data.json` migrated to explicit source states;
- source refreshes migrated to the transactional pipeline.

Repository search confirms that production code no longer contains the legacy canonical publication title join, fetcher-level `previous_data` policy, or legacy nontransactional fallback writers.

The known-debt baseline remains at 10 and contains only work assigned to later architecture/security/accessibility blocks.

**Decision:** 3G is complete by absorption into 3B–3E.

## 4. 3H — deployment gate discovered

The Repository audit push run for merge commit `e19f33e` succeeded, but the GitHub Pages build for the same commit failed.

Failure:

```text
Liquid syntax error:
Tag '{% ... %}' was not properly terminated
docs/superpowers/specs/2026-09-24-shared-site-architecture-design.md
```

Root cause:

- GitHub Pages runs Jekyll over repository Markdown;
- `docs/superpowers` contains internal design/plan documents with literal Liquid and GitHub Actions template examples;
- these documents are engineering sources, not website content;
- there is currently no root `_config.yml` excluding them.

The site itself does not depend on Jekyll-generated CSS or Markdown:

- all five HTML pages reference the repository root `style.css`;
- there is no repository `assets/` directory;
- root HTML contains no Liquid tokens.

## 5. Selected fix

Keep the default GitHub Pages/Jekyll publishing path, but exclude the internal engineering documentation tree:

```yaml
exclude:
  - docs/superpowers
```

This is narrower than adding `.nojekyll` and avoids changing the publication behavior of unrelated repository files.

A regression test requires the exclusion and scans Markdown that remains in Jekyll scope for raw Liquid delimiters.

## 6. 3H final gate

Block 3 is complete only when all of the following are true on the merge candidate and then on `main`:

- Repository audit workflow: PASS;
- Python updater syntax: PASS;
- deterministic bibliometric metrics check: PASS;
- shared-site renderer: PASS;
- all unit tests: PASS;
- known debt: 10;
- new violations: 0;
- resolved baseline entries: 0;
- baseline growth: 0;
- GitHub Pages build/deployment: PASS.

The Pages result must be verified after merge because the branch-source Pages workflow is triggered by the `main` publication event.

## 7. Protected scope

This closeout must not:

- alter profile/content facts;
- alter canonical publication identities;
- alter source-link mappings;
- alter bibliometric observations/metrics;
- alter transactional updater semantics;
- change any HTML layout/content;
- change `style.css`;
- change the known-debt baseline;
- address Block 4 debts.

Expected known debt after closeout: **10 → 10**.
