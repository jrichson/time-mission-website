---
phase: quick-260504-lsk
plan: 01
subsystem: schema-and-data
tags: [seo, schema, knowledge-panel, antwerp, alternateName, audit-gap-closure]
dependency_graph:
  requires:
    - "data/locations.json schema (existing)"
    - "src/lib/schema/localBusiness.ts emitter (existing)"
    - "scripts/check-schema-output.js validator (existing)"
  provides:
    - "LocationRecord.alternateName?: string optional field"
    - "LocalBusinessNode.alternateName?: string optional emit"
    - "Open-location brand-prefix invariant locked in CI"
    - "Antwerp canonical Time Mission name + alternateName preserving legacy operator brand"
  affects:
    - "data/locations.json (Antwerp record)"
    - "antwerp.html inline JSON-LD"
    - "js/locations.js FALLBACK (parity)"
    - "scripts/check-internal-links.js (template-literal skip)"
    - "package.json (check:astro-dist alias)"
tech_stack:
  added: []
  patterns:
    - "Optional schema-emit field with guarded conditional assignment"
    - "Generalized open-location iteration for brand-name invariants"
key_files:
  created:
    - ".planning/quick/260504-lsk-fix-p0-5-p0-8-rename-antwerp-location-to/260504-lsk-SUMMARY.md"
  modified:
    - "src/data/locations.ts"
    - "src/lib/schema/localBusiness.ts"
    - "data/locations.json"
    - "scripts/check-schema-output.js"
    - "antwerp.html"
    - "js/locations.js"
    - "scripts/check-internal-links.js"
    - "package.json"
decisions:
  - "Antwerp canonical name is 'Time Mission Antwerp'; legacy operator brand 'Experience Factory Antwerp' preserved in JSON-LD via Schema.org alternateName"
  - "alternateName plumbed through entire emit pipeline (LocationRecord -> LocalBusinessNode -> generated JSON-LD) so future locations opt in via data only"
  - "scripts/check-schema-output.js iterates ALL open + schema-eligible slugs to lock 'Time Mission ' prefix invariant — single shared assertion, not per-slug branches"
  - "antwerp.html inline JSON-LD updated directly (legacy hand-authored static page; not yet routed through Astro schema modules)"
  - "scripts/check-internal-links.js now ignores {{TEMPLATE}} placeholders since they are substituted by sync-static-to-public.mjs at build time"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-04T22:55Z"
requirements:
  - "P0-5"
  - "P0-8"
---

# Quick Plan 260504-lsk-01: Fix P0-5/P0-8 — Rename Antwerp Location Summary

One-liner: Renamed Antwerp to "Time Mission Antwerp" with legacy "Experience Factory Antwerp" preserved as Schema.org alternateName, plumbed alternateName through the LocationRecord/LocalBusinessNode emit pipeline, locked the open-location brand-prefix invariant in `scripts/check-schema-output.js`, and unblocked `npm run verify` end-to-end.

## What was done

### Task 1 — Plumb alternateName through types (commit ebed8d7)

- Added optional `alternateName?: string` to `LocationRecord` (`src/data/locations.ts`).
- Added optional `alternateName?: string` to `LocalBusinessNode` between `name` and `url` (`src/lib/schema/localBusiness.ts`).
- `localBusinessNode()` now conditionally emits `node.alternateName = loc.alternateName` only when the source value is a non-empty trimmed string. Other locations omit the field entirely.
- Type-check passes (`npx astro check`: 0 errors, 0 warnings, 4 pre-existing hints unrelated to this change).

### Task 2 — Rename Antwerp record (commit 1e8334a)

- `data/locations.json`: Antwerp `name` field changed from `"Experience Factory Antwerp"` to `"Time Mission Antwerp"`; new sibling field `"alternateName": "Experience Factory Antwerp"` added.
- All 6 open locations now satisfy `name.startsWith('Time Mission ')` (mount-prospect, philadelphia, west-nyack=Palisades, lincoln=Providence, manassas, antwerp).
- `node scripts/check-location-contracts.js` exits 0 (validator tolerates the new `alternateName` field — no schema rejection).
- `git diff data/locations.json` shows ONLY the Antwerp record changed.
- `venueName: "Experience Factory"`, `contact.email: "info@experience-factory.com"`, mailto bookingUrl/giftCardUrl all preserved (legacy operator still physically runs the venue).

### Task 3 — Lock contract and unblock verify (commit 3e53692)

