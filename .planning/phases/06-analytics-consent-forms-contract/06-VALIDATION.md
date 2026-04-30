---
phase: 06
slug: analytics-consent-forms-contract
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-29
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (`@playwright/test`) + Node check scripts |
| **Config file** | `playwright.config.js` |
| **Quick run command** | `npm run check:analytics` (after PLAN wires it) |
| **Full suite command** | `npm run verify:phase6` |
| **Estimated runtime** | ~60–120 seconds (includes `build:astro`) |

---

## Sampling Rate

- **After every task commit:** `npm run check:analytics` where applicable; always `node scripts/check-analytics-contract.js` if touched
- **After every plan wave:** `npm run verify:phase6` or at minimum `npm run check && npm run test:smoke`
- **Before `/gsd-verify-work`:** `npm run verify:phase6` green
- **Max feedback latency:** ~120s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-* | 01 | 1 | ANLY-01 | T-06-01 | CSP + no secrets in repo | grep/build | `npm run build:astro` | ✅ | ⬜ |
| 06-02-* | 02 | 2 | ANLY-02 — ANLY-04 | T-06-02 | No PII keys in contract | node | `npm run check:analytics` | PLAN | ⬜ |
| 06-03-* | 03 | 2 | FORM-01 — FORM-04 | T-06-03 | No PII in form events | playwright | `npm run test:smoke` | ✅ | ⬜ |
| 06-04-* | 04 | 3 | ANLY-05 | T-06-02 | Dedupe-ready payloads | playwright + node | `npm run test:smoke` | ✅ | ⬜ |
| 06-05-* | 05 | 4 | ANLY-06 + gate | — | Doc accuracy | manual/doc | `npm run verify:phase6` | ✅ | ⬜ |

---

## Wave 0 Requirements

- **Existing infrastructure covers all phase requirements** — no new Wave 0 test framework install.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GTM Preview + GA4 DebugView | ANLY-01 / operator | Needs real GTM container | Tag Assistant / GTM Preview on staging |
| Cross-domain linker | ANLY-06 | ROLLER tenant config | Follow `docs/roller-booking-launch-checklist.md` |

---

## Validation Sign-Off

- [x] Wave 0 N/A — existing infra
- [ ] All tasks include `<automated>` verify
- [ ] `nyquist_compliant: true` after execution

**Approval:** pending
