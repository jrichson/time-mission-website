---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-05-05T08:00:00.000Z"
last_activity: 2026-05-05 -- Phase 10 (Audit-Gap Closure & Cutover Readiness) closed; 7 plans shipped, 7 host items recorded in docs/cutover-checklist.md, verify:phase10 alias wired
progress:
  total_phases: 10
  completed_phases: 10
  total_plans: 47
  completed_plans: 47
  phase_10_plans: 7
  phase_10_status: complete
  percent: 100
  percent_v1_core: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** The migrated site must preserve the existing customer-facing experience and conversion paths while making the site easier to maintain, measure, optimize, and scale.
**Current focus:** v1.0 roadmap phases **1–10** complete. Cutover gate is `npm run verify:phase10` + `docs/cutover-checklist.md` host items + `docs/rollback-runbook.md` rehearsal — all remaining work is human-led.

## Current Position

Phase: **10 complete** (closed 2026-05-05; 7 plans shipped covering 13 P0/P1 audit code gaps; 7 host/external items deferred to `docs/cutover-checklist.md`)
Plans: **47/47** (40 v1 roadmap + 7 Phase 10)
Status: Cutover-ready
Last activity: 2026-05-05 -- Phase 10 (Audit-Gap Closure & Cutover Readiness) closed

Progress: All 10 phases documented and shipped; v1 requirement coverage **43/43** (Phase 10 extends SEO/COMP/DATA/ANLY/VER practices, no new requirement IDs).

## Performance Metrics

**Velocity:**

- Total **v1** plans completed: 40 (roadmap `01-xx` … `08-xx`)
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

**Recent trend:**

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

- 2026-05-04 — Phase 10 added: Audit-Gap Closure & Cutover Readiness. Origin: external SEO/A11y/Security/Performance audit (39 findings) coverage analysis identified 13 code gaps remaining in Astro + 9 host/external dependencies. See `.planning/phases/10-audit-gap-closure-cutover-readiness/10-CONTEXT.md`. Next: `/gsd-plan-phase 10`.

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

## Session continuity

**All 10 v1.0 phases shipped (closed 2026-05-05).** Cutover gate is `npm run verify:phase10` (passes end-to-end against current state) + `docs/cutover-checklist.md` host items + `docs/rollback-runbook.md` rehearsal. The roadmap's code work is done; remaining items are human-led: Cloudflare preview rehearsal, ROLLER/GTM validation, the 7 host/external dependencies in the cutover checklist, and the P2-6 brand compliance review.
