# Deferred Items — Quick Task 260506-gnx (RFC-10)

These pre-existing smoke test failures are NOT caused by RFC-10 changes. They
fail identically on the pre-task baseline (HEAD `2043d56`) before any of this
task's edits, so they are out of scope per the GSD scope-boundary rule.

| # | Test | Project | Symptom | Pre-existing on HEAD `2043d56`? |
|---|------|---------|---------|---------------------------------|
| 1 | `tests/smoke/site.spec.js:19 — homepage loads core navigation and booking panel` | chromium | `locator('.hero-title [aria-label="MISSION"]')` not found. The current `dist/index.html` (from `src/pages/index.astro`) renders `<span class="visually-hidden hero-h1-seo">` + `<span class="line-1" aria-hidden="true">` instead of `aria-label="MISSION"`. The test references a structure that no longer exists in the Astro-rendered output. | ✓ Yes |
| 2 | `tests/smoke/site.spec.js:19 — homepage loads core navigation and booking panel` | mobile (Pixel 5) | Same as #1 | ✓ Yes |
| 3 | `tests/smoke/site.spec.js:219 — Mobile location selector (P0-7a) › tapping a location link keeps overlay open and reveals info panel` | mobile (Pixel 5) | `#locationInfo` resolves to the element but `.toBeVisible()` fails (`unexpected value "hidden"`); 8x retries don't recover. Likely a viewport/timing flake unrelated to booking module. | ✓ Yes |

## Verification

The pre-existing baseline was confirmed via `git stash` of Task 3 changes,
re-running `npx playwright test --project=chromium -g "homepage loads core
navigation"` and `--project=mobile -g "Mobile location selector"`. Both
failed identically on the Task 1+2-only baseline (Tasks 1 and 2 cannot
plausibly affect the hero-title `aria-label` element or the mobile location
selector — those touch `js/booking-controller.js` and `js/ticket-panel.js`
only). The failures are also reproducible against the strict pre-Task-1
HEAD `2043d56`.

## Booking-related smoke tests (in scope) — ALL PASS

- ✓ `tests/smoke/site.spec.js:32 — ticket panel options hydrate from location data` — validates `/orland-park?book=1` and `/manassas?book=1` hrefs (TMBooking.mount syncCtaHref)
- ✓ `tests/smoke/site.spec.js:85 — open location ?book=1 navigates to https checkout` — validates the new `scheduleAutoRedirect` + `awaitTMReady` deadline poll (BOOK-04 race fix)

55 of 58 enabled smoke tests pass; 3 failures pre-existing; 2 skipped (also pre-existing).

## Recommendation

These pre-existing failures should be filed as separate quick tasks. They
do not gate RFC-10 (booking module deepening) cutover.
