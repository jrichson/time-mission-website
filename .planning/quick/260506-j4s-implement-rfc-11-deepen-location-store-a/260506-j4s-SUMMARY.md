# Quick Task 260506-j4s — SUMMARY

**RFC:** [#11 — deepen the location store](https://github.com/jrichson/time-mission-website/issues/11)
**Branch:** `gsd/v1.0-milestone`
**Date:** 2026-05-06

## Goal

Hybrid of Design A (storage fix) + Design C (FALLBACK kill via inline JSON).
Public `window.TM` surface preserved verbatim; dual-source disease eliminated.

## Commits

| Hash | Task | Description |
|------|------|-------------|
| `cd38454` | 1 | feat: deepen window.TM + inline TM_DATA |
| `5a3dd90` | 2 | fix: single-writer location storage + architecture guard |
| `3f0e0a2` | 3 | build: regenerate CSP hashes for inline TM_DATA script |

## Net Code Change

| File | Δ |
|------|---|
| `js/locations.js` | -154 LoC (FALLBACK constant) -70 LoC (fetch+ready+synthetic-current) +30 LoC (getSavedSlug + onChange + TM_DATA reader) |
| `js/nav.js` | +24 / -9 (logo→getSavedSlug, syncAllLocations dual-write deletion, TM.onChange subscriber) |
| `scripts/check-fallback-locations-sync.js` | **DELETED** (-119 LoC) |
| `scripts/check-locations-architecture.js` | **NEW** (~30 LoC) |
| `src/components/SiteScripts.astro` | +5 (inline TM_DATA block) |
| 9 root `*.html` pages | -8 each (inline `localStorage.setItem` blocks) |
| `package.json` | check:fallback → check:locations-architecture |
| `_headers` | 2 hashes retired, 4 added (CSP regen) |

**Approximate total:** −290 LoC removed, public API surface preserved.

## Verification

- ✅ `npm run check` — exit 0; new `check-locations-architecture` reports "Single writer: js/locations.js"
- ✅ `npm run test:smoke` — **58 pass / 0 fail / 2 skipped (by design)**, includes BOOK-04 race + P0-7a mobile selector
- ⚠️  `npm run verify` — exit 1, but failure is **pre-existing** in `check-hreflang-cluster.js` (see deferred-items.md). Reproduces on baseline `b4c52e9` after fresh build. `src/components/SiteHead.astro` emits hreflang since `2d75334` audit-wave6 — out of RFC #11 scope.
- ✅ Build artifact regen: `npm run build:astro` injects `window.TM_DATA` into 26 dist pages; `inject-csp-hashes.mjs` updates `_headers` automatically.

## Deliverables vs RFC

| # | RFC item | Status |
|---|----------|--------|
| 1 | Add `TM.getSavedSlug()` | ✅ |
| 2 | Add `TM.onChange()` | ✅ |
| 3 | Fix nav.js dual-writer | ✅ |
| 4 | Migrate-once on legacy `timeMissionLocation` | ✅ |
| 5 | Inject `window.TM_DATA` via `SiteScripts.astro` | ✅ |
| 6 | Pre-Astro HTML bridge | ⏭️ Skipped (planner verified `_redirects` 301s every legacy `*.html` to Astro paths; bridge unneeded) — but defensively, root `*.html` files were de-leaked anyway |
| 7 | Delete FALLBACK constant | ✅ |
| 8 | Delete fetch + ready-promise + synthetic-current | ✅ — `TM.ready === Promise.resolve()` |
| 9 | Delete `scripts/check-fallback-locations-sync.js` | ✅ (-119 LoC) |
| 10 | New `check-locations-architecture.js` | ✅ |

## Public API Compatibility

The 14-method `window.TM` surface is signature-stable. No callers required code changes:

- `ticket-panel.js` — no edits (consumes `TM.ready.then`, still works)
- `booking-controller.js` — no edits
- `a11y.js` — no edits
- `nav.js` — only the 3 RFC-required lines (logo handler, `syncAllLocations`, `TM.onChange` subscriber)

## Out of Scope (per RFC)

- The `updateDOM()` 35-selector ladder — Design B (clean redesign with `data-tm-bind-*`) considered and rejected as too invasive pre-cutover. File a follow-on RFC if it ever becomes painful.

## Human Verification Checkpoint (Task 4)

Per the plan, Task 4 is a manual UAT step. The user should:

1. `npx serve dist/` (or open `dist/index.html` in a browser)
2. Pick a city in the navbar → confirm dropdown text updates
3. Reload the page → confirm city persists (validates single-writer storage)
4. Open DevTools → Application → Local Storage → confirm only `tm_location` is written, NOT `timeMissionLocation` (validates legacy-key sunset)
5. Visit `/philadelphia?book=1` → confirm auto-redirect to Roller still works (BOOK-04 race fix from RFC #10 still green post-RFC-#11)
6. Open the page in private/incognito → with no localStorage, confirm `body[data-location]` still sets the visible location (validates secondary-hydration path)
7. Toggle DevTools "Throttling: Offline" → reload → confirm page still renders with locations (validates synchronous TM_DATA inline injection vs old fetch path)
8. Visit a coming-soon location → confirm its CTA goes to `/<slug>` not Roller (validates resolveBookingUrl integration with the new store)
9. Mobile viewport → tap location selector → tap a city → confirm overlay stays open and info panel reveals (validates P0-7a path is intact)
