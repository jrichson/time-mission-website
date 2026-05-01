# Phase 09 — Context

## Purpose

Consolidate **post–Phase-8 work** that landed outside the original v1.0 eight-phase roadmap: the architecture RFC program (`.planning/ARCHITECTURE-DEEPENING-PHASES.md`, **closed 2026-05-01**), verification/policy hardening, and **UI parity fixes** (footer, newsletter, ticket-panel CSS on lean layouts).

## Relationship to other docs

| Doc | Role |
|-----|------|
| `ARCHITECTURE-DEEPENING-PHASES.md` | Source RFC phases (1–6 + success criteria); **program closed** 2026-05-01 |
| `09-PLAN-SUMMARY.md` | What shipped in-repo + optional follow-ups |
| `ROADMAP.md` | Phase 9 row in `.planning` progress table |

## Scope boundaries

- **In scope:** Single-source ticket options, compiled route artifacts, locations embed fingerprint + stale signal, policy runner + booking policies, `TMFacade` + public API doc + unit tests, footer/newsletter CSS scoping + `SiteFooter` legacy grid parity, `ticket-panel.css` on pages that use `SiteLayout` + `TicketPanel` without loading the sheet (e.g. privacy, FAQ).
- **Optional backlog only:** Megapartial split into named CSS files (Phase 4 doc tasks 2–3) — duplicate ticket-panel fork already removed; further splits are discretionary, not open RFC scope.

## Verification

Shipped work is guarded by `npm run verify` (build, dist checks, Playwright, `check:analytics`, policy/unit tests where wired).
