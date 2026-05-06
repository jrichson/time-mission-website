---
phase: quick-260506-bvu
plan: 01
subsystem: csp-hardening
tags: [csp, security, sha256, inline-scripts, cloudflare-pages]
dependency_graph:
  requires: [quick-260505-t7n]
  provides: [csp-hardening-pipeline, hash-injector, csp-ci-gate, csp-smoke-tests]
  affects: [_headers, dist/_headers, SiteScripts.astro, js/site-progressive.js, scripts/build-chain]
tech_stack:
  added: [scripts/inject-csp-hashes.mjs, scripts/check-csp-hashes.js, tests/smoke/csp.spec.js, js/site-progressive.js, _headers.tmpl]
  patterns: [sha256-csp-hash-injection, source-of-truth-template, ci-hash-drift-gate, playwright-functional-smoke]
key_files:
  created:
    - js/site-progressive.js
    - _headers.tmpl
    - scripts/inject-csp-hashes.mjs
    - scripts/check-csp-hashes.js
    - tests/smoke/csp.spec.js
  modified:
    - src/components/SiteScripts.astro
    - scripts/sync-static-to-public.mjs
    - scripts/verify-site-output.mjs
    - package.json
    - _headers
    - js/page-about-after.js
    - js/page-antwerp-after.js
    - js/page-contact-after.js
    - js/page-faq-after.js
    - js/page-group-event-after.js
    - js/page-houston-after.js
    - js/page-index-after.js
    - js/page-lincoln-after.js
    - js/page-manassas-after.js
    - js/page-mount-prospect-after.js
    - js/page-philadelphia-after.js
    - js/page-west-nyack-after.js
decisions:
  - "_headers.tmpl is the single source of truth; _headers and dist/_headers are both generated outputs"
  - "check:csp-hashes wired into verify (via verify-site-output.mjs), NOT check — dist/ required"
  - "Duplicate footer-location-toggle handlers in 12 page-after files removed; site-progressive.js is sole sitewide handler"
  - "Per-page JSON-LD hashes kept inline per SEO convention; 26 unique hashes in global /* CSP"
  - "Single global /* CSP rule (union of all page hashes) chosen over per-route rules for maintenance simplicity"
metrics:
  duration: ~90 minutes
  completed: "2026-05-06T16:42:58Z"
  tasks_completed: 3
  tasks_total: 4
  files_created: 5
  files_modified: 18
---

# Quick Task 260506-bvu: Drop `'unsafe-inline'` from CSP via SHA256 Hashes — Summary

**One-liner:** SHA256 hash pipeline removes `'unsafe-inline'` from both `script-src` and `style-src` — 17 script hashes + 8 style hashes injected from `_headers.tmpl` into both root `_headers` and `dist/_headers` deterministically on every build.

## What Was Built

### Task 1 — Extract SiteScripts.astro inline blocks to js/site-progressive.js (54074aa)

- Created `js/site-progressive.js` with reveal-observer + footer-location-toggle IIFEs (4-space indent, file-level JSDoc per CLAUDE.md conventions)
- Removed two `<script is:inline>` blocks from `SiteScripts.astro`
- Replaced with `<script defer is:inline src="/js/site-progressive.js?v=1">`
- Inline non-src non-JSON-LD script count per page: **5 → 3** (analytics-labels, consent-bootstrap, site-contract)
- `dist/js/site-progressive.js` exists after build

### Task 2 — Hash injector, _headers.tmpl, sync-static-to-public.mjs update (0ad2ed7)

- Created `_headers.tmpl` — template with `{{SCRIPT_HASHES}}` and `{{STYLE_HASHES}}` placeholders (no `'unsafe-inline'`)
- Created `scripts/inject-csp-hashes.mjs` — walks `dist/**/*.html`, SHA256-hashes inline `<script>` (no src=, not JSON-LD) and `<style>` blocks, sorts hashes for determinism, substitutes into template, writes both `root _headers` and `dist/_headers`; asserts `'unsafe-inline'` absent from rendered output before writing
- Updated `sync-static-to-public.mjs` — reads `_headers.tmpl` instead of `_headers`; writes pre-build `public/_headers` with `'unsafe-inline'` stand-ins so Astro build has valid syntax; `_headers.tmpl` in `mandatoryFiles` existence check
- Wired `inject-csp-hashes.mjs` into `build:astro` after minify step
- Two consecutive builds produce byte-identical CSP line (deterministic)

