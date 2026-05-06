---
phase: quick-260506-bvu
verified: 2026-05-06T09:55:00Z
status: human_needed
score: 4/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Visit /, /antwerp, /faq in Chrome DevTools with Console open, filter for 'policy' or 'CSP'. Site must be served via Cloudflare Pages preview or `wrangler pages dev dist` (NOT astro preview — it ignores _headers)."
    expected: "Zero CSP console errors on any page. Reveal animations trigger on scroll. Footer location toggles open/close on click."
    why_human: "Playwright/astro-preview does not enforce HTTP _headers. CSP hash enforcement is only observable under Cloudflare Pages or wrangler pages dev."
---

# Quick Task 260506-bvu: CSP Hardening — Verification Report

**Task Goal:** Drop 'unsafe-inline' from CSP script-src and style-src in _headers via build-time SHA256 hash injection. Build pipeline coupling must be safe (single source of truth = _headers.tmpl). CI gate must catch hash drift.
**Verified:** 2026-05-06T09:55:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 'unsafe-inline' is absent from script-src in dist/_headers | VERIFIED | `python3` parse: `script-src: unsafe-inline=False, sha256_count=17` |
| 2 | 'unsafe-inline' is absent from style-src in dist/_headers | VERIFIED | `python3` parse: `style-src: unsafe-inline=False, sha256_count=8` |
| 3 | All pages load without CSP violations in browser (zero console CSP errors) | NEEDS HUMAN | Playwright runs against `astro preview` which does not enforce HTTP `_headers`. Verified via automated gate that hashes are correct; runtime CSP enforcement requires Cloudflare Pages or `wrangler pages dev`. |
| 4 | npm run build:astro produces dist/_headers with correct SHA256 hashes | VERIFIED | `dist/_headers` exists with 17 script hashes + 8 style hashes; no `unsafe-inline`; CSP line 2,110 bytes. Root `_headers` CSP line byte-identical to `dist/_headers`. |
| 5 | npm run check exits 0 (check:csp-hashes passes) | VERIFIED | `npm run check` exits 0. `node scripts/check-csp-hashes.js` exits 0: "CSP hash check passed: 17 script hash(es), 8 style hash(es) verified." Note: `check:csp-hashes` is wired into `verify-site-output.mjs` (not the `check` script chain) — intentional documented deviation because `check` is source-only and `check:csp-hashes` requires `dist/`. |

**Score:** 4/5 truths verified (1 needs human)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `js/site-progressive.js` | reveal observer + footer-location-toggle as external deferred script | VERIFIED | 27 lines, 4-space indent, JSDoc header, IIFE reveal + `.footer-location-toggle` handler. `dist/js/site-progressive.js` also present (523 bytes). |
| `_headers.tmpl` | CSP template with `{{SCRIPT_HASHES}}` and `{{STYLE_HASHES}}` placeholders | VERIFIED | Placeholders on line 11 inside `Content-Security-Policy:` directive. No `unsafe-inline` in template. Comment line 4 explains rendered output. |
| `scripts/inject-csp-hashes.mjs` | Build step: walks dist HTML, computes hashes, renders _headers from template | VERIFIED | 127 lines ESM. Walks `dist/**/*.html`, excludes Finder duplicates + `assets/extracted/`, extracts inline `<script>` (no src=, no JSON-LD) and `<style>` blocks, sorts hashes, substitutes placeholders, asserts no `unsafe-inline` in rendered output, writes both `_headers` and `dist/_headers`. Syntax valid. |
| `scripts/check-csp-hashes.js` | CI gate: recomputes hashes against dist, diffs against _headers | VERIFIED | 145 lines CommonJS. Walks `dist/**/*.html` with same exclusion logic, verifies each hash appears in corresponding CSP directive in `dist/_headers`, exits 0. Wired into `verify-site-output.mjs` step 3 (after `build:astro`). |
| `tests/smoke/csp.spec.js` | Playwright test catching CSP violations at runtime | VERIFIED | 47 lines. 2 tests: reveal `.visible` class via `scrollIntoViewIfNeeded` + `toHaveClass`, footer toggle `.open` class via `waitForLoadState('load')` + click. Uses correct patterns (no `waitForTimeout`, no raw `scrollTo`). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `package.json build:astro` | `scripts/inject-csp-hashes.mjs` | sequential `&&` chain after `minify-dist-assets.mjs` | WIRED | `"build:astro": "... && node scripts/minify-dist-assets.mjs && node scripts/inject-csp-hashes.mjs"` |
| `scripts/inject-csp-hashes.mjs` | `_headers.tmpl` | `readFileSync` + string replace of `SCRIPT_HASHES` / `STYLE_HASHES` | WIRED | `tmplPath = path.join(root, '_headers.tmpl')`, `tmpl.replace(/\{\{SCRIPT_HASHES\}\}/g, ...)`, `tmpl.replace(/\{\{STYLE_HASHES\}\}/g, ...)` |
| `scripts/sync-static-to-public.mjs` | `_headers.tmpl` | reads tmpl, writes pre-build `public/_headers` with `unsafe-inline` stand-ins | WIRED | Lines 86-96: `fs.readFileSync(_headers.tmpl)`, replaces placeholders with `'unsafe-inline'`, writes `public/_headers`. `mandatoryFiles` includes `_headers.tmpl` (not `_headers`). |
| `scripts/verify-site-output.mjs` | `check:csp-hashes` | step 3 in verify pipeline | WIRED | Line 40: `['check:csp-hashes', []]` — runs after `build:astro`, before `check:routes`. |
| `dist/_headers` | Cloudflare Pages deploy | included in `dist/` output | VERIFIED | `dist/_headers` exists, 2,110-byte CSP line with 25 SHA256 hashes. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `inject-csp-hashes.mjs` | `scriptHashes`, `styleHashes` | `dist/**/*.html` inline blocks → SHA256 | Yes — scans actual built HTML | FLOWING |
| `_headers` (root) | CSP line | template substitution from `_headers.tmpl` + computed hashes | Yes — byte-identical to `dist/_headers` verified by `diff` | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `check-csp-hashes.js` exits 0 against existing dist/ | `node scripts/check-csp-hashes.js` | "CSP hash check passed: 17 script hash(es), 8 style hash(es) verified." | PASS |
| `npm run check` exits 0 | `npm run check; echo "EXIT: $?"` | EXIT CODE: 0 | PASS |
| `dist/_headers` has no `unsafe-inline` in script-src | python3 parse | `unsafe-inline=False` | PASS |
| `dist/_headers` has no `unsafe-inline` in style-src | python3 parse | `unsafe-inline=False` | PASS |
| `dist/_headers` has 17 script hashes | python3 parse | `sha256_count=17` | PASS |
| `dist/_headers` has 8 style hashes | python3 parse | `sha256_count=8` | PASS |
| Root `_headers` CSP line byte-identical to `dist/_headers` | `diff <(grep CSP dist/_headers) <(grep CSP _headers)` | IDENTICAL | PASS |
| `IntersectionObserver` not inline in `dist/index.html` | `grep -c "IntersectionObserver" dist/index.html` | 0 | PASS |
| `dist/js/site-progressive.js` exists | `ls dist/js/site-progressive.js` | 523 bytes | PASS |
| `SiteScripts.astro` has no inline reveal or footer-toggle blocks | `grep -c "IntersectionObserver\|footer-location-toggle" SiteScripts.astro` | 0 | PASS |
| `inject-csp-hashes.mjs` syntax valid | `node --check scripts/inject-csp-hashes.mjs` | OK | PASS |
| `check-csp-hashes.js` syntax valid | `node --check scripts/check-csp-hashes.js` | OK | PASS |

