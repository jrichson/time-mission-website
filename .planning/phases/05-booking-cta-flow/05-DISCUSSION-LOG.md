# Phase 5: Booking & CTA Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `05-CONTEXT.md`.

**Date:** 2026-04-29
**Phase:** 5 — Booking & CTA Flow
**Areas discussed:** Primary checkout mechanism, `?book=1`, coming-soon & gift cards, CTA surface scope

---

## Primary checkout mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Same-tab default | Navigate same tab to validated external URL | ✓ |
| New tab | Keep marketing site in original tab | |
| Planner per surface | Planner decides per CTA surface | |

| Option | Description | Selected |
|--------|-------------|----------|
| Remove iframe default | Do not load Roller iframe/widget as default path | ✓ |
| Gated fallback | External default; iframe behind switch | |
| Keep until cutover | Phase 5 only adds tracking; keep iframe | |

**Follow-ups**

| Topic | Selected |
|-------|----------|
| Same-tab breadth | Planner discretion after audit |
| URL precedence (`rollerCheckoutUrl` vs `bookingUrl`) | User deferred; **recommended:** `rollerCheckoutUrl` first, else `bookingUrl`, tighten data validation |

---

## `?book=1` (BOOK-04)

**User action:** Skipped interactive prompts.

**Captured default:** Preserve current **location-page** behavior (`replaceState`, `TM.ready`, deferred navigation); **no** new global `?book=1` patterns unless planner finds a regression need.

---

## Coming-soon & gift cards

| Topic | Selected |
|-------|----------|
| Coming-soon | Keep current rule — **no checkout**; route via location path semantics |
| Gift cards | **`giftCardUrl` from validated data**; tracking depth deferred to Phase 6 |

---

## CTA surface scope

| Option | Selected |
|--------|----------|
| Full sweep | |
| Critical paths first | ✓ |
| Astro-only | |

---

## Claude's Discretion

- URL precedence finalized in PLAN if data audit suggests a different rule.
- iframe removal mechanics and script deletion vs stub.

## Deferred Ideas

- Non-location `?book=1`
- Full-repo CTA sweep timing
- Gift-card analytics (Phase 6)
