---
phase: 07
slug: seo-schema-local-search-baseline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-29
---

# Phase 07 — Validation Strategy

> Per-phase validation contract aligned with `07-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node CommonJS scripts under `scripts/check-*.js` (regex/HTML string parse; JSON-LD via `JSON.parse`); existing `@playwright/test` optional for smoke extensions |
| **Config file** | `package.json` (`check`, `verify:phase7` to be added); `playwright.config.js` (existing) |
| **Quick run command** | `npm run check` (after Wave 0 adds SEO catalog / robots-shape scripts) |
| **Full suite command** | `npm run verify:phase7` |
| **Estimated runtime** | ~120–180s including `build:astro` (dev hardware) |

---

## Sampling Rate

- **After every task commit:** `npm run check`
- **After every plan wave:** `npm run build:astro &&` targeted `scripts/check-schema-output.js` / `scripts/check-nap-parity.js` when those exist
- **Before `/gsd-verify-work`:** `npm run verify:phase7` must exit 0
- **Max feedback latency:** \<180s for full phase gate on representative hardware

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|---------------|------------|----------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 1 | SEO-01 | — | No PII in meta/OG; catalog is non-secret | unit | `node scripts/check-seo-catalog.js` | ❌ Wave 0 | pending |
| TBD | 01 | 1 | SEO-01 | — | Central robots rules ↔ registry | unit | `node scripts/check-seo-robots.js` | ❌ Wave 0 | pending |
| TBD | 02+ | 2 | SEO-01 | — | Rendered `dist/*.html` meta parity | integration | `node scripts/check-seo-output.js` | ❌ Wave 0 | pending |
| TBD | 03 | 3 | SEO-02 | — | Sitemap URLs = registry clean set | integration | `node scripts/check-sitemap-output.js` or `check-sitemap.js --dist` | ❌ Wave 0 | pending |
| TBD | 03 | 3 | SEO-03, SEO-04 | — | JSON-LD graph shape + open/coming-soon rules | integration | `node scripts/check-schema-output.js` | ❌ Wave 0 | pending |
| TBD | 04 | 4 | SEO-05 | — | NAP ↔ `data/locations.json` / TS module | integration | `node scripts/check-nap-parity.js` | ❌ Wave 0 | pending |
| TBD | 04 | 4 | SEO-06 | — | AI bot rules + `llms.txt` safe links | unit | `node scripts/check-robots-ai-bots.js`; `node scripts/check-llms-txt.js` | ❌ Wave 0 | pending |
| TBD | 05 | 5 | SEO-06 | — | GEO review artifact | file | `test -f docs/geo-answer-first-review.md` | ❌ Wave 0 | pending |
| Gate | — | — | SEO-01..06 | — | Full chain | integration | `npm run verify:phase7` | ❌ Wave 0 | pending |

*Executors: replace `TBD` with task IDs from PLAN.md.*

---

## Wave 0 Requirements

- [ ] `scripts/check-seo-catalog.js`
- [ ] `scripts/check-seo-robots.js`
- [ ] `scripts/check-seo-output.js`
- [ ] `scripts/check-sitemap-output.js` (or `--dist` on `check-sitemap.js`)
- [ ] `scripts/check-schema-output.js`
- [ ] `scripts/check-nap-parity.js`
- [ ] `scripts/check-robots-ai-bots.js`
- [ ] `scripts/check-llms-txt.js`
- [ ] `npm run verify:phase7`
- [ ] `docs/geo-answer-first-review.md`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|---------------------|
| Google Rich Results / Schema tools | SEO-03 | External validator | Paste sample `dist` URLs after build |
| Search Console sitemap ingestion | SEO-02 | Post-deploy | Submit `sitemap.xml` on cutover staging |

---

## Validation Sign-Off

- [ ] All tasks map to an automated command or manual row above
- [ ] Sampling: no three consecutive commits without `npm run check`
- [ ] Wave 0 script list tracked in PLAN tasks
- [ ] Feedback latency acceptable for executor agents
- [ ] After execution: `nyquist_compliant: true` when gate is green

**Approval:** pending
