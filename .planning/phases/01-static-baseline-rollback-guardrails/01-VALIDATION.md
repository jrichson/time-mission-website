---
phase: 01
slug: static-baseline-rollback-guardrails
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-29
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js (CommonJS checks) + `@playwright/test` |
| **Config file** | `playwright.config.js` |
| **Quick run command** | `npm run verify` |
| **Full suite command** | `npm run verify && npm run build:astro && node scripts/check-astro-dist-manifest.js` (exact script name after Plan 03 lands) |
| **Estimated runtime** | ~2–6 minutes (depends on Playwright + Astro build) |

---

## Sampling Rate

- **After every task commit:** `npm run verify` (minimum)
- **After every plan wave:** Full suite including Astro build + dist manifest (once Plan 03 exists)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~360 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FND-04 | T-static-01 | Git ref documented; no secrets in rollback doc | manual+git | `git tag` / `git branch` listing | ✅ tag | ⬜ pending |
| 01-02-01 | 02 | 2 | FND-01 | T-dep-01 | Pin astro deps; audit advisory | npm | `npm run build:astro` | ✅ dist | ⬜ pending |
| 01-03-01 | 03 | 3 | FND-03 | T-manifest-01 | No PII in manifest JSON | node | `node scripts/check-astro-dist-manifest.js` | ✅ script | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/check-astro-dist-manifest.js` — validates `dist/` output (Plan 03)
- **Existing infrastructure:** Location/sitemap/component/booking/a11y/link checks cover legacy static site

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Astro preview loads shell | FND-01 | Browser confirms MIME/path | Run `npm run preview:astro`; open `/`; confirm 200 and placeholder content |
| Representative asset renders | FND-03 | Binary/font sanity | Load one `/css/*.css`, one `/assets/` path from built output |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or documented manual steps
- [ ] Sampling continuity: manifest check follows Astro build tasks
- [ ] No watch-mode flags in CI commands
- [ ] `nyquist_compliant: true` set in frontmatter after execution

**Approval:** pending
