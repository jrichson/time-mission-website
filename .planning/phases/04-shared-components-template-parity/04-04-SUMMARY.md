---
phase: 04-shared-components-template-parity
plan: 04-04
status: completed
completed_at: 2026-04-29
---

## Summary

Delivered Wave 3 (second half): **high-surface representative templates** — homepage, locations index, nested group page, and two location pages (open + coming-soon). All use `SiteLayout`, validated location data from **`src/data/locations.ts`**, and preserve Pitfall 4 (`body[data-location]` = **slug** from `find()`, not display name).

### Key artifacts

| Artifact | Purpose |
|----------|---------|
| `src/pages/index.astro` | Full homepage parity (hero, sections, game popup in pre-nav slot, inline CSS + script fragments) |
| `src/pages/locations.astro` | Data-driven list; US/EU ordering; `bodyClass="has-noise"`; `stateBadge` / `formatAddress` for labels |
| `src/pages/groups/corporate.astro` | Nested route `groups/corporate.html`; absolute `/assets/…` for images (Pitfall 6) |
| `src/pages/philadelphia.astro` | Open location: `bodyDataLocation="philadelphia"` |
| `src/pages/houston.astro` | Coming-soon location: `bodyDataLocation="houston"` |
| `src/partials/*` | Per-page `*-inline.raw.css.txt`, `*-main.frag.txt`, `*-after.frag.txt` (and index prenav) extracted from legacy HTML |

### Verification

- `npm run build:astro` emits `index.html`, `locations.html`, `groups/corporate.html`, `philadelphia.html`, `houston.html`
- `npm run check:routes` — clean URL surfaces on sources; **`--dist`** used in phase gates after build

### Notes

- Intentionally **no** `[slug].astro` catch-all: only these location representatives are emitted in `dist/` for Phase 4 scope.
- **`check-route-contract.js`** was extended (Phase 2 script, used by Phase 4 pages) to ignore static asset prefixes **`/assets/`**, **`/css/`**, **`/js/`**, **`/fonts/`** in href/preload surfaces so homepage asset links do not fail the registry.

### Deviations

- None material.

## Self-Check: PASSED
