---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Cutover-ready
last_updated: "2026-05-06T17:30:00.000Z"
last_activity: 2026-05-06 -- Quick task 260506-dxi: compressed 38 experience JPGs in place via sharp+mozjpeg (1600px@q78, 1400px@q70 for one outlier); ~120MB→13MB total, all targets ≤300KB; no markup/filename changes; npm run check exits 0
progress:
  total_phases: 11
  completed_phases: 11
  total_plans: 52
  completed_plans: 52
  percent: 100
  percent_v1_core: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** The migrated site must preserve the existing customer-facing experience and conversion paths while making the site easier to maintain, measure, optimize, and scale.
**Current focus:** Phase 11 — small-mobile-responsiveness-480px-tier-cookie-banner-placeme

## Current Position

Phase: 11 (small-mobile-responsiveness-480px-tier-cookie-banner-placeme) — COMPLETE
Plan: 5 of 5
Plans: **52/52** (40 v1 roadmap + 7 Phase 10 + 5 Phase 11)
Status: Cutover-ready (all 11 phases closed; verify chain green)
Last activity: 2026-05-06 -- Completed quick task 260506-dxi: compressed 38 experience JPGs in place (sharp+mozjpeg, 1600px@q78); experience photos dir ~120MB→13MB, all targets ≤300KB; npm run check exits 0

Progress: All 11 phases documented and shipped; v1 requirement coverage **43/43** (Phases 10 + 11 extend SEO/COMP/DATA/ANLY/VER/FND practices, no new requirement IDs).

## Performance Metrics

**Velocity:**

- Total **v1** plans completed: 52 (40 roadmap `01-xx` … `08-xx` + 7 Phase 10 + 5 Phase 11)
- **Phase 9:** 1 consolidated summary (`09-PLAN-SUMMARY.md`) + context (`09-CONTEXT.md`)
- Average duration: N/A
- Total execution time: N/A

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Static Baseline & Rollback Guardrails | 3 | Complete | — |
| 2. Route Registry & Clean URL Contract | 9 | Complete | — |
| 3. Validated Data Foundation | 4 | Complete | — |
| 4. Shared Components & Template Parity | 5 | Complete | — |
| 5. Booking & CTA Flow | 4 | Complete | — |
| 6. Analytics, Consent & Forms Contract | 5 | Complete | — |
| 7. SEO, Schema & Local Search Baseline | 5 | Complete | — |
| 8. Built-Output Verification & Cutover Readiness | 5 | Complete | — |
| 9. Architecture deepening & template hygiene | summary docs | Complete | — |
| 10. Audit-Gap Closure & Cutover Readiness | 7 | Complete | — |
| 11. small-mobile responsiveness ≤480 + POLISH-01 | 5 | Complete | — |

**Recent trend:**

- **Phase 11 closed 2026-05-05**: 5 plans shipped closing the launch-blocking responsive gap from Phase 10 UAT test 8 (severity major, ≤425px viewports). Wave summary: (W1) 11-01 ≤480 tier across `nav.css` / `footer.css` / `faq.css` / `base.css` / `newsletter.css`; 11-02 ≤480 tier across 7 partials (`about`, `contact`, `faq`, `locations`, `birthdays`, `legal`, `houston`); 11-03 POLISH-01 cookie banner `.cm--box` rewrite (`rgba(20,20,24,0.92)` surface, orange 18% border, 220ms `cubic-bezier` slide-up, mobile <640 full-width minus 16px gutter above iOS home indicator). (W2) 11-04 Playwright `small mobile (375x667)` describe with no-horizontal-scroll on 4 pages + `.footer-legal` wrap + `.location-btn` / `.btn-tickets` ≥ 44×44 tap targets, plus 8 visual baselines refreshed. (W3) 11-05 verify chain green + ROADMAP/STATE bookkeeping. Tap-target floor preserved throughout. `npm run verify` and `npm run verify:phase10` both exit 0.
- **Phase 10 closed 2026-05-05**: 7 plans shipped covering 13 P0/P1 audit code gaps. Wave summary: (W1) SSR landmarks + skip-link + axe `dist` scan + Playwright mobile project + P0-7a `js/nav.js` `stopPropagation` fix; (W2) 6 legal-page Astro migrations with shared `legal-inline.raw.css.txt` partial; (W3) per-route `lang` prop + `antwerp.html` → `antwerp.astro` + `check-hreflang-cluster` validator; (W4) hero medium audit (zero IMG_SINGLE candidates) + `web-vitals@5.2.0` RUM beacon (consent-gated); (W5) EU-routed cookie banner (`vanilla-cookieconsent@3.1.0`) + `check-tap-targets` validator + `.btn-tickets` 48px / `.location-btn` 44px fixes; (W6) `docs/cutover-checklist.md` + `verify:phase10` alias + ROADMAP/STATE update. The 7 host/external items (P1-7, P1-10, P1-11, P1-17, P2-8, P2-9, P2-10) and P2-6 brand compliance are recorded in `docs/cutover-checklist.md` for human owners.
- Phase 10 highest-leverage single fix: Antwerp schema rename + `alternateName` shipped pre-planning via quick-task 260504-lsk.
- Phase 9: Ticket options SSoT, `compile-route-artifacts`, `locationsFingerprint` + stale analytics event, `scripts/lib/policy-runner.js` + booking policies, `TMFacade` + `docs/tm-public-api.md`, footer/newsletter CSS isolation, `ticket-panel.css` on lean layouts; optional **CSS partial split** remains discretionary backlog (RFC program closed).

