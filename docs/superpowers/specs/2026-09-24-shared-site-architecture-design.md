# Block 2 — Shared Site Architecture Design

**Repository:** `WevertonGomesCosta/WevertonGomesCosta.github.io`
**Date:** 2026-09-24
**Status:** Audited design; pending user review before implementation planning
**Base:** `main@2ec6c0121d56350cb2443e1c97367aa906fbefac`

## 1. Purpose

Block 2 removes the repository's markup-level structural debt by making shared site chrome single-source, converting action-like links into semantic controls, and removing duplicated accessibility/i18n defects. The implementation must preserve the site's current visual design, navigation behavior, factual content, static HTML delivery, GitHub Pages deployment model, and PT/EN translation contract.

The block is not a general cleanup. It has one bounded architectural outcome: shared markup must become generated from canonical components, while the existing repository auditor ratchets the known debt from 65 entries to 11 without adding policy exceptions.

## 2. Audited Current State

The Block 1 foundation is merged into protected `main`. The repository audit baseline contains 65 entries:

| Rule | Count |
| --- | ---: |
| `A11Y_REDUCED_MOTION_POLICY` | 1 |
| `BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE` | 1 |
| `HTML_ACTION_HASH_LINK` | 13 |
| `HTML_BUTTON_MISSING_TYPE` | 21 |
| `I18N_FIXED_ARIA_LABEL` | 19 |
| `I18N_REFERENCE_MISSING` | 1 |
| `LEGACY_MAXIMIZED_REFERENCE` | 2 |
| `SECURITY_CSP_POLICY` | 5 |
| `SECURITY_EXTERNAL_SCRIPT_INTEGRITY` | 2 |
| **Total** | **65** |

The shared footer is approximately 10.9 kB and is byte-for-byte equivalent after whitespace normalization in `index.html`, `publicacoes.html`, and `projetos.html`. The privacy page has the same footer except for the intentionally absent self-link to the privacy page.

Navigation has two legitimate variants:

- home navigation in `index.html`, using same-page section anchors;
- inner-page navigation in `publicacoes.html`, `projetos.html`, and `politica-de-privacidade.html`, using a home brand and a page-specific translated title.

The four interactive pages also repeat the language switcher, back-to-top control, footer email action, avatar/brand markup, and legal/site-map chrome.

`404.html` is intentionally minimal and has no shared nav/footer.

The current GitHub Pages deployment uses the platform's Jekyll build, but the repository itself stores complete static HTML files and local verification uses `python -m http.server`. Block 2 must preserve that source/deployed parity.

Line-ending audit shows that `index.html` currently uses CRLF while the three inner pages use LF. The renderer therefore cannot normalize whole files implicitly.

## 3. Scope

### 3.1 In scope

Block 2 owns four defect classes already frozen by the Block 1 baseline:

- `HTML_ACTION_HASH_LINK`: 13 → 0;
- `HTML_BUTTON_MISSING_TYPE`: 21 → 0;
- `I18N_FIXED_ARIA_LABEL`: 19 → 0;
- `I18N_REFERENCE_MISSING`: 1 → 0.

This removes exactly 54 baseline entries.

Block 2 also introduces a permanent composition guard so nav/footer drift cannot return silently.

### 3.2 Out of scope

The following remain for later structural blocks and must not be changed here:

- `BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE`;
- `LEGACY_MAXIMIZED_REFERENCE`;
- `A11Y_REDUCED_MOTION_POLICY`;
- `SECURITY_CSP_POLICY`;
- `SECURITY_EXTERNAL_SCRIPT_INTEGRITY`;
- academic data architecture;
- decomposition of `utils.js`;
- translation failure isolation;
- metadata/head internationalization;
- CSP/SRI hardening;
- reduced-motion implementation;
- redesign of `404.html`;
- factual profile/content normalization.

No new dependency, framework, static-site generator, bundler, or package manager is introduced.

