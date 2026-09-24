# Repository Audit Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a deterministic, baseline-aware repository auditor that freezes the current structural debt, blocks new regressions, detects resolved debt, and enforces the checks in GitHub Actions without changing visible site behavior.

**Architecture:** A thin Python CLI delegates to a focused standard-library `repository_audit` package split into core identity/configuration, HTML rules, data rules, runtime/security rules, and orchestration. A responsibility-split unittest suite develops each layer in RED->GREEN order. Versioned .audit/policy.json defines intentional exceptions; .audit/known-debt.json freezes genuine current debt; CI compares the candidate baseline with the PR base SHA or push-event `before` SHA so debt is monotonically non-increasing.

**Tech Stack:** Python 3.13 standard library only; GitHub Actions with actions/checkout@v4 and actions/setup-python@v5.

**Spec:** docs/superpowers/specs/2026-09-24-repository-audit-foundation-design.md

## Global Constraints

- Standard library only; no package installation, network, or secrets.
- No visible site behavior changes in Block 1.
- Do not refactor shared HTML, utils.js, data content, CDN usage, or animations.
- Identity is exactly rule_id + normalized repository-relative path + stable subject.
- Line number, message, severity, and metadata are diagnostic only.
- Repeated no-ID HTML elements use deterministic DOM paths, not line numbers.
- REQUIRED_HTML is the canonical required-page set, while all root-level `*.html` files are automatically discovered and audited; policy.json cannot narrow either.
- known-debt.json is removable debt; policy.json is intentional policy; every policy exception must match a raw current violation or configuration fails as stale.
- After bootstrap, candidate debt identities must be a subset of the reference baseline; additions are BASELINE_GROWTH.
- RESOLVED debt blocks until its stale baseline entry is deleted.
- Invalid repository data JSON is JSON_PARSE; malformed auditor policy/baseline is fatal configuration.
- HTML uses html.parser.HTMLParser. Regex is allowed only for narrow source-code rules with dedicated tests.
- Bootstrap debt is reconciled against an independent inventory before versioning.
- The independent 65-item inventory is anchored to merge base `8ce0d58126b182bc3b1570733843dd1c0ffbddde`; if execution starts from a different merge base, stop before Task 1 and re-audit/revise the inventory rather than forcing the old count.

## File Map

Create:
- scripts/audit_repository.py
- scripts/repository_audit/__init__.py
- scripts/repository_audit/core.py
- scripts/repository_audit/html_rules.py
- scripts/repository_audit/data_rules.py
- scripts/repository_audit/runtime_rules.py
- scripts/repository_audit/engine.py
- scripts/repository_audit/__init__.py
- scripts/repository_audit/core.py
- scripts/repository_audit/html_rules.py
- scripts/repository_audit/data_rules.py
- scripts/repository_audit/runtime_rules.py
- scripts/repository_audit/engine.py
- tests/test_audit_core.py
- tests/test_audit_html.py
- tests/test_audit_data.py
- tests/test_audit_runtime.py
- tests/test_audit_cli.py
- tests/test_audit_workflow.py
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

### Pre-flight inventory anchor

Before Task 1, verify:

~~~bash
BASE="$(git merge-base main HEAD)"
test "$BASE" = "8ce0d58126b182bc3b1570733843dd1c0ffbddde"
~~~

Expected: exit 0. If it fails, the 65-item independent inventory is no longer authoritative for the execution base. Re-run the structural inventory and update the spec/plan before writing implementation code.

## Review Focus

1. A multi-commit direct push to main must compare baseline growth with `github.event.before`, not merely `HEAD^1`.
2. Policy cannot narrow the audited-page set; every policy exception must match a raw current violation, so obsolete exceptions cannot hide later regressions.
3. Repeated DOM controls without IDs remain distinct while blank-line/source-line movement preserves identity.
4. Bootstrap mode works when candidate known-debt.json does not yet exist, but normal audit mode treats a missing baseline as configuration failure.
5. Security/accessibility debt cannot be cleared by placeholder syntax: invalid SRI, missing crossorigin, comments mentioning reduced motion, or incomplete CSP remain violations.

