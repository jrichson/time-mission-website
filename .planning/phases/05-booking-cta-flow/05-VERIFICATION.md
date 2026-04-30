---
phase: 05
name: booking-cta-flow
status: passed
updated: "2026-04-29"
---

# Phase 5 verification — Booking & CTA Flow

## Goal (from ROADMAP)

Booking and revenue-adjacent CTAs resolve predictably through validated destinations, with tracked external checkout links as the default path.

## Requirements traced

| ID | Evidence |
|----|----------|
| BOOK-01 | `resolveOpenCheckoutUrl` + `bookOrOpenPanel` same-tab `assign`; matrix doc |
| BOOK-02 | `getBookingUrl` coming-soon → `getLocationPage` unchanged |
| BOOK-03 | `roller-checkout.js` no-op; `check-booking-architecture.js` BOOK-03 asserts |
| BOOK-04 | `scheduleAutoRedirect` uses `getBookingUrl`; smoke covers `?book=1` → https nav request |
| BOOK-05 | `docs/roller-booking-launch-checklist.md`; linked from checklist + phase docs |

## Automated gate

`npm run verify:phase5` — **passed** (executed 2026-04-29 in this session).

Includes: `npm run check`, `build:astro`, `check:routes -- --dist`, `check:astro-dist`, `check:ticket-panel-parity`, `check:ticket-panel-source-parity`, `test:smoke`.

## Human verification

- BOOK-05 checklist items (GTM preview, test purchase, dataLayer) require operator access — documented, not automated here.

## Gaps

None identified for phase scope; optional human BOOK-05 sign-off remains pre-launch.
