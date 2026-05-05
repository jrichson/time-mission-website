---
phase: 10
slug: audit-gap-closure-cutover-readiness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `10-RESEARCH.md` `## Validation Architecture` section.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `@playwright/test` ^1.59.1 (existing) + Node CommonJS validators in `scripts/` |
| **Config file** | `playwright.config.js` + `package.json#scripts` |
| **Quick run command** | `npm run check` |
| **Full suite command** | `npm run verify:phase10` (NEW — Wave 7 plan 10-09) |
| **Estimated runtime** | ~60–120s (current `verify` ~30s + axe scan ~30–60s + new validators ~5–15s) |

---

## Sampling Rate

- **After every task commit:** Run `npm run check` (fast static checks; no browser launch)
- **After every plan wave:** Run `npm run verify` (full chain incl. smoke tests)
- **Before `/gsd-verify-work`:** Full `npm run verify:phase10` must be green
- **Max feedback latency:** ~30s for `npm run check`; ~120s for full verify

---

## Per-Task Verification Map

| Plan | Wave | Finding | Behavior Under Test | Test Type | Automated Command | File Exists | Status |
|------|------|---------|---------------------|-----------|-------------------|-------------|--------|
| 10-03 | 2 | P1-3 | Every Astro page has `<main id="main">` and SSR `.skip-link` first focusable in built HTML | Static dist scan | `npm run check:a11y-baseline` (extended) | ⚠️ extend existing | ⬜ pending |
| 10-03 | 2 | P0-4 partial | Decorative SVGs in partials have `aria-hidden="true"` | Static partial scan | `npm run check:a11y-baseline` (extended) | ⚠️ extend existing | ⬜ pending |
| 10-04 | 2 | P0-4 | `dist/` HTML has zero `critical` or `serious` axe image-alt violations | Integration (axe + Playwright) | `npm run check:img-alt-axe` | ❌ Wave 0 | ⬜ pending |
| 10-04 | 2 | P0-7a | Mobile tap on location-link navigates without double-toggle | Smoke (Playwright mobile viewport) | `npm run test:smoke -- --project=mobile` | ❌ Wave 0 (extend smoke) | ⬜ pending |
| 10-05 | 3 | P1-16 | All 6 legal pages render via `dist/{slug}.html` with parity to legacy `terms.html`/etc. | Static dist scan + schema check | `npm run check:astro-dist` + `npm run check:schema-output` | ✅ extend existing | ⬜ pending |
| 10-06 | 4 | P1-9 | `dist/antwerp.html` emits `<html lang="nl-BE"`; US pages emit `<html lang="en"`; no cross-cluster hreflang (unless approved) | Static dist scan | `npm run check:hreflang-cluster` | ❌ Wave 0 | ⬜ pending |
| 10-07 | 5 | P1-18 | `dist/{location}.html` contains `<picture>` with `srcset` ≥2 sources for hero | Static dist scan | extend `check-seo-output.js` | ✅ extend existing | ⬜ pending |
| 10-07 | 5 | P2-1 | `web_vitals` event with LCP/CLS/INP appears in `dataLayer` on homepage + 1 location page | Manual (GTM DebugView) | Manual checklist in `docs/cutover-checklist.md` | n/a (manual) | ⬜ pending |
| 10-08 | 6 | P2-4 | Banner renders with `<aside aria-label="Cookie consent">` on first visit; consent state persists in localStorage; `dataLayer` receives `consent_update` event | Smoke (Playwright) | extend `tests/smoke/site.spec.js` | ✅ extend existing | ⬜ pending |
| 10-08 | 6 | P1-1 | All nav buttons + pagination ≥44px height; booking CTAs ≥48px | Static CSS audit | `npm run check:tap-targets` | ❌ Wave 0 | ⬜ pending |
| 10-09 | 7 | host items | `docs/cutover-checklist.md` exists with owner column for P1-7, P1-10, P1-11, P1-17, P2-8, P2-9, P2-10 | Static doc scan | `npm run check:cutover-checklist` (NEW) or grep | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Wave 0 = artifacts that must exist BEFORE the plan tasks execute. Per research, the planner should treat these as either explicit Wave 0 plans or as the first task in the relevant plan.

- [ ] `scripts/check-img-alt-axe.js` — new validator (covers P0-4); created in plan 10-04
- [ ] `scripts/check-tap-targets.js` — new validator (covers P1-1); created in plan 10-08
- [ ] `scripts/check-hreflang-cluster.js` — new validator (covers P1-9); created in plan 10-06
- [ ] `scripts/check-cutover-checklist.js` — new validator (covers cutover doc presence); created in plan 10-09
- [ ] `docs/cutover-checklist.md` — new doc (covers host items P1-7, P1-10, P1-11, P1-17, P2-8, P2-9, P2-10); created in plan 10-09
- [ ] Install `@axe-core/playwright` ^4.11.3: `npm install --save-dev @axe-core/playwright` — first task of plan 10-04
- [ ] Install `vanilla-cookieconsent` ^3.1.0: `npm install vanilla-cookieconsent` — first task of plan 10-08
- [ ] Install `web-vitals` ^5.2.0: `npm install web-vitals` — first task of plan 10-07
- [ ] Mobile project added to `playwright.config.js` (`devices['Pixel 5']`) — first task of plan 10-04 OR added to existing smoke project

---

## Manual-Only Verifications

| Behavior | Finding | Why Manual | Test Instructions |
|----------|---------|------------|-------------------|
| RUM `web_vitals` events arrive in GTM | P2-1 | Requires live GTM DebugView session against deployed preview | (1) Deploy preview, (2) open GTM DebugView, (3) load homepage + 1 location page, (4) confirm `web_vitals` event with `name`, `value`, `id` parameters |
| Cookie consent UI visual states (focus, hover, mobile breakpoints) | P2-4 | Visual regression not in scope for verify chain | Designer review against mockup-reference; spot-check on Antwerp + Houston |
| Hero video brand decision (P1-12) | P1-12 | Brand call required before code path | Brand owner reviews `index.html` hero in preview; chooses captions track or `aria-hidden`; Plan 10-04 (a11y wave) records decision in CONTEXT update |
| Cloudflare Pages preview routing case-insensitivity | P1-7 | Host-config verification, not code | Per `docs/cloudflare-preview-validation.md`; recorded in `docs/cutover-checklist.md` |
| Booking subdomain (`tickets.timemission.com`) reachability | P1-17 | DNS / DevOps action | DevOps confirms DNS + TLS or removes from `_headers` CSP; recorded in cutover checklist |
| Share image + brochure compression | P2-8, P2-9 | Designer asset re-export | Designer delivers compressed assets; verify `share-image.jpg` ≤200KB, `brochure.pdf` ≤3MB; recorded in cutover checklist |

---

## Validation Sign-Off

- [ ] All tasks have automated verify command OR are listed in Manual-Only table above
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all NEW validator scripts and npm installs
- [ ] No watch-mode flags in any test command
- [ ] Feedback latency < 120s for full verify
- [ ] `nyquist_compliant: true` set in frontmatter once plan-checker passes Dimension 8

**Approval:** pending