---

### Task 1: Core identity, policy, and baseline engine

**Files**
- Create scripts/repository_audit/__init__.py
- Create scripts/repository_audit/core.py
- Create tests/test_audit_core.py

**Produces**
RULE_IDS, REQUIRED_HTML, AuditConfigError, Violation, PolicyException, AuditPolicy, BaselineEntry, Baseline, AuditComparison, normalize_repo_path(), make_fingerprint(), load_policy(), load_baseline(), classify_violations(), find_baseline_growth().

- [ ] **Step 1: Write failing identity tests**

At the top of each test module, add `<repo>/scripts` to `sys.path` and import from `repository_audit`.

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
python -m unittest tests.test_audit_core.TestIdentityAndBaseline -v
~~~

Expected: import/file failure or missing interfaces.

- [ ] **Step 3: Implement core identity**

Define all 23 rule IDs from the spec, SCHEMA_VERSION = 1, and the canonical required-page set:

~~~python
REQUIRED_HTML = (
    "index.html",
    "publicacoes.html",
    "projetos.html",
    "politica-de-privacidade.html",
    "404.html",
)
~~~

The discovered audit scope is not stored in policy. Task 2 will implement `discover_audited_html(root)` from root-level `*.html` files.

Violation.severity defaults to the only version-1 value, `"error"`; validate/reject any other severity in version 1.

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
- any unknown policy top-level key (including a legacy audited_html override) -> AuditConfigError;
- any unknown policy-exception entry key -> AuditConfigError;
- any unknown baseline top-level/entry key -> AuditConfigError;
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
git add scripts/repository_audit/__init__.py scripts/repository_audit/core.py   tests/test_audit_core.py
git commit -m "feat: add audit identity and baseline core"
~~~

---

### Task 2: Deterministic HTML parser and structural/control rules

**Files**
- Create scripts/repository_audit/html_rules.py
- Create tests/test_audit_html.py

**Consumes**
Task 1 core models, rule IDs and REQUIRED_HTML.

**Produces**
HtmlElement, HtmlDocument, discover_audited_html(), parse_html(), element_subject(), audit_html_structure().

- [ ] **Step 1: Write failing DOM identity tests**

Pin:
- discover_audited_html(root) returns the five fixture/root HTML files in deterministic sorted order;
- adding root-level extra.html makes it appear automatically without policy/config changes;
- nested docs/example.html is not included in version-1 root-page scope;
- two identical no-ID buttons below different siblings -> distinct subjects;
- same DOM plus blank lines -> same subjects;
- moving the button from section to aside -> different subject.

- [ ] **Step 2: Run RED**

~~~bash
python -m unittest tests.test_audit_html.TestHtmlParserIdentity -v
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
- valid about.html?x=1#bio when about.html contains id="bio";
- href="#missing" and about.html#missing -> HTML_INTERNAL_LINK_TARGET;
- query-only href="?view=full" is not a redundant self-link;
- root-relative "/" -> index.html and "/publicacoes.html" -> publicacoes.html;
- mailto, tel, https, and protocol-relative URLs;
- missing.html;
- ../outside.html path escape.

- [ ] **Step 6: Run RED**

~~~bash
python -m unittest tests.test_audit_html.TestHtmlRules -v
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

Resolve URLs with urllib.parse.urlsplit/unquote. Constrain local resolution to repository root. A trailing slash resolves to index.html. For an HTML target with a non-empty decoded fragment, parse the target and require a matching id; missing ids emit HTML_INTERNAL_LINK_TARGET. A same-file URL is HTML_SELF_LINK only when both query and fragment are empty. All HTML rules iterate `discover_audited_html(root)`; policy has no API capable of reducing that set.

- [ ] **Step 8: Run Task 2 plus full suite GREEN**

~~~bash
python -m unittest tests.test_audit_html.TestHtmlParserIdentity \
  tests.test_audit_html.TestHtmlRules -v
python -m unittest discover -s tests -p "test_*.py"
~~~

