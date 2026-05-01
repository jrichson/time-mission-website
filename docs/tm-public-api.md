# Time Mission — public browser API (`window`)

This document is the **supported extension surface** for locations, booking, and analytics on timemission.com. New features should call through these objects rather than reaching into script internals.

## `window.TMFacade` (preferred)

Single entry for editors and integrations:

| Property              | Description |
|-----------------------|-------------|
| `TM`                  | Location data API (`load`, `get`, `select`, `listTicketOptions`, etc.) — see below. |
| `TMBooking`           | Booking gateway: `getDestination`, `navigate`, `attach`, `isDirectBookingUrl`. |
| `TMAnalytics`         | `track(eventKey, params)` — normalized, non-PII GTM queue (see `analytics-labels.json`). |
| `BookingController`   | Lower-level attachment helper (legacy name); prefer `TMBooking` for navigation decisions. |

Getters resolve at access time so load order (`locations.js` after `booking-controller.js` / `analytics.js`) stays valid.

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

## `window.TMBooking`

Defined in `js/booking-controller.js`. Use for programmatic booking navigation and panel coordination.

## `window.TMAnalytics`

Defined in `js/analytics.js`. Keys must exist in `src/data/site/analytics-labels.json` (including `site_contract_stale` for roster drift diagnostics).

## `window.__TM_SITE_CONTRACT__`

Small JSON-safe embed from `getPublicSiteContract()` (build time). Includes `locationsFingerprint` for comparing the shipped roster hash to the fetched `locations.json` after `TM.load()` (non-PII analytics signal on mismatch).

## Contract checks

- Booking rules: `scripts/policies/booking-policies.cjs` via `scripts/check-booking-architecture.js`.
- Full gate: `npm run verify`.
