---
phase: 02-route-registry-clean-url-contract
plan: 02-01
status: completed
completed_at: 2026-04-29
---

## Summary

Implemented the Phase 02 route registry (`src/data/routes.json`), CommonJS route contract validator (`scripts/check-route-contract.js`), and standalone `npm run check:routes` entry point.

### Key artifacts

| Artifact | Purpose |
|----------|---------|
| `src/data/routes.json` | Canonical paths, legacy `.html` sources, Astro `outputFile`, sitemap flags, marketing aliases |
| `scripts/check-route-contract.js` | `--registry`, `--redirects`, `--sitemap`, `--sources` (+ scopes), `--dist` |
| `package.json` | `"check:routes": "node scripts/check-route-contract.js"` (not wired into global `check` yet — Plan 09) |

### Verification

- `node scripts/check-route-contract.js --registry` — pass
- `npm run check:routes -- --registry` — pass
- Embedded smoke (`node -e` registry assertions from PLAN) — pass

### Notes

- Full default invocation (`npm run check:routes` with no flags) runs registry + redirects + sitemap + sources and **will fail** until `_redirects`, `sitemap.xml`, and HTML surfaces are aligned in later Wave 2–4 plans — expected during staged rollout.

### Deviations

- None.

## Self-Check: PASSED
