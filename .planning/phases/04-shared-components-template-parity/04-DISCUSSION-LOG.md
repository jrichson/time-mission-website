# Phase 4: Shared Components & Template Parity - Discussion Log

> **Audit trail only.** Decisions live in `04-CONTEXT.md`. This log preserves auto-mode rationales.

**Date:** 2026-04-29  
**Phase:** 4 — Shared Components & Template Parity  
**Mode:** `--auto` (no interactive prompts; recommended defaults applied)  
**Areas auto-selected:** All — layout granularity, ticket panel/`build.sh`, DOM+vanilla JS hooks, CSS parity strategy, representative templates + data wiring, drift checks  

---

## Layout and component granularity

**Auto rationale:** Prefer **Astro layout(s) + cohesive components** (`Nav`, `Footer`, ticket region, SEO composition) with slot-based body content—the smallest duplication that matches **`COMP-01`** without fragmenting markup unnecessarily.

---

## Ticket panel source of truth & `build.sh`

**Auto rationale:** Single **Astro-authored ticket panel**, retire **`build.sh`** only after parity coverage plus checks satisfy **`COMP-03`**; avoid long-term dual edits—default favors moving ownership to Astro once golden templates validate the component.

---

## DOM, IDs, and vanilla JS (COMP-02)

**Auto rationale:** **Preserve selectors, IDs, and script compatibility** (`#ticketPanel`, overlay, aria, existing `js/*` order)—parity and smoke tests depend on structural stability.

---

## CSS strategy

**Auto rationale:** **Import global CSS in established order** from layouts; migrate page-local styles without visible drift—parity over premature optimization.

---

## Representative templates & data wiring

**Auto rationale:** Use **exact ROADMAP template set** for **`COMP-04`**; wire chrome through **validated Phase 3 data modules**.

---

## Phase-internal verification

**Auto rationale:** Extend **`check`-style** guarantees so duplicated chrome cannot drift silently (specific implementation: planner/agent discretion).

---

## Deferred (not folded)

Scope boundaries confirmed: booking/checkout defaults (**Phase 5**), analytics contracts (**Phase 6**), full SEO/schema sophistication (**Phase 7**).

---

*Discuss-phase completed in auto mode.*