- `scripts/check-schema-output.js`: added a generalized open-location pass after the existing `/philadelphia` and `/houston` branches. For every route whose slug matches an open + `localBusinessSchemaEligible: true` location, the script now asserts:
  - Exactly one `EntertainmentBusiness` node.
  - `name` is a non-empty string starting with `"Time Mission "`.
  - If `alternateName` is present, it is a non-empty string.
  - If source data declares `alternateName`, the emitted JSON-LD must match (drift detection).
- `antwerp.html`: hand-authored inline LocalBusiness JSON-LD now declares `name: "Time Mission Antwerp"` and `alternateName: "Experience Factory Antwerp"` (legacy static page is not yet emitted through the Astro schema module — patched directly at source).

## GitNexus impact analysis (per CLAUDE.md)

Index was fresh (last commit 135bb23) at the start of execution. CLI invocations:

| Symbol | Type | Risk | Direct dependents | Notes |
|---|---|---|---|---|
| `LocationRecord` | Interface | **MEDIUM** | 6 importers: `src/lib/ticket-options.ts`, `src/lib/site-contract.ts`, `src/lib/locations-fingerprint.ts`, `scripts/lib/derive-ticket-options-from-locations.ts`, `src/lib/schema/localBusiness.ts`, `src/lib/schema/graph.ts` | Optional field is structurally additive; no breaking change to any consumer. |
| `localBusinessNode` | Function | **LOW** | 1 caller: `buildLocationGraph` (graph.ts), 1 process | Output gains optional property; consumer treats it as black-box JSON-LD. |
| `LocalBusinessNode` | Interface | **LOW** | 1 importer: `src/lib/schema/graph.ts` | Same — additive interface. |

**No HIGH/CRITICAL warnings.** Adding optional fields was safe across all consumers; manual review of `graph.ts` confirmed the function output is consumed as a black box (line 43: `const business = localBusinessNode(loc, canonicalPath);`). No destructuring or shape-dependent logic.

GitNexus MCP `detect_changes` was not directly available in this session (CLI exposes `analyze/index/status/clean` but not `detect_changes`). Scope verification was performed via `git diff --stat 135bb23..HEAD` showing exactly 8 modified files matching the expected scope (4 plan-declared + 4 deviation-driven).

## Verification

- `npm run check`: PASSED (all source-side validators including location contracts, sitemap, components, booking, accessibility, internal links, route contract, site data, location route alignment, FALLBACK sync, component usage, site contract, analytics, consent, SEO catalog, SEO robots).
- `npm run build:astro`: PASSED (15 Astro routes built).
- `node scripts/check-schema-output.js`: PASSED for 14 Astro-rendered routes, including the new open-location brand-prefix assertions.
- `npm run verify`: PASSED end-to-end including all dist-side validators and 20/20 Playwright smoke tests.

### Emitted JSON-LD verification (dist/antwerp.html)

```
"name":"Time Mission Antwerp"
"alternateName":"Experience Factory Antwerp"
```

Both fields are present in the deployed `dist/antwerp.html` LocalBusiness JSON-LD block.

## Deviations from Plan

### Rule 1 (auto-fix bug) — js/locations.js FALLBACK Antwerp.name

- **Found during:** Task 2 verification (npm run check).
- **Issue:** `scripts/check-fallback-locations-sync.js` enforces parity between `data/locations.json` and the FALLBACK object in `js/locations.js`. After renaming Antwerp, FALLBACK still had the old name, breaking the parity check.
- **Fix:** Updated `js/locations.js` line 33 — Antwerp FALLBACK `name` now `"Time Mission Antwerp"`. `alternateName` is NOT mirrored because the parity check does not require it.
- **Files modified:** `js/locations.js`.
- **Commit:** 3e53692.

### Rule 1 (auto-fix bug) — antwerp.html hand-authored JSON-LD

- **Found during:** Task 3 (`dist/antwerp.html` inspection).
- **Issue:** Antwerp is NOT in `src/data/site/astro-rendered-output-files.json` — it is still served as a hand-authored static HTML file (root `antwerp.html`) copied to `dist/` by `scripts/sync-static-to-public.mjs`. The new `localBusinessNode()` plumbing therefore does not yet drive Antwerp's JSON-LD; the inline `<script type="application/ld+json">…</script>` block on the source page does. Without patching this directly, the plan's success criterion #1 (Antwerp's emitted JSON-LD declares the canonical brand) was unsatisfied even though the data and emitter were correct.
- **Fix:** Updated the inline EntertainmentBusiness JSON-LD in `antwerp.html` to declare `name: "Time Mission Antwerp"` and `alternateName: "Experience Factory Antwerp"`.
- **Files modified:** `antwerp.html`.
- **Commit:** 3e53692.
- **Note for Phase 10 plan 10-01:** Once Antwerp is migrated to an Astro page, this hand-edit can be replaced by the data-driven emit path that already supports `alternateName` end-to-end.

