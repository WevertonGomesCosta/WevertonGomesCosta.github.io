# Repository Audit Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a deterministic, baseline-aware repository auditor that freezes the current structural debt, blocks new regressions, detects resolved debt, and enforces the checks in GitHub Actions without changing visible site behavior.

**Architecture:** One Python standard-library CLI owns rule registration, parsing, stable violation identity, policy exceptions, baseline comparison, reporting, and bootstrap output. A unittest suite develops each layer in RED->GREEN order. Versioned .audit/policy.json defines intentional repository semantics; .audit/known-debt.json freezes genuine current debt; CI compares the candidate baseline with the base/parent baseline so debt is monotonically non-increasing.

**Tech Stack:** Python 3.13 standard library only; GitHub Actions with actions/checkout@v4 and actions/setup-python@v5.

**Spec:** docs/superpowers/specs/2026-09-24-repository-audit-foundation-design.md

## Global Constraints

- Standard library only; no package installation, network, or secrets.
- No visible site behavior changes in Block 1.
- Do not refactor shared HTML, utils.js, data content, CDN usage, or animations.
- Identity is exactly rule_id + normalized repository-relative path + stable subject.
- Line number, message, severity, and metadata are diagnostic only.
- Repeated no-ID HTML elements use deterministic DOM paths, not line numbers.
- known-debt.json is removable debt; policy.json is intentional policy.
- After bootstrap, candidate debt identities must be a subset of the reference baseline; additions are BASELINE_GROWTH.
- RESOLVED debt blocks until its stale baseline entry is deleted.
- Invalid repository data JSON is JSON_PARSE; malformed auditor policy/baseline is fatal configuration.
- HTML uses html.parser.HTMLParser. Regex is allowed only for narrow source-code rules with dedicated tests.
- Bootstrap debt is reconciled against an independent inventory before versioning.

## File Map

Create:
- scripts/audit_repository.py
- tests/test_repository_audit.py
- .audit/policy.json
- .audit/known-debt.json
- .github/workflows/repository-audit.yml

Do not modify:
- index.html
- publicacoes.html
- projetos.html
- politica-de-privacidade.html
- 404.html
- style.css
- utils.js
- translations.json
- academic-registry.json
- fallback-data.json

## Review Focus

1. Internal links: query strings, meaningful fragments, fragment-only links, root-relative links, mailto/tel, protocol-relative URLs, and path traversal.
2. Repeated DOM controls: identical no-ID elements remain distinct, while blank-line movement preserves identity.
3. Bibliographic normalization: Unicode hyphens/diacritics/punctuation and DOI URL prefixes normalize deterministically; empty DOIs are not duplicates.
4. Baseline genesis versus monotonic enforcement: first bootstrap has no reference; every later candidate addition fails.
5. Malformed required data JSON: exactly one JSON_PARSE violation and clean dependent-rule skipping, not a cascade.

---

### Task 1: Core identity, policy, and baseline engine

**Files**
- Create scripts/audit_repository.py
- Create tests/test_repository_audit.py

**Produces**
RULE_IDS, AuditConfigError, Violation, PolicyException, AuditPolicy, BaselineEntry, Baseline, AuditComparison, normalize_repo_path(), make_fingerprint(), load_policy(), load_baseline(), classify_violations(), find_baseline_growth().

- [ ] **Step 1: Write failing identity tests**

The first test class must pin these behaviors:

~~~python
class TestIdentityAndBaseline(unittest.TestCase):
    def test_fingerprint_ignores_line_and_message(self):
        a = audit.Violation(
            "HTML_BUTTON_MISSING_TYPE", "index.html", "button#x", "one", line=10
        )
        b = audit.Violation(
            "HTML_BUTTON_MISSING_TYPE", "./index.html", "button#x", "two", line=900
        )
        self.assertEqual(a.fingerprint, b.fingerprint)

    def test_windows_and_posix_paths_have_same_identity(self):
        self.assertEqual(
            audit.make_fingerprint(
                "HTML_BUTTON_MISSING_TYPE", r"pages\index.html", "button#x"
            ),
            audit.make_fingerprint(
                "HTML_BUTTON_MISSING_TYPE", "pages/index.html", "button#x"
            ),
        )

    def test_different_subject_is_different_identity(self):
        self.assertNotEqual(
            audit.make_fingerprint(
                "HTML_BUTTON_MISSING_TYPE", "index.html", "button#one"
            ),
            audit.make_fingerprint(
                "HTML_BUTTON_MISSING_TYPE", "index.html", "button#two"
            ),
        )
