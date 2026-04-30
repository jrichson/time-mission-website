---
phase: 3
slug: validated-data-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-29
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node CommonJS scripts + npm scripts (existing) |
| **Config file** | `package.json` |
| **Quick run command** | `npm run check:locations && npm run check:site-data` (after Plan 03-02 adds site-data) |
| **Full suite command** | `npm run verify:phase3` |
| **Estimated runtime** | ~30–120 seconds (includes Astro build) |

---

## Sampling Rate

- **After every task commit targeting data:** Run `npm run check:locations` or `npm run check:site-data` as applicable
- **After every plan wave:** Run `npm run check`
- **Before `/gsd-verify-work`:** `npm run verify:phase3` must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 03-01 | 1 | DATA-04 | T-3-01 / — | No untrusted URL schemes in location URLs | script | `npm run check:locations` | ⬜ W0 | ⬜ pending |
| 3-01-02 | 03-01 | 1 | DATA-01 | — | N/A | script + import | `npm run build:astro` | ⬜ W0 | ⬜ pending |
| 3-01-03 | 03-01 | 1 | DATA-02 | — | N/A | script | `npm run check:locations` | ⬜ W0 | ⬜ pending |
| 3-02-01 | 03-02 | 1 | DATA-03 | — | Link targets are clean paths only | script | `npm run check:site-data` | ⬜ W0 | ⬜ pending |
| 3-03-01 | 03-03 | 2 | DATA-03 | — | Same | script | `npm run check:site-data` | ⬜ W0 | ⬜ pending |
| 3-04-01 | 03-04 | 2 | DATA-01–04 | — | Registry alignment | script | `npm run verify:phase3` | ⬜ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/check-site-data.js` — created in Plan 03-02; stub not required beforehand
- *Existing infrastructure: `scripts/check-location-contracts.js`, `npm run check`, Playwright*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Editor ergonomics for new JSON files | DATA-03 | IDE/schema comfort | Open each new `src/data/site/*.json` and confirm readable structure |

*If none beyond above: manual list stays minimal.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency acceptable
- [ ] `nyquist_compliant: true` set in frontmatter after execution

**Approval:** pending
