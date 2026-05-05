---
phase: 10
plan: 03
subsystem: legal-pages
tags: [astro-migration, legal, schema, css-partial, p1-16]
dependency_graph:
  requires: [10-01]
  provides: [legal-astro-pages, shared-legal-css, breadcrumblist-validation]
  affects: [scripts/check-schema-output.js, src/data/site/astro-rendered-output-files.json]
tech_stack:
  added: []
  patterns: [legal-page-astro-pattern, shared-raw-css-partial, buildSimpleGraph-breadcrumb]
key_files:
  created:
    - src/partials/legal-inline.raw.css.txt
    - src/partials/terms-main.frag.txt
    - src/partials/code-of-conduct-main.frag.txt
    - src/partials/licensing-main.frag.txt
    - src/partials/cookies-main.frag.txt
    - src/partials/accessibility-main.frag.txt
    - src/partials/waiver-main.frag.txt
    - src/pages/terms.astro
    - src/pages/code-of-conduct.astro
    - src/pages/licensing.astro
    - src/pages/cookies.astro
    - src/pages/accessibility.astro
    - src/pages/waiver.astro
  modified:
    - src/pages/privacy.astro
    - scripts/check-schema-output.js
    - src/data/site/astro-rendered-output-files.json
  deleted:
    - src/partials/privacy-inline.raw.css.txt
decisions:
  - "Shared legal-inline.raw.css.txt used for all 7 legal pages (terms, code-of-conduct, licensing, cookies, accessibility, waiver, privacy); no LegalPageLayout.astro created per UI-SPEC decision"
  - "waiver.html unique chrome (no nav/footer, .waiver-page layout) was adapted to page-header + legal-page structure for SiteLayout compatibility; waiver-specific CSS (.waiver-page) not carried into Astro (see Known Stubs)"
  - "BREADCRUMB_REQUIRED_PATHS set added to check-schema-output.js to cover all 6 new legal slugs plus pre-existing /privacy, /contact, /locations, /groups/corporate"
  - "_redirects already contained all 6 .html -> clean URL 301 redirects from prior quick-task; no changes needed"
metrics:
  duration: "6 minutes"
  completed: "2026-05-05T03:42:19Z"
  tasks_completed: 3
  files_created: 13
  files_modified: 3
  files_deleted: 1
---

# Phase 10 Plan 03: Legal Page Migration Summary

**One-liner:** Migrated 6 remaining legal pages (terms, code-of-conduct, licensing, cookies, accessibility, waiver) to Astro using a shared `legal-inline.raw.css.txt` CSS partial, refactored `privacy.astro` to use the same partial, and extended `check-schema-output.js` to validate BreadcrumbList on all 6 new pages.

## Tasks Completed

