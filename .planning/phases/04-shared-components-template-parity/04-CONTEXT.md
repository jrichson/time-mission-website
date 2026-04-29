# Phase 4: Shared Components & Template Parity - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 delivers shared Astro components and representative page templates so the migrated site preserves the existing visual design and browser behavior contracts (FND-02, COMP-01–04): same copy, typography, imagery, animations, navigation, footer, ticket panel, overlays, and page-specific behavior as the current static HTML site unless a change is explicitly documented as a bug fix. Scope is **parity-first composition**—not redesign, not new UI systems, not booking/analytics/schema refactors beyond what templates need to render correctly.

</domain>

<decisions>
## Implementation Decisions

### Layout and component granularity
- **D-01:** Use one or more **Astro layouts** (e.g. base shell + optional variants) that wrap shared chrome with a **named slot/default slot** for main content. Prefer a small set of cohesive components (**Nav**, **Footer**, **TicketPanel** or equivalent markup region, shared **head**/meta composition) rather than splitting every repeating HTML row into tiny fragments in this phase.

### Ticket panel source of truth & `build.sh` (COMP-03)
- **D-02:** The **canonical ticket panel markup** for the Astro path lives in Astro components (fed by validated Phase 3 data where applicable). **Retire `./build.sh` ticket-panel sync** only after every page that requires the ticket panel is served from Astro templates using that component **and** automated checks equivalent to drift detection prove the panel matches the intended contract everywhere.
- **D-03:** Until cutover is complete, avoid indefinite dual edits: either freeze `components/ticket-panel.html` changes except emergency fixes **or** document a short interim sync rule—the default recommended path is **single ownership in Astro** as soon as representative templates prove the component.

### DOM, IDs, selectors, and vanilla JS (COMP-02)
- **D-04:** Preserve **stable identifiers and structure** consumed by existing scripts and a11y: e.g. `#ticketPanel`, `#ticketOverlay`, `#ticketLocation`, `#ticketBookBtn`, related classes, `aria-*` and roles aligned with current `components/ticket-panel.html`, `js/ticket-panel.js`, `js/nav.js`, `js/a11y.js`, and `js/roller-checkout.js`. Do **not** rename IDs/classes for “cleaner” Astro patterns if it breaks selectors.
- **D-05:** Keep **vanilla IIFE scripts** (`js/locations.js`, `js/nav.js`, etc.) as the behavior layer; Astro components output HTML that hydrates behavior the same way as today. Prefer loading scripts with the **same relative/public paths and order** as a reference parity page unless a planner-verified consolidation is unavoidable.

### CSS and visual parity (FND-02)
- **D-06:** **Layout** should import global stylesheets **`css/variables.css` → `css/base.css` → then feature CSS** (`nav.css`, `footer.css`, etc.) in the **same cascade order** as current flagship pages. No redesign tokens or new frameworks.
- **D-07:** Page-specific presentation may remain **co-located** (inline or imported CSS) migrated from existing `<style>` blocks; Astro `scoped` styles are acceptable when they reproduce the same computed rules **without visible drift**.

### Data consumption (tie-in to Phase 3)
- **D-08:** Shared chrome (nav labels, footer links, location-derived UI, catalogs) pulls from **validated `src/data` modules** and shared contracts from Phase 3—**no reintroducing literals** that duplicate catalogs for durable facts.

### Representative templates before bulk migration (COMP-04)
- **D-09:** Before converting the full corpus, ship **parity templates** aligned with `.planning/ROADMAP.md`: **homepage**, **one core marketing page**, **one group/event page**, **one open-location page**, **one coming-soon location page**, **locations index**, **FAQ + contact pattern** (may be two routes or one combined pattern per planner), **policy/utility/legal pattern**.
- **D-10:** Each template acts as the **golden reference** for QA, smoke tests, and future bulk migration—patterns established here extend to remaining pages.

### Verification expectations (phase-internal)
- **D-11:** Phase 4 work should integrate with existing **`npm run check`** mentality: extend or add checks so **chrome/ticket markup** cannot drift unnoticed (exact mechanism left to planner—may extend `check-components`-style validation to Astro output or source components).

### Claude's Discretion
- Exact file names under `src/components/` vs `src/layouts/`, number of layouts (one vs segmented), and migration ordering of representative pages versus secondary pages **within Phase 4 scope**.
- Tactical choice between scoped CSS migration vs retaining a single shared page stylesheet where parity is faster to guarantee.
- How to automate drift detection (AST, HTML snapshot, selective string checks) **as long as** COMP-02/COMP-03 intent is satisfied.

