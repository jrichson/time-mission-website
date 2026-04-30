# Phase 5: Booking & CTA Flow - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 delivers predictable **booking and revenue-adjacent CTA** behavior: open-location paths resolve to validated **ROLLER/external checkout** destinations, coming-soon paths avoid accidental checkout and use deliberate fallbacks, **`?book=1`** entry behavior stays tested (BOOK-04), the **default path is tracked external checkout links** with **iframe/overlay removed from the default path** (BOOK-03), and launch readiness includes **ROLLER GTM/GA4 / purchase validation** when access exists (BOOK-05). Scope is **behavior and resolution rules**—not Phase 6 analytics payload design (beyond what booking handlers need to remain hook-ready).

</domain>

<decisions>
## Implementation Decisions

### Primary checkout mechanism (BOOK-01, BOOK-03)
- **D-01:** **Default handoff** for open locations: navigate **same tab** to the validated external checkout URL resolved from location data (plus any planner-defined helper). Same-tab is the stated default even though some legacy code paths today use **`window.open(..., '_blank')`**—Phase 5/planner should **reconcile** ticket panel vs nav vs inline CTAs intentionally.
- **D-02:** **Roller iframe overlay is not part of the default path:** do **not** load the Roller iframe CDN/widget on normal pages as the default booking experience. Removing **`js/roller-checkout.js`** intercept behavior and the progressive-checkout iframe script from the default bundle/path is in scope unless research proves an interim guardrail is required—if so, document explicitly as a temporary exception.
- **D-03:** **URL field precedence** when multiple outbound fields exist: **planner discretion**, with **recommended default** — use **`rollerCheckoutUrl` when present**, otherwise **`bookingUrl`**, and tighten validated-data rules so every **open** location has at least one resolvable outbound checkout URL.
- **D-04:** **Same-tab vs new-tab per surface** is **planner discretion** after auditing CTAs (`bookOrOpenPanel`, `#ticketBookBtn`, location-page buttons, group/event CTAs). User did not require uniform same-tab everywhere; planner documents the matrix in plans.

### `?book=1` deep linking (BOOK-04)
- **D-05:** User skipped detailed questions; adopt **planner defaults**: preserve **current observable behavior** on **location pages** (`body[data-location]`): strip query via **`history.replaceState`**, wait for **`window.TM.ready`** where applicable, then navigate to the resolved booking URL with similar deferred timing **unless** tests or accessibility review justify a change.
- **D-06:** **`?book=1` on non-location routes** is **out of scope** unless the planner discovers a regression requirement; no requirement to add new global patterns in Phase 5.

### Coming-soon & gift cards (BOOK-02 and gift-card CTAs)
- **D-07:** **Coming-soon:** keep today’s effective rule — **no external checkout** from booking helpers; ticket-panel / **`getBookingUrl`** style behavior continues to route coming-soon selections toward the **location story path** (e.g. `/{slug}` / `?book=1` semantics that do **not** launch checkout). Do not introduce checkout overlays for coming-soon in Phase 5.
- **D-08:** **Gift cards:** use **`giftCardUrl`** from **validated location data**; Phase 5 ensures links resolve correctly and stay parity-safe. **Normalized analytics / dataLayer tracking** for gift-card clicks is **Phase 6** unless a trivial non-PII attribute is needed to avoid broken instrumentation hooks.

### CTA surface scope
- **D-09:** Phase 5 prioritizes **critical paths**: ticket panel, nav booking entry, location pages, and **representative Astro templates** from Phase 4. A **full-repo sweep** of every legacy `.html` CTA may trail bulk migration **provided** verification gates cover migrated/representative surfaces and booking-architecture checks do not regress—planner defines the exact file/route list.

### Claude's Discretion
- Exact implementation of removing iframe loading (script tag injection, event listener ordering vs `ticket-panel.js`), and whether **`roller-checkout.js`** is deleted vs reduced to a no-op stub vs feature-flagged **must** be spelled out in PLAN.md.
- **Booking URL helper** shape (single `resolveCheckoutUrl(loc)` vs separate ticket vs gift-card resolvers).
- How **`tests/smoke/site.spec.js`** and **`scripts/check-booking-architecture.js`** are extended for external-default behavior.