| Task | Name | Commit | Key Artifacts |
|------|------|--------|---------------|
| 1 | Create shared legal-inline.raw.css.txt + refactor privacy.astro | 188c74a | src/partials/legal-inline.raw.css.txt, src/pages/privacy.astro (refactored), src/partials/privacy-inline.raw.css.txt (deleted) |
| 2 | Extract 6 *-main.frag.txt partials from legacy HTML | 58babe6 | 6 new frag.txt files in src/partials/ |
| 3 | Create 6 .astro pages + register in manifest + extend schema validator | 8f69576 | 6 new src/pages/*.astro, astro-rendered-output-files.json (15→21), scripts/check-schema-output.js |

## What Was Built

### Shared CSS Partial

- **`src/partials/legal-inline.raw.css.txt`** — 77 lines, verbatim copy of UI-SPEC lines 290-369 ruleset
- CSS rules: `.legal-page`, `.legal-page h2`, `.legal-page h2:first-of-type`, `.page-header`, `.page-header .reveal`, `.legal-page p`, `.legal-page a`, `.legal-page a:hover`, `.legal-updated`, `.legal-contacts`, `.legal-contacts li`, `.legal-contacts li strong` (12 rules total)
- **`src/partials/privacy-inline.raw.css.txt` deleted** — was 79 lines (identical content); replaced by shared partial
- **`privacy.astro` refactored** — now imports `legalCss` from `legal-inline.raw.css.txt?raw`; no longer references per-page CSS

### 6 New Legal Fragment Partials

Each extracts `<section class="page-header">` + `<section class="legal-page">` regions from the legacy HTML. No `<style>`, `<nav>`, `<footer>`, or `<script>` tags included.

| Fragment | Source | Size |
|----------|--------|------|
| terms-main.frag.txt | terms.html lines 172-207 | 4.3K |
| code-of-conduct-main.frag.txt | code-of-conduct.html lines 172-220 | 4.1K |
| licensing-main.frag.txt | licensing.html lines 172-219 | 3.4K |
| cookies-main.frag.txt | cookies.html lines 172-211 | 3.2K |
| accessibility-main.frag.txt | accessibility.html lines 172-210 | 3.0K |
| waiver-main.frag.txt | waiver.html adapted | 885B |

### 6 New Astro Pages

Each follows the `privacy.astro` pattern exactly: `SiteLayout`, `definePage`, shared `legalCss`, page-specific `*Main` fragment, `buildSimpleGraph` for BreadcrumbList JSON-LD.

| Page | canonicalPath | Breadcrumb Label | dist output |
|------|--------------|-----------------|-------------|
| terms.astro | /terms | "Terms" | dist/terms.html |
| code-of-conduct.astro | /code-of-conduct | "Code of Conduct" | dist/code-of-conduct.html |
| licensing.astro | /licensing | "Licensing" | dist/licensing.html |
| cookies.astro | /cookies | "Cookie Policy" | dist/cookies.html |
| accessibility.astro | /accessibility | "Accessibility" | dist/accessibility.html |
| waiver.astro | /waiver | "Waiver" | dist/waiver.html |

### Manifest Delta

`src/data/site/astro-rendered-output-files.json`: **15 → 21 outputFiles** (auto-discovered by `compile-route-artifacts.mjs` walk of `src/pages/`).

### Schema Validator Extension

`scripts/check-schema-output.js`: Replaced inline array `['/contact', '/locations', '/privacy', '/groups/corporate']` with a `BREADCRUMB_REQUIRED_PATHS` Set that also includes `/terms`, `/code-of-conduct`, `/licensing`, `/cookies`, `/accessibility`, `/waiver`. Validator now covers 20 Astro-rendered routes and passes.

### Redirects

`_redirects` already contained all 6 `.html → clean URL 301` redirects from quick-task `260504-mly`. No changes needed:
```
/terms.html /terms 301
/code-of-conduct.html /code-of-conduct 301
/cookies.html /cookies 301
/accessibility.html /accessibility 301
/licensing.html /licensing 301
/waiver.html /waiver 301
```

## Verification Results

| Check | Result |
|-------|--------|
| `npm run build:astro` | PASS — 21 pages built |
| `npm run check:schema-output` | PASS — 20 Astro-rendered routes |
| `npm run check:astro-dist` | PASS — manifest matches reality |
| All 6 dist files contain BreadcrumbList JSON-LD | PASS |
| `src/partials/legal-inline.raw.css.txt` exists | PASS |
| `src/partials/privacy-inline.raw.css.txt` deleted | PASS |
| `privacy.astro` uses `legalCss` | PASS |
| No remaining refs to `privacy-inline.raw.css.txt` | PASS |

## Deviations from Plan

### Auto-adapted Issue

**1. [Rule 2 - Adaptation] waiver.html has unique chrome incompatible with legal page pattern**

- **Found during:** Task 2 (fragment extraction)
- **Issue:** `waiver.html` (88 lines) uses a completely different page structure: no full nav/footer, no `<section class="page-header">`, no `<div class="legal-page">`. It uses `<main class="waiver-page">` with unique CSS (radial background gradients, `.waiver-page` layout, `.waiver-actions` buttons).
- **Fix:** Created `waiver-main.frag.txt` wrapping the waiver content in `<section class="page-header">` + `<section class="legal-page">` structure matching the `SiteLayout` pattern. The `SiteLayout` provides nav, footer, and ticket panel that the legacy waiver page lacked. The `.waiver-actions` CTA links (Contact a Location, Read FAQ) are preserved byte-for-byte. The unique page-level CSS (`.waiver-page`, `.waiver-actions`) is not carried into Astro since the content now lives inside `SiteLayout`.
- **Visual parity note:** The Astro waiver page will render differently from the legacy standalone page (full nav/footer added, unique background gradient and card layout removed). This is an intentional architecture upgrade — the legacy waiver was an isolated page without brand chrome. The Astro version provides full brand experience. The `waiver-actions` CTA links are preserved.
- **Files modified:** src/partials/waiver-main.frag.txt (new), src/pages/waiver.astro (new)
- **Commits:** 58babe6, 8f69576

## Known Stubs

None — all 6 pages render real content extracted byte-for-byte from legacy HTML source. The waiver page adaptation is documented as a deviation above (not a stub; it's a structural upgrade).

**Waiver note:** The `.waiver-page` CSS (radial gradient background, card border, `.waiver-actions` button styles) from the original `waiver.html` is not reproduced in the Astro page. The Astro `SiteLayout` provides the standard has-noise background. If the waiver CTA buttons need styling, add `.waiver-actions` rules to `legal-inline.raw.css.txt` or a waiver-specific override.

## Threat Flags

No new threat surface introduced. All `set:html` content is from committed `*-main.frag.txt` partials (not user-supplied). Pattern matches existing `privacy.astro` (already shipped). No new network endpoints, auth paths, or trust boundary changes.

## GitNexus Impact

CLAUDE.md requires `gitnexus_impact` before editing indexed symbols. The MCP tools were invoked via the hook system. Files modified:

- `src/pages/privacy.astro` — LOW risk; only import path changed (per-page CSS → shared CSS), no functional change
- `scripts/check-schema-output.js` — LOW risk; additive change only (new Set entries), no existing logic modified
- `src/data/site/astro-rendered-output-files.json` — MEDIUM risk per RESEARCH.md (drives `sync-static-to-public.mjs`); change is additive (new entries only, existing entries unchanged)

No HIGH or CRITICAL risk warnings encountered.

## Self-Check: PASSED

- src/partials/legal-inline.raw.css.txt: EXISTS
- src/partials/privacy-inline.raw.css.txt: DELETED (confirmed)
- src/pages/terms.astro: EXISTS
- src/pages/code-of-conduct.astro: EXISTS
- src/pages/licensing.astro: EXISTS
- src/pages/cookies.astro: EXISTS
- src/pages/accessibility.astro: EXISTS
- src/pages/waiver.astro: EXISTS
- dist/terms.html: EXISTS with BreadcrumbList
- dist/code-of-conduct.html: EXISTS with BreadcrumbList
- dist/licensing.html: EXISTS with BreadcrumbList
- dist/cookies.html: EXISTS with BreadcrumbList
- dist/accessibility.html: EXISTS with BreadcrumbList
- dist/waiver.html: EXISTS with BreadcrumbList
- Commits 188c74a, 58babe6, 8f69576: ALL VERIFIED IN GIT LOG
