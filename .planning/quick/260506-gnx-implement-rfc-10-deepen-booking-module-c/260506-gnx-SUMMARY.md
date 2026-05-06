---
phase: quick-260506-gnx
plan: 01
subsystem: booking
tags: [rfc-10, booking, refactor, race-fix, dead-code-removal]
dependency_graph:
  requires:
    - js/locations.js (window.TM, window.TM.ready)
    - js/analytics.js (window.TMAnalytics.track, safeDestination)
    - data/locations.json (rollerCheckoutUrl, bookingUrl, status)
  provides:
    - "window.TMBooking.{open, resolve, mount, attach, getDestination, navigate, isDirectBookingUrl}"
    - "tm:booking:open CustomEvent"
    - "[data-tm-booking-trigger] click delegation owned end-to-end by TMBooking"
  affects:
    - 31 root + group HTML pages (script tag removed)
    - src/components/SiteScripts.astro (script tag removed; v= bumped on the two rewritten files)
    - src/partials/about-inline-scripts.frag.txt
    - scripts/policies/booking-policies.cjs (4 roller-* rules removed; ticket-panel-uses-tm-booking needle updated)
    - scripts/check-route-contract.js (shared scope trimmed)
tech_stack:
  added: []
  patterns:
    - "Single canonical booking gateway (RFC-10): all URL math + auto-redirect on window.TMBooking"
    - "Programmatic open via CustomEvent('tm:booking:open') decouples TMBooking from panel UI"
    - "Deadline-bounded TM.ready poll (awaitTMReady ≤1s) closes the BOOK-04 race"
key_files:
  created: []
  modified:
    - js/booking-controller.js
    - js/ticket-panel.js
    - src/components/SiteScripts.astro
    - src/partials/about-inline-scripts.frag.txt
    - scripts/policies/booking-policies.cjs
    - scripts/check-route-contract.js
    - 31 *.html files (root + groups + locations/index.html)
  deleted:
    - js/roller-checkout.js
decisions:
  - "Bumped cache-buster on booking-controller.js (v1->v2) and ticket-panel.js (v4->v5) — both files were rewritten and returning users must invalidate cached copies (Rule 2: correctness)"
  - "TMTicketPanel global removed entirely (RFC-10) — sole consumer js/roller-checkout.js was a deletable stub"
  - "Pre-existing smoke test failures (homepage MISSION aria-label + mobile location selector) deferred to separate quick task; reproducible on HEAD 2043d56 baseline so out of scope per scope-boundary rule"
metrics:
  tasks_completed: 3
  commits: 3
  duration_minutes: ~75
  loc_delta:
    js/booking-controller.js: "+161 / -1 (208 -> 368)"
    js/ticket-panel.js: "+64 / -203 (258 -> 119)"
    js/roller-checkout.js: "-13 (deleted)"
    total: "net +8 LoC across the booking module; ~210 LoC removed by deduplication"
  completed: 2026-05-06
requirements:
  - RFC-10
---

# Quick Task 260506-gnx: Implement RFC #10 — Deepen Booking Module — Summary

One-liner: **Collapsed all booking URL computation, analytics tracking, and the `?book=1` auto-redirect out of `js/ticket-panel.js` into `window.TMBooking`; deleted the dead `js/roller-checkout.js` stub and removed its 31 HTML script tags + 4 policy rules.**

## What was built

### 1. Expanded `window.TMBooking` surface (RFC-10)

Added three new public methods on `window.TMBooking`:

| Method | Behavior |
|--------|----------|
| `open(opts?)` | Programmatic ticket-panel open. Calls the registered panel's `openPanel` if mounted; otherwise dispatches `CustomEvent('tm:booking:open')` so panel impls (or future replacements) can listen without TMBooking importing UI code. |
| `resolve(opts)` | Canonical RFC-10 alias over `getDestination(opts)`. Thin wrapper. |
| `mount(panelEl?, opts?)` | Wires a panel DOM (selectEl, ctaBtn, overlayEl, closeEl) to TMBooking. Auto-discovers `#ticketPanel`/`#ticketLocation`/`#ticketBookBtn` if `panelEl` not supplied. Marks the CTA as `[data-tm-booking-trigger]`, binds the dropdown change handler, syncs CTA href deferred behind `TM.ready`, and delegates clicks via `attach()`. |

Final surface:
```js
window.TMBooking = { attach, getDestination, navigate, isDirectBookingUrl,
                     open, resolve, mount }
```

`window.TMFacade` re-exposes `TMBooking` via getter — the new methods appear automatically without any TMFacade edits.

### 2. BOOK-04 race fix in centralized `?book=1` auto-redirect

Moved `scheduleAutoRedirect` from `ticket-panel.js` into `booking-controller.js` and **fixed the race**:

