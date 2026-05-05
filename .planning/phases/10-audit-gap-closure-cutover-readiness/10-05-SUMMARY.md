---
phase: 10
plan: 05
status: complete
completed: 2026-05-04
addresses: [P1-18, P2-1]
requirements_addressed: [ANLY-01, ANLY-03, SEO-01]
executed_by: orchestrator (inline) — initial subagent dispatch failed with bash permission denials after creating its worktree but before Task 1 commit
---

## What Was Built

Closes audit P1-18 (per-location hero srcset) without breaking visual parity, and closes P2-1 (RUM beacon) integrated with Phase 6 Consent Mode v2.

The hero medium audit was the gating first task per UI-SPEC line 142-143 and CONTEXT item 3, and its finding short-circuited Task 2: every Astro-rendered location partial (philadelphia, houston, antwerp) uses a `<video>` hero. Visual parity prohibits replacing video with a still image, so zero `<picture>` + `srcset` conversions were performed. The web-vitals RUM beacon is consent-gated, attribution-build, and pushes LCP/CLS/INP to `window.dataLayer` for GTM consumption — no external fetch, no new CSP allowlist required.

## Hero Medium Audit Findings

| Category | Count | Files |
|----------|-------|-------|
| VIDEO | 3 | `philadelphia-main.frag.txt` (line 4), `houston-main.frag.txt` (line 4), `antwerp-main.frag.txt` (line 4) |
| PICTURE_EXISTING | 0 | — |
| IMG_SINGLE | 0 | — |

`docs/hero-medium-audit.md` documents the methodology and conclusion. Future location migrations using `<img>` heroes (e.g. coming-soon city pages once Astro-rendered) should re-run this audit.

## Files Converted in Task 2

**0 conversions.** Per `docs/hero-medium-audit.md`, all Astro-rendered location partials use `<video>` heroes; no `<picture>` + `srcset` work was needed in Phase 10.

## web-vitals Install

| Field | Value |
|-------|-------|
| Package | `web-vitals` |
| Version | `5.2.0` (exact pin, no caret) |
| Block | `dependencies` (runtime browser script, not devDependency) |
| Lockfile | `package-lock.json` resolved to `5.2.0` |
| Bundle shipped | `js/web-vitals.iife.js` ← copied from `node_modules/web-vitals/dist/web-vitals.attribution.iife.js` (11.3 KB attribution build) |
| Auto-sync to dist | `scripts/sync-static-to-public.mjs` `mandatoryDirs` already includes `js/`; no script change required |

## RUM Script Behavior (`js/web-vitals-rum.js`)

- IIFE pattern matches project convention (`'use strict'`, 4-space indent, single quotes, fail-soft try/catch).
- Consent gate: reads `window.__TM_CONSENT_STATE__.analytics_storage`. Initializes only when `'granted'`.
- For late grants: subscribes to `tm:consent-updated` (Phase 6 + plan 10-06 banner accept).
- Push payload: `{event:'web_vitals', web_vitals_name, web_vitals_delta, web_vitals_value, web_vitals_rating, web_vitals_id}`. Rounded numerics; no URL, no query params, no user identifiers (PII allowlist per threat T-10-05-02).
- Idempotency guard: `initialized` flag prevents double-subscription on repeat consent events.
- DoS guard (T-10-05-03): if `window.webVitals` global is missing, the IIFE no-ops silently.

## SiteScripts Wiring

`src/components/SiteScripts.astro` now ends with:

```astro
<script defer is:inline src="/js/a11y.js"></script>
<script defer is:inline src="/js/web-vitals.iife.js"></script>
<script defer is:inline src="/js/web-vitals-rum.js?v=1"></script>
```

Vendor bundle precedes the RUM script so `window.webVitals` is defined before the consumer runs. Both scripts are `defer` so they don't block page rendering. RUM script uses a versioned query string per the existing `js/locations.js?v=10` convention.

## CSP Review (`_headers`)

**No change.** The current CSP already reads:

