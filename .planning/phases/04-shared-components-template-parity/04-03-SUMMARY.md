---
phase: 04-shared-components-template-parity
plan: 04-03
status: completed
completed_at: 2026-04-29
---

## Summary

Delivered Wave 3 (first half): **simple representative templates** ported to Astro behind `SiteLayout`, plus **`scripts/sync-static-to-public.mjs` skip-list** so routes rendered from `src/pages/*.astro` are not overwritten by legacy HTML copy during `build:astro` (Pitfall 5 mitigation).

Together with Wave 3 second half (**04-04**), this covers four of eight ROADMAP archetypes (`about`, `faq`, contact, privacy).

### Key artifacts

| Artifact | Purpose |
|----------|---------|
| `scripts/sync-static-to-public.mjs` | Excludes migrated `outputFile` routes from legacy → `public/` copy |
| `src/pages/about.astro` | Marketing template parity |
| `src/pages/faq.astro` | FAQ pattern via `Faq.astro` + `src/data/site/faqs.json` |
| `src/pages/contact.astro` | Contact form parity; canonical thank-you path **`/contact-thank-you`** (`tests/smoke/site.spec.js`) |
| `src/pages/privacy.astro` | Policy/utility parity |
| `src/partials/*` | Body/main/after fragments + `*.raw.css.txt` for global page styles (matching legacy `<style>` behavior) |

### Verification

- `npm run check` — includes route contract, site data, `check:component-usage` after 04-05 wiring
- Representative pages built with `npm run build:astro`; `dist/` contains `about.html`, `faq.html`, `contact.html`, `privacy.html` per route registry

### Notes

- Page-local CSS uses **`is:global`** / fragment pattern so selectors match legacy unmangled class names where required.
- Legacy root `*.html` remain in repo for rollback; Astro is the producer for registered `outputFile` paths after sync skip.

### Deviations

- None material.

## Self-Check: PASSED