- **Before:** if `window.TM` was undefined when ticket-panel.js executed, the code fell through synchronously to `scheduleAutoRedirect()` — which fired before location data hydrated.
- **After:** `awaitTMReady(deadline)` polls every 25ms for `window.TM.ready` until either the promise resolves OR a 1-second deadline is reached (last-resort fallback to avoid stranding the user on `/slug?book=1` if `TM` script never loads).
- Auto-boot guard: `DOMContentLoaded` if `document.readyState === 'loading'`; immediate call otherwise. Defer-attribute on the `<script>` tag means DOM is parsed by the time we run.

### 3. Slimmed `js/ticket-panel.js` to UI-only (258 → 119 LoC)

**Deleted:**
- `getBookingUrl(id)` (URL math)
- `scheduleAutoRedirect()` (moved to TMBooking)
- `tmTrack(key, payload)` helper (TMBooking owns location_select / booking_click)
- `normalizeLocation(value)` helper (no longer needed)
- The custom click listener on `#ticketBookBtn` that re-computed URLs (TMBooking.attach handles it via `[data-tm-booking-trigger]`)
- `window.TMTicketPanel = { open, close, getBookingUrl }` — public global removed entirely (RFC-10)

**Kept (UI-only):**
- `openTicketPanel(e)` / `closeTicketPanel()` — DOM class toggling, body overflow lock, direct `TMAnalytics.track('ticket_panel_open' | 'ticket_panel_close', …)` for parity
- `syncLocationOptions()` — hydrates `#ticketLocation` `<option>` list from `window.TM.locations` (fired on `window.TM.ready`)
- `getLocationContext()` — stripped to `{ ready, listTicketOptions: null }` (no booking helpers)
- ESC + overlay-click close handlers
- `tm:booking:open` event listener for programmatic `TMBooking.open()` calls

The panel is handed off via `window.TMBooking.mount(ticketPanel, { selectEl, ctaEl, overlayEl, closeEl, openPanel, closePanel, pageLocationSlug })`.

### 4. Deleted `js/roller-checkout.js` + removed every reference

`js/roller-checkout.js` was a 13-LoC doc stub whose only runtime reference was `window.TMTicketPanel.getBookingUrl`, which we deleted in this same change. Removed:

- The file itself (`git rm js/roller-checkout.js`)
- 31 `<script src="…/js/roller-checkout.js?v=1"></script>` tags across:
  - 28 root pages: 404, about, accessibility, antwerp, brussels, code-of-conduct, contact, cookies, dallas, faq, gift-cards, groups, houston, index, lincoln, licensing, locations/index, manassas, missions, mount-prospect, orland-park, philadelphia, privacy, terms, west-nyack, plus 6 `groups/*.html`
  - `src/components/SiteScripts.astro` (Astro layout)
  - `src/partials/about-inline-scripts.frag.txt`
- `js/roller-checkout.js` removed from `scripts/check-route-contract.js` `shared` SCOPE_FILES
- 4 roller-* policies dropped from `scripts/policies/booking-policies.cjs`:
  - `no-roller-checkouts-map`
  - `roller-no-iframe-cdn`
  - `roller-no-checkout-symbol`
  - `roller-no-cdn-domain`
- `ticket-panel-uses-tm-booking` policy needle updated: `'getTMBooking'` → `'window.TMBooking'` (slimmed ticket-panel.js references the global directly, not via a helper)

Cache-buster bumps on the two files whose source actually changed:
- `booking-controller.js?v=1` → `?v=2`
- `ticket-panel.js?v=4` → `?v=5`

## Files modified

### Created
None.

### Modified
- `js/booking-controller.js` (208 → 368 LoC; +161 / −1)
- `js/ticket-panel.js` (258 → 119 LoC; +64 / −203)
- `src/components/SiteScripts.astro` (5 lines changed; v= bumps + line removed)
- `src/partials/about-inline-scripts.frag.txt` (1 line removed)
- `scripts/policies/booking-policies.cjs` (32 lines removed; needle updated)
- `scripts/check-route-contract.js` (1 line removed)
- 31 *.html files in repo root + groups/ + locations/ (1 script tag line removed each)

### Deleted
- `js/roller-checkout.js` (13 LoC)

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1. Expand TMBooking | `7e2abc2` | js/booking-controller.js |
| 2. Slim ticket-panel | `3c125af` | js/ticket-panel.js |
| 3. Delete roller-checkout + cleanup | `305c745` | 36 files (including js/roller-checkout.js delete) |

## GitNexus impact reports captured

The MCP `gitnexus_*` tools were not directly available in this executor's runtime, but PreToolUse hooks confirmed the GitNexus knowledge graph for each symbol; manual grep-based blast-radius analysis was performed before each edit:

| Symbol | Direct callers (d=1) | Risk | Action |
|--------|----------------------|------|--------|
| `getDestination` | `getBookingUrl` (in ticket-panel.js — being deleted) [confirmed by GitNexus PreToolUse hook] | LOW | Updated in plan scope |
| `navigate`, `attach` | Same-file IIFE + ticket-panel.js [grep] | LOW | Updated in plan scope |
| `getBookingUrl` | js/roller-checkout.js (stub, being deleted) [grep] | LOW | Removed with file |
| `scheduleAutoRedirect` | Same-file IIFE only [grep] | LOW | Moved to booking-controller |
| `TMTicketPanel` | js/roller-checkout.js comment only [grep] | LOW | Removed with file |
| `roller-checkout.js` | 31 HTML pages + 4 policies + 1 scope list [grep] | LOW | All updated atomically |

GitNexus index is stale post-commit (last indexed: `38f54f0`); `npx gitnexus analyze` should run after the docs commit lands. The PostToolUse hook surfaces this reminder consistently.

## Verification

| Gate | Result |
|------|--------|
| `node -e ...booking-controller surface check` (Task 1 verify) | **PASS** — open/resolve/mount/getDestination/navigate/isDirectBookingUrl/scheduleAutoRedirect/window.TM.ready/awaitTMReady all present |
| `node -e ...ticket-panel slim check` (Task 2 verify) | **PASS** — no getBookingUrl/TMTicketPanel/scheduleAutoRedirect/tmTrack helper; window.TMBooking + window.TM.ready + data-tm-booking-trigger all present |
| `npm run check` | **PASS (exit 0)** — all 18 sub-checks green: locations, sitemap, components, **booking architecture**, accessibility, internal-links, **route contract**, site-data, location-routes, fallback, component-usage, site-contract, analytics, consent, seo-catalog, seo-robots. (Two pre-existing description-length warnings on `/houston` and `/orland-park`, unrelated to this task.) |
| `npm run test:smoke` | **55 passed; 3 pre-existing failures; 2 skipped.** All RFC-10 booking tests pass: `ticket panel options hydrate from location data` (validates `/orland-park?book=1` and `/manassas?book=1` hrefs from TMBooking.mount syncCtaHref) and `open location ?book=1 navigates to https checkout` (validates the new awaitTMReady deadline poll BOOK-04 fix). |

## Deviations from Plan

### Rule 2 — Cache-buster bumps in SiteScripts.astro

Plan said "do NOT bump the `?v=` cache buster on other scripts." Plan also rewrote both `js/booking-controller.js` (Task 1) and `js/ticket-panel.js` (Task 2). Returning users have these files cached; without a `?v=` bump, the rewritten code never reaches them. Bumped:
- `booking-controller.js?v=1` → `?v=2`
- `ticket-panel.js?v=4` → `?v=5`

Other scripts (locations, analytics, nav, etc.) were untouched and retain their existing `?v=` values.

### Rule 3 — Three additional HTML files cleaned

Plan's initial file-discovery loop missed three files (`philadelphia.html`, `faq.html`, `groups/private-events.html`) due to a stale background-task race when reading `/tmp/rfc10-rm.txt`. The verification scan (`grep -rln roller-checkout`) caught the residue immediately and a second python pass cleaned the missed files. Final `grep -rln "roller-checkout" --include="*.html" --include="*.astro" --include="*.txt" --include="*.cjs" --include="*.mjs" --include="*.js"` (excluding node_modules/dist/.planning) returns empty.

### Deferred — 3 pre-existing smoke test failures

Documented in `deferred-items.md`. Reproducible on the pre-task HEAD `2043d56` baseline (verified via `git stash` + isolated re-run). Out of scope per the GSD scope-boundary rule.

## Authentication gates

None encountered.

## Threat surface scan

No new attack surface. Removed surface: 31 `<script src=".../js/roller-checkout.js">` tags from production HTML (was a no-op stub but reduced loaded-script count by one per page).

No new network endpoints, auth paths, file-access patterns, or schema changes at trust boundaries.

## Stub tracking

No stubs introduced. The deleted `js/roller-checkout.js` itself was effectively a stub (Phase 5 BOOK-03 left it as a 13-LoC "intentionally empty" IIFE); RFC-10 retires it.

## Self-Check: PASSED

- `js/booking-controller.js` exists at expected path (368 LoC) — FOUND
- `js/ticket-panel.js` exists at expected path (119 LoC) — FOUND
- `js/roller-checkout.js` no longer exists — CONFIRMED MISSING
- Commit `7e2abc2` (feat task 1) — FOUND in git log
- Commit `3c125af` (refactor task 2) — FOUND in git log
- Commit `305c745` (chore task 3) — FOUND in git log
- `npm run check` exit 0 — VERIFIED
- `npm run test:smoke`: 55 pass / 3 pre-existing fail / 2 skip — VERIFIED (no regressions vs baseline)
- `grep -rln "roller-checkout" --include={.html,.astro,.txt,.cjs,.mjs,.js}` (excluding node_modules/dist/.planning) — empty — CONFIRMED