### Folded Todos
- None (`todo match-phase 4` returned no matches).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & v1 requirements
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria (5 bullets), Depends on Phase 3, **UI hint: yes**.
- `.planning/REQUIREMENTS.md` — **FND-02**, **COMP-01**, **COMP-02**, **COMP-03**, **COMP-04** (full bullets).
- `.planning/PROJECT.md` — Parity-first migration, rollback, preflight URL/analytics constraints; static site remains design contract.

### Prior phase contexts (carry-forward)
- `.planning/phases/01-static-baseline-rollback-guardrails/01-CONTEXT.md` — Astro `build.format: 'file'`, `trailingSlash: 'never'`, rollback posture, Phase 1 does not constrain component file layout but assets/host files must mirror deploy expectations.
- `.planning/phases/02-route-registry-clean-url-contract/02-CONTEXT.md` — Clean URL contract locked in Phase 2; internal routes and helpers must agree with registry (**do not duplicate ad hoc slugs** in components).

### UX / parity UI contract for frontend phases
- `.planning/phases/02-route-registry-clean-url-contract/02-UI-SPEC.md` — **Parity/no redesign** stance, existing font/color/spacing/token preservation philosophy (adapt Phase 02 content for shared chrome in Phase 4—still “preserve static HTML/CSS presentation”).

### Plan & research artifacts (Phase 3)
- `.planning/phases/03-validated-data-foundation/03-RESEARCH.md` — Data/catalog approach (if planner needs grounding).
- `.planning/phases/03-validated-data-foundation/03-01-PLAN.md` through `03-04-PLAN.md` — What `src/data` must supply to pages.

### Live repo contracts / implementation anchors
- `components/ticket-panel.html` — Legacy source-of-truth snapshot for markup sync (until Astro component fully replaces workflow per COMP-03).
- `build.sh` — Current ticket-panel propagation mechanism **to retire** after Astro parity.
- `css/variables.css`, `css/base.css`, `css/nav.css`, `css/footer.css`, `css/faq.css`, `css/newsletter.css`, `css/ticket-panel.css` — Shared styling cascade.
- `js/locations.js`, `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `js/a11y.js` — Browser behavior dependencies on DOM structure.
- `scripts/check-components.js` — Existing drift-detection precedent for duplicated ticket panel markup.
- `.planning/codebase/ARCHITECTURE.md` — Layers, ticket panel pattern, `window.TM` data flow.
- `.planning/codebase/STRUCTURE.md` — Directory layout and integration points for static migration.
- `.planning/research/PITFALLS.md` — Migration pitfalls touching markup, scripts, Astro static output (**read relevant sections before changing shared chrome**).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- `components/ticket-panel.html` + `build.sh` — Current sync workflow; Astro **TicketPanel**-style component supersedes for migrated routes.
- `css/` — Established token and component stylesheets; layouts should reuse rather than rewrite.
- `js/*.js` — Existing globals and DOM bindings; Astro output must remain compatible.

### Established patterns
- Static HTML pages duplicate nav/footer/ticket markup; Phase 4 centralizes duplication into Astro components while preserving **literal parity** where required.
- Playwright smoke tests (`tests/smoke/site.spec.js`) assume specific behaviors (ticket panel, nav, FAQs)—templates must not break selectors or flows.

### Integration points
- Phase 3 **`src/data/*`** modules supply labels, URLs, navigation, footer entries, analytics labels—components consume these APIs.
- Clean routes (`src/data/routes.json` / route tooling from Phase 2) must inform **internal links** in nav/footer/templates.

</code_context>

<specifics>
## Specific Ideas

- **Auto-mode (`/gsd-discuss-phase 4 --auto`):** Recommended defaults chosen for layout/slot composition, ticket panel retirement sequencing, preserving legacy JS hooks and stylesheet order, data-driven chrome, golden template set aligned with ROADMAP, and verifier extension at planner discretion.
- Prior Phase 02 UI-SPEC reinforces **no new design system**, **fonts/colors unchanged**—carry that forward for Phase 4 component work.

</specifics>

<deferred>
## Deferred Ideas

- **Phase 5:** Booking/default external checkout behavior, iframe/overlay policy details, `?book=1` end state—only touch here if templates need minimal wiring; full behavior belongs in Phase 5.
- **Phase 6:** GTM/event contracts beyond what’s needed to preserve existing load order or placeholders.
- **Phase 7:** JSON-LD/metadata **generation** sophistication beyond parity ports of existing head/meta.
- **Bulk conversion** of **all** legacy `.html` files after representatives—may spill into Phase 7/8 sequencing; Phase 4 caps at **parity templates + shared components**, not necessarily 100% page count migrated.

### Reviewed Todos (not folded)
- None.

</deferred>

---

*Phase: 04-shared-components-template-parity*
*Context gathered: 2026-04-29*
