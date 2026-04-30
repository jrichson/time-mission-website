---
phase: 04-shared-components-template-parity
plan: 04-05
status: completed
completed_at: 2026-04-29
---

## Summary

Closed Phase 4 with **automated parity gates**: dist-level ticket panel contract, Astro vs legacy ticket-panel snapshot diff (normalized), source-level `SiteLayout` adoption, and an extended **`dist/` manifest**. **`npm run check`** includes **`check:component-usage`**; **`verify:phase4`** chains check → build → astro-dist → routes-on-dist → both ticket-panel checks.

`components/ticket-panel.html` was aligned with **`src/components/TicketPanel.astro`** so source-parity normalization matches production markup.

### Key artifacts

| Artifact | Purpose |
|----------|---------|
| `scripts/check-ticket-panel-parity.js` | Every `dist/**/*.html` that loads `ticket-panel.js` must contain the panel contract (markers, IDs, close control, location select, book button) |
| `scripts/check-ticket-panel-source-parity.js` | Slice from `dist` (e.g. `about.html`) vs `components/ticket-panel.html` with `normalize()` (whitespace, dynamic `<option>` list excluded) |
| `scripts/check-component-usage.js` | All `src/pages/**/*.astro` import `SiteLayout`; `SiteLayout.astro` imports required chrome components |
| `scripts/check-astro-dist-manifest.js` | **`mustFile`** entries for Phase 4 representatives (e.g. `index.html`, `contact.html`, `privacy.html`, `houston.html`, …) plus existing host-file checks |
| `package.json` | `check:component-usage` on global `check`; `verify:phase4` as Phase 4 gate |

### Verification

- `npm run verify:phase4` — `check` → `build:astro` → `check:astro-dist` → `check:routes -- --dist` → `check:ticket-panel-parity` → `check:ticket-panel-source-parity`
- Playwright smoke tests still target **repo-root** static HTML (Phase 8 migration to `dist` per **VER-01/03**, not this plan)

### Notes

- **`check:component-usage`** runs inside `npm run check` (not duplicated at the end of `verify:phase4`).

### Deviations

- **04-05-PLAN.md** text listed `check:component-usage` as a trailing `verify:phase4` step; actual wiring folds it into **`npm run check`**, which `verify:phase4` already invokes first — behavior matches intent (component usage gated on every check).

## Self-Check: PASSED
