# Plan 07-03 Summary

## Objective
Centralized JSON-LD `@graph` from `src/lib/schema/*`, migrated Astro pages off inline `const ld` literals, `check-schema-output.js`, removed erroneous duplicate Organization script from `faq` inline CSS partial, `docs/schema-coverage-matrix.md`.

## GitNexus
`impact` not run (stale index); scope limited to schema + pages per plan.

## Notes
- **FAQ duplicate JSON-LD:** Legacy HTML snippet was embedded in `src/partials/faq-inline.raw.css.txt` inside the global `<style>` block, producing a second Organization script + invalid first-parse block. Removed; `check-schema-output` prefers blocks containing `"@graph"`.

## Verification
- `npx astro check`, `npm run build:astro`, `npm run check:schema-output`, `npm run check:seo-output`, `npm run check`

## Self-Check
- PASSED