## 4. Architectural Decision

Shared chrome will use **canonical component sources plus deterministic Python rendering into committed static HTML**.

The canonical sources will live under:

```text
_site_components/
  back-to-top.html
  language-switcher.html
  nav-home.html
  nav-inner.html
  footer.html
```

A standard-library-only renderer will live at:

```text
scripts/render_shared_site.py
```

The four rendered pages remain normal, complete HTML documents committed at repository root:

```text
index.html
publicacoes.html
projetos.html
politica-de-privacidade.html
```

GitHub Pages continues to deploy those root HTML artifacts. JavaScript is not required to construct nav, footer, language controls, or back-to-top markup.

### 4.1 Why not runtime JavaScript composition

Runtime injection would make navigation/footer availability depend on JavaScript and would worsen the existing progressive-enhancement and translation-failure concerns. It would also make source inspection and the current auditor less representative of the delivered HTML.

### 4.2 Why not Jekyll includes

The Pages pipeline already uses Jekyll, so `_includes` is technically possible. It is not selected because repository-root HTML would then contain Liquid rather than the exact browser-delivered markup. That would break the current local `python -m http.server` parity and require the auditor to understand a second build representation.

### 4.3 Generated HTML is not a second editable source

Root HTML remains versioned because it is the deploy artifact, but generated regions are not authoritative. CI verifies them byte-for-byte against the canonical components. Manual edits inside generated regions are therefore rejected.

## 5. Component and Page Model

### 5.1 Generated-region markers

Rendered regions use stable HTML comments:

```html
<!-- shared:<region>:start -->
...generated HTML...
<!-- shared:<region>:end -->
```

Valid region names are fixed by the renderer. The implementation must reject:

- a missing start or end marker;
- duplicate marker pairs for the same expected region;
- end markers before start markers;
- nested or overlapping generated regions;
- unexpected generated-region names in a configured page.

Markers remain in the committed output so drift can be checked without a sidecar manifest.

### 5.2 Placeholder grammar

Component parameters use only renderer-owned tokens of the form:

```text
@@TOKEN_NAME@@
```

where `TOKEN_NAME` is uppercase ASCII letters, digits, and underscores.

Liquid/Jekyll syntax such as `{{ ... }}` or `{% ... %}` is forbidden in these components. This prevents the GitHub Pages Jekyll stage from interpreting renderer placeholders.

Rendering is fatal if any `@@TOKEN_NAME@@` remains unresolved.

### 5.3 Page configuration

The renderer owns an explicit, closed page configuration:

| Page | Regions | Nav | Nav title | Privacy footer link |
| --- | --- | --- | --- | --- |
| `index.html` | fixed language, back-to-top, nav, footer | home | none | present |
| `publicacoes.html` | back-to-top, nav, footer | inner | `nav-title-publications` / `Publicações Científicas` | present |
| `projetos.html` | back-to-top, nav, footer | inner | `nav-title-projects` / `Todos os Projetos` | present |
| `politica-de-privacidade.html` | back-to-top, nav, footer | inner | `nav-title-privacy` / `Política de Privacidade` | absent |

`404.html` is not a configured render target and the renderer must never write it.

### 5.4 Language switcher reuse

`language-switcher.html` is canonical. It accepts a renderer-owned class token so the same markup can produce:

- the fixed home switcher with `lang-fixed`;
- nav switchers without `lang-fixed`.

Both forms must contain `type="button"`.

`nav-home.html` and `nav-inner.html` consume the rendered language-switcher markup rather than maintaining independent copies.

### 5.5 Footer variation

`footer.html` is one canonical footer. A single `@@PRIVACY_SEGMENT@@` token renders either:

- the complete existing translated privacy-link segment **including its trailing separator** (`<privacy link> | `) on non-privacy pages; or
- an empty value on `politica-de-privacidade.html`.

The separator must be part of the token value so the privacy page cannot render an orphan `|`. No separate privacy-footer component is permitted.

