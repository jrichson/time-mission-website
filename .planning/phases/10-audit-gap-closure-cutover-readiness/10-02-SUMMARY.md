---
phase: 10
plan: 02
subsystem: accessibility-validation, mobile-ux
tags: [axe-core, playwright, mobile, a11y, p0-4, p0-7a]
dependency_graph:
  requires: []
  provides:
    - "@axe-core/playwright@4.11.3 installed (exact pin)"
    - "scripts/check-img-alt-axe.js — axe dist HTML scan for image-alt violations"
    - "playwright.config.js mobile project (Pixel 5)"
    - "tests/smoke/site.spec.js P0-7a mobile regression test"
    - "js/nav.js e.stopPropagation() fix in narrow-picker handler"
  affects:
    - "scripts/verify-site-output.mjs — check:img-alt-axe wired after check:schema-output"
    - "package.json — @axe-core/playwright dep + check:img-alt-axe script"
tech_stack:
  added:
    - "@axe-core/playwright@4.11.3 (exact pin, no caret)"
  patterns:
    - "CommonJS validator script (same pattern as check-accessibility-baseline.js)"
    - "Playwright mobile project using devices['Pixel 5']"
    - "test.skip(({ isMobile }) => !isMobile) — mobile-only test guard"
key_files:
  created:
    - scripts/check-img-alt-axe.js
  modified:
    - package.json
    - package-lock.json
    - playwright.config.js
    - scripts/verify-site-output.mjs
    - tests/smoke/site.spec.js
    - js/nav.js
decisions:
  - "Use @axe-core/playwright named export { AxeBuilder } (not default export) — confirmed via node REPL"
  - "Adapt test selectors from plan template to actual DOM IDs: #locationDropdown (not #locationOverlay), #locationBtn (not .location-btn)"
  - "P0-7a test passes immediately — overlay handler already guards with e.target === locationOverlay; stopPropagation fix is defensive hardening per must_have truth"
  - "stopPropagation count: 3 total in nav.js (2 pre-existing + 1 new P0-7a); plan estimated 4 but pre-existing count was 2 not 3"
metrics:
  duration_minutes: 4
  completed_date: "2026-05-05"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 6
  files_created: 1
---

# Phase 10 Plan 02: axe-core Dist Scan + Mobile Location-Tap Regression Fix Summary

**One-liner:** axe-core/playwright@4.11.3 dist scanner with mobile Pixel 5 project and e.stopPropagation() defensive fix in js/nav.js narrow-picker handler.

## What Was Built

### Task 1 — Install @axe-core/playwright + add mobile Playwright project
- Installed `@axe-core/playwright@4.11.3` with exact version pin (no caret/tilde) — supply chain threat T-10-02-01 mitigated
- Edited `playwright.config.js` to add second project: `{ name: 'mobile', use: { ...devices['Pixel 5'] } }`
- Existing `chromium` project unchanged; `webServer` block unchanged
- Verified: `npx playwright test --list --project=mobile` lists all existing tests under mobile project

**Commit:** `80efebf`

### Task 2 — Create scripts/check-img-alt-axe.js + wire into verify chain
- Created `scripts/check-img-alt-axe.js` (CommonJS, follows check-accessibility-baseline.js pattern)
- Reads `src/data/site/astro-rendered-output-files.json` to get 15 output HTML files
- Spawns or detects running `preview:test` server on 127.0.0.1:4173 (with 30s readiness poll)
- Runs `new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()` per page
- Filters `critical`/`serious` violations with IDs matching `image-alt`, `image-redundant-alt`, `role-img-alt`, `video-caption`, `video-description`, or any `image-*`/`video-*` prefix
- Added `"check:img-alt-axe": "node scripts/check-img-alt-axe.js"` to `package.json` scripts
- Inserted `['check:img-alt-axe', []]` into `verify-site-output.mjs` steps array after `check:schema-output`, before `check:sitemap-output`
- Server lifecycle wrapped in try/finally with SIGTERM cleanup (threat T-10-02-02 mitigated)

**Commit:** `8cff758`

### Task 3 — Mobile Playwright test + js/nav.js stopPropagation fix
- Added `test.describe('Mobile location selector (P0-7a)')` block to `tests/smoke/site.spec.js`
- Test uses `test.skip(({ isMobile }) => !isMobile, 'mobile-only test')` — skipped on chromium project
- Test: navigate `/`, click `#locationBtn`, tap `#locationDropdown a[href*="philadelphia"]`, assert `#locationInfo` visible AND `#locationDropdown` still has `.open` class
- Applied `e.stopPropagation()` after `e.preventDefault()` in the `if (narrowPicker && slug && !isComingSoonLink)` block in `js/nav.js` with explanatory comment
- Both projects pass: mobile 1 passed, chromium 20 passed + 1 skipped (P0-7a correctly skipped)

