# Phase 3 Research: Validated Data Foundation

**Phase:** 3 — Validated Data Foundation  
**Researched:** 2026-04-29  
**Question:** What do we need to know to plan DATA-01–DATA-04 well?

## Summary

The brownfield site today uses `data/locations.json` as the primary location source, duplicated in `js/locations.js` `FALLBACK`, with additional literals scattered across HTML pages (nav, footer, group copy, FAQs, SEO). Phase 2 introduced `src/data/routes.json` as the URL contract; Phase 3 must make **business facts** first-class, **validated**, and **importable by Astro** without breaking the existing `public/data/locations.json` fetch path used by `js/locations.js`.

Recommended approach:

1. **Keep `data/locations.json` as the human-edited source of truth** for locations until a later migration explicitly moves authoring elsewhere. Add optional international-readiness fields (DATA-04) with permissive validation (optional keys, consistent shapes when present).

2. **Expose Astro-friendly imports** via `src/data/locations.ts` (or equivalent) that re-exports the same document Astro/Vite can bundle, preserving field names consumed by `js/locations.js` today.

3. **Extend `scripts/check-location-contracts.js`** (or a sibling module it imports) with DATA-02 rules: open vs coming-soon booking/gift/map/hours/contact/local-SEO/schema-eligibility invariants, not only `bookingUrl` presence.

4. **Introduce new JSON modules under `src/data/site/`** (or `src/data/content/`) for navigation, footer links, analytics label constants, group/mission/faq catalogs, and default SEO tokens. Add **`scripts/check-site-data.js`** that validates JSON shape and cross-references `canonicalPath` values against `src/data/routes.json` so DATA-03 does not drift from ROUTE-03.

5. **Avoid new runtime npm deps** if possible: use Node + fs + the same error-accumulation pattern as existing `scripts/check-*.js`. Optional: TypeScript interfaces live in `src/env.d.ts` or a small `src/types/site-data.d.ts` for editor support only.

6. **Pitfall alignment:** `.planning/research/PITFALLS.md` Pitfall 3 (location drift) — Phase 3 should document a path to **generate or verify** `js/locations.js` FALLBACK from `data/locations.json` in a later plan or explicitly defer to Phase 4/5 with a tracked todo in PLAN must_haves.

## Existing artifacts

| Artifact | Role |
|----------|------|
| `data/locations.json` | Live location facts, fetched by browser |
| `js/locations.js` | `FALLBACK` duplicate — technical debt |
| `scripts/check-location-contracts.js` | Minimal open/coming-soon, id/slug, page existence |
| `src/data/routes.json` | Canonical paths — must align with slugs and site links |
| `scripts/sync-static-to-public.mjs` | Copies `data/` → `public/data/` before Astro build |

## DATA requirement mapping

| ID | Research conclusion |
|----|---------------------|
| DATA-01 | JSON at repo root + `src/data/locations.ts` re-export; `npm run check:locations` remains gate |
| DATA-02 | Expand validator: hours shape, map URL scheme, gift rules, local SEO placeholders, `schemaEligible` or derived rule |
| DATA-03 | New validated JSON modules + `check:site-data` wired into `npm run check` |
| DATA-04 | Optional per-location: `countryCode`, `locale`, `timeZone`, `currency`, `phoneE164`, `hreflang[]` |

## Anti-patterns

- Maintaining two divergent location files (TS and JSON) without a single generate/copy step.
- Putting large HTML fragments in JSON (breaks parity and XSS review) — store plain strings; components own markup in Phase 4.
- Site data links that use `.html` paths — must use clean paths per Phase 2.

## Validation Architecture

Phase execution should prove validation through **Node check scripts** (existing pattern), not browser tests:

- **After each plan wave:** `npm run check` (must include new `check:site-data` once introduced).
- **Before phase complete:** `npm run verify:phase3` (new gate script combining `check`, `build:astro`, and optional `check:routes -- --dist` if integrated in gate).
- **Sampling:** Every task that edits JSON under `data/` or `src/data/` must update or extend a check script so drift fails CI.

**Test infrastructure:** `@playwright/test` already exists; Phase 3 does not require new e2e unless a task adds a smoke assertion for generated JSON in `dist/`. Prefer grep/script verification.

## RESEARCH COMPLETE