## 6. Renderer Contract

`scripts/render_shared_site.py` is Python standard-library only.

It supports two explicit, mutually exclusive modes:

```text
python -B scripts/render_shared_site.py --write
python -B scripts/render_shared_site.py --check
```

Exactly one mode is required. Supplying neither mode or both modes is a fatal CLI/configuration error with exit code 2.

### 6.1 `--write`

- reads canonical components and configured root pages;
- parses, validates, and renders **all** configured targets in memory before writing any file;
- if any target has a fatal render-contract error, writes nothing;
- after all targets validate, writes only configured pages whose rendered bytes differ;
- uses a safe replace strategy per changed file so a failed write does not intentionally truncate an existing page;
- never writes `404.html` or unrelated files;
- produces deterministic output;
- is idempotent: a second `--write` produces no changes.

### 6.2 `--check`

- renders every configured page in memory;
- compares expected bytes with committed bytes;
- exits 0 only when every generated region is synchronized;
- exits 1 when rendered output differs from committed output;
- exits 2 for malformed markers, missing components, unresolved tokens, invalid configuration, decoding failures, or other fatal render-contract errors;
- does not modify the working tree.

### 6.3 Encoding and line endings

All files are UTF-8 without BOM. A BOM in a configured component or render target is a fatal contract error.

Component files use LF internally. For each rendered target the renderer detects the target page's existing newline style and converts inserted component text to that style. A configured target containing mixed CRLF and bare-LF line endings is a fatal contract error rather than an invitation to normalize the file implicitly.

The renderer must preserve content and newline style outside generated regions. In particular:

- `index.html` remains CRLF unless a separately approved repository-wide EOL policy is introduced later;
- the three inner pages remain LF.

Tests must exercise CRLF, LF, mixed-EOL rejection, and the no-partial-write guarantee when one of multiple targets is invalid.

## 7. Semantic Control Migration

The current 13 `href="#"` violations represent two different semantics and must not receive one mechanical replacement.

### 7.1 Back-to-top is navigation

Each back-to-top control remains an anchor and changes from `href="#"` to:

```html
href="#page-top"
```

Each of the four interactive pages receives a real `id="page-top"` target on the document's root `<html>` element. Existing body IDs remain unchanged.

The current `.back-to-top` class remains the JavaScript/CSS hook.

### 7.2 CV generation is an action

All four `[data-cv-type]` anchors in `index.html` become:

```html
<button type="button" ... data-cv-type="...">
```

`CvPdfGenerator` already binds through `[data-cv-type]`; that selector contract remains unchanged.

### 7.3 Email copy is an action

`#copy-email-link` and every rendered `#copy-email-footer` become `<button type="button">` controls.

`ClipboardCopier` continues to bind by those exact IDs. The IDs are not renamed.

### 7.4 Existing buttons

Every existing `<button>` in the four interactive pages receives an explicit type. Non-submit UI controls use:

```html
type="button"
```

The contact form's actual submit control, if present, retains submit semantics and must not be converted to `type="button"`.

Converted controls must not create any new `HTML_BUTTON_MISSING_TYPE` violation.

## 8. CSS Equivalence Contract

Changing an action from `<a>` to `<button>` must not produce a visual redesign.

CSS may be modified only to neutralize browser button defaults and extend existing selectors to semantic button equivalents.

Required cases include:

- `button.cta-btn`;
- `button.contact-link`;
- footer email action styling equivalent to existing footer links.

The footer currently styles `.footer-column ul li a`; therefore the new footer email button must receive an explicit class and equivalent selectors rather than relying on browser defaults.

Any reset must be narrowly scoped. A global `button { ... }` reset is forbidden in this block.

Visual invariants include layout, spacing, typography, colors, borders, hover behavior, icon size, and responsive behavior.

## 9. Accessibility Normalization