~~~

Use importlib.util to import scripts/audit_repository.py by path and tempfile.TemporaryDirectory for fixtures.

- [ ] **Step 2: Run RED**

Run:

~~~bash
python -m unittest tests.test_repository_audit.TestIdentityAndBaseline -v
~~~

Expected: import/file failure or missing interfaces.

- [ ] **Step 3: Implement core identity**

Define all 23 rule IDs from the spec and SCHEMA_VERSION = 1.

Implement path normalization and SHA-256 identity:

~~~python
def normalize_repo_path(value: str) -> str:
    normalized = value.replace("\\", "/")
    parts = PurePosixPath(normalized).parts
    while parts and parts[0] == ".":
        parts = parts[1:]
    if not parts or parts[0] == "/" or ".." in parts:
        raise AuditConfigError(f"Invalid repository-relative path: {value!r}")
    return PurePosixPath(*parts).as_posix()

def make_fingerprint(rule_id: str, path: str, subject: str) -> str:
    canonical = "\x1f".join((rule_id, normalize_repo_path(path), subject))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
~~~

Violation.fingerprint and PolicyException.fingerprint are computed properties. BaselineEntry stores the supplied fingerprint.

- [ ] **Step 4: Run identity tests GREEN**

Expected: 3 tests pass.

- [ ] **Step 5: Add failing loader/comparison tests**

Pin:
- unknown policy rule -> AuditConfigError;
- duplicate policy identity -> AuditConfigError;
- unsupported schema -> AuditConfigError;
- baseline fingerprint mismatch -> AuditConfigError;
- duplicate baseline identity -> AuditConfigError;
- exact current/baseline identity -> KNOWN;
- baseline identity absent from current -> RESOLVED;
- same count but different subject -> NEW;
- candidate fingerprint absent from reference -> BASELINE_GROWTH;
- candidate removal -> no growth.

- [ ] **Step 6: Run RED**

~~~bash
python -m unittest \
  tests.test_repository_audit.TestPolicyAndBaselineLoading \
  tests.test_repository_audit.TestBaselineComparison -v
~~~

- [ ] **Step 7: Implement strict loaders/comparison**

Policy schema:

~~~json
{
  "schema_version": 1,
  "audited_html": ["index.html"],
  "exceptions": [
    {
      "rule_id": "I18N_FIXED_ARIA_LABEL",
      "path": "index.html",
      "subject": "span#brand",
      "reason": "Intentional invariant brand name"
    }
  ]
}
~~~

Validate paths, rule IDs, non-empty reason/subject, duplicate identities, schema version, and baseline fingerprint recomputation. Sort results by rule_id, path, subject.

- [ ] **Step 8: Run Task 1 suite GREEN**

- [ ] **Step 9: Commit**

~~~bash
git add scripts/audit_repository.py tests/test_repository_audit.py
git commit -m "feat: add audit identity and baseline engine"
~~~

---

### Task 2: Deterministic HTML parser and structural/control rules

**Files**
- Modify scripts/audit_repository.py
- Modify tests/test_repository_audit.py

**Produces**
HtmlElement, HtmlDocument, parse_html(), element_subject(), audit_html_structure().

- [ ] **Step 1: Write failing DOM identity tests**

Pin:
- two identical no-ID buttons below different siblings -> distinct subjects;
- same DOM plus blank lines -> same subjects;
- moving the button from section to aside -> different subject.

- [ ] **Step 2: Run RED**

~~~bash
python -m unittest tests.test_repository_audit.TestHtmlParserIdentity -v
~~~

- [ ] **Step 3: Implement HTML collector**

Use HTMLParser and preserve ordered attribute pairs so duplicate attributes remain visible. Track per-parent tag counts.

Segments:
- element with id: tag#id
- no id: tag:nth-of-type(N)

The stored DOM path begins at the nearest ancestor containing an id, otherwise at the document root. Void tags are not pushed.

- [ ] **Step 4: Run parser identity tests GREEN**

- [ ] **Step 5: Write failing structural/control tests**

Pin exact examples for:
- duplicate IDs;
- duplicate rel attributes;
- button without type versus explicit type;
- bare href="#" versus href="#contact";
- target="_blank" without noopener versus with noopener;
- explicit index.html self-link versus index.html#contact;
- valid about.html?x=1#bio;
- mailto, tel, https, and protocol-relative URLs;
- missing.html;
- ../outside.html path escape.