*Updated after Phase 10 closure (2026-05-05)*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Initial release is parity-first: no redesign, no runtime framework rewrite, no full i18n, no CMS, no SSR/hybrid default.
- Canonical routes are clean extensionless paths with no trailing slash; legacy `.html` URLs redirect directly to clean paths.
- GTM is the primary browser analytics integration with Consent Mode v2-ready hooks and dedupe-ready event identity.
- ROLLER remains checkout; outbound booking intent is required, purchase validation depends on available ROLLER/GTM access.
- Old static site must remain deployable until Astro launch is verified.
- **Phase 9:** Public browser extension surface for booking/locations is **`TMFacade`** + documented APIs; new check rules favor policy tables over one-off scripts.

### Roadmap Evolution

- 2026-05-04 — Phase 10 added: Audit-Gap Closure & Cutover Readiness. Origin: external SEO/A11y/Security/Performance audit (39 findings) coverage analysis identified 13 code gaps remaining in Astro + 9 host/external dependencies. See `.planning/phases/10-audit-gap-closure-cutover-readiness/10-CONTEXT.md`.
- 2026-05-05 — Phase 10 closed: 7 plans shipped covering 13 P0/P1 audit code gaps; 7 host/external items + P2-6 brand compliance recorded in `docs/cutover-checklist.md` for human owners; `verify:phase10` exits 0 end-to-end. v1.0 milestone code work complete; remaining items are human-led cutover steps.
- 2026-05-05 — Phase 11 added: small-mobile responsiveness ≤480px tier + cookie banner placement polish. Origin: Phase 10 UAT discovered serious responsiveness issues at viewports ≤425px (footer columns not stacking, button sizes, copy sizes). Bundles RESP-01 (major — `@media (max-width: 480px)` tier across `nav.css`/`footer.css`/`faq.css` + 15 page-local partials) and POLISH-01 (minor — cookie banner bottom-left card placement per ui-design-brain spec). Full diagnosis in `.planning/phases/10-audit-gap-closure-cutover-readiness/10-UAT.md` Gaps section.
- 2026-05-05 — Phase 11 closed: ≤480 small-mobile tier shipped across 5 shared CSS + 7 partials; POLISH-01 cookie banner placement implemented in `css/cookie-consent.css`; Playwright 375×667 smoke locked in. Cutover gate `npm run verify:phase10` remains green; v1 requirement coverage unchanged at 43/43.

### Pending todos

- **Cutover gate**: `npm run verify:phase10` must exit 0 before launch (currently green); see `docs/cutover-checklist.md` for the full 8-step Final Pre-Cutover Sequence.
- **Host action P1-7** (Web Dev): Cloudflare case-insensitive routing — verify on preview per `docs/cloudflare-preview-validation.md`.
- **Host action P1-10** (Product + Brand): ROLLER / Experience Factory brand strategy decision; document in cutover checklist.
- **Host action P1-11** (GTM Admin): FB & TikTok pixel `domain=.timemission.com` fix in GTM container.
- **Host action P1-17** (DevOps): `tickets.timemission.com` DNS + CSP — either deploy subdomain OR migrate booking URLs to `ecom.roller.app` then remove from `_headers`.
- **Host action P2-8** (Designer): Re-export `share-image.jpg` (586 KB → ~150 KB).
- **Host action P2-9** (Designer + Web Dev): Compress `brochure.pdf` (11.7 MB → ~2–3 MB).
- **Host action P2-10** (DevOps): Narrow `api-1.timemission.com` CORS to `https://timemission.com` if PII-bound.
- **Manual review P2-6** (Designer): Brand compliance review against `assets/mockup-reference/`.
- Human: Rehearse `docs/cloudflare-preview-validation.md` on a real Cloudflare Pages preview.
- Human: Confirm ROLLER/GTM validation (including cross-domain / purchase) with Venue Manager or playground access — `docs/roller-booking-launch-checklist.md`.
- Optional: Split group event inline CSS partials (discretionary cleanup; not an open RFC).