### Task 3 — CI hash drift gate + Playwright CSP smoke tests (82fb7b0)

- Created `scripts/check-csp-hashes.js` — recomputes hashes from dist HTML, verifies each appears in `dist/_headers` CSP directive; fails with `"dist/ not found — run npm run build:astro first"` when dist/ absent
- Wired `check:csp-hashes` into `scripts/verify-site-output.mjs` (after `build:astro`, before `check:routes`); also added `check:csp-hashes` script entry to `package.json`
- Created `tests/smoke/csp.spec.js` — 2 functional tests (4 with projects): reveal animation (`.visible` class via `scrollIntoViewIfNeeded`) and footer toggle (`.open` class after click with `waitForLoadState('load')`)
- **Rule 1 fix (auto-applied):** Removed duplicate `footer-location-toggle` click handler from 12 `js/page-*-after.js` files — duplicate handlers caused `classList.toggle('open')` to fire an even number of times per click (net 0 change); `site-progressive.js` is now the sole sitewide handler

### Task 4 — Human verification (not blocking — see handoff below)

All automation is complete. Human verification steps are documented below.

## Key Metrics

| Metric | Value |
|--------|-------|
| Script hashes in final CSP | 17 |
| Style hashes in final CSP | 8 |
| Total hashes in CSP | 25 |
| CSP line length (dist/_headers) | ~2,110 bytes |
| Inline non-src script tags per page (before) | 5 |
| Inline non-src script tags per page (after) | 3 |
| Builds run to verify determinism | 2 (byte-identical) |

## Verification Results

All automated gates green:

```
npm run check              → EXIT 0 (all source-only checks pass)
npm run build:astro        → EXIT 0, "CSP hashes injected: 17 script hash(es), 8 style hash(es)."
npm run check:csp-hashes   → EXIT 0, "CSP hash check passed: 17 script hash(es), 8 style hash(es) verified."
dist/_headers contains sha256-... in script-src and style-src: PASS
dist/_headers contains no 'unsafe-inline': PASS
root _headers CSP line == dist/_headers CSP line: PASS (diff exits 0)
Two consecutive builds byte-identical: PASS
csp.spec.js tests: 4/4 pass (reveal .visible, footer-toggle .open)
```

**Pre-existing failure (out of scope):** `check:hreflang-cluster` fails due to `<link rel="alternate" hreflang>` tags emitted by `SiteHead.astro` (confirmed pre-existing at commit `3d2f21a`, before any bvu changes). This causes `npm run verify` to exit non-zero. This is unrelated to CSP hardening.

## Handoff for Human Verification (Task 4)

Task 4 is a `checkpoint:human-verify`. The following steps can be run at any time:

**Step 1 — Build (already done, can re-run to confirm):**
```bash
npm run build:astro
# Expected: exits 0, prints "CSP hashes injected: 17 script hash(es), 8 style hash(es)."
```

**Step 2 — Inspect CSP lines:**
```bash
grep "Content-Security-Policy" dist/_headers
grep "Content-Security-Policy" _headers
diff <(grep "Content-Security-Policy" dist/_headers) <(grep "Content-Security-Policy" _headers)
# Expected: sha256-... tokens, no 'unsafe-inline', diff exits 0
```

**Step 3 — Run CI gate:**
```bash
npm run check:csp-hashes
# Expected: "CSP hash check passed: 17 script hash(es), 8 style hash(es) verified."
```

**Step 4 — Run Playwright smoke tests:**
```bash
npx playwright test tests/smoke/csp.spec.js
# Expected: 4/4 pass
```

**Step 5 — Confirm tmpl is the source:**
```bash
grep "_headers.tmpl" scripts/sync-static-to-public.mjs
# Expected: at least one match
```

**Step 6 — Manual browser check (recommended before deploy):**
```bash
npm run preview:test
# Open http://127.0.0.1:4173 in Chrome DevTools
# Console tab — filter for "policy" or "CSP"
# Visit /, /antwerp, /faq — zero CSP console errors expected
# Scroll the page — .reveal elements should animate in
# Click a footer location toggle — parent div should get .open class
```