- [ ] **Step 9: Commit**

~~~bash
git add scripts/repository_audit/html_rules.py tests/test_audit_html.py
git commit -m "feat: audit HTML structure and controls"
~~~

---

### Task 3: Required files, JSON integrity, translations, and policy filtering

**Files**
- Create scripts/repository_audit/data_rules.py
- Create tests/test_audit_data.py
- Create .audit/policy.json

**Consumes**
Task 1 core models/rule IDs and Task 2 parsed HTML documents.

**Produces**
REQUIRED_FILES, REQUIRED_DATA_JSON, read_repository_json(), audit_repository_data(). Policy filtering itself is owned by Task 5 engine so stale exceptions can be validated against the complete raw violation set.

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
python -m unittest tests.test_audit_data.TestRepositoryDataRules -v
~~~

- [ ] **Step 3: Implement safe data loading**

Implement a pure read_repository_json(root, relative) helper returning (data, error). audit_repository_data is the sole owner that converts a non-null error into JSON_PARSE. Later academic/data rules call the same helper and, when data is None, skip dependent checks without emitting a second JSON_PARSE. This prevents duplicate parse violations across rule groups.

- [ ] **Step 4: Write failing i18n tests**

Pin:
1. PT/EN key mismatch -> TRANSLATION_KEY_PARITY.
2. wrong language set -> TRANSLATION_LANGUAGE_SET.
3. p#missing data-key="missing-key" absent in both languages -> one I18N_REFERENCE_MISSING with subject p#missing@data-key:missing-key and missing-language metadata.
4. aria-label without data-key-aria-label -> I18N_FIXED_ARIA_LABEL.
5. title without data-key-title -> I18N_FIXED_TITLE.
6. the data rule group emits raw violations without suppressing policy exceptions; policy suppression/stale validation is tested in Task 5 after all raw rule groups are available.

- [ ] **Step 5: Run RED**

~~~bash
python -m unittest tests.test_audit_data.TestTranslationRules -v
~~~

- [ ] **Step 6: Implement declarative i18n checks**

Only inspect:
- data-key
- data-key-placeholder
- data-key-title
- data-key-aria-label

Do not infer arbitrary JavaScript translation strings.

- [ ] **Step 7: Create the real policy**

~~~json
{
  "schema_version": 1,
  "exceptions": []
}
~~~

REQUIRED_HTML comes only from Task 1 code and is not configurable here.

No bootstrap debt is hidden as policy.

- [ ] **Step 8: Run Task 3 plus full suite GREEN**

- [ ] **Step 9: Commit**

~~~bash
git add scripts/repository_audit/data_rules.py tests/test_audit_data.py .audit/policy.json
git commit -m "feat: audit repository data and translations"
~~~

---

### Task 4: Academic, legacy, motion, and security rules

**Files**
- Modify scripts/repository_audit/data_rules.py
- Create scripts/repository_audit/runtime_rules.py
- Modify tests/test_audit_data.py
- Create tests/test_audit_runtime.py

**Produces**
normalize_title(), normalize_doi(), audit_academic_data(), audit_runtime_policy().

**Consumes**
Task 3 read_repository_json(). Academic checks must never emit JSON_PARSE themselves: if academic-registry.json or fallback-data.json cannot be parsed, they skip dependent checks because Task 3 already owns the single JSON_PARSE violation.

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
self.assertEqual(
    audit.normalize_doi("https://dx.doi.org/10.1234/ABC"),
    "10.1234/abc",
)
self.assertEqual(audit.normalize_doi("doi:10.1234/ABC"), "10.1234/abc")
~~~

Also prove empty/None DOIs are not duplicates and that ID/DOI/title duplicates are independently detected.

- [ ] **Step 2: Run RED**

~~~bash
python -m unittest tests.test_audit_data.TestAcademicRules -v
~~~

- [ ] **Step 3: Implement academic rules**

Registry top-level required keys:
schema_version, updated_at, source_basis, summary, works.

Every work requires non-empty id, type, status, title; non-empty string-list authors; integer year; DOI optional.