### Blockers / concerns

- ROLLER purchase validation depends on Venue Manager or playground access.
- Consent/CMP implementation details and form backend/provider remain open planning decisions.
- Linux CI may need committed Playwright screenshot baselines for `chromium-linux` if tests run on Ubuntu (see `docs/verification-pipeline.md`).

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260504-lsk | Fix P0-5/P0-8: rename Antwerp to "Time Mission Antwerp" + plumb `alternateName` through LocationRecord and LocalBusinessNode | 2026-05-04 | 3e53692 | [260504-lsk-fix-p0-5-p0-8-rename-antwerp-location-to](./quick/260504-lsk-fix-p0-5-p0-8-rename-antwerp-location-to/) |
| 260504-mly | Fix P1-8: WordPress-era + Palisades legacy redirects in `_redirects` (12 paths to `/`, `/palisades` → `/west-nyack`) | 2026-05-04 | 7240619 | [260504-mly-fix-p1-8-add-missing-legacy-url-redirect](./quick/260504-mly-fix-p1-8-add-missing-legacy-url-redirect/) |
| 260505-qod | Migrate 4 legacy location pages (lincoln, mount-prospect, manassas, west-nyack) to Astro three-fragment wrappers | 2026-05-05 | f3240ab | [260505-qod-migrate-4-legacy-location-pages-lincoln-](./quick/260505-qod-migrate-4-legacy-location-pages-lincoln-/) |
| 260505-r78 | Add per-page "Last updated: Month YYYY" stamp + `<meta name="last-modified">` to all 25 Astro pages via git mtime (override > git > build-date chain; process.cwd() for stable repo-root in Vite prerender) | 2026-05-06 | 68f25f1 | [260505-r78-add-per-page-last-updated-visible-date-f](./quick/260505-r78-add-per-page-last-updated-visible-date-f/) |
| 260505-t7n | Extract 14 page-CSS and 12 page-after-JS files from inline set:html injections in 25 Astro wrappers; antwerp.html inline style 83KB→906B, no-src script 21KB→5.6KB; unblocks CSP hash follow-up (t7n-2) | 2026-05-06 | d13791c | [260505-t7n-remove-unsafe-inline-from-csp-via-hash-b](./quick/260505-t7n-remove-unsafe-inline-from-csp-via-hash-b/) |
| 260506-bvu | Drop 'unsafe-inline' from CSP via SHA256 hashes: _headers.tmpl source-of-truth, inject-csp-hashes.mjs writes 17 script+8 style hashes, check:csp-hashes CI gate, site-progressive.js extraction, csp.spec.js 4/4 pass | 2026-05-06 | 82fb7b0 | [260506-bvu-drop-unsafe-inline-from-csp-via-sha256-h](./quick/260506-bvu-drop-unsafe-inline-from-csp-via-sha256-h/) |
| 260506-dxi | Compress 38 experience JPGs in place via sharp+mozjpeg (1600px@q78, 1400px@q70 for one outlier); experience photo dir ~120MB→13MB, all targets ≤300KB; no markup/filename changes | 2026-05-06 | 35faf5d | [260506-dxi-compress-experience-jpgs-to-300kb-via-sh](./quick/260506-dxi-compress-experience-jpgs-to-300kb-via-sh/) |

## Session continuity

**All 11 v1.0 phases shipped (Phase 10 + 11 closed 2026-05-05).** Cutover gate is `npm run verify:phase10` (passes end-to-end against current state, including the new small-mobile 375×667 smoke) + `docs/cutover-checklist.md` host items + `docs/rollback-runbook.md` rehearsal. The roadmap's code work is done; remaining items are human-led: Cloudflare preview rehearsal, ROLLER/GTM validation, the 7 host/external dependencies in the cutover checklist, and the P2-6 brand compliance review.
