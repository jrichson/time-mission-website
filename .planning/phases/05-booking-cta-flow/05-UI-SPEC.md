---
phase: 05
slug: booking-cta-flow
status: approved
shadcn_initialized: false
preset: none
created: "2026-04-29"
reviewed_at: "2026-04-29"
---

# Phase 05 — UI Design Contract

> **Booking & CTA flow:** behavior and resolution rules only — **visual parity** with Phases 02–04; no redesign. Default customer path is **validated external checkout URLs** (same-tab default per `05-CONTEXT.md` D-01); **ROLLER iframe overlay is not on the default path** (BOOK-03, D-02).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — extend Phase 04 Astro + legacy CSS (`css/*.css`) |
| Preset | not applicable |
| Component library | none (vanilla JS + existing DOM contracts) |
| Icon library | none new — reuse inline SVGs on booking surfaces |
| Font | Same as Phase 04: `Bebas Neue`, `DM Sans`, `Monument Extended`, `Orbitron` |

Phase 5 **does not add** Tailwind, shadcn, or UI npm packages.

---

## Spacing Scale

**No new spacing tokens.** All booking-adjacent UI (ticket panel, nav booking entry, location/group CTAs) preserves computed spacing from legacy reference pages and Phase 4 representatives — same contract table as Phase `04-UI-SPEC.md` (“Preserve existing authored values…”).

| Token | Contract |
|-------|----------|
| All | Parity-only; planner documents any unavoidable pixel tweaks as documented bug fixes |

**Touch / hit targets:** preserve WCAG-aligned targets already present on reference pages; any change must match `scripts/check-accessibility-baseline.js` expectations.

---

## Typography

| Role | Contract |
|------|----------|
| Body / Label / Heading / Display | Identical to Phase 04 — `var(--body)`, `var(--display)`, `var(--tech)` and page-local booking CTA styles unchanged |

Do not introduce additional marketing type scales on booking surfaces.

---

## Color

**60 / 30 / 10 split (semantic — inherited palette):**

| Role | Token / value | Usage |
|------|----------------|-------|
| Dominant (~60%) | `--dark`, `--surface`, `--black` | Page backgrounds, ticket panel backdrop |
| Secondary (~30%) | `--elevated`, `--border`, `--gray` | Panels, selects, chrome surrounding CTAs |
| Accent (~10%) | `--orange`, `--gradient-primary` | **Reserved for:** primary booking progression control (`#ticketBookBtn` / `.btn-ticket-book` class family), prominent location-page **Book** buttons matching legacy emphasis — **not** for generic text links or secondary chrome |
| Semantic destructive | `--red` | Only if a Phase 5 surface introduces remove/cancel-checkout confirmation (unlikely); otherwise unused |

---

## Copywriting Contract

Source: validated data + legacy strings; **no new marketing voice**.

| Element | Copy / rule |
|---------|----------------|
| Ticket panel title | **Book Your Adventure** (preserve `TicketPanel` / `ticket-panel.html`) |
| Ticket panel instruction | **Select your location and we'll take you to our booking system to choose your date and time.** |
| Primary booking CTA (panel) | **Continue to Booking** |
| Location selector label | **Choose Location** |
| Coming-soon / no-checkout path | Do **not** promise checkout; navigate or deep-link to **location story** (`/{slug}`, clean URL). Helper button labels must be **specific** (e.g. **View Houston Details**, **Learn about this location**) — never **Click Here** or **Submit** |
| Gift card CTAs | Labels from validated nav/footer/catalog data; destination **`giftCardUrl`** only |
| Empty / pre-selection state | Use existing panel instructional copy above — no placeholder **No results** strings |
| Error / blocked booking | **Problem + next step**, e.g. **We couldn’t open booking for this location. Try another venue or contact us for help.** (+ link to `/contact` where legacy does) |
| Destructive confirmation | Not expected in Phase 5; if added: name the action in title + confirm button (**Cancel booking**, **Leave checkout**) |

---

## Interaction & Behavior Contract

| Topic | Contract |
|-------|----------|
| Default checkout handoff | **Same-tab navigation** to resolved external URL as **default** (D-01); per-surface **same-tab vs `target="_blank"`** matrix is **planner-owned** (D-04) and must be documented in PLAN.md |
| ROLLER iframe / overlay | **Not loaded on default path** (D-02, BOOK-03). Optional fallback, if retained, must be **explicitly documented** in PLAN.md + UI-SPEC addendum — not silent |
| URL precedence | **`rollerCheckoutUrl` when present**, else **`bookingUrl`** for checkout intent (D-03); open locations must resolve at least one |
| Coming-soon | **No external checkout**; story/contact/waitlist-style fallback only (D-07, BOOK-02) |
| `?book=1` | Preserve **location-page** observable behavior: clean URL strip, **`TM.ready`** ordering, deferred navigate unless tests justify change (D-05, BOOK-04). Non-location routes **out of scope** (D-06) |
| Gift cards | **`giftCardUrl`** from validated data; analytics normalization deferred to Phase 6 except trivial hook-safe attributes (D-08) |
| Critical surfaces | Ticket panel, nav booking entry, representative Astro templates from Phase 4, location/group CTAs — scope per D-09 |

---

## Visual Hierarchy (booking contexts)

| Screen / surface | Primary focal anchor |
|------------------|---------------------|
| Ticket panel open | **`#ticketBookBtn`** — single obvious continuation after location choice |
| Location page (open) | Legacy hero / primary **Book** cluster matching Philadelphia/Houston templates |
| Coming-soon location | **Non-checkout** primary story CTA — hierarchy must **not** imply checkout |

Icon-only controls keep existing **`aria-label`** patterns (e.g. `#ticketClose`).

---

## DOM & Hooks (carry-forward)

Preserve IDs and selectors consumed by `js/ticket-panel.js`, `js/locations.js`, `js/nav.js`, smoke tests, and accessibility checks: `#ticketPanel`, `#ticketOverlay`, `#ticketLocation`, `#ticketBookBtn`, `#ticketClose`, `body[data-location]`, booking/architecture validators.

Phase 5 script changes (e.g. removing default iframe injection) **must not** introduce double navigation or broken focus return — document ordering in PLAN.md.

---

## Analytics & Launch Readiness (BOOK-05)

- **UI contract:** booking surfaces remain **hook-ready** for non-PII Phase 6 events (attributes/data attributes allowed per planner — no PII).
- **Purchase / GTM validation:** captured in **launch checklist**, not new visible UI — reference `05-CONTEXT.md` external/vendor note.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable |
| Third-party UI registries | none | not applicable |

---

## Verification Alignment

| Gate | Expected |
|------|----------|
| `scripts/check-booking-architecture.js` | Pass after URL/resolution changes |
| `npm run check` / Phase verify scripts | Pass |
| Playwright smoke (`tests/smoke/site.spec.js`) | Booking + `?book=1` expectations updated with PLAN |

---

## Checker Sign-Off

| Dimension | Verdict |
|-----------|---------|
| 1 Copywriting | PASS |
| 2 Visuals | PASS |
| 3 Color | PASS |
| 4 Typography | PASS |
| 5 Spacing | PASS |
| 6 Registry Safety | PASS |

**Approval:** 2026-04-29