Normalize title with NFKD, remove combining marks, lowercase, replace non-alphanumerics with spaces, collapse whitespace. Normalize DOI by lowercase/trim and strip common prefixes case-insensitively: `doi:`, `https://doi.org/`, `http://doi.org/`, `https://dx.doi.org/`, and `http://dx.doi.org/`.

Subjects:
- id:<id>
- doi:<normalized-doi>
- title:<normalized-title>
- source:<source>|title:<normalized-title>

- [ ] **Step 4: Write failing runtime/security tests**

Pin:
- the current kind of Unicode-hyphen duplicate in a bibliometric source;
- processPlatformData(... "maximized") and acad.maximized as two distinct legacy violations;
- CSS @media plus JavaScript matchMedia reduced-motion handling -> clean;
- a comment containing "prefers-reduced-motion" without active CSS/JS handling -> violation;
- external script without integrity -> violation;
- external script with malformed integrity -> violation;
- valid sha384-* integrity but missing crossorigin="anonymous" -> violation;
- valid SRI plus crossorigin="anonymous" and a local script -> clean;
- CSP meta lacking default-src or script-src -> violation;
- CSP containing both required directives on one audited page and absent on another -> violation only on missing page.

- [ ] **Step 5: Run RED**

~~~bash
python -m unittest tests.test_audit_runtime.TestRuntimePolicyRules -v
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

Reduced motion: emit one `A11Y_REDUCED_MOTION_POLICY` violation at style.css / subject `site:prefers-reduced-motion` unless both conditions are present outside comments: (1) an active CSS `@media (...prefers-reduced-motion: reduce...)` rule and (2) JavaScript `matchMedia(...prefers-reduced-motion: reduce...)` detection.

External script integrity: each cross-origin/protocol-relative script src must have an `integrity` value containing at least one syntactically valid `sha256-`, `sha384-`, or `sha512-` base64 token and `crossorigin="anonymous"`. Otherwise emit one violation with subject equal to the full src. Do not make network requests to verify the digest bytes.

CSP: each audited HTML page requires a non-empty meta `http-equiv="Content-Security-Policy"` whose content contains non-empty `default-src` and `script-src` directives; otherwise emit `SECURITY_CSP_POLICY` subject `document:csp-meta`.

- [ ] **Step 7: Run Task 4 plus full suite GREEN**

- [ ] **Step 8: Commit**

~~~bash
git add scripts/repository_audit/data_rules.py scripts/repository_audit/runtime_rules.py   tests/test_audit_data.py tests/test_audit_runtime.py
git commit -m "feat: audit academic and runtime debt"
~~~

---

### Task 5: Orchestration, CLI, reporting, and bootstrap baseline

**Files**
- Create scripts/repository_audit/engine.py
- Create scripts/audit_repository.py
- Modify scripts/repository_audit/__init__.py
- Create tests/test_audit_cli.py
- Create .audit/known-debt.json

**Consumes**
All Task 1-4 raw rule groups and core loaders.

**Produces**
RULES, RULE_COVERAGE, AuditReport, run_audit(), write_bootstrap_baseline(), main().
CLI: --root, --policy, --baseline, --reference-baseline, --json, --emit-current-debt.

- [ ] **Step 1: Write failing orchestration tests**

Pin:
- RULE_COVERAGE union equals RULE_IDS exactly, with no unknown or missing rule ID;
- clean fixture -> PASS;
- exact policy exception suppresses its matching raw violation, remains present in AuditReport.exempted, and increments EXEMPTED output;
- policy exception matching no raw violation -> fatal stale-policy configuration;
- new missing-type button -> NEW/fail;
- stale baseline entry -> RESOLVED/fail;
- violation inserted into candidate baseline while reference is empty -> BASELINE_GROWTH/fail;
- no reference argument -> genesis mode does not invent growth.

- [ ] **Step 2: Run RED**

~~~bash
python -m unittest tests.test_audit_cli.TestAuditOrchestration -v
~~~

- [ ] **Step 3: Implement orchestration**

Rule groups and explicit coverage:

~~~python
RULES = (
    audit_html_structure,
    audit_repository_data,
    audit_academic_data,
    audit_runtime_policy,
)
RULE_COVERAGE = {
    audit_html_structure: frozenset({
        "HTML_DUPLICATE_ID", "HTML_INTERNAL_LINK_TARGET",
        "HTML_TARGET_BLANK_NO_NOOPENER", "HTML_DUPLICATE_ATTRIBUTE",
        "HTML_SELF_LINK", "HTML_BUTTON_MISSING_TYPE", "HTML_ACTION_HASH_LINK",
    }),
    audit_repository_data: frozenset({
        "JSON_PARSE", "REQUIRED_FILE", "TRANSLATION_LANGUAGE_SET",
        "TRANSLATION_KEY_PARITY", "I18N_FIXED_ARIA_LABEL",
        "I18N_FIXED_TITLE", "I18N_REFERENCE_MISSING",
    }),
    audit_academic_data: frozenset({
        "ACADEMIC_REGISTRY_STRUCTURE", "ACADEMIC_REGISTRY_DUPLICATE_ID",
        "ACADEMIC_REGISTRY_DUPLICATE_DOI", "ACADEMIC_REGISTRY_DUPLICATE_TITLE",
        "BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE",
    }),
    audit_runtime_policy: frozenset({
        "LEGACY_MAXIMIZED_REFERENCE", "A11Y_REDUCED_MOTION_POLICY",
        "SECURITY_EXTERNAL_SCRIPT_INTEGRITY", "SECURITY_CSP_POLICY",
    }),
}
~~~

At module/test time assert that the union of RULE_COVERAGE values equals RULE_IDS exactly.

run_audit sequence:
1. resolve root/policy/baseline;
2. load policy and candidate baseline;
3. execute rule groups;
4. reject duplicate emitted fingerprints;
5. validate every configured policy exception against the complete raw violation set, fail on stale exceptions, and suppress exact active matches;
6. classify remaining current violations versus candidate baseline;
7. if reference supplied, calculate baseline growth;
8. return sorted report.

AuditReport stores `exempted` active-policy matches separately from current debt. `passed` is true only if NEW, RESOLVED, and GROWTH are empty; EXEMPTED does not fail but is always visible.

- [ ] **Step 4: Write failing CLI/bootstrap tests**

Pin:
- --emit-current-debt works when .audit/known-debt.json is absent;
- normal audit mode with missing .audit/known-debt.json fails configuration;
- generated bootstrap refuses overwrite;
- entries are sorted by rule/path/subject;
- every fingerprint recomputes;
- main returns 0 PASS, 1 audit failure, 2 fatal configuration;
- --json output parses with json.loads.

- [ ] **Step 5: Run RED**

~~~bash
python -m unittest tests.test_audit_cli.TestCli -v
~~~

- [ ] **Step 6: Implement CLI and reporting**

`--emit-current-debt <path>` is a separate bootstrap path: it loads policy, executes all raw rules, validates/suppresses policy exceptions, and writes the remaining current violations without loading or requiring the candidate known-debt file. Every other audit mode requires a valid candidate baseline.

Bootstrap reason exactly:
Pre-existing debt frozen before structural block 2

Human output:

~~~text
Repository audit

PASS       <N> rules clean
KNOWN      <N> baseline violations
EXEMPTED   <N> active policy exceptions
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

Expected: KNOWN 65, EXEMPTED 0, NEW 0, RESOLVED 0, GROWTH 0, Result PASS.

- [ ] **Step 11: Commit**

~~~bash
git add scripts/audit_repository.py scripts/repository_audit/__init__.py \
  scripts/repository_audit/engine.py tests/test_audit_cli.py \
  .audit/policy.json .audit/known-debt.json
git commit -m "feat: bootstrap repository audit baseline"
~~~

---

### Task 6: GitHub Actions enforcement and end-to-end verification

**Files**
- Create .github/workflows/repository-audit.yml
- Create tests/test_audit_workflow.py

- [ ] **Step 1: Write failing workflow contract test**

