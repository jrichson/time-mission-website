---
phase: 05-booking-cta-flow
plan: 02
status: complete
---

## Summary

- Replaced `js/roller-checkout.js` with documented no-op IIFE (BOOK-03 / D-02): no CDN injection, no `RollerCheckout`, no capture-phase interception.
- Refreshed `scripts/check-booking-architecture.js`: removed requirement for `loc.rollerCheckoutUrl` inside roller-checkout; added BOOK-03 forbids for iframe CDN, `RollerCheckout`, and `cdn.rollerdigital.com`.

## Notes

- `SiteScripts.astro` and legacy HTML may still reference `roller-checkout.js` for load-order compatibility; file remains valid JS with 200 response.
- Initial homepage load no longer requests `checkout_iframe.js` (spot-check via smoke server logs).

## Self-Check: PASSED