### Rule 3 (auto-fix blocking issue) — scripts/check-internal-links.js template-literal handling

- **Found during:** Task 3 (`npm run check`).
- **Issue:** `npm run check` fails on baseline (commit 135bb23) because every page emits `{{TM_MEDIA_BASE}}/assets/video/*.mp4` placeholders that are substituted at build time by `scripts/sync-static-to-public.mjs` and `astro.config.mjs` (see `tmMediaBaseFromEnv()`). The source-side `check:links` invocation against the repo root reports these placeholders as missing internal assets even though they are intentional unsubstituted templates. This blocks the `npm run check` step that `npm run verify` depends on.
- **Confirmed pre-existing:** Reproduced on bare `git stash` of all my edits — same failure occurs at baseline 135bb23.
- **Fix:** Added a guard to `scripts/check-internal-links.js` that skips any href/src starting with or containing `{{`. The dist-side `check:links --dist` is unaffected because templates are already substituted in dist.
- **Files modified:** `scripts/check-internal-links.js`.
- **Commit:** 3e53692.

### Rule 3 (auto-fix blocking issue) — package.json check:astro-dist alias

- **Found during:** Task 3 (`npm run verify`).
- **Issue:** `scripts/verify-site-output.mjs` (the `npm run verify` orchestrator) and `verify:phase1`-`verify:phase6` aliases all reference `npm run check:astro-dist`, but no such script is registered in `package.json`. The script file `scripts/check-astro-dist-manifest.js` exists but is unwired. `npm run verify` fails with `npm error Missing script: "check:astro-dist"`.
- **Confirmed pre-existing:** Same failure exists on baseline 135bb23 — not caused by this plan's edits.
- **Fix:** Added `"check:astro-dist": "node scripts/check-astro-dist-manifest.js"` to `package.json` scripts. The verify orchestrator now wires through cleanly.
- **Files modified:** `package.json`.
- **Commit:** 3e53692.

## Authentication gates

None — fully autonomous execution.

## Notes

### For Phase 10 plan 10-01

This quick plan ships:

- The `alternateName` plumbing through `LocationRecord` → `LocalBusinessNode` → emitted JSON-LD.
- The brand-prefix assertion in `scripts/check-schema-output.js` covering all open + schema-eligible locations.
- A direct fix of Antwerp's inline JSON-LD in the legacy hand-authored `antwerp.html`.

Plan 10-01 may now drop the P0-5/P0-8 line items and focus on:

- Host-config / redirects / DNS readiness.
- Migrating Antwerp (and other still-static locations) to Astro routes so the data-driven emit pipeline (already complete) fully supersedes the hand-edited inline JSON-LD.
- Any audit findings still open beyond canonical brand attribution.

### Worktree branch base correction

The agent worktree was created on a base older than the documented HEAD (135bb23). At session start, `git merge-base HEAD 135bb23` returned a different commit, so per the orchestrator instructions a `git reset --soft 135bb23` was run, followed by `git checkout 135bb23 -- .` to bring the working tree back to the documented baseline. This corrected a known Windows-style worktree creation issue on this macOS session.

## Self-Check: PASSED

- `.planning/quick/260504-lsk-fix-p0-5-p0-8-rename-antwerp-location-to/260504-lsk-SUMMARY.md`: written by this run.
- Commit ebed8d7 (Task 1): present in `git log`.
- Commit 1e8334a (Task 2): present in `git log`.
- Commit 3e53692 (Task 3): present in `git log`.
- `src/data/locations.ts`: contains `alternateName?: string;` (line 44).
- `src/lib/schema/localBusiness.ts`: contains `alternateName?: string;` (line 19) and the conditional `node.alternateName = loc.alternateName` block (line 61-63).
- `data/locations.json`: Antwerp record has `name: "Time Mission Antwerp"` and `alternateName: "Experience Factory Antwerp"`.
- `scripts/check-schema-output.js`: contains the `openLocationSlugs` block asserting `name.startsWith('Time Mission ')`.
- `dist/antwerp.html`: inline JSON-LD includes both `"name":"Time Mission Antwerp"` and `"alternateName":"Experience Factory Antwerp"`.
- `npm run verify`: exit 0 with all 20/20 smoke tests passing.