The test reads the workflow and asserts these literal contracts:
- pull_request trigger;
- push branches: [main];
- fetch-depth: 0;
- unit-test command;
- github.event.pull_request.base.sha;
- github.event.before;
- git cat-file -e;
- --reference-baseline;
- repository-audit CLI command.

- [ ] **Step 2: Run RED**

~~~bash
python -m unittest tests.test_audit_workflow.TestWorkflowContract -v
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
          if [[ "${{ github.event_name }}" == "pull_request" ]]; then
            BASE_SHA="${{ github.event.pull_request.base.sha }}"
          else
            BASE_SHA="${{ github.event.before }}"
          fi

          if [[ -z "$BASE_SHA" || "$BASE_SHA" =~ ^0+$ ]]; then
            echo "has_reference=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          git cat-file -e "${BASE_SHA}^{commit}"
          if git cat-file -e "${BASE_SHA}:.audit/known-debt.json" 2>/dev/null; then
            git show "${BASE_SHA}:.audit/known-debt.json" > /tmp/base-known-debt.json
            echo "has_reference=true" >> "$GITHUB_OUTPUT"
          else
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

Genesis is valid only when the verified PR-base/push-before commit truly has no baseline file (or the event before SHA is the all-zero creation sentinel). Failure to resolve/read an existing nonzero reference commit is fatal and must never fall through to genesis. After Block 1 lands, later PRs/pushes use a reference baseline.

- [ ] **Step 4: Run workflow test and complete suite GREEN**

~~~bash
python -m unittest tests.test_audit_workflow.TestWorkflowContract -v
python -m unittest discover -s tests -p "test_*.py"
python scripts/audit_repository.py
~~~

Expected: tests PASS and audit KNOWN 65 / EXEMPTED 0 / NEW 0 / RESOLVED 0 / GROWTH 0.

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
- scripts/repository_audit/__init__.py
- scripts/repository_audit/core.py
- scripts/repository_audit/html_rules.py
- scripts/repository_audit/data_rules.py
- scripts/repository_audit/runtime_rules.py
- scripts/repository_audit/engine.py
- tests/test_audit_core.py
- tests/test_audit_html.py
- tests/test_audit_data.py
- tests/test_audit_runtime.py
- tests/test_audit_cli.py
- tests/test_audit_workflow.py

No runtime content file may appear.

- [ ] **Step 6: Commit workflow**

~~~bash
git add .github/workflows/repository-audit.yml tests/test_audit_workflow.py
git commit -m "ci: enforce repository audit"
~~~

- [ ] **Step 7: Final local acceptance**

~~~bash
python -m unittest discover -s tests -p "test_*.py"
python scripts/audit_repository.py
git diff --check main...HEAD
git status --short
~~~

Expected: green suite; audit PASS with 65 KNOWN, 0 EXEMPTED, and zero NEW/RESOLVED/GROWTH; clean tree.

- [ ] **Step 8: Verify implementation PR CI**

Expected:
- unit tests green;
- only the bootstrap transition from a reference commit without known-debt.json may take the no-reference genesis path;
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
8. REQUIRED_HTML is required, every root-level HTML page is automatically audited, policy cannot narrow that discovered scope, and stale policy exceptions fail configuration.
9. --json output parses as JSON; normal CI output remains concise.
10. Workflow push comparison uses github.event.before and genesis is possible only when the verified reference truly lacks the baseline.
11. Tests use only standard library/temp files and make no network calls.
12. Any Critical/Important final-review finding receives a new failing regression test before its fix.

## Execution Handoff

This harness does not expose a subagent execution tool. After the plan is reviewed and approved, implementation must use **Native execution** with superpowers:executing-plans:

- execute all six tasks in order;
- preserve the RED->GREEN sequence for every task;
- commit at each task boundary;
- keep the progress ledger required by executing-plans;
- run one whole-branch review after all tasks;
- fix any Critical/Important final-review finding only after adding a failing regression test;
- do not merge or push to main without the normal explicit integration step.

This is the available execution method for this environment.
