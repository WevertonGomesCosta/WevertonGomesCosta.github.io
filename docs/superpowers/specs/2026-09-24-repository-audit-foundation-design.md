# Repository Audit Foundation — Design Specification

**Repository:** `WevertonGomesCosta/WevertonGomesCosta.github.io`  
**Date:** 2026-09-24  
**Status:** Proposed design approved in chat; implementation not started  
**Target block:** Structural strategy — Block 1: audit and regression foundation

## 1. Purpose

The repository has already received a sequence of successful point fixes, but several later fixes addressed repeated symptoms of the same structural causes. The next phase must prevent the project from returning to a cycle of isolated corrections.

This block introduces a repository-level audit subsystem that:

1. detects whole classes of structural defects;
2. distinguishes pre-existing technical debt from new regressions;
3. fails CI on new violations;
4. detects when known debt has been resolved so the baseline can only shrink;
5. protects subsequent refactors with repeatable checks;
6. uses only the Python standard library for the audit engine.

The audit subsystem is infrastructure. It must not simultaneously refactor shared layout, JavaScript architecture, bibliographic data, accessibility behavior, CDN security, or animation behavior.

## 2. Current problem model

The current repository contains independent structural debts including:

- duplicated shared page chrome, especially footer/navigation markup;
- no repository-wide automated quality gate;
- monolithic `utils.js`;
- fragmented factual/profile content sources;
- partially manual academic-data maintenance;
- incomplete semantic normalization of controls;
- residual accessibility/i18n inconsistencies;
- no reduced-motion policy;
- legacy compatibility references such as `maximized`;
- CDN hardening gaps;
- limited automated consistency checks between HTML, translations, JSON data, and repository files.

Known examples observed before this design include:

- action links using `href="#"`;
- buttons without explicit `type`;
- untranslated/fixed ARIA labels;
- compatibility references to `maximized`;
- no `prefers-reduced-motion` handling;
- external scripts without SRI/CSP coverage;
- duplicated bibliometric records in source-specific data.

These examples are inputs to the initial baseline, not separate implementation tasks in this block.

## 3. Design choice

The selected approach is a **baseline-aware auditor**.

A strict zero-debt auditor would make the new CI permanently red until every structural debt is fixed. An informational-only auditor would not prevent regressions. The baseline-aware model allows the current debt to be frozen while making new debt fail immediately.

The fundamental invariant is:

> Known debt may stay temporarily or decrease. It must never grow silently.

## 4. Repository structure

The block will add:

```text
scripts/
  audit_repository.py

tests/
  test_repository_audit.py

.audit/
  known-debt.json
  policy.json

.github/
  workflows/
    repository-audit.yml
```

No runtime site dependency is introduced.

### 4.1 `scripts/audit_repository.py`

Single command-line entry point for repository auditing.

Responsibilities:

- discover repository files from the working tree;
- run the registered audit rules;
- normalize violations into a stable machine-readable representation;
- compare actual violations with the known-debt baseline;
- print a human-readable summary;
- optionally emit JSON for CI/debugging;
- return a non-zero status when blocking conditions exist.

### 4.2 `tests/test_repository_audit.py`

Standard-library `unittest` suite.

Responsibilities:

- test rule behavior using temporary fixture repositories/files;
- test stable violation identity;
- test baseline matching;
- test NEW / KNOWN / RESOLVED classification;
- test exit-code behavior;
- test malformed baseline handling.

Tests must not depend on network access.

### 4.3 `.audit/known-debt.json`

Explicit inventory of accepted pre-existing violations.

The file is versioned so every increase or decrease is visible in review.

A baseline entry will have a schema equivalent to:

```json
{
  "schema_version": 1,
  "entries": [
    {
      "rule_id": "HTML_ACTION_HASH_LINK",
      "path": "index.html",
      "subject": "#copy-email-link",
      "fingerprint": "<stable-hash>",
      "reason": "Pre-existing debt frozen before structural block 2"
    }
  ]
}
```

Line numbers are informational only and must not define identity.

