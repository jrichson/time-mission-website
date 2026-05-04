---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
last_updated: "2026-05-04T23:25:00.000Z"
last_activity: 2026-05-04 — Completed quick task 260504-mly: WordPress-era + Palisades legacy redirects added to `_redirects` (P1-8). Prior: 260504-lsk Antwerp schema rename + alternateName (P0-5 / P0-8).
progress:
  total_phases: 10
  completed_phases: 9
  total_plans: 40
  completed_plans: 40
  phase_9_plans: 1
  phase_9_status: complete
  phase_10_plans: 0
  phase_10_status: not_planned
  percent_v1_core: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** The migrated site must preserve the existing customer-facing experience and conversion paths while making the site easier to maintain, measure, optimize, and scale.
**Current focus:** v1.0 roadmap phases **1–8** complete; **Phase 9** bundles post-milestone engineering + UI parity work under `.planning/phases/09-architecture-deepening-template-hygiene/`. Cutover rehearsal and production deploy remain human-led next steps.

## Current Position

Phase: **10 not planned yet** (Phases 1–9 complete; Phase 10 added 2026-05-04 from external audit coverage analysis)
Plans: v1 counted plans **40/40**; Phase 9 tracked as **1 deliverable summary**; Phase 10 has **0/9** suggested plans (run `/gsd-plan-phase 10` to break down)
Status: Planning — Phase 10 awaits planning before cutover
Last activity: 2026-05-04 — Phase 10 (Audit-Gap Closure & Cutover Readiness) scaffolded with `10-CONTEXT.md` capturing 13 code gaps + 9 host-dependencies from external SEO/A11y/Security/Performance audit

Progress: Phases 1–9 documented; v1 requirement coverage still **43/43** (Phase 10 is sustainment, not a new requirement ID — extends SEO/COMP/DATA/ANLY/VER practices).

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
| 10. Audit-Gap Closure & Cutover Readiness | 0 (not planned) | Not planned | — |

**Recent trend:**

- Phase 10 (added 2026-05-04): External audit coverage analysis identified 13 code gaps (P0-4, P0-5, P0-7a, P0-8, P1-1, P1-3, P1-8, P1-9, P1-12, P1-16, P1-18, P2-1, P2-4, P2-6) + 9 host/external dependencies (P1-7, P1-10, P1-11, P1-17, P2-8, P2-9, P2-10). Antwerp schema rename + `alternateName` is the highest-leverage single fix.
- Phase 9: Ticket options SSoT, `compile-route-artifacts`, `locationsFingerprint` + stale analytics event, `scripts/lib/policy-runner.js` + booking policies, `TMFacade` + `docs/tm-public-api.md`, footer/newsletter CSS isolation, `ticket-panel.css` on lean layouts; optional **CSS partial split** remains discretionary backlog (RFC program closed).

*Updated after Phase 10 scaffolding pass (2026-05-04)*

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

- **Phase 10 planning:** Run `/gsd-plan-phase 10` to break the suggested 9-plan wave structure into actionable plans.
- **Brand decision blocking 10-04:** P1-12 hero `<video>` — captions track vs `aria-hidden` decorative. Owner: Brand.
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

Milestone planning execution complete through **Phase 9 documentation**. Next: cutover using `npm run verify`, preview checklist, and `docs/rollback-runbook.md` if rollback is required. Engineering backlog: optional CSS file split for event templates (outside closed RFC scope).