- [ ] **Step 6: Run RED**

~~~bash
python -m unittest tests.test_repository_audit.TestHtmlRules -v
~~~

- [ ] **Step 7: Implement structural rules**

Stable subjects:
- duplicate ID -> id:<value>
- duplicate attribute -> <element-subject>@attr:<name>
- invalid local href -> <element-subject>@href:<raw-href>
- target blank -> <element-subject>@target:_blank
- self-link -> <element-subject>@self:<href>
- missing button type -> element subject
- bare hash -> element subject

Resolve URLs with urllib.parse.urlsplit/unquote. Constrain local resolution to repository root. A trailing slash resolves to index.html.

- [ ] **Step 8: Run Task 2 plus full suite GREEN**

~~~bash
python -m unittest tests.test_repository_audit.TestHtmlParserIdentity \
  tests.test_repository_audit.TestHtmlRules -v
python -m unittest discover -s tests -p "test_*.py"
~~~

- [ ] **Step 9: Commit**

~~~bash
git add scripts/audit_repository.py tests/test_repository_audit.py
git commit -m "feat: audit HTML structure and controls"
~~~

---

### Task 3: Required files, JSON integrity, translations, and policy filtering

**Files**
- Modify scripts/audit_repository.py
- Modify tests/test_repository_audit.py
- Create .audit/policy.json

**Produces**
REQUIRED_FILES, REQUIRED_DATA_JSON, audit_repository_data(), apply_policy_exceptions().

- [ ] **Step 1: Write failing required-file/JSON tests**

Use these canonical files:

~~~python
REQUIRED_FILES = (
    "index.html", "publicacoes.html", "projetos.html",
    "politica-de-privacidade.html", "404.html",
    "style.css", "utils.js",
    "translations.json", "academic-registry.json", "fallback-data.json",
    "robots.txt", "sitemap.xml",
)
REQUIRED_DATA_JSON = (
    "translations.json", "academic-registry.json", "fallback-data.json",
)
SUPPORTED_LANGUAGES = ("pt", "en")
~~~

Pin:
- absent translations.json -> REQUIRED_FILE subject file:translations.json;
- malformed translations.json -> exactly one JSON_PARSE;
- translation-dependent rules skip malformed translations instead of throwing.

- [ ] **Step 2: Run RED**

~~~bash
python -m unittest tests.test_repository_audit.TestRepositoryDataRules -v
~~~

- [ ] **Step 3: Implement safe data loading**

A helper returns None on missing/invalid repository data, appends JSON_PARSE on read/parse failure, and prevents downstream cascades.

- [ ] **Step 4: Write failing i18n tests**

Pin:
1. PT/EN key mismatch -> TRANSLATION_KEY_PARITY.
2. wrong language set -> TRANSLATION_LANGUAGE_SET.
3. p#missing data-key="missing-key" absent in both languages -> one I18N_REFERENCE_MISSING with subject p#missing@data-key:missing-key and missing-language metadata.
4. aria-label without data-key-aria-label -> I18N_FIXED_ARIA_LABEL.
5. title without data-key-title -> I18N_FIXED_TITLE.
6. exact PolicyException fingerprint suppresses only its exact violation.

- [ ] **Step 5: Run RED**

~~~bash
python -m unittest tests.test_repository_audit.TestTranslationRules -v
~~~

- [ ] **Step 6: Implement declarative i18n checks**

Only inspect:
- data-key
- data-key-placeholder
- data-key-title
- data-key-aria-label

Do not infer arbitrary JavaScript translation strings.

Policy filtering is exact fingerprint filtering after rule emission.

- [ ] **Step 7: Create the real policy**

~~~json
{
  "schema_version": 1,
  "audited_html": [
    "index.html",
    "publicacoes.html",
    "projetos.html",
    "politica-de-privacidade.html",
    "404.html"
  ],
  "exceptions": []
}
~~~

No bootstrap debt is hidden as policy.

- [ ] **Step 8: Run Task 3 plus full suite GREEN**

- [ ] **Step 9: Commit**

~~~bash
git add scripts/audit_repository.py tests/test_repository_audit.py .audit/policy.json
git commit -m "feat: audit repository data and translations"
~~~

---

### Task 4: Academic, legacy, motion, and security rules

**Files**
- Modify scripts/audit_repository.py
- Modify tests/test_repository_audit.py

**Produces**
normalize_title(), normalize_doi(), audit_academic_and_runtime().