### 4.4 `.audit/policy.json`

Versioned deterministic policy for rules that need explicit repository-specific semantics rather than inference.

Examples include:

- HTML pages included in repository-wide structural checks;
- legitimate fixed ARIA labels that are proper names/brands and do not require translation;
- explicitly allowed self-links, if any;
- dependency URLs or categories excluded from a rule for a documented reason.

Policy exceptions must identify a stable subject, not a line number. They are not technical-debt entries: an exception means the behavior is intentionally allowed, while `known-debt.json` means the behavior is undesirable and scheduled to be removed.

Malformed policy, duplicate exception identities, or references to unknown rule IDs are fatal configuration errors.

### 4.5 `.github/workflows/repository-audit.yml`

Runs on:

- `pull_request`;
- pushes to `main`;
- optionally manual `workflow_dispatch`.

The workflow will:

1. check out the repository with enough Git history to inspect the relevant base/parent commit;
2. configure a maintained Python version;
3. run the unit tests;
4. materialize the reference `known-debt.json` from the pull-request base branch, or from the first parent on a `main` push when available;
5. run the repository audit against the candidate baseline and the reference baseline;
6. fail on NEW, RESOLVED, BASELINE_GROWTH, malformed configuration, or fatal rule errors.

For the initial bootstrap PR, the reference branch has no baseline file; that single genesis case is explicitly supported. After the baseline exists on `main`, baseline additions are blocked.

No secret or network API is required by the audit itself.

## 5. Violation model

Every violation produced by a rule has a common structure:

```text
rule_id
path
subject
fingerprint
message
severity
line (diagnostic only)
metadata (optional)
```

### 5.1 Stable identity

Violation identity is not based on line number.

The canonical identity is derived from exactly:

```text
rule_id + normalized repository-relative path + stable subject
```

The fingerprint is a deterministic SHA-256 hash of that canonical representation. Diagnostic text, severity, metadata, and line number are never part of identity.

The `subject` must therefore contain the rule-specific stable identity needed to distinguish violations. Examples: `button#clear-btn`, `a#copy-email-link`, `section#education>div.timeline-item:nth-of-type(3)>button:nth-of-type(1)`, `rel@a[href=...]`, `doi:10....`, or `title:<normalized-title>`.

When loading `known-debt.json`, the auditor recomputes every fingerprint from `rule_id`, `path`, and `subject` and rejects any stored fingerprint that does not match. This prevents hand-edited inconsistent identities.

Examples of stable subjects:

- element ID when available;
- deterministic DOM path for HTML elements without IDs, anchored at the nearest ancestor ID when possible and using structural `nth-of-type` indices only where needed to distinguish repeated siblings;
- translation key;
- internal path;
- normalized publication title/DOI;
- JSON object key path;
- dependency URL.

For HTML, this is required because the repository contains repeated controls with the same tag, class, and translation key. Identical-looking elements must remain distinct baseline identities. Adding or removing blank lines must not affect identity; moving/replacing the element to a different DOM structural position may intentionally create a NEW/RESOLVED pair because the structural subject changed.

The same violation moving from line 100 to line 120 remains the same debt item.

A different violation replacing it must be classified as new even if the total count is unchanged.

## 6. Baseline comparison states

Each current or baseline violation is classified as one of four states.

### PASS

No violation exists for the invariant.

### KNOWN

The current violation exactly matches a versioned baseline entry.

It is reported but does not fail the audit.

### NEW

A current violation has no matching baseline entry.

This is a regression and fails the audit.

### RESOLVED

A baseline entry no longer corresponds to a current violation.

This is progress, but the stale exception must be removed from `.audit/known-debt.json`. The audit fails until the baseline is reduced.

Treating RESOLVED as blocking prevents obsolete allowances from remaining indefinitely.

### 6.1 Baseline monotonicity

Comparing the candidate working tree only with its own `known-debt.json` is insufficient: a change could add a new defect and add the same fingerprint to the baseline in the same commit.