All 19 `I18N_FIXED_ARIA_LABEL` findings are redundant labels on decorative graphics whose meaning is already present as visible adjacent text.

The intended treatment is decorative, not translation proliferation.

### 9.1 Expertise and service emoji icons

For icon spans accompanying visible headings:

- remove `role="img"`;
- remove fixed `aria-label`;
- add `aria-hidden="true"`.

### 9.2 LICAE and Conecta GEM feature logos

For logo wrappers whose adjacent content already identifies the organization:

- remove fixed wrapper `aria-label` and redundant image role;
- mark the visual wrapper `aria-hidden="true"`;
- preserve the image element and its visual behavior.

### 9.3 Footer profile icons

The LICAE/Conecta GEM icon spans inside links are decorative because the link already contains visible text.

They must:

- remove fixed `aria-label`;
- use `aria-hidden="true"`.

The accessible link name remains the visible `LICAE/UFV` or `Conecta GEM` text.

No new translation keys are created solely to label decorative icons.

## 10. Missing Translation Reference

`politica-de-privacidade.html` references `privacy-services-p2`, which is absent from both translation maps.

The canonical PT text is:

> Recomendo que você revise as políticas de privacidade desses serviços para entender como eles tratam suas informações.

The canonical EN text is:

> I recommend that you review the privacy policies of these services to understand how they handle your information.

The key is added to both `pt` and `en`, preserving language-set and key-parity invariants.

## 11. Audit Baseline Ratchet

At Block 2 completion, current raw violations must match an 11-entry candidate baseline exactly.

Expected remaining counts:

| Rule | Count |
| --- | ---: |
| `A11Y_REDUCED_MOTION_POLICY` | 1 |
| `BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE` | 1 |
| `LEGACY_MAXIMIZED_REFERENCE` | 2 |
| `SECURITY_CSP_POLICY` | 5 |
| `SECURITY_EXTERNAL_SCRIPT_INTEGRITY` | 2 |
| **Total** | **11** |

The following must be exactly zero:

- `HTML_ACTION_HASH_LINK`;
- `HTML_BUTTON_MISSING_TYPE`;
- `I18N_FIXED_ARIA_LABEL`;
- `I18N_REFERENCE_MISSING`.

The 11 retained entries must keep the same rule/path/subject fingerprints already present in the 65-entry reference baseline. Block 2 must not replace one debt identity with another.

The candidate baseline is regenerated through the production auditor into a temporary path, verified, and then used to replace `.audit/known-debt.json`. `.audit/policy.json` remains:

```json
{
  "schema_version": 1,
  "exceptions": []
}
```

The Block 1 comparison semantics deliberately permit this reduction: candidate entries removed relative to the reference baseline are not growth. Any new candidate fingerprint is growth and fails CI.

## 12. Permanent Quality Gates

The repository workflow gains a dedicated step:

```bash
python -B scripts/render_shared_site.py --check
```

It runs after unit tests and before the repository audit.

The workflow contract test must verify that the render check is present.

The existing `Repository audit / audit` required status check remains the only mandatory GitHub status context; the render check executes inside that job.

## 13. Test Requirements

A focused `tests/test_shared_site.py` suite owns the renderer contract.

At minimum it must cover:

1. deterministic rendering of the home page;
2. deterministic rendering of each inner-page nav title;
3. one canonical footer with the privacy link present or absent according to page config;
4. canonical language-switcher reuse for fixed and nav variants;
5. back-to-top rendering with a real `#page-top` target;
6. CRLF preservation;
7. LF preservation;
8. idempotent `--write`;
9. `--check` success on synchronized fixtures;
10. `--check` failure on manual generated-region drift;
11. fatal failure for missing markers;
12. fatal failure for duplicate markers;
13. fatal failure for overlapping/nested markers;
14. fatal failure for unresolved `@@TOKEN_NAME@@`;
15. proof that `404.html` is not a render target;
16. fatal failure when neither or both CLI modes are supplied;
17. fatal failure for UTF-8 BOM or mixed EOL in a configured target;
18. no partial writes when one target fails after another target has already rendered successfully.

