# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** The migrated site must preserve the existing customer-facing experience and conversion paths while making the site easier to maintain, measure, optimize, and scale.
**Current focus:** Phase 1: Static Baseline & Rollback Guardrails

## Current Position

Phase: 1 of 8 (Static Baseline & Rollback Guardrails)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-04-29 — Roadmap created from v1 requirements and research.

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: N/A
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Static Baseline & Rollback Guardrails | 0 | TBD | N/A |
| 2. Route Registry & Clean URL Contract | 0 | TBD | N/A |
| 3. Validated Data Foundation | 0 | TBD | N/A |
| 4. Shared Components & Template Parity | 0 | TBD | N/A |
| 5. Booking & CTA Flow | 0 | TBD | N/A |
| 6. Analytics, Consent & Forms Contract | 0 | TBD | N/A |
| 7. SEO, Schema & Local Search Baseline | 0 | TBD | N/A |
| 8. Built-Output Verification & Cutover Readiness | 0 | TBD | N/A |

**Recent Trend:**
- Last 5 plans: None yet
- Trend: N/A

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Initial release is parity-first: no redesign, no runtime framework rewrite, no full i18n, no CMS, no SSR/hybrid default.
- Canonical routes are clean extensionless paths with no trailing slash; legacy `.html` URLs redirect directly to clean paths.
- GTM is the primary browser analytics integration with Consent Mode v2-ready hooks and dedupe-ready event identity.
- ROLLER remains checkout; outbound booking intent is required, purchase validation depends on available ROLLER/GTM access.
- Old static site must remain deployable until Astro launch is verified.

### Pending Todos

None yet.

### Blockers/Concerns

- ROLLER purchase validation depends on Venue Manager or playground access.
- Consent/CMP implementation details and form backend/provider remain open planning decisions.
- Cloudflare preview and rollback assumptions must be validated against the real hosting setup before cutover.

## Session Continuity

Last session: 2026-04-29 11:52
Stopped at: Roadmap and initial state created; Phase 1 is ready for planning.
Resume file: None
