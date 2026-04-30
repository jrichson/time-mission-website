---
phase: 05-booking-cta-flow
plan: 01
status: complete
---

## Summary

- Added `resolveOpenCheckoutUrl(loc)` in `js/ticket-panel.js`: non-empty trimmed `rollerCheckoutUrl` precedes `bookingUrl` for open venues (D-03). Coming-soon still returns internal path via `getLocationPage` in `getBookingUrl`.
- Extended `scripts/check-booking-architecture.js` with resolver presence and Roller-first ordering heuristic.

## Verification

- `npm run check:booking` and `npm run check:locations` passed during execution.
- `window.TM.ready` guard unchanged for `?book=1` auto-redirect.

## Self-Check: PASSED