- [ ] **Step 1: Write failing academic normalization tests**

Pin:

~~~python
self.assertEqual(
    audit.normalize_title("Genome‐enabled: Predição, Café."),
    audit.normalize_title("Genome-enabled predicao cafe"),
)
self.assertEqual(
    audit.normalize_doi("https://doi.org/10.1234/ABC "),
    "10.1234/abc",
)
~~~

Also prove empty/None DOIs are not duplicates and that ID/DOI/title duplicates are independently detected.

- [ ] **Step 2: Run RED**

~~~bash
python -m unittest tests.test_repository_audit.TestAcademicRules -v
~~~

- [ ] **Step 3: Implement academic rules**

Registry top-level required keys:
schema_version, updated_at, source_basis, summary, works.

Every work requires non-empty id, type, status, title; non-empty string-list authors; integer year; DOI optional.

Normalize title with NFKD, remove combining marks, lowercase, replace non-alphanumerics with spaces, collapse whitespace. Normalize DOI by lowercase/trim and stripping https://doi.org/ or http://dx.doi.org/.

Subjects:
- id:<id>
- doi:<normalized-doi>
- title:<normalized-title>
- source:<source>|title:<normalized-title>

- [ ] **Step 4: Write failing runtime/security tests**

Pin:
- the current kind of Unicode-hyphen duplicate in a bibliometric source;
- processPlatformData(... "maximized") and acad.maximized as two distinct legacy violations;
- prefers-reduced-motion present -> no motion debt;
- external script without integrity -> violation; external with integrity and local script -> clean;
- CSP present on one audited page and absent on another -> violation only on missing page.

- [ ] **Step 5: Run RED**

~~~bash
python -m unittest tests.test_repository_audit.TestRuntimePolicyRules -v
~~~

- [ ] **Step 6: Implement narrow runtime/security rules**

Use only these active legacy patterns:

~~~python
MAXIMIZED_PATTERNS = (
    ("processPlatformData:maximized",
     re.compile(r"processPlatformData\s*\([^\n;]*['\"]maximized['\"]")),
    ("property:acad.maximized",
     re.compile(r"\bacad\.maximized\b")),
)
~~~

Reduced motion: search style.css, utils.js, and audited HTML for literal prefers-reduced-motion. If absent, one violation at style.css with subject site:prefers-reduced-motion.

External script integrity: each external/protocol-relative script src without non-empty integrity is one violation, subject full src.

CSP: each audited HTML page requires a non-empty meta http-equiv="Content-Security-Policy"; absent subject document:csp-meta.

- [ ] **Step 7: Run Task 4 plus full suite GREEN**

- [ ] **Step 8: Commit**

~~~bash
git add scripts/audit_repository.py tests/test_repository_audit.py
git commit -m "feat: audit academic and runtime debt"
~~~

---

### Task 5: Orchestration, CLI, reporting, and bootstrap baseline

**Files**
- Modify scripts/audit_repository.py
- Modify tests/test_repository_audit.py
- Create .audit/known-debt.json

**Produces**
RULES, AuditReport, run_audit(), write_bootstrap_baseline(), main().
CLI: --root, --policy, --baseline, --reference-baseline, --json, --emit-current-debt.

- [ ] **Step 1: Write failing orchestration tests**

Pin:
- clean fixture -> PASS;
- new missing-type button -> NEW/fail;
- stale baseline entry -> RESOLVED/fail;
- violation inserted into candidate baseline while reference is empty -> BASELINE_GROWTH/fail;
- no reference argument -> genesis mode does not invent growth.

- [ ] **Step 2: Run RED**

~~~bash
python -m unittest tests.test_repository_audit.TestAuditOrchestration -v
~~~

- [ ] **Step 3: Implement orchestration**

Rule groups:

~~~python
RULES = (
    audit_html_structure,
    audit_repository_data,
    audit_academic_and_runtime,
)
~~~

run_audit sequence:
1. resolve root/policy/baseline;
2. load policy and candidate baseline;
3. execute rule groups;
4. apply policy exceptions;
5. reject duplicate emitted fingerprints;
6. classify current versus candidate baseline;
7. if reference supplied, calculate baseline growth;
8. return sorted report.

AuditReport.passed is true only if NEW, RESOLVED, and GROWTH are empty.

- [ ] **Step 4: Write failing CLI/bootstrap tests**

Pin:
- generated bootstrap refuses overwrite;
- entries are sorted by rule/path/subject;
- every fingerprint recomputes;
- main returns 0 PASS, 1 audit failure, 2 fatal configuration;
- --json output parses with json.loads.