After the initial bootstrap, the candidate baseline must therefore be a **subset of the reference baseline** from the branch/commit being changed.

- existing baseline identities may remain;
- existing identities may be removed when the corresponding debt is fixed;
- new baseline identities are rejected as `BASELINE_GROWTH`;
- editing a reason or other non-identity metadata is allowed if the identity is unchanged;
- the first bootstrap is allowed only when the reference commit has no baseline file.

For pull requests, CI compares the candidate baseline to the pull request base branch. For pushes to `main`, CI compares it to the first parent of the pushed commit when a prior baseline exists.

This makes the baseline monotonically non-increasing under normal development. A future intentionally permanent exception belongs in `policy.json`, where it is reviewed as policy rather than disguised as technical debt.

## 7. Initial rule families

The first version should favor deterministic structural rules over subjective style rules.

### 7.1 File and serialization integrity

- `JSON_PARSE`: required repository data JSON files must parse. A parse failure is a blocking audit violation; rules that depend on that parsed file skip it without causing a secondary internal exception.
- `REQUIRED_FILE`: canonical required files must exist.
- `TRANSLATION_LANGUAGE_SET`: expected languages exist.
- `TRANSLATION_KEY_PARITY`: PT and EN contain the same keys.

### 7.2 HTML structural integrity

- `HTML_DUPLICATE_ID`: duplicate IDs within a page.
- `HTML_INTERNAL_LINK_TARGET`: relative internal file links resolve.
- `HTML_TARGET_BLANK_NO_NOOPENER`: external/new-tab links include `noopener`.
- `HTML_DUPLICATE_ATTRIBUTE`: invalid repeated attributes such as duplicate `rel`.
- `HTML_SELF_LINK`: redundant explicit links to the current HTML file when the link has no meaningful fragment target. Fragment-only navigation such as `#contact`, and links such as `index.html#contact`, are not self-link violations. A bare `href="#"` is handled separately by `HTML_ACTION_HASH_LINK`. Legitimate same-file exceptions, if ever needed, must be explicit in `.audit/policy.json`.

### 7.3 Control semantics

- `HTML_BUTTON_MISSING_TYPE`: every button has explicit `type`.
- `HTML_ACTION_HASH_LINK`: every bare `<a href="#">` is a violation. Real navigation to the top or to a section must use an explicit fragment target such as `#top` or `#contact`; non-navigation actions must use the appropriate control element. This keeps the rule deterministic and avoids guessing intent.

The initial known occurrences are baseline debt. New occurrences are blocked immediately.

### 7.4 Internationalization/accessibility consistency

- `I18N_FIXED_ARIA_LABEL`: translatable semantic labels must use the translation mechanism. Proper names/brands that are intentionally language-invariant must be enumerated in `.audit/policy.json`.
- `I18N_FIXED_TITLE`: translatable tooltips/titles must use the translation mechanism.
- `I18N_REFERENCE_MISSING`: declarative HTML translation references (`data-key`, `data-key-placeholder`, `data-key-title`, `data-key-aria-label`) must exist in every supported language.

Version 1 does not attempt general JavaScript AST analysis because the standard library has no JavaScript parser. Any JavaScript source checks must use narrow, rule-specific patterns with dedicated tests rather than a broad string search that treats unrelated literals as translation keys.

### 7.5 Academic/data invariants

- `ACADEMIC_REGISTRY_STRUCTURE`: required top-level registry structure and work identity fields.
- `ACADEMIC_REGISTRY_DUPLICATE_ID`.
- `ACADEMIC_REGISTRY_DUPLICATE_DOI`.
- `ACADEMIC_REGISTRY_DUPLICATE_TITLE` after deterministic title normalization.
- `BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE` for source-specific article lists where duplicates are structurally detectable.

The auditor does not decide whether a source legitimately contains records absent from the canonical registry. Cross-source bibliographic reconciliation remains a later data-architecture concern.

### 7.6 Legacy/runtime policy

