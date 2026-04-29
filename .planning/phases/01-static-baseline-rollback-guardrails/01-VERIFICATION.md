---
status: passed
phase: 01-static-baseline-rollback-guardrails
verified: "2026-04-29"
---

# Phase 1 verification — Static baseline & rollback guardrails

## Requirement traceability

| ID | Evidence |
|----|----------|
| FND-01 | Astro `astro.config.mjs`: `output: 'static'`, `build.format: 'file'`, `trailingSlash: 'never'`; `npm run build:astro` produces `dist/index.html`. |
| FND-03 | Legacy site remains independently deployable; rollback tag `pre-astro-migration-baseline` preserved on baseline docs commit; `docs/rollback-runbook.md` documents triggers and operator outline including Cloudflare outline + Phase 8 rehearsal. |
| FND-04 | `.planning/baseline/` artifacts including README with verify record and rollback tag name; `npm run verify:phase1` composes legacy `npm run verify`, Astro build, and manifest check. |

## Automated verification

- `npm run verify` — exit 0 (checks + Playwright smoke; requires Playwright browsers installed via `npx playwright install chromium` after fresh npm ci).
- `npm run verify:phase1` — exit 0 (includes `npm run build:astro` and `check:astro-dist-manifest.js`).
- `node scripts/check-astro-dist-manifest.js` — asserts `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `404.html`, mirrored static paths under `dist/`.

## Human verification

- None blocking — preview rehearsal deferred to Phase 8 per CONTEXT D-17.

## Gaps

- None identified.
