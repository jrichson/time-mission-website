---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: idle
last_updated: "2026-04-30T12:00:00.000Z"
last_activity: 2026-04-30 — Phase 09 catalogued (architecture deepening + template hygiene); v1 phases 1–8 unchanged
progress:
  total_phases: 9
  completed_phases: 9
  total_plans: 40
  completed_plans: 40
  phase_9_plans: 1
  phase_9_status: complete
  percent_v1_core: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** The migrated site must preserve the existing customer-facing experience and conversion paths while making the site easier to maintain, measure, optimize, and scale.
**Current focus:** v1.0 roadmap phases **1–8** complete; **Phase 9** bundles post-milestone engineering + UI parity work under `.planning/phases/09-architecture-deepening-template-hygiene/`. Cutover rehearsal and production deploy remain human-led next steps.

## Current Position

Phase: **09 complete** (summary-only phase — see `09-PLAN-SUMMARY.md`)
Plans: v1 counted plans **40/40**; Phase 9 tracked as **1 deliverable summary** (not a numbered `NN-PLAN.md`)
Status: Idle — ready for cutover rehearsal / production decision
Last activity: 2026-04-30 — Roadmap + RFC success criteria aligned with shipped architecture deepening, policy runner, `TMFacade`, footer/newsletter scoping, ticket-panel CSS on privacy/FAQ

Progress: Phases 1–9 documented; v1 requirement coverage still **43/43** (Phase 9 is sustainment, not a new requirement ID).

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

**Recent trend:**

- Phase 9: Ticket options SSoT, `compile-route-artifacts`, `locationsFingerprint` + stale analytics event, `scripts/lib/policy-runner.js` + booking policies, `TMFacade` + `docs/tm-public-api.md`, footer/newsletter CSS isolation, `ticket-panel.css` on lean layouts; optional **CSS partial split** remains (RFC Phase 4).

*Updated after Phase 9 documentation pass*

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

### Pending todos

- Human: Rehearse `docs/cloudflare-preview-validation.md` on a real Cloudflare Pages preview.
- Human: Confirm ROLLER/GTM validation (including cross-domain / purchase) with Venue Manager or playground access — `docs/roller-booking-launch-checklist.md`.
- Optional: Split group event inline CSS partials per `.planning/ARCHITECTURE-DEEPENING-PHASES.md` Phase 4.

### Blockers / concerns

- ROLLER purchase validation depends on Venue Manager or playground access.
- Consent/CMP implementation details and form backend/provider remain open planning decisions.
- Linux CI may need committed Playwright screenshot baselines for `chromium-linux` if tests run on Ubuntu (see `docs/verification-pipeline.md`).

## Session continuity

Milestone planning execution complete through **Phase 9 documentation**. Next: cutover using `npm run verify`, preview checklist, and `docs/rollback-runbook.md` if rollback is required. Engineering backlog: optional RFC Phase 4 CSS file split.
