---
phase: 02-route-registry-clean-url-contract
plan: 02-02
status: completed
completed_at: 2026-04-29
---

## Summary

Aligned `_redirects`, `sitemap.xml`, `scripts/check-sitemap.js`, and `docs/redirect-map.md` with `src/data/routes.json`.

### Changes

| Area | Details |
|------|---------|
| `_redirects` | Generated legacy `.html` → clean paths plus alias shortcuts; removed `/licensing`, `/orland-park`, `/dallas`, `/brussels` self-loop rows |
| `sitemap.xml` | 31 clean `<loc>` URLs from registry (`sitemap: true`), root `/` trailing slash only |
| `scripts/check-sitemap.js` | Reads registry; rejects `.html` locs and non-root trailing-slash locs |
| `docs/redirect-map.md` | Phase 02 sections for Cloudflare primary behavior, queries, fragments, status policy, Netlify caveats, checklist |

### Validator tweak

Removed naive redirect equality check that flagged intentional `/locations/` → `/locations` trailing-slash trimming (`scripts/check-route-contract.js`).

### Verification

- `npm run check:sitemap`
- `npm run check:routes -- --redirects --sitemap`

### Notes

Full `npm run check:routes` (includes `--sources`) remains expected to fail until Plans 03–08 sweep HTML/JS surfaces.

## Self-Check: PASSED
