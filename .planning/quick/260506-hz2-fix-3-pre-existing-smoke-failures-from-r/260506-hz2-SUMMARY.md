---
phase: quick-260506-hz2
plan: 01
subsystem: smoke-tests, navigation
tags: [smoke, regression, accessibility, p0-7a, nav, mobile]
requires: [bef2441]
provides: [green-smoke-gate]
affects: [tests/smoke/site.spec.js, js/nav.js]
tech-stack:
  added: []
  patterns:
    - "Visually-hidden SEO H1 (`.hero-h1-seo`) + decorative aria-hidden spans (`.line-1`, `.line-2`) — verified via Playwright `.toHaveText` (attached) for the SEO span and `.toBeVisible` + `.toHaveText` for the visible eyebrow"
    - "Mobile narrow-picker click branch (max-width: 768px): preventDefault + stopPropagation + showLocationInfo + scrollIntoView; overlay stays open"
key-files:
  created: []
  modified:
    - tests/smoke/site.spec.js
    - js/nav.js
decisions:
  - "Update test selectors to match correct post-Astro accessible markup; do NOT modify site markup (the new H1 pattern is the right accessibility contract)"
  - "Restore P0-7a mobile branch verbatim from 512a65b shape; defer deeper nav.js refactor to Candidate 2 RFC (LocationContext deepening)"
  - "block: 'start' (per plan) used instead of original 'nearest' — the plan's spec is the source of truth"
metrics:
  duration_minutes: 7
  tasks_completed: 3
  files_modified: 2
  commits: 2
  completed_date: "2026-05-06"
---

# Quick Task 260506-hz2: Fix 3 Pre-existing Smoke Failures Summary

Restored the green smoke gate by (1) updating hero H1 assertions to match the post-Astro accessible markup, and (2) restoring the mobile narrow-picker click branch in `js/nav.js` that was accidentally removed by commit `7656203` ("audit-wave1"). All 3 previously-failing tests are now green; `npm run check` and `npm run test:smoke` both exit 0.

## What Failed and Why

| # | Test | Project | Root cause |
|---|------|---------|------------|
| 1 | `homepage loads core navigation and booking panel` | chromium | `tests/smoke/site.spec.js:24` asserted `.hero-title [aria-label="MISSION"]` (legacy markup). Astro migration moved to a more accessible pattern: `<span class="visually-hidden hero-h1-seo">` carries the screen-reader text, `<span class="line-1">`/`<span class="line-2">` are decorative (`aria-hidden="true"`). Test was stale, not the markup. |
| 2 | `homepage loads core navigation and booking panel` | mobile (Pixel 5) | Same as #1 (same selector regression on both projects). |
| 3 | `Mobile location selector (P0-7a) > tapping a location link keeps overlay open and reveals info panel` | mobile (Pixel 5) | Commit `7656203` ("audit-wave1") deleted the mobile narrow-picker branch from `js/nav.js` that commit `512a65b` originally added for P0-7a. Without it, link clicks fall through to `closeLocationOverlay()` and let the browser navigate, so `#locationDropdown` loses `.open` and `#locationInfo` becomes invisible. |

## Changes

### `tests/smoke/site.spec.js` (Task 1 — commit `52f2741`)

Updated the homepage hero assertions:

```diff
- await expect(page.locator('.hero-title [aria-label="MISSION"]')).toBeVisible();
+ // Post-Astro hero H1 contract:
+ // - .hero-h1-seo carries the screen-reader H1 text (visually-hidden)
+ // - .line-1 is the decorative "STEP INTO THE" eyebrow (visible, aria-hidden)
+ // - .line-2 renders "TIME MISSION" via SVG mask (visible, aria-hidden, no text node)
+ await expect(page.locator('.hero-title .hero-h1-seo')).toHaveText(/Time Mission.*Interactive Mission Rooms/i);
+ await expect(page.locator('.hero-title .line-1')).toBeVisible();
+ await expect(page.locator('.hero-title .line-1')).toHaveText(/STEP INTO THE/);
+ await expect(page.locator('.hero-title .line-2')).toBeVisible();
```

`.hero-h1-seo` is `visually-hidden` (clip-path/absolute), so `.toHaveText` (which only requires the element to be attached + match text) was used instead of `.toBeVisible` to avoid false-failing on visual hiding.

### `js/nav.js` (Task 2 — commit `8ba675e`)

Restored the narrow-picker matchMedia + the mobile click branch. The new click handler signature changes from `() =>` back to `(e) =>` so `preventDefault`/`stopPropagation` can be called.

```diff
+ const narrowPickerQuery = window.matchMedia('(max-width: 768px)');

  if (locationBtn && locationOverlay) {
    ...
-   link.addEventListener('click', () => {
+   link.addEventListener('click', (e) => {
        const cityName = link.dataset.city;
        const slug = getLocationSlug(link);
+       const narrowPicker = narrowPickerQuery.matches;
+       const isComingSoonLink = link.classList.contains('location-coming-soon');

        if (cityName) {
            const overlayTrack = slug ? { cta_id: 'nav_location_overlay' } : undefined;
            syncAllLocations(cityName, slug, overlayTrack);
            showLocationInfo(slug || cityName);
        }

+       // Mobile narrow-picker (P0-7a): keep overlay open, reveal #locationInfo, scroll it into view.
+       // Coming-soon links bypass this and navigate normally so users still see the coming-soon page.
+       if (narrowPicker && slug && !isComingSoonLink) {
+           e.preventDefault();
+           // Stop bubble to overlay-background click handler which would call closeLocationOverlay()
+           e.stopPropagation();
+           const panel = document.getElementById('locationInfo');
+           if (panel) {
+               requestAnimationFrame(function () {
+                   panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
+               });
+           }
+           return;
+       }

+       // Desktop (or coming-soon on any width): close overlay and let the browser follow href.
        closeLocationOverlay();
   });
```