```
script-src 'self' 'unsafe-inline' https://cdn.rollerdigital.com https://www.googletagmanager.com
```

`'self'` permits the new same-origin scripts. The RUM beacon writes only to `window.dataLayer` (in-page state); no `fetch()` to external endpoints, so `connect-src` needs no allowlist change either. Documented per acceptance criterion: "CSP unchanged — web-vitals script is same-origin and only writes to dataLayer (no fetch to external endpoints)."

## Adjacent Fix — `check-img-alt-axe.js` `networkidle` → `load`

Phase 10's manifest expansion (10-04 added antwerp) surfaced a pre-existing flaw in 10-02's axe scanner: it used `waitUntil: 'networkidle'` against pages with autoplay looping hero `<video>` elements, which never reach networkidle and triggered the 20-second timeout. Switched to `waitUntil: 'load'`. axe DOM queries only need a loaded document; this was the right semantic fit all along.

This is a small cross-phase regression patch, kept in this commit because:
- The regression was triggered by Wave 3's manifest growth (philly/houston had the same hero video and the scan presumably worked when only image-hero pages were in scope, but expanded coverage forced the issue).
- Without the fix, axe scan blocks phase verification.
- The change is one-line, documented, and aligned with the original validator's intent.

## Key Files Created / Modified

- `docs/hero-medium-audit.md` — created (Task 1)
- `package.json` — modified (web-vitals 5.2.0 dependency)
- `package-lock.json` — modified (lockfile entry)
- `js/web-vitals.iife.js` — created (vendor bundle copy, 11.3 KB)
- `js/web-vitals-rum.js` — created (IIFE RUM beacon, 1.8 KB)
- `src/components/SiteScripts.astro` — modified (added two `<script>` tags)
- `scripts/check-img-alt-axe.js` — modified (networkidle → load adjacent fix)
- `_headers` — unchanged (CSP review only)

## Commits

- `a3db93c` — docs(10-05): hero medium audit — all 3 Astro location partials use `<video>` heroes
- `5042469` — feat(10-05): web-vitals@5.2.0 RUM beacon, consent-gated, dataLayer push

## Verification

| Check | Result |
|-------|--------|
| `npm run build:astro` | 22 pages built |
| `dist/js/web-vitals.iife.js` present (11,549 bytes) | ✓ |
| `dist/js/web-vitals-rum.js` present (1,848 bytes) | ✓ |
| `dist/index.html` and `dist/philadelphia.html` contain both `<script>` tags | ✓ |
| `web-vitals` exact-pin `5.2.0` in dependencies | ✓ |
| `npm run check:img-alt-axe` (after the load fix) | passed for 22 pages |
| `npm run check:hreflang-cluster` | passed for 22 files |
| `npm run check:schema-output` | passed for 21 Astro-rendered routes |
| `_headers` git diff | unchanged |

## Notes / Deviations

- **Inline execution**: The dispatched `gsd-executor` subagent created its worktree, read the required files, and identified the audit findings — but its first `git commit` bash call was permission-denied. The agent obeyed the prompt's `<bash_permission_note>` and signaled `bash_permission_denied`. The orchestrator picked up the audit, kept the agent's `docs/hero-medium-audit.md` content (it had been Written to the main working tree before the bash failure), and completed Tasks 1-3 inline.
- **Attribution build vs basic build**: I used `web-vitals.attribution.iife.js` (11.3 KB) per the plan's `truths` line about importing from `web-vitals/attribution`. Both expose the same `window.webVitals.{onLCP,onCLS,onINP}` API; attribution adds debug breakdown fields that the current `sendToDataLayer` payload doesn't reference. If payload size becomes a concern, swap to `web-vitals.iife.js` (5.7 KB) — drop-in compatible.
- **Stale GitNexus index**: not refreshed during this wave; should run `npx gitnexus analyze` at phase close.
- **Untracked workspace**: `.claude/worktrees/` and `assets/video/hero-bg-web.mp4` remain untracked from prior agent runs; not part of this plan and not committed.