### Requirements Coverage

No requirement IDs declared in PLAN frontmatter (`requirements: []`). Task is standalone quick task — not mapped to REQUIREMENTS.md phase IDs.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No stubs, placeholders, TODO/FIXME comments, hardcoded empty returns, or incomplete handlers found in any of the 5 created files.

### Wiring Deviation: check:csp-hashes in verify, not check

The PLAN's Task 3 docstring (`Wire into: npm run check via check:csp-hashes`) and task instructions (`Add && npm run check:csp-hashes to the end of the check script`) specified wiring into the `npm run check` chain. The executor deliberately deviated: `check:csp-hashes` is wired into `verify-site-output.mjs` instead.

**Reason (documented in SUMMARY decisions):** `npm run check` is source-only and runs without a built `dist/`. `check:csp-hashes` requires `dist/` to exist. Placing it in `check` would cause `check` to fail in clean-install or CI contexts before a build runs.

**Assessment:** The deviation is justified. The CI gate still runs on every `npm run verify` call (which includes `build:astro` as a prior step). The must_have truth "npm run check exits 0 (check:csp-hashes passes)" is met: `npm run check` exits 0, and `check:csp-hashes` passes when invoked directly or via `verify`. The security goal — catching hash drift before deploy — is achieved.

### Human Verification Required

#### 1. Browser CSP enforcement under real HTTP headers

**Test:** Run `wrangler pages dev dist` (or deploy to Cloudflare Pages staging). Open Chrome DevTools, Console tab filtered for "policy" or "CSP". Visit `/`, `/antwerp`, `/faq`. Also visit a group page (`/groups/birthdays`) and a location page with legacy static HTML (e.g. `/missions` or `/groups`).

**Expected:** Zero CSP console errors on all pages. `.reveal` elements animate in on scroll. Footer location toggle buttons open/close their parent `div.open`.

**Why human:** `astro preview` serves pages via a plain HTTP dev server that does not read or enforce the Cloudflare-style `_headers` file. All automated hash checks confirm the hashes are correct at the content level, but actual HTTP header delivery and browser enforcement can only be verified under Cloudflare Pages or `wrangler pages dev dist`.

### Gaps Summary

No blocking gaps. All artifacts exist, are substantive, and are wired correctly. The single human verification item is a deployment-surface test that cannot be automated without a Cloudflare Pages environment.

---

_Verified: 2026-05-06T09:55:00Z_
_Verifier: Claude (gsd-verifier)_
