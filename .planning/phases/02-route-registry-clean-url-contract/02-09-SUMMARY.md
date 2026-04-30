---
phase: 02-route-registry-clean-url-contract
plan: 02-09
status: completed
completed_at: 2026-04-29
---

## Summary

Completed Astro-related route sync, expanded dist manifest checks, wired `check:routes` into global `npm run check`, and added `verify:phase2` as the consolidated Phase 02 gate. Supporting fix: internal link checker resolves extensionless paths via `src/data/routes.json`.

### Key artifacts

| Artifact | Purpose |
|----------|---------|
| `scripts/sync-static-to-public.mjs` | Copies registered routes from `routes.json` into `public/` (primary `outputFile`, fallback `legacySources`; skips `/`; `/locations` uses `locations/index.html` → `locations.html`) |
| `scripts/check-astro-dist-manifest.js` | Requires representative HTML routes plus `_redirects` / `sitemap.xml` under `dist/` |
| `scripts/check-internal-links.js` | Absolute paths `/…` resolved through registry → `outputFile` |
| `package.json` | `check` ends with `npm run check:routes`; `verify:phase2` runs check → build → astro-dist → `check:routes -- --dist` |

### Verification

- `npm run verify:phase2` — pass (includes `npm run check`, `npm run build:astro`, `npm run check:astro-dist`, `npm run check:routes -- --dist`)
- `npm run test:smoke` — pass (clean `/philadelphia` navigation shimmed for Python `http.server` in one test)

### Notes

- Smoke test “location selection persists canonical slug” uses `page.route('**/*', …)` to rewrite `/philadelphia` → `/philadelphia.html` because the Playwright web server does not apply Cloudflare-style clean URL rewrites.

### Deviations

- None.

## Self-Check: PASSED