Existing audit tests continue to own semantic HTML/i18n rules; Block 2 must add regression fixtures only where an existing rule lacks coverage for the exact migrated shape.

The complete unit suite, `compileall`, repository auditor, renderer check, and `git diff --check` are mandatory gates.

### 13.1 Visual and interaction validation matrix

Because semantic migration changes element types, HTTP 200 alone is not evidence of visual equivalence. Before a task that changes rendered controls is frozen, local browser validation must cover:

- `index.html` at a representative desktop width and a mobile width;
- each inner page (`publicacoes.html`, `projetos.html`, `politica-de-privacidade.html`) at least at desktop width, plus one inner page at mobile width to exercise the shared inner-nav responsive contract;
- PT and EN switcher behavior on the home page and one inner page;
- back-to-top visibility and navigation to the real `#page-top` target;
- CV actions, contact email-copy action, footer email-copy action, clear/show-more controls, timeline toggles, and the contact-form submit action where present;
- footer privacy-link presence on non-privacy pages and absence on the privacy page.

The validation must explicitly check layout, spacing, typography, colors, borders, hover/focus behavior, icon alignment, and absence of orphan footer separators. Any visible difference introduced solely by changing an anchor to a button is a regression unless separately approved.

## 14. Runtime and Deployment Invariants

Throughout implementation:

- all four interactive pages remain usable as static HTML;
- nav/footer exist in source without executing JavaScript;
- `utils.js` public selectors and IDs used by existing handlers remain valid;
- no factual profile content changes;
- no PT/EN key is removed;
- no page title/nav title behavior changes;
- no external dependency is added;
- GitHub Pages continues using its existing deployment path;
- `python -m http.server` remains a valid local preview;
- all five key pages continue returning HTTP 200 locally.

## 15. Implementation Boundaries

The implementation plan should decompose the block into independently reviewable tasks:

1. renderer/core composition contract and tests, initially producing behavior-equivalent shared regions;
2. semantic control migration and narrowly scoped CSS equivalence;
3. accessibility/i18n normalization;
4. baseline reduction and CI enforcement;
5. whole-branch review and local site validation.

Each task must use RED → GREEN TDD and receive local validation before the next task begins.

No task may broaden into data architecture, `utils.js` decomposition, reduced-motion work, or CSP/SRI hardening.

## 16. Acceptance Criteria

Block 2 is acceptable only when all of the following are simultaneously true:

- canonical shared components are the only editable source for generated nav/footer/language/back-to-top regions;
- `render_shared_site.py --check` passes and is enforced in CI;
- render output is deterministic and cross-platform with preserved target EOL style;
- manual drift inside a generated region is detected;
- `404.html` remains outside the renderer;
- the four markup/i18n debt classes are zero;
- `.audit/known-debt.json` contains exactly 11 entries;
- the 11 retained debt fingerprints match the corresponding identities from the Block 1 baseline;
- `.audit/policy.json` still has zero exceptions;
- no new audit violation exists;
- all unit tests pass;
- `git diff --check` is clean;
- the visual/interaction validation matrix in §13.1 passes without unapproved differences;
- the four interactive pages preserve visual and behavioral equivalence;
- all five key pages return HTTP 200 in local validation;
- the protected `Repository audit / audit` PR check passes against the 65-entry `main` reference baseline.

## 17. Deferred Work

After Block 2, the structural baseline intentionally contains 11 entries. They map cleanly to later blocks:

- Block 3 — data/content architecture: bibliometric duplicate and source-of-truth consolidation;
- Block 4 — JS/runtime architecture: legacy `maximized`, reduced motion, runtime decomposition/failure isolation;
- Block 5 — hardening/maintenance: CSP and external-script SRI.

Block 2 must reduce debt; it must not hide or reclassify these remaining defects.