### Folded Todos
- None (`todo match-phase 5` returned no matches).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & v1 requirements
- `.planning/ROADMAP.md` — Phase 5 goal, success criteria (5 bullets), Depends on Phase 4, **Requirements** BOOK-01–BOOK-05.
- `.planning/REQUIREMENTS.md` — **BOOK-01** through **BOOK-05** (full bullets).
- `.planning/PROJECT.md` — Parity-first migration, outbound booking intent, ROLLER remains checkout, iframe → external default policy in Active requirements.

### Prior phase contexts (carry-forward)
- `.planning/phases/04-shared-components-template-parity/04-CONTEXT.md` — Stable ticket-panel DOM IDs, vanilla JS behavior layer, Astro parity templates.
- `.planning/phases/02-route-registry-clean-url-contract/02-CONTEXT.md` — Clean URL contract; internal paths must agree with route registry.
- `.planning/phases/01-static-baseline-rollback-guardrails/01-CONTEXT.md` — Static Astro output shape.

### Live repo contracts / implementation anchors
- `data/locations.json` / `src/data/locations.ts` — `bookingUrl`, `rollerCheckoutUrl`, `giftCardUrl`, `status`.
- `js/ticket-panel.js` — Ticket panel, **`getBookingUrl`**, **`?book=1`**, **`bookOrOpenPanel`** / **`window.open`** behavior (must reconcile with D-01/D-04).
- `js/roller-checkout.js` — Current iframe intercept (Phase 5 removes default path per D-02).
- `js/locations.js` — `window.TM` readiness and location resolution.
- `components/ticket-panel.html` / `src/components/TicketPanel.astro` — Markup contract for booking controls.
- `scripts/check-booking-architecture.js` — Booking URL architecture validation.
- `tests/smoke/site.spec.js` — Smoke expectations for booking flows.
- `.planning/research/PITFALLS.md` — Booking, URLs, third-party checkout pitfalls as applicable.

### External / vendor
- No standalone external spec in-repo for ROLLER progressive checkout; rely on **validated URLs** + **BOOK-05** launch checklist when Venue Manager/playground access exists.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- **`window.TMTicketPanel`** (`js/ticket-panel.js`) exposes `getBookingUrl` — downstream booking helpers may build on this or consolidate into a shared module; planner chooses.
- **Validated location modules** (`src/data/locations.ts`) — single source for outbound URLs once Phase 3 rules are extended for Phase 5.

### Established patterns
- **Capture-phase** click handling in `roller-checkout.js` runs before `ticket-panel.js` bubble handlers — removing iframe logic changes event ordering; verify **no double navigation**.
- **Direct booking** detection (`isDirectBookingUrl`) distinguishes `http(s)`, `mailto`, `tel`.

### Integration points
- **Phase 4 Astro pages** (`src/pages/*.astro`, `SiteLayout`) — script load order and ticket panel markup must stay compatible until scripts change.
- **Phase 6** — booking CTAs should remain ready for **non-PII** `dataLayer` hooks without implementing the full event contract in Phase 5.

</code_context>

<specifics>
## Specific Ideas

- Discussion selections: **iframe removed from default path**, **same-tab as default external navigation** (with **per-surface planner discretion**), **coming-soon unchanged** (no checkout), **gift cards from `giftCardUrl`**, **critical-path-first CTA scope**.

</specifics>

<deferred>
## Deferred Ideas

- **Global `?book=1` semantics** on non-location pages — not required unless a regression is found.
- **Full-repo booking CTA sweep** beyond critical paths — trails bulk migration per D-09.
- **Rich analytics for gift cards** — Phase 6.

### Reviewed Todos (not folded)
- None.

---

*Phase: 05-booking-cta-flow*
*Context gathered: 2026-04-29*