**Commit:** `512a65b`

## Acceptance Criteria Verification

| Criterion | Result |
|-----------|--------|
| `@axe-core/playwright` version in package.json is `"4.11.3"` (no caret) | PASS |
| `node_modules/@axe-core/playwright` reports version `4.11.3` | PASS |
| `playwright.config.js` has `name: 'mobile'` project with `devices['Pixel 5']` | PASS |
| `playwright.config.js` still has chromium project | PASS |
| `npx playwright test --list --project=mobile` exits 0 | PASS |
| `scripts/check-img-alt-axe.js` is CommonJS (`require`, not `import`) | PASS |
| reads `astro-rendered-output-files.json` | PASS |
| uses `@axe-core/playwright` | PASS |
| uses `withTags(['wcag2a', 'wcag2aa'])` | PASS |
| filters `critical`/`serious` impacts | PASS |
| `package.json` `check:img-alt-axe` = `"node scripts/check-img-alt-axe.js"` | PASS |
| `verify-site-output.mjs` has `check:img-alt-axe` between `check:schema-output` and `check:sitemap-output` | PASS |
| `test.describe('Mobile location selector (P0-7a)')` exists in site.spec.js | PASS |
| test contains `isMobile` skip guard | PASS |
| `js/nav.js` has `e.stopPropagation()` after `e.preventDefault()` in narrow-picker block | PASS |
| `js/nav.js` contains `P0-7a: stop bubble to overlay-background click handler` comment | PASS |
| `npx playwright test --project=mobile --grep "P0-7a"` exits 0 | PASS |
| `npx playwright test --project=chromium` passes (no regression) | PASS |
| `npm run check:components` exits 0 | PASS |

## Deviations from Plan

### Investigation Finding (not a deviation — plan-documented path)

**P0-7a double-tap bug investigation:**
- **Found during:** Task 3 RED phase
- **Issue:** The plan predicted the mobile test would FAIL before the fix because clicking a location link bubbles to the overlay background handler and calls `closeLocationOverlay()`. Test passed immediately instead.
- **Root cause:** The overlay background handler at line 145 already guards with `if (e.target === locationOverlay)`. Since location links are children of the overlay — not the overlay element itself — `e.target !== locationOverlay` for any link click. The guard prevents the close. The double-tap bug may only manifest on specific touch environments or may have been partially mitigated in a prior commit.
- **Action taken:** Per plan instruction ("If it passes immediately, the bug is already fixed elsewhere — investigate before proceeding"), investigation confirmed the guard makes the fix redundant in current code. The `e.stopPropagation()` fix was applied anyway per the plan's `must_have` truth (defensive hardening against future handler changes) with the P0-7a explanatory comment.
- **Selector adaptation:** Plan template used `a.location-link[href*="philadelphia"]` and `#locationOverlay` — actual DOM uses plain `<a>` links (no `location-link` class) and `#locationDropdown`. Test selectors adapted to match actual rendered HTML.

### stopPropagation count discrepancy

The plan's final verification expected `grep -c "e.stopPropagation()" js/nav.js >= 4` (existing 3 + new 1). Actual pre-existing count was 2 (not 3), so total is 3. This is a plan estimation error, not a code issue. The new P0-7a stopPropagation at line 178 is confirmed present.

## Known Stubs

None — all functionality is fully wired. `check-img-alt-axe.js` requires `npm run build:astro` first (existing `dist/` used for this plan's verification). No hardcoded placeholders or TODO markers.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns beyond what the plan's threat model documents. `check-img-alt-axe.js` accesses only `127.0.0.1:4173` (local preview server) and reads local filesystem manifests. No external requests. No PII in axe scan output (DOM structure only).

## Verify Chain Placement Diff

Before:
```
['check:schema-output', []],
['check:sitemap-output', []],
```

After:
```
['check:schema-output', []],
['check:img-alt-axe', []],
['check:sitemap-output', []],
```

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `scripts/check-img-alt-axe.js` exists | FOUND |
| `playwright.config.js` exists | FOUND |
| `10-02-SUMMARY.md` exists | FOUND |
| commit `80efebf` (Task 1) | FOUND |
| commit `8cff758` (Task 2) | FOUND |
| commit `512a65b` (Task 3) | FOUND |
