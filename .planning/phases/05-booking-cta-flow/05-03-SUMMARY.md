---
phase: 05-booking-cta-flow
plan: 03
status: complete
---

## Summary

- `bookOrOpenPanel` in `js/ticket-panel.js`: `https:` direct booking URLs use `window.location.assign(href)` (D-01); mailto/tel unchanged.
- Added `docs/booking-cta-surface-matrix.md` (operator-facing BOOK-01 / D-04 table).

## Grep follow-up

- `window.open` does not appear in `js/ticket-panel.js` after change. Other `js/` files were not required to be empty of `window.open` for this phase.

## Self-Check: PASSED
