---
phase: 05-booking-cta-flow
plan: 04
status: complete
---

## Summary

- Smoke: `open location ?book=1 navigates to https checkout` asserts first **navigation** request to non-localhost `https://` (avoids flaking on `chrome-error://` when third-party document load fails).
- Added `docs/roller-booking-launch-checklist.md` (BOOK-05: GTM/GA4/purchase QA outline).
- `package.json`: `verify:phase5` chains check → astro build → dist route check → astro manifest → ticket-panel parity (×2) → smoke.

## CI / networking

- Outbound HTTPS request is still required for the new smoke test; fully air-gapped CI may need adjustment or skip policy.

## Self-Check: PASSED