Behaviour matrix after fix:

| Viewport | Link type | Action |
|----------|-----------|--------|
| ≤ 768px (mobile) | Open venue | preventDefault + scrollIntoView + overlay stays open |
| ≤ 768px (mobile) | Coming-soon (`.location-coming-soon`) | Native nav + closeLocationOverlay() |
| ≥ 769px (desktop) | Any | Native nav + closeLocationOverlay() (unchanged) |

## Regressing commit reference

- `512a65b feat(10-02): add mobile P0-7a regression test + stopPropagation fix in js/nav.js` — original P0-7a fix (the source-of-truth for what was restored)
- `7656203 fix(audit-wave1): high-priority client audit fixes` — accidentally deleted the narrow-picker branch (`+3 -28` in `js/nav.js`); future audit reviewers should know this commit removed P0-7a along with intended changes

## Verification

| Gate | Result |
|------|--------|
| `npm run build:astro` | exits 0 (Astro build + minify + CSP hash injection) |
| `npm run check` | exits 0 (32 routes, 33 pages, all 18 check-* scripts pass) |
| `npm run test:smoke` | **58 passed, 2 skipped (by design), 0 failed** in 36.1s |
| `npm run verify` (= `verify-site-output.mjs`) | exits 0 |
| `npm run verify:phase10` (cutover-gate alias) | exits 0 |
| Scope (`git diff --stat bef2441..HEAD`) | exactly 2 files: `tests/smoke/site.spec.js`, `js/nav.js` |

The 3 specific previously-failing tests are now PASS:

1. `[chromium] tests/smoke/site.spec.js:19 › homepage loads core navigation and booking panel` — **PASS**
2. `[mobile] tests/smoke/site.spec.js:19 › homepage loads core navigation and booking panel` — **PASS**
3. `[mobile] tests/smoke/site.spec.js:226 › Mobile location selector (P0-7a) › tapping a location link keeps overlay open and reveals info panel` — **PASS** (chromium project skips it via `test.skip(({ isMobile }) => !isMobile, 'mobile-only test')`)

No previously-passing tests regressed.

## Deviations from Plan

### `[Rule 3 — Blocking issue resolved]` Plan referenced `npm run build` which doesn't exist

- **Found during:** Task 1 verify
- **Issue:** Plan's `<verify>` block called `npm run build`; actual script in `package.json` is `npm run build:astro` (full pipeline: `sync-static-to-public.mjs && astro build && minify-dist-assets.mjs && inject-csp-hashes.mjs`).
- **Fix:** Used `npm run build:astro` instead. Net behaviour matches plan intent (build dist/ before Playwright preview boots).
- **Files modified:** None (script-name correction only)

### `[Note]` Worktree branch base reset re-staged unrelated artifacts

- **Found during:** Pre-Task 1 setup
- **Issue:** The worktree-branch-check soft-reset to `bef2441` re-staged two files that were *deleted* in commits 305c745 and beyond: `assets/video/hero-bg-web.mp4` and `js/roller-checkout.js`. They appeared as `A` (added) in `git status`.
- **Fix:** Unstaged them with `git reset HEAD` so they remain untracked working-tree files. They are NOT part of this task's scope and were never committed by hz2.
- **Files modified:** None (staging-only correction)

## Authentication Gates

None — no external services touched.

## GitNexus impact analysis (manual, MCP unavailable)

The `mcp__gitnexus__*` tools are not provided in this executor's environment (only the `gitnexus` CLI is on PATH). I performed manual impact analysis by reading `js/nav.js`:

- `showLocationInfo` — defined at `js/nav.js:201`; called at lines 156 (mouseenter), 168 (click), 257 (post-load). Not exposed on `window`, not imported elsewhere. **Risk: LOW**, scope local to nav.js IIFE.
- `syncAllLocations` — defined at `js/nav.js:80`; called at lines 167 (click) and 252 (post-load). Not exposed on `window`. **Risk: LOW**, scope local to nav.js IIFE.

Edits were confined to the click handler scope per plan. Post-edit `git diff --stat` confirms ONLY `js/nav.js` and `tests/smoke/site.spec.js` modified (matches Task 3 success criterion).

The GitNexus index is now stale at `bef2441`; the orchestrator's docs commit will trigger the post-commit hook which re-runs `npx gitnexus analyze`.

## Future Work (out of scope)

- **Candidate 2 RFC — LocationContext deepening + nav.js refactor:** The deeper restructuring of `js/nav.js` to hoist click-handling into LocationContext was intentionally deferred per the plan's `<context>` section. This minimal fix preserves the current shape so the RFC can land cleanly later without merge friction.

## Self-Check: PASSED

- `tests/smoke/site.spec.js` — FOUND, modified at lines 19–34 (hero assertions block)
- `js/nav.js` — FOUND, modified at line 111 (matchMedia hoist) and lines 159–188 (click handler)
- Commit `52f2741` (Task 1 — test) — FOUND in `git log`
- Commit `8ba675e` (Task 2 — fix) — FOUND in `git log`
- 3 previously-failing tests verified PASS in `npm run test:smoke` output
- `npm run check` exit 0 — VERIFIED
- `npm run test:smoke` exit 0 (58 pass, 2 skipped) — VERIFIED
- `npm run verify:phase10` exit 0 — VERIFIED
- Scope = exactly 2 files (`git diff --stat bef2441..HEAD`) — VERIFIED