- `LEGACY_MAXIMIZED_REFERENCE`: active compatibility references to `maximized`.
- `A11Y_REDUCED_MOTION_POLICY`: repository must eventually contain the agreed reduced-motion handling.
- `SECURITY_EXTERNAL_SCRIPT_INTEGRITY`: externally loaded executable dependencies without the selected integrity policy.
- `SECURITY_CSP_POLICY`: absence of the selected CSP mechanism.

These are initially expected to be known debt, not fixed in Block 1.

## 8. Rule registry and implementation boundaries

The initial implementation may remain in one Python file while the rule set is small, but rule execution must be registry-driven rather than a long monolithic procedural script.

Conceptually:

```python
RULES = [
    audit_json_files,
    audit_translation_parity,
    audit_html_structure,
    audit_control_semantics,
    audit_i18n_attributes,
    audit_academic_registry,
    audit_legacy_runtime_policy,
]
```

Each rule returns violations and does not decide whether they are KNOWN/NEW. Baseline classification is centralized.

This separation is important because later structural blocks will remove violations without rewriting the audit rules.

## 9. Parsing strategy

The audit uses only the standard library.

- JSON: `json`.
- HTML: `html.parser.HTMLParser` with a small purpose-built collector that preserves duplicate attributes and tracks a deterministic DOM path independently of source line numbers.
- Paths: `pathlib`.
- hashing: `hashlib`.
- tests/fixtures: `unittest`, `tempfile`.
- command-line interface: `argparse`.

Regex may be used for targeted source-code policy checks where no parser exists in the standard library, but not as a substitute for HTML parsing.

## 10. Command-line contract

The primary command is:

```bash
python scripts/audit_repository.py
```

Useful options should include:

```bash
python scripts/audit_repository.py --json
python scripts/audit_repository.py --baseline .audit/known-debt.json
python scripts/audit_repository.py --reference-baseline /tmp/base-known-debt.json
```

A special baseline-generation mode may be implemented for initial bootstrapping, but it must never silently overwrite the baseline. Generated output should require explicit review before being versioned.

### Exit codes

- `0`: only PASS and KNOWN states exist; no stale baseline entries.
- non-zero: NEW violation, RESOLVED baseline item, BASELINE_GROWTH, malformed policy/baseline, or fatal audit error.

## 11. Human-readable output

The default output should be concise and grouped by state, for example:

```text
Repository audit

PASS     12 rules clean
KNOWN    38 baseline violations
NEW       0
RESOLVED  0

Result: PASS
```

When NEW or RESOLVED items exist, print rule, path, subject, and a short diagnostic.

The auditor must not dump full source files or excessively verbose traces during normal CI execution.

## 12. Bootstrap procedure

The initial baseline is not produced by blindly accepting every emitted warning.

Bootstrap sequence:

1. implement and unit-test the audit engine;
2. run it against the current `main` snapshot;
3. inspect every detected violation;
4. classify false positives and fix the rule rather than baseline them;
5. version only genuine pre-existing debt;
6. rerun until the result is PASS with zero NEW and zero RESOLVED.

This establishes the structural freeze point.

The baseline commit itself must therefore be reviewable and attributable.

## 13. CI and branch policy

The workflow provides the automated signal for every pull request and for `main`.

Where repository settings permit, the audit check should become required before merging into `main`. If repository administration through the available integration cannot configure this safely, enabling the required-check rule is documented as a repository-settings follow-up rather than simulated in code.

The workflow must be green before later structural blocks are merged.

## 14. Error handling

Fatal audit-configuration/runtime conditions include:

- unreadable audit configuration where the failure is not representable as a repository rule;
- malformed `.audit/known-debt.json`;
- malformed `.audit/policy.json`;
- duplicate baseline identities;
- duplicate policy-exception identities;
- stored baseline fingerprint inconsistent with its `rule_id`, `path`, and `subject`;
- policy references to unknown rule IDs;
- unsupported baseline or policy schema version;
- internal rule exception.

