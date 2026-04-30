---
phase: 05
slug: booking-cta-flow
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-04-29"
---

# Phase 05 — Validation Strategy

> Booking flow validation uses existing **Node check scripts** and **Playwright smoke tests** — no new unit-test framework.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (`@playwright/test` 1.59.x) + Node check scripts |
| **Config file** | `playwright.config.js` |
| **Quick run command** | `npm run check:booking && npm run check:locations` |
| **Full suite command** | `npm run verify:phase5` (added in Plan 05-04) |
| **Estimated runtime** | ~60–120 seconds (depends on smoke count) |

---

## Sampling Rate

- **After every task commit:** `npm run check:booking`
- **After every plan wave:** `npm run check` (full static gates)
- **Before `/gsd-verify-work`:** `npm run verify:phase5` green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | BOOK-01 | T-05-02 | Resolver prefers HTTPS Roller/booking URLs | grep + node | `npm run check:booking` | ✅ | ⬜ |
| 05-01-02 | 01 | 1 | BOOK-02 | — | Coming-soon returns internal path only | grep | `grep -q "coming-soon" js/ticket-panel.js && npm run check:booking` | ✅ | ⬜ |
| 05-02-01 | 02 | 2 | BOOK-03 | T-05-01 | No Roller CDN iframe injection | grep | `! rg checkout_iframe js/roller-checkout.js` | ✅ | ⬜ |
| 05-03-01 | 03 | 3 | BOOK-01 | — | Same-tab https navigation | grep | `grep -q location.assign js/ticket-panel.js \|\| grep -q location.href js/ticket-panel.js` | ✅ | ⬜ |
| 05-04-01 | 04 | 4 | BOOK-04 | — | Smoke passes | Playwright | `npm run test:smoke` | ✅ | ⬜ |
| 05-04-02 | 04 | 4 | BOOK-05 | — | Checklist doc exists | file | `test -f docs/roller-booking-launch-checklist.md` | ✅ | ⬜ |

---

## Wave 0 Requirements

- [x] Existing `tests/smoke/site.spec.js` covers homepage booking panel
- [x] `scripts/check-booking-architecture.js` exists — extended by Phase 5 plans

*Wave 0 satisfied — no new framework install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GTM purchase event | BOOK-05 | Needs Venue Manager / staging tag playground | Follow `docs/roller-booking-launch-checklist.md` § GTM |

---

## Validation Sign-Off

- [x] All tasks have automated verify or existing script coverage
- [x] Sampling continuity maintained across waves
- [x] No watch-mode flags
- [ ] `nyquist_compliant: true` confirmed after execution

**Approval:** pending execution
