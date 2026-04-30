---
phase: 04
slug: shared-components-template-parity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-04-29"
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for Phase 4 (shared Astro components + template parity).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node CommonJS scripts + `@playwright/test` (existing) |
| **Config file** | `package.json`, `playwright.config.js` |
| **Quick run command** | `npm run check` |
| **Full suite command** | `npm run verify:phase4` (added by Phase 4 plans) |
| **Estimated runtime** | ~120–240 seconds |

---

## Sampling Rate

- **After every task commit:** `npm run check` (minimum)
- **After every plan wave:** `npm run build:astro` + Phase 4–specific parity checks scripts once introduced
- **Before `/gsd-verify-work`:** Full `npm run verify:phase4` must be green
- **Max feedback latency:** Under 300 seconds for verify:phase4 on CI-class hardware

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------- |
| Pending | TBD | 1–4 | FND-02, COMP-xx | Static site — SSRF/auth N/A | N/A | script + grep | `npm run check` | ⬜ pending |

Planner will populate concrete rows as PLAN.md tasks land.

---

## Wave 0 Requirements

- [x] Existing `npm run check` covers location, routes, site data, components (legacy HTML)
- [x] Phase 4 adds `verify:phase4` chaining `check` + `build:astro` + new Astro/ticket-panel parity checks per RESEARCH.md

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|---------------------|
| Visual parity | FND-02 | Pixel-level judgment | Compare representative Astro routes to legacy HTML in browser for each golden template |
| Ticket panel UX | COMP-02 | Focus trap / screen reader | Keyboard and SR spot-check on one migrated page |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or documented manual-only path
- [ ] Sampling continuity across waves
- [ ] `nyquist_compliant: true` set when plans complete

**Approval:** pending