Malformed or missing repository content that has a dedicated rule, such as an invalid required data JSON file or a missing required canonical file, is reported by that rule (`JSON_PARSE`, `REQUIRED_FILE`) rather than converted into an opaque internal fatal error. Dependent rules must skip unavailable parsed data cleanly.

Fatal audit errors are distinct from NEW violations and must return non-zero.

Optional files/rules must declare optionality explicitly rather than suppressing arbitrary exceptions.

## 15. Test strategy

### Unit tests

At minimum:

1. malformed required repository JSON is detected as JSON_PARSE and dependent rules skip cleanly;
2. duplicate HTML IDs are detected;
3. duplicate attributes are detected;
4. internal missing-file links are detected;
5. action `href="#"` is detected;
6. button without type is detected;
7. PT/EN key mismatch is detected;
8. duplicate academic IDs/DOIs/titles are detected;
9. stable fingerprint survives source-line movement;
10. repeated HTML elements without IDs receive distinct DOM-path subjects;
11. moving/replacing one repeated violation to a different DOM structural path is NEW even when the aggregate count is unchanged;
12. exact baseline match is KNOWN;
13. disappeared baseline entry is RESOLVED;
14. malformed baseline fails;
15. duplicate baseline identities fail;
16. stored fingerprint inconsistent with rule/path/subject fails;
17. malformed policy fails;
18. unknown rule ID in policy fails;
19. candidate baseline addition relative to a reference baseline fails as BASELINE_GROWTH;
20. removing an entry from the candidate baseline is allowed when the violation is also gone;
21. initial bootstrap without a reference baseline is allowed;
22. clean fixture exits successfully.

### Repository integration test

The test suite also invokes the auditor against the repository fixture/configuration needed to ensure CLI wiring works.

The actual repository audit is a separate CI step because its known debt is expected to evolve.

## 16. Non-goals for Block 1

This block does **not**:

- convert action links to buttons;
- add missing button types;
- refactor duplicated footer/navigation markup;
- split `utils.js`;
- remove `maximized`;
- add reduced-motion behavior;
- redesign translations;
- reconcile all bibliographic source discrepancies;
- implement CSP/SRI;
- reorganize the repository tree;
- automate academic data refresh;
- change visible site behavior.

Those changes belong to later structural blocks and must reduce the baseline under the protection of this auditor.

## 17. Acceptance criteria

Block 1 is complete when all of the following are true:

1. `python -m unittest discover -s tests -p "test_*.py"` passes.
2. `python scripts/audit_repository.py` passes on the branch.
3. The current genuine technical debt is explicitly represented in `.audit/known-debt.json`.
4. Repository-specific intentional exceptions are explicit in `.audit/policy.json`, not hidden in the debt baseline.
5. Adding a new violation to a fixture or temporary repository makes the audit fail.
6. Adding a new debt fingerprint to the candidate baseline relative to an existing reference baseline fails as BASELINE_GROWTH.
7. Resolving a baseline violation without updating the baseline also makes the audit fail.
8. Moving a known violation to another line does not create a false NEW item.
9. Replacing one known violation with another while keeping the same count creates a NEW item.
10. A stored fingerprint inconsistent with its rule/path/subject is rejected.
11. GitHub Actions runs tests and the audit on pull requests and pushes to `main`, including baseline monotonicity comparison.
12. No visible site behavior changes as part of this block.
13. The next structural block can remove debt by deleting corresponding baseline entries rather than changing audit policy.

## 18. Follow-on sequence

After this block is green:

1. **Block 2 — shared site architecture:** remove duplicated shared chrome and normalize common control semantics/i18n.
2. **Block 3 — content/data architecture:** consolidate canonical profile/content and academic-data maintenance.
3. **Block 4 — JavaScript/runtime architecture:** decompose `utils.js`, improve graceful degradation, safer DOM rendering, reduced motion.
4. **Block 5 — hardening/maintenance:** CSP/SRI, reproducible data tooling, repository organization, maintenance documentation.

The audit baseline should shrink throughout these blocks until structural debt tracked by it reaches zero or only explicitly justified permanent exceptions remain.
