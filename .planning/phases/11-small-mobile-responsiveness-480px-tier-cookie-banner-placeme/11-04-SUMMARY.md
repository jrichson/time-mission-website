---
phase: 11-small-mobile-responsiveness-480px-tier-cookie-banner-placeme
plan: 04
status: complete
tasks_completed: 1
tasks_total: 1
gap_closure: false
key-files:
  created:
    - .planning/phases/11-small-mobile-responsiveness-480px-tier-cookie-banner-placeme/11-04-SUMMARY.md
  modified:
    - tests/smoke/site.spec.js
    - tests/smoke/visual.spec.js-snapshots/homepage-mobile-darwin.png
    - tests/smoke/visual.spec.js-snapshots/location-open-mobile-darwin.png
    - tests/smoke/visual.spec.js-snapshots/location-coming-soon-mobile-darwin.png
    - tests/smoke/visual.spec.js-snapshots/groups-corporate-mobile-darwin.png
    - tests/smoke/visual.spec.js-snapshots/groups-birthdays-mobile-darwin.png
    - tests/smoke/visual.spec.js-snapshots/faq-mobile-darwin.png
    - tests/smoke/visual.spec.js-snapshots/contact-mobile-darwin.png
    - tests/smoke/visual.spec.js-snapshots/groups-corporate-chromium-darwin.png
---

# Plan 11-04 Summary — Small-mobile Playwright smoke tests

## Outcome
Added a `test.describe('small mobile (375x667)', …)` block to `tests/smoke/site.spec.js` (65 lines, 7 tests) and refreshed visual regression baselines invalidated by Wave 1 CSS changes. The full smoke suite is green: **54 passed, 2 skipped, 0 failed**.

## What was built

`tests/smoke/site.spec.js` — appended a single describe block at end of file (lines 237–298):

1. `test.use({ viewport: { width: 375, height: 667 } })` — per-block viewport override (no playwright.config.js change required).
2. **Four no-horizontal-scroll tests** in a `for (const url of REPRESENTATIVE_PAGES)` loop covering `/`, `/antwerp`, `/faq`, `/locations`. Asserts `documentElement.scrollWidth <= window.innerWidth + 1` (1px sub-pixel tolerance).
3. **Footer-legal wrap test** at `/about` — asserts `getComputedStyle(.footer-legal).flexWrap === 'wrap'` and `offsetHeight > 20`. Validates Plan 11-01's `css/footer.css` ≤480 rule.
4. **`.location-btn` 44×44 tap-target test** at `/` — `boundingBox()` width and height ≥ 44.
5. **`.nav-right .btn-tickets` 44×44 tap-target test** at `/` — scoped to nav-bar copy (page has 4+ `.btn-tickets` including a hidden one inside the collapsed `.mobile-menu` drawer; `.first()` originally matched the hidden one and timed out).

## Verification
```
npm run build:astro                                    # Astro build green
npm run test:smoke -- --grep "small mobile"            # 14 passed (7 cases × 2 projects)
npm run test:smoke                                      # 54 passed, 2 skipped
```

## Deviations
- **`.btn-tickets` selector scoped to `.nav-right`** — plan-as-written used `.btn-tickets` `.first()`, which Playwright resolved to the hidden `<a>` inside the closed `.mobile-menu` drawer (timeout). Selector tightened to `.nav-right .btn-tickets` so the assertion targets the always-visible nav-bar Book Now. Same intent, deterministic locator.
- **Visual baselines regenerated (8 PNGs)** — Wave 1 CSS changes legitimately moved pixels on mobile-project screenshots and one chromium screenshot (groups-corporate). Baselines regenerated via `playwright test --update-snapshots`. These are intended changes, not regressions; the new screenshots show the post-fix small-mobile layout the phase was designed to deliver.

## Commits
- `0082baa` feat(11-04): add small mobile (375x667) Playwright smoke tests
- `0be57cd` test(11-04): refresh visual baselines for ≤480 CSS + cookie-banner changes

## Self-Check: PASSED
- File modified: tests/smoke/site.spec.js (+65 lines).
- All acceptance grep checks return ≥ expected matches.
- `npm run test:smoke -- --grep "small mobile"` → 14/14 pass.
- `npm run test:smoke` (full suite) → 54 pass, 0 fail, 2 skipped (pre-existing Phase 6 skips).
- `playwright.config.js` unchanged (`git diff --stat playwright.config.js` empty).
