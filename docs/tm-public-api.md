# Time Mission — public browser API (`window`)

This document is the **supported extension surface** for locations, booking, and analytics on timemission.com. New features should call through these objects rather than reaching into script internals.

## `window.TMFacade` (preferred)

Single entry for editors and integrations:

| Property              | Description |
|-----------------------|-------------|
| `TM`                  | Location data API (`load`, `get`, `select`, `listTicketOptions`, etc.) — see below. |
| `TMBooking`           | Booking gateway: `resolveIntent`, `getDestination`, `navigate`, `attach`, `isDirectBookingUrl`. |
| `TMAnalytics`         | `track(eventKey, params)` — normalized, non-PII GTM queue (see `analytics-labels.json`). |
| `BookingController`   | Lower-level attachment helper (legacy name); prefer `TMBooking` for navigation decisions. |

Getters resolve at access time so `TMFacade` can point at modules loaded earlier or later in the browser script chain.

## `window.TM` (locations)

Defined in `js/locations.js`. Notable methods:

- `TM.ready` — Promise when `data/locations.json` has been fetched.
- `TM.load()` — loads location roster (called by pages).
- `TM.get(id)`, `TM.getOpen()`, `TM.getByRegion(region)`
- `TM.normalizeSlug(value)` — same slug key rules as `id` / persisted `tm_location`.
- `TM.isIndexPath()` — `true` when the current URL is the marketing homepage (no forced location restore).
- `TM.select(id, opts?)` — optional `opts.cta_id` is merged into the `location_select` analytics payload (single event per selection).
- `TM.clear()`, `TM.restore()`
- `TM.listTicketOptions()` — ticket panel `<option>` data; **must match** `src/lib/ticket-options.ts` (`ticketPanelSelectOptions`).
- `window.LocationContext.getLocationView(id)` — stable location view data for overlay/footer/ticket surfaces.

## `window.TMBooking`

Defined in `js/booking-controller.js`. Use for programmatic booking navigation and panel coordination.

- `TMBooking.resolveIntent(opts)` — returns the booking decision for a location/kind/group combination, including `href`, `presentation`, and provider flags.
- `TMBooking.getDestination(opts)` — returns only the destination URL from the same decision logic.
- `TMBooking.navigate(intent)` — tracks and performs the selected presentation: iframe, Roller iframe, EU outbound link, or normal internal link.

## `window.TMI18n`

Defined in `js/language-switcher.js`. Static copy still uses `data-i18n` attributes.

- `TMI18n.t(key, lang?)` — raw translation lookup.
- `TMI18n.text(key, fallback, replacements?)` — string fallback plus `{token}` formatting for dynamic browser copy.
- `TMI18n.array(key, fallback)` — array fallback for rotating browser copy.

## `window.TMAnalytics`

Defined in `js/analytics.js`. Keys must exist in `src/data/site/analytics-labels.json` (including `site_contract_stale` for roster drift diagnostics).

## `window.__TM_SITE_CONTRACT__`

Small JSON-safe embed from `getPublicSiteContract()` (build time). Includes `locationsFingerprint`, location ids, EU external-location ids, booking presentation facts, and runtime event/storage keys for comparing the shipped roster hash to the fetched `locations.json` after `TM.load()` (non-PII analytics signal on mismatch).

## Contract checks

- Booking rules: `scripts/policies/booking-policies.cjs` via `scripts/check-booking-architecture.js`.
- Full gate: `npm run verify`.