**Rollback path:** If CSP errors appear, add `'unsafe-inline'` back to `script-src` in `_headers.tmpl` and re-run `node scripts/inject-csp-hashes.mjs`. This regenerates both `_headers` and `dist/_headers` without a full rebuild.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Duplicate footer-location-toggle handlers causing toggle cancellation**
- **Found during:** Task 3 (csp.spec.js footer-toggle test failing)
- **Issue:** `site-progressive.js` adds `click` listener for `.footer-location-toggle`. All 12 `js/page-*-after.js` files also contained the identical handler (legacy from t7n extraction of `*-after.frag.txt` fragments, which already included the footer toggle). Result: 4 listeners per button, 4 `classList.toggle('open')` calls per click = net 0 change.
- **Fix:** Removed the duplicate `footer-location-toggle` block from all 12 `page-*-after.js` files. `site-progressive.js` is now the sole sitewide handler.
- **Files modified:** `js/page-about-after.js`, `js/page-antwerp-after.js`, `js/page-contact-after.js`, `js/page-faq-after.js`, `js/page-group-event-after.js`, `js/page-houston-after.js`, `js/page-index-after.js`, `js/page-lincoln-after.js`, `js/page-manassas-after.js`, `js/page-mount-prospect-after.js`, `js/page-philadelphia-after.js`, `js/page-west-nyack-after.js`
- **Commit:** 82fb7b0

**2. [Rule 1 - Bug] Style regex capture group index in inject-csp-hashes.mjs**
- **Found during:** Task 2, first build run
- **Issue:** `INLINE_STYLE_RE` has pattern `/<style[^>]*>([\s\S]*?)<\/style>/g` — one capture group, body = `m[1]`. Code used `m[2]` → `TypeError: data argument undefined`.
- **Fix:** Changed `const body = m[2]` to `const body = m[1]` for style extraction.
- **Commit:** 0ad2ed7 (fixed inline before commit)

### Plan Count Deviation (documentation only, not a bug)

The plan stated "exactly 5" inline non-src non-JSON-LD scripts per page after Task 1 (analytics-labels + 3 consent variants + site-contract = 5). In reality each page emits **1** consent script (the body varies per route — eu_strict/us_open/global_strict — but one per page), so the actual count is **3** per page. The plan was based on a research-time assumption that 3 consent variants would appear per page. The injector correctly collects all 3 distinct consent hashes by scanning all pages — the CSP union is correct. No code change needed.

## Known Stubs

None — all inline blocks are hashed and included in the CSP. No data flows to UI that is left unresolved.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced.

| Threat Mitigated | Component | Status |
|-----------------|-----------|--------|
| T-bvu-01 — Template substitution tampering | inject-csp-hashes.mjs | Post-substitution assertion added: exits 1 if `'unsafe-inline'` in rendered output |
| T-bvu-02 — Stale dist/_headers | check-csp-hashes.js | Recomputes hashes on every `npm run verify`; drift caught before deploy |
| T-bvu-03 — unsafe-inline reintroduction | check-csp-hashes.js | Fails if unsafe-inline in dist/_headers CSP directives |
| T-bvu-06 — Finder duplicate HTML files | inject-csp-hashes.mjs + check-csp-hashes.js | Both scripts exclude files with space+digits in basename |
| T-bvu-07 — _headers dual-source drift | sync-static-to-public.mjs | Reads _headers.tmpl not _headers; injector regenerates root _headers each build |

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| js/site-progressive.js exists | FOUND |
| _headers.tmpl exists | FOUND |
| scripts/inject-csp-hashes.mjs exists | FOUND |
| scripts/check-csp-hashes.js exists | FOUND |
| tests/smoke/csp.spec.js exists | FOUND |
| Commit 54074aa (Task 1) exists | FOUND |
| Commit 0ad2ed7 (Task 2) exists | FOUND |
| Commit 82fb7b0 (Task 3) exists | FOUND |
| No unsafe-inline in dist/_headers | PASS |
| dist/_headers CSP == root _headers CSP | PASS |
| sync-static-to-public.mjs reads _headers.tmpl | PASS |
