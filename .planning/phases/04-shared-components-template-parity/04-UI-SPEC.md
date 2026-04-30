---
phase: 04
slug: shared-components-template-parity
status: draft
shadcn_initialized: false
preset: none
created: "2026-04-29"
---

# Phase 04 — UI Design Contract

> Extends Phase 02 parity contract for **Astro composition**: shared components must reproduce the existing static HTML/CSS/JS experience; no redesign.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none; Astro components emit same HTML/CSS as legacy pages |
| Preset | not applicable |
| Component library | none (Astro `.astro` only; no React/Vue/Svelte) |
| Icon library | none introduced — reuse existing SVG/asset paths |
| Font | Same as Phase 02: `Bebas Neue`, `DM Sans`, `Monument Extended`, `Orbitron` via existing CSS and `assets/fonts/` |

Phase 4 is **composition only**: lift repeated markup into `src/layouts/` and `src/components/` while preserving tokens, spacing, motion, and copy from the legacy pages that serve as the design contract.

---

## Spacing Scale

No new spacing tokens. All section, nav, footer, ticket panel, overlay, and form spacing must match the computed layout of the reference static page for each template class.

| Token | Contract |
|-------|----------|
| All | Preserve existing authored values in `css/`, page-local styles, and equivalent Astro `<style>` only when computed rules match |

---

## Typography

| Role | Contract |
|------|----------|
| Body / Label / Heading / Display | Identical to Phase 02 — preserve `var(--body)`, `var(--display)`, `var(--tech)`, and page-local heading styles |

Do not change font loading order, preloads, or `@font-face` blocks relative to legacy flagship pages unless required to fix a documented bug.

---

## Color

Identical to Phase 02 table (dominant dark surfaces, orange/cyan accents, existing gradients). Astro components must not introduce new accent usage on shared chrome.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| All visible strings | Must match legacy reference pages for each migrated route (nav, footer, ticket panel, FAQs, CTAs, legal) |
| New user-facing strings | **Disallowed** except parity fixes explicitly documented as bug fixes |

Data-driven labels must come from validated `src/data` modules (Phase 3); do not hand-type durable facts in components.

---

## Interaction & Motion

| Area | Contract |
|------|----------|
| Nav, mobile menu, location overlay, ticket panel | Same open/close behavior, focus order, and ARIA patterns as legacy |
| Scroll / reveal / hero | Preserve existing CSS animation and `animation-delay` patterns from reference pages |
| Scripts | Load `js/*.js` in the same order as reference pages; use `is:inline` where Astro would otherwise bundle or hash |

---

## DOM & Accessibility Hooks

| Contract |
|----------|
| Preserve `#ticketPanel`, `#ticketOverlay`, `#ticketLocation`, `#ticketBookBtn`, `#ticketClose`, mobile menu IDs, skip link, and `body[data-location]` patterns consumed by `js/*.js` and smoke tests |
| Preserve roles, `aria-*`, and keyboard behaviors verified by `scripts/check-accessibility-baseline.js` |

---

## Representative Templates (COMP-04)

Golden references before bulk migration:

1. Homepage (`/`)
2. One core marketing page (e.g. `/about`)
3. One group/event page (e.g. under `/groups/`)
4. One open-location page
5. One coming-soon location page
6. Locations index (`/locations/`)
7. FAQ + contact (may be two routes)
8. One policy/utility page (e.g. privacy or cookies)

Each must be visually indistinguishable from its legacy HTML counterpart at normal breakpoints unless a bug fix is documented.

---

## No-Change Guardrails (extends Phase 02)

- Do not introduce Tailwind, shadcn, or new UI npm dependencies for chrome.
- Do not refactor `build.sh`/`components/ticket-panel.html` workflow until PLAN tasks explicitly retire it under COMP-03 gates.

---

## Verification Checks

| Check | Expected |
|-------|----------|
| `npm run check` | Pass after component changes |
| `npm run build:astro` | Pass; output includes migrated routes |
| Component/ticket parity scripts | Pass when added per RESEARCH.md |
| Playwright smoke | Pass against built output for migrated URLs |

---

## Checker Sign-Off

- [ ] Dimension 1–6: PASS per Phase 02 criteria, applied to Astro output
- [ ] Script/load order parity: PASS for representative pages

**Approval:** pending