- [ ] **Step 5: Run RED**

~~~bash
python -m unittest tests.test_repository_audit.TestCli -v
~~~

- [ ] **Step 6: Implement CLI and reporting**

Bootstrap reason exactly:
Pre-existing debt frozen before structural block 2

Human output:

~~~text
Repository audit

PASS       <N> rules clean
KNOWN      <N> baseline violations
NEW        <N>
RESOLVED   <N>
GROWTH     <N>

Result: PASS|FAIL
~~~

- [ ] **Step 7: Run all unit tests GREEN**

~~~bash
python -m unittest discover -s tests -p "test_*.py"
~~~

- [ ] **Step 8: Generate bootstrap candidate**

~~~bash
rm -f .audit/known-debt.generated.json
python scripts/audit_repository.py \
  --emit-current-debt .audit/known-debt.generated.json
~~~

- [ ] **Step 9: Reconcile against the independent inventory**

The current branch base has been independently measured. The generated debt must be exactly:

~~~text
HTML_BUTTON_MISSING_TYPE                 21
HTML_ACTION_HASH_LINK                    13
I18N_FIXED_ARIA_LABEL                    19
I18N_REFERENCE_MISSING                    1
BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE       1
LEGACY_MAXIMIZED_REFERENCE                2
A11Y_REDUCED_MOTION_POLICY                1
SECURITY_EXTERNAL_SCRIPT_INTEGRITY        2
SECURITY_CSP_POLICY                       5
TOTAL                                    65
~~~

The single I18N_REFERENCE_MISSING is politica-de-privacidade.html -> privacy-services-p2, absent in PT and EN.

Run:

~~~bash
python - <<'PY'
import json
from collections import Counter
with open(".audit/known-debt.generated.json", encoding="utf-8") as f:
    data = json.load(f)
counts = Counter(x["rule_id"] for x in data["entries"])
expected = {
    "HTML_BUTTON_MISSING_TYPE": 21,
    "HTML_ACTION_HASH_LINK": 13,
    "I18N_FIXED_ARIA_LABEL": 19,
    "I18N_REFERENCE_MISSING": 1,
    "BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE": 1,
    "LEGACY_MAXIMIZED_REFERENCE": 2,
    "A11Y_REDUCED_MOTION_POLICY": 1,
    "SECURITY_EXTERNAL_SCRIPT_INTEGRITY": 2,
    "SECURITY_CSP_POLICY": 5,
}
assert counts == expected, (counts, expected)
assert len(data["entries"]) == 65
print("bootstrap debt verified: 65/65")
PY
~~~

Expected: bootstrap debt verified: 65/65.

Any extra finding must be inspected. False positives are fixed in the rule RED->GREEN, not baselined. Any missing expected finding requires fixing the detector before proceeding.

- [ ] **Step 10: Promote baseline and verify PASS**

~~~bash
mv .audit/known-debt.generated.json .audit/known-debt.json
python scripts/audit_repository.py
~~~

Expected: KNOWN 65, NEW 0, RESOLVED 0, GROWTH 0, Result PASS.

- [ ] **Step 11: Commit**

~~~bash
git add scripts/audit_repository.py tests/test_repository_audit.py \
  .audit/policy.json .audit/known-debt.json
git commit -m "feat: bootstrap repository audit baseline"
~~~

---

### Task 6: GitHub Actions enforcement and end-to-end verification

**Files**
- Create .github/workflows/repository-audit.yml
- Modify tests/test_repository_audit.py

- [ ] **Step 1: Write failing workflow contract test**

The test reads the workflow and asserts these literal contracts:
- pull_request trigger;
- push branches: [main];
- fetch-depth: 0;
- unit-test command;
- github.event.pull_request.base.sha;
- git rev-parse HEAD^1;
- --reference-baseline;
- repository-audit CLI command.

- [ ] **Step 2: Run RED**

~~~bash
python -m unittest tests.test_repository_audit.TestWorkflowContract -v
~~~

Expected: FileNotFoundError.

- [ ] **Step 3: Create workflow**

Use:

~~~yaml
name: Repository audit

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-python@v5
        with:
          python-version: "3.13"

      - name: Run unit tests
        run: python -m unittest discover -s tests -p "test_*.py"

      - name: Resolve reference baseline
        id: reference
        shell: bash
        run: |
          set -euo pipefail
          rm -f /tmp/base-known-debt.json
          if [[ "\${{ github.event_name }}" == "pull_request" ]]; then
            BASE_SHA="\${{ github.event.pull_request.base.sha }}"
            git show "\${BASE_SHA}:.audit/known-debt.json" \
              > /tmp/base-known-debt.json 2>/dev/null || true
          elif [[ "\${{ github.event_name }}" == "push" ]]; then
            if git rev-parse HEAD^1 >/dev/null 2>&1; then
              PARENT_SHA="$(git rev-parse HEAD^1)"
              git show "\${PARENT_SHA}:.audit/known-debt.json" \
                > /tmp/base-known-debt.json 2>/dev/null || true
            fi
          fi
          if [[ -s /tmp/base-known-debt.json ]]; then
            echo "has_reference=true" >> "$GITHUB_OUTPUT"
          else
            rm -f /tmp/base-known-debt.json
            echo "has_reference=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Audit with reference
        if: steps.reference.outputs.has_reference == 'true'
        run: >-
          python scripts/audit_repository.py
          --reference-baseline /tmp/base-known-debt.json

      - name: Audit bootstrap/manual case
        if: steps.reference.outputs.has_reference != 'true'
        run: python scripts/audit_repository.py
~~~

Genesis is valid only while the base commit has no baseline. After Block 1 lands, later PRs/pushes use a reference baseline.

- [ ] **Step 4: Run workflow test and complete suite GREEN**

~~~bash
python -m unittest tests.test_repository_audit.TestWorkflowContract -v
python -m unittest discover -s tests -p "test_*.py"
python scripts/audit_repository.py
~~~

Expected: tests PASS and audit KNOWN 65 / NEW 0 / RESOLVED 0 / GROWTH 0.

- [ ] **Step 5: Verify only foundation files changed**

~~~bash
git diff --name-only main...HEAD
git diff --check main...HEAD
git status --short
~~~

Expected changed set only:
- .audit/known-debt.json
- .audit/policy.json
- .github/workflows/repository-audit.yml
- docs/superpowers/plans/2026-09-24-repository-audit-foundation.md
- docs/superpowers/specs/2026-09-24-repository-audit-foundation-design.md
- scripts/audit_repository.py
- tests/test_repository_audit.py

No runtime content file may appear.

- [ ] **Step 6: Commit workflow**

~~~bash
git add .github/workflows/repository-audit.yml tests/test_repository_audit.py
git commit -m "ci: enforce repository audit"
~~~

- [ ] **Step 7: Final local acceptance**

~~~bash
python -m unittest discover -s tests -p "test_*.py"
python scripts/audit_repository.py
git diff --check main...HEAD
git status --short
~~~

Expected: green suite; audit PASS with 65 KNOWN and zero NEW/RESOLVED/GROWTH; clean tree.

- [ ] **Step 8: Verify implementation PR CI**

Expected:
- unit tests green;
- only this bootstrap PR may take the no-reference genesis path;
- audit green;
- no secrets/network dependency.

If repository settings access safely permits requiring the status check on main, require Repository audit / audit. Otherwise record branch protection as an explicit follow-up and do not claim it was configured.

---

## Final Whole-Branch Review Checklist

1. Every RULE_IDS member has implementation coverage; no registered rule is silently dead.
2. known-debt.json contains exactly the 65 independently verified current violations.
3. policy.json contains no exception introduced merely to make bootstrap pass.
4. New violation plus matching candidate-baseline addition fails against an existing reference baseline.
5. Removing a known violation while retaining its baseline entry fails as RESOLVED.
6. Repeated no-ID elements remain individually identifiable without line-number identity.
7. Runtime site files are byte-for-byte unchanged from branch base.
8. --json output parses as JSON; normal CI output remains concise.
9. Workflow genesis is possible only when the reference commit truly lacks the baseline.
10. Tests use only standard library/temp files and make no network calls.
11. Any Critical/Important final-review finding receives a new failing regression test before its fix.

## Execution Handoff

- **Subagent-driven:** fresh implementation/review context per task plus final whole-branch review. Preferred because identity, HTML parsing, baseline monotonicity, data normalization, and CI semantics are independent failure surfaces whose mistakes could weaken every later structural block.
- **Native:** implement all six tasks in one session with TDD and one final whole-branch review. Faster/cheaper, with independent review only at the end.

**Recommendation:** Subagent-driven if available. Native is acceptable when speed/cost is the priority, provided the final whole-branch review is retained.
