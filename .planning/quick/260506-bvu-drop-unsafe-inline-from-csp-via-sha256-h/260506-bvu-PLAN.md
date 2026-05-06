---
phase: quick-260506-bvu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/SiteScripts.astro
  - js/site-progressive.js
  - scripts/inject-csp-hashes.mjs
  - _headers.tmpl
  - _headers
  - scripts/check-csp-hashes.js
  - tests/smoke/csp.spec.js
  - package.json
autonomous: false
requirements: []
must_haves:
  truths:
    - "'unsafe-inline' is absent from script-src in dist/_headers"
    - "'unsafe-inline' is absent from style-src in dist/_headers"
    - "All pages load without CSP violations in browser (zero console CSP errors)"
    - "npm run build:astro produces dist/_headers with correct SHA256 hashes"
    - "npm run check exits 0 (check:csp-hashes passes)"
  artifacts:
    - path: "js/site-progressive.js"
      provides: "reveal observer + footer-location-toggle logic as external deferred script"
    - path: "_headers.tmpl"
      provides: "CSP template with SCRIPT_HASHES and STYLE_HASHES placeholders"
    - path: "scripts/inject-csp-hashes.mjs"
      provides: "Build step that walks dist HTML, computes hashes, renders _headers from template"
    - path: "scripts/check-csp-hashes.js"
      provides: "CI gate: recomputes hashes against dist and diffs against _headers"
    - path: "tests/smoke/csp.spec.js"
      provides: "Playwright test that catches CSP violations at runtime"
  key_links:
    - from: "package.json build:astro"
      to: "scripts/inject-csp-hashes.mjs"
      via: "sequential && chain after minify-dist-assets.mjs"
      pattern: "inject-csp-hashes"
    - from: "scripts/inject-csp-hashes.mjs"
      to: "_headers.tmpl"
      via: "readFileSync + string replace of SCRIPT_HASHES / STYLE_HASHES"
      pattern: "SCRIPT_HASHES|STYLE_HASHES"
    - from: "dist/_headers"
      to: "Cloudflare Pages deploy"
      via: "included in dist/ output copied by wrangler pages deploy"
      pattern: "Content-Security-Policy.*sha256-"
---

<objective>
Drop 'unsafe-inline' from CSP script-src and style-src in _headers by:
1. Extracting the two remaining inline scripts in SiteScripts.astro (reveal observer + footer toggle) to /js/site-progressive.js, reducing sitewide inline scripts from 5 to 3 hashes.
2. Building a post-build hash injector (scripts/inject-csp-hashes.mjs) that walks dist HTML, SHA256-hashes every remaining inline block, and renders dist/_headers from a _headers.tmpl template.
3. Adding a CI gate (check:csp-hashes) and a Playwright CSP smoke test.

Purpose: Remove the last unsafe-inline grants from the production CSP, completing the CSP hardening work started by t7n-1.

Output:
- js/site-progressive.js (new — reveal + footer toggle as external deferred script)
- _headers.tmpl (new — template with placeholders for injected hashes)
- scripts/inject-csp-hashes.mjs (new — hash injector)
- scripts/check-csp-hashes.js (new — CI drift detector)
- tests/smoke/csp.spec.js (new — CSP violation detector)
- _headers updated (drops unsafe-inline, gains sha256-... entries)
- package.json updated (inject-csp-hashes wired into build:astro, check:csp-hashes wired into check)

Background: t7n-1 (commit e71440f) already extracted 14 CSS and 12 JS page-specific files from
inline set:html injections. After a fresh build the remaining inline inventory is:
- Sitewide script hashes (5): __TM_ANALYTICS_LABELS__ (1), consent-profile (3 variants: eu/us/global), __TM_SITE_CONTRACT__ (1), reveal-observer (1, extracted here), footer-toggle (1, extracted here)
- After Task 1 extraction: 3 sitewide script hashes remain (analytics-labels, consent x3, site-contract — count 5 distinct but sitewide)
- Sitewide style hash (1): merged SiteLayout+SiteFooter is:global block (confirmed single hash)
- Per-page JSON-LD: 26 unique hashes (one per Astro-rendered page) — kept inline per SEO convention
- Legacy static pages (missions, groups, gift-cards, brussels, dallas, orland-park): own inline hashes
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260505-t7n-remove-unsafe-inline-from-csp-via-hash-b/260505-t7n-SUMMARY.md

<!-- Key interfaces the executor needs -->
<interfaces>
<!-- Current SiteScripts.astro — blocks to extract (lines 10-32): -->
```
<!-- Block A: reveal observer (lines 10-24) -->
<script is:inline>
    (function () {
        var revealEls = document.querySelectorAll('.reveal');
        if (!revealEls.length) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            revealEls.forEach(function (el) { el.classList.add('visible'); });
        } else {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) entry.target.classList.add('visible');
                });
            }, { threshold: 0.1 });
            revealEls.forEach(function (el) { observer.observe(el); });
        }
    })();
</script>

<!-- Block B: footer-location-toggle (lines 26-32) -->
<script is:inline>
    document.querySelectorAll('.footer-location-toggle').forEach(function (btn) {
        btn.addEventListener('click', function () {
            btn.parentElement.classList.toggle('open');
        });
    });
</script>
```

<!-- Current _headers CSP line (line 7) — full current CSP: -->
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.rollerdigital.com https://www.googletagmanager.com; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; media-src 'self' https:; frame-src https://www.google.com https://maps.google.com https://cdn.rollerdigital.com https://tickets.timemission.com https://ecom.roller.app https://www.googletagmanager.com; connect-src 'self' https://tickets.timemission.com https://ecom.roller.app https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://sgtm.timemission.com; object-src 'none'; form-action 'self'; base-uri 'self'; frame-ancestors 'self'
```

<!-- scripts/sync-static-to-public.mjs pattern — copy mandatory files to public/ before astro build: -->
```javascript
// mandatoryFiles includes '_headers' — sync-static-to-public.mjs copies root _headers to public/_headers
// inject-csp-hashes.mjs must ALSO write root _headers (source of truth) in addition to dist/_headers
// so that the next run of sync-static-to-public picks up the updated version
```

<!-- scripts/check-astro-dist-manifest.js pattern for new check script: -->
```javascript
// CommonJS, require() only, read from dist/, collect errors[], print with console.error(), exit(1)
// Add: mustFile('_headers') already exists in manifest — new check reads _headers and recomputes hashes
```

<!-- package.json build:astro current command: -->
```
"build:astro": "node scripts/sync-static-to-public.mjs && astro build && node scripts/minify-dist-assets.mjs"
```
</interfaces>

<!-- Post-t7n-1 inline inventory (confirmed by hash measurement against current dist): -->
<!-- STALE dist has 35 script hashes + 21 style hashes — these are pre-t7n-1 build artifacts -->
<!-- AFTER FRESH BUILD post-t7n-1, the set reduces to: -->
<!-- Script: analytics-labels(1) + consent-profile(3) + site-contract(1) + reveal(1) + footer-toggle(1) = 7 sitewide -->
<!-- After Task 1 extracts reveal + footer-toggle: 5 sitewide script hashes remain -->
<!-- Style: 1 sitewide (SiteLayout+SiteFooter merged is:global block) -->
<!-- JSON-LD: 26 per-page hashes (one per Astro page) -->
<!-- Legacy static pages: missions, groups, gift-cards, brussels, dallas, orland-park have own inline blocks -->
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extract SiteScripts.astro inline blocks to /js/site-progressive.js</name>
  <files>js/site-progressive.js, src/components/SiteScripts.astro</files>
  <action>
**Pre-task check:** Run `node scripts/sync-static-to-public.mjs && astro build && node scripts/minify-dist-assets.mjs` (npm run build:astro) to get a fresh post-t7n-1 dist. Then verify inline script count is reduced vs current stale dist.

**Step 1: Create js/site-progressive.js**

Create new file `js/site-progressive.js` containing the two IIFE bodies extracted verbatim from SiteScripts.astro lines 10-31. Use 4-space indentation per CLAUDE.md browser-script convention. File-level comment explaining what it does:

```javascript
/**
 * site-progressive.js — progressive enhancement loaded deferred on every page.
 * Handles:
 *   - Reveal-on-scroll: IntersectionObserver for .reveal elements with prefers-reduced-motion guard.
 *   - Footer location toggles: .footer-location-toggle expand/collapse.
 */
(function () {
    var revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        revealEls.forEach(function (el) { el.classList.add('visible'); });
    } else {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, { threshold: 0.1 });
        revealEls.forEach(function (el) { observer.observe(el); });
    }
})();

document.querySelectorAll('.footer-location-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
        btn.parentElement.classList.toggle('open');
    });
});
```

**Step 2: Update SiteScripts.astro**

Replace the two `<script is:inline>` blocks (lines 10-32 — reveal observer + footer toggle) with a single external reference:

```astro
<script defer is:inline src="/js/site-progressive.js?v=1"></script>
```

Leave all other lines in SiteScripts.astro untouched — especially:
- Line 7: `<script is:inline define:vars={{ siteContract }}>` (must stay inline for Consent Mode contract)
- Lines 33+: the existing external `<script defer is:inline src="...">` references

**Step 3: Verify extraction**

Run `npm run build:astro`. After build, grep dist/index.html and dist/antwerp.html:
- Count `<script` with no `src=`: should be 5 or fewer (analytics-labels, consent, site-contract, and GTM loader if env set)
- Confirm `site-progressive.js` present in `dist/js/`
- Confirm no `IntersectionObserver` literal appears inline in dist HTML

Also run `npm run check` — must exit 0. This confirms the extraction didn't break any contract check.
  </action>
  <verify>
    <automated>npm run build:astro && npm run check</automated>
  </verify>
  <done>
  - js/site-progressive.js exists and contains both reveal-observer and footer-toggle logic
  - SiteScripts.astro no longer has `<script is:inline>` reveal or footer-toggle blocks
  - dist/js/site-progressive.js exists after build
  - `npm run build:astro` exits 0
  - `npm run check` exits 0
  - Inline non-src scripts in dist/index.html reduced to 5 or fewer
  </done>
</task>

<task type="auto">
  <name>Task 2: Build hash injector (inject-csp-hashes.mjs) and _headers.tmpl</name>
  <files>scripts/inject-csp-hashes.mjs, _headers.tmpl</files>
  <action>
**Step 1: Create _headers.tmpl**

Copy the current `_headers` content to `_headers.tmpl`. In the CSP line, make these changes:
- Replace `'unsafe-inline'` in `script-src` with `{{SCRIPT_HASHES}}`
- Replace `'unsafe-inline'` in `style-src` with `{{STYLE_HASHES}}`
- Add a comment line above `/*` explaining this is a template rendered by inject-csp-hashes.mjs

Result (the modified CSP directives only, everything else identical):
```
# This file is a template — rendered to _headers and dist/_headers by scripts/inject-csp-hashes.mjs
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' {{SCRIPT_HASHES}} https://cdn.rollerdigital.com https://www.googletagmanager.com; script-src-attr 'none'; style-src 'self' {{STYLE_HASHES}} https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; media-src 'self' https:; connect-src ...; object-src 'none'; form-action 'self'; base-uri 'self'; frame-ancestors 'self'
```

**Step 2: Create scripts/inject-csp-hashes.mjs**

ESM module (uses import, not require). Modeled after scripts/sync-static-to-public.mjs in style.

```javascript
/**
 * inject-csp-hashes.mjs — runs after astro build + minify-dist-assets.mjs.
 *
 * Walks dist/**\/*.html, extracts every inline <script> (no src=) and <style> block,
 * computes SHA256-base64 hashes, substitutes them into _headers.tmpl placeholders,
 * writes both _headers (repo root, source of truth) and dist/_headers (Cloudflare deploy target).
 *
 * Placeholders in _headers.tmpl:
 *   {{SCRIPT_HASHES}} — space-separated 'sha256-...' tokens for all inline <script> bodies
 *   {{STYLE_HASHES}}  — space-separated 'sha256-...' tokens for all inline <style> bodies
 *
 * IMPORTANT: 'unsafe-inline' must NOT appear in _headers.tmpl — this script enforces its absence.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { glob } from 'node:fs/promises'; // Node 22+; fallback: use fs.readdirSync recursive

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const tmplPath = path.join(root, '_headers.tmpl');
const rootHeadersPath = path.join(root, '_headers');
const distHeadersPath = path.join(distDir, '_headers');
```

Algorithm:

```
1. Read _headers.tmpl. If it contains 'unsafe-inline', exit(1) with error "Template contains unsafe-inline — remove before proceeding".

2. Collect HTML files: use fs.readdirSync(distDir, { recursive: true }) to walk dist/, filter *.html files. EXCLUDE files whose basename contains a space (Finder duplicates) and exclude 'assets/extracted/'.

3. For each HTML file, extract inline blocks using regex:
   - Inline scripts: /<script([^>]*)>([\s\S]*?)<\/script>/g — skip if attrs contains src= or is:inline src
   - Inline styles:  /<style[^>]*>([\s\S]*?)<\/style>/g

4. Compute hash: crypto.createHash('sha256').update(body, 'utf8').digest('base64')
   → format: 'sha256-<base64>'

5. Deduplicate: collect into Set<string> for scriptHashes and styleHashes separately.

6. Sort both sets (Array.from(set).sort()) for stable diff output.

7. Build substitution strings:
   SCRIPT_HASHES = sorted hashes joined by ' '
   STYLE_HASHES  = sorted hashes joined by ' '

8. Read _headers.tmpl, replace {{SCRIPT_HASHES}} and {{STYLE_HASHES}}.
   Verify after replace that 'unsafe-inline' is NOT in the result — if so, exit(1).

9. Write result to _headers (root) and dist/_headers.

10. Print summary: "CSP hashes injected: N script hash(es), M style hash(es)" with list of hashes at debug verbosity.
```

**Implementation note on glob:** Node 22's `fs.glob` is experimental. Use this reliable alternative:

```javascript
function walkHtml(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
        if (entry.isFile() && entry.name.endsWith('.html')) {
            results.push(path.join(entry.parentPath || entry.path, entry.name));
        }
    }
    return results;
}
```

Filter exclusions before processing:
```javascript
const htmlFiles = walkHtml(distDir).filter(f => {
    const rel = path.relative(distDir, f);
    // Exclude Finder duplicate files (space before .html)
    if (/ \d*\.html$/.test(path.basename(f))) return false;
    // Exclude development/preview pages
    if (rel.startsWith('assets/extracted/')) return false;
    return true;
});
```

**Step 3: Wire into build:astro in package.json**

Update `build:astro` script to append `&& node scripts/inject-csp-hashes.mjs` after minify:

```json
"build:astro": "node scripts/sync-static-to-public.mjs && astro build && node scripts/minify-dist-assets.mjs && node scripts/inject-csp-hashes.mjs"
```

**Step 4: Run full build and verify**

Run `npm run build:astro`. Check:
- `_headers` (root) no longer contains `unsafe-inline` in script-src or style-src
- `dist/_headers` likewise
- Both files contain `'sha256-...'` tokens in the CSP line
- `npm run check` still exits 0
  </action>
  <verify>
    <automated>npm run build:astro && grep -v "unsafe-inline" dist/_headers | grep -c "sha256-"</automated>
  </verify>
  <done>
  - _headers.tmpl exists with {{SCRIPT_HASHES}} and {{STYLE_HASHES}} placeholders (no unsafe-inline)
  - scripts/inject-csp-hashes.mjs exists and runs without error
  - npm run build:astro exits 0
  - dist/_headers contains sha256-... hashes in script-src and style-src
  - dist/_headers does NOT contain unsafe-inline in script-src or style-src
  - _headers (root) matches dist/_headers CSP line (same hashes)
  </done>
</task>

<task type="auto">
  <name>Task 3: CI hash drift gate (check-csp-hashes.js) and Playwright CSP smoke test</name>
  <files>scripts/check-csp-hashes.js, tests/smoke/csp.spec.js, package.json</files>
  <action>
**Step 1: Create scripts/check-csp-hashes.js**

CommonJS (require), modeled after scripts/check-astro-dist-manifest.js:

```javascript
/**
 * check-csp-hashes.js — CI gate that recomputes SHA256 hashes from dist HTML and
 * verifies every inline block's hash appears in dist/_headers CSP.
 *
 * Fails if:
 *   - dist/_headers contains 'unsafe-inline' in script-src or style-src
 *   - Any inline block hash is absent from the matching CSP directive
 *   - dist/ is missing (run npm run build:astro first)
 *
 * Wire into: npm run check via check:csp-hashes
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const distHeaders = path.join(distDir, '_headers');
```

Algorithm:

```
1. Verify distDir and distHeaders exist, else exit(1).

2. Read dist/_headers. Check:
   - script-src line must NOT contain 'unsafe-inline' → push error if found
   - style-src line must NOT contain 'unsafe-inline' → push error if found

3. Extract hashes from dist/_headers:
   - scriptHashesInHeader = Set of 'sha256-...' tokens appearing after 'script-src' in CSP line
   - styleHashesInHeader  = Set of 'sha256-...' tokens appearing after 'style-src' in CSP line
   (Parse: split CSP header value on ';', find script-src and style-src tokens, collect sha256- prefixed values)

4. Walk dist HTML (same walkHtml() + same exclusion filter as injector):
   - For each inline <script> (no src=): compute sha256-base64, verify in scriptHashesInHeader
   - For each inline <style>: compute sha256-base64, verify in styleHashesInHeader
   - On missing: push error "Hash not in CSP: sha256-{hash} (from {relPath})"

5. Collect errors[], print, exit(1) if any. Print success count on exit(0).
```

Note: The check reads from dist/ (requires a prior build). It does NOT rebuild. This is correct for CI: the build step writes _headers, the check step verifies them. Both are sequential.

**Step 2: Create tests/smoke/csp.spec.js**

New file. CommonJS, modeled after tests/smoke/site.spec.js:

```javascript
/**
 * csp.spec.js — Playwright smoke test for Content Security Policy violations.
 *
 * Navigates representative pages and fails on any CSP console error.
 * Requires the site to be built and served (webServer in playwright.config.js handles this).
 *
 * Run: npx playwright test csp.spec.js
 */
const { test, expect } = require('@playwright/test');

const PAGES_TO_CHECK = ['/', '/antwerp', '/faq', '/groups/birthdays', '/locations'];

for (const url of PAGES_TO_CHECK) {
    test(`no CSP violations on ${url}`, async ({ page }) => {
        const violations = [];

        page.on('console', (msg) => {
            if (
                msg.type() === 'error' &&
                /Content.Security.Policy|CSP|refused to (load|execute)/i.test(msg.text())
            ) {
                violations.push(msg.text());
            }
        });

        // Capture page errors too (for blocked script events)
        page.on('pageerror', (err) => {
            if (/Content.Security.Policy|CSP/i.test(err.message)) {
                violations.push(err.message);
            }
        });

        await page.goto(url, { waitUntil: 'networkidle' });

        expect(violations, `CSP violations on ${url}:\n${violations.join('\n')}`).toHaveLength(0);
    });
}
```

**Step 3: Wire check:csp-hashes into package.json**

Add the new check script:
```json
"check:csp-hashes": "node scripts/check-csp-hashes.js"
```

Add `&& npm run check:csp-hashes` to the end of the `check` script (the long chain ending in `npm run check:seo-robots`).

**Note on Playwright test:** The CSP smoke test runs against `astro preview` which does NOT enforce HTTP `_headers` — Astro preview is a plain HTTP server that ignores Cloudflare-style header files. CSP violations in this test come from the inline content NOT matching the hashes in the **meta-delivered** CSP, which Astro does not emit. The meaningful CSP violation test only works against Cloudflare Pages or `wrangler pages dev`. Document this in the test file with a comment.

Revise the approach: the Playwright CSP smoke test should instead verify:
1. No script-execution errors (catches broken scripts that unsafe-inline would have hidden)
2. Key interactive behaviors still function: reveal animations trigger, footer toggles work

```javascript
// Revised csp.spec.js approach: Verify no page runtime errors AND key behaviors post-CSP-hardening
test('site-progressive.js reveal and footer-toggle still function after CSP hardening', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    // Scroll to a .reveal element and verify it gets .visible class
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    const visibleCount = await page.evaluate(() =>
        document.querySelectorAll('.reveal.visible').length
    );
    expect(errors).toHaveLength(0);
    expect(visibleCount).toBeGreaterThan(0);
});

test('footer location toggle opens on click', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('.footer-location-toggle').first();
    await toggle.scrollIntoViewIfNeeded();
    await toggle.click();
    const parent = toggle.locator('..');
    await expect(parent).toHaveClass(/open/);
});
```

This is more robust than CSP console listening (which would be silent in preview mode).

**Step 4: Full verification**

Run `npm run build:astro && npm run check` — both must exit 0. Manually inspect `dist/_headers` to confirm CSP line has sha256 hashes and no unsafe-inline.

Then run `npm run test:smoke` — all existing tests + new csp.spec.js tests must pass.
  </action>
  <verify>
    <automated>npm run build:astro && npm run check && npm run test:smoke</automated>
  </verify>
  <done>
  - scripts/check-csp-hashes.js exists and exits 0 against current dist
  - tests/smoke/csp.spec.js exists with reveal + footer-toggle functional checks
  - npm run check includes check:csp-hashes and exits 0
  - npm run test:smoke passes all tests (including new csp.spec.js)
  - dist/_headers has no unsafe-inline in script-src or style-src
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
  Full CSP hardening pipeline:
  - Task 1: reveal + footer-toggle extracted to /js/site-progressive.js
  - Task 2: inject-csp-hashes.mjs writes sha256 hashes to _headers and dist/_headers
  - Task 3: check-csp-hashes CI gate + Playwright functional smoke tests
  </what-built>
  <how-to-verify>
  1. Run: npm run build:astro
     Expected: exits 0, prints "CSP hashes injected: N script hash(es), M style hash(es)"

  2. Inspect dist/_headers CSP line:
     - script-src must contain sha256-... tokens and NO 'unsafe-inline'
     - style-src must contain sha256-... tokens and NO 'unsafe-inline'
     Command: grep "Content-Security-Policy" dist/_headers

  3. Run: npm run check
     Expected: exits 0, check:csp-hashes passes

  4. Run: npm run test:smoke
     Expected: all tests pass including new csp.spec.js reveal and footer-toggle tests

  5. Manual browser check (optional but recommended):
     - Run: npm run preview:test
     - Open http://127.0.0.1:4173 in Chrome DevTools
     - Open Console tab — filter for "policy" or "CSP" errors
     - Visit /, /antwerp, /faq — zero CSP console errors expected
     - Scroll the page — .reveal elements should animate in
     - Click a footer location toggle button — parent div should get .open class

  6. Rollback smoke (optional): If any CSP error appears:
     - Edit _headers.tmpl: temporarily add 'unsafe-inline' back to script-src line only
     - Run: node scripts/inject-csp-hashes.mjs
     - Redeploy — violations stop? Confirms hash mismatch root cause
  </how-to-verify>
  <resume-signal>Type "approved" if verification passed, or describe any failures/violations found</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| dist HTML → browser | Inline script/style bodies are the hash-coverage boundary. Any mutation between inject step and deploy breaks coverage. |
| _headers.tmpl → _headers | Template substitution — SCRIPT_HASHES/STYLE_HASHES tokens must be replaced fully; partial replacement leaves placeholder text in CSP which browsers will ignore. |
| Cloudflare Pages → browser | HTTP header delivery. If _headers is missing or truncated, CSP falls back to none. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-bvu-01 | Tampering | inject-csp-hashes.mjs template substitution | mitigate | Post-substitution assertion: verify 'unsafe-inline' absent from rendered output before writing files; exit(1) if found |
| T-bvu-02 | Tampering | Stale dist/_headers after content change | mitigate | check:csp-hashes CI gate recomputes hashes on every `npm run check` run; hash drift caught before deploy |
| T-bvu-03 | Elevation of Privilege | unsafe-inline inadvertently reintroduced | mitigate | check-csp-hashes.js fails on any unsafe-inline in dist/_headers; wired into npm run check |
| T-bvu-04 | Denial of Service | CSP blocks legitimate scripts (hash mismatch post-deploy) | accept | Rollback: add unsafe-inline back to _headers.tmpl and re-run injector. Risk is low given injector auto-computes from built output. |
| T-bvu-05 | Information Disclosure | __TM_TAGGING_CONFIG__ or __TM_SITE_CONTRACT__ content in inline script | accept | These are already public-facing (in browser source); hashing only pins the exact bytes, does not hide them. No PII per CLAUDE.md constraint. |
| T-bvu-06 | Tampering | Finder duplicate HTML files (.html with spaces) included in hash scan | mitigate | Explicit exclusion filter in both injector and check script (filename contains space) |
</threat_model>

<verification>
Full pipeline verification:

1. `npm run build:astro` exits 0 and prints hash injection summary
2. `grep "Content-Security-Policy" dist/_headers` shows sha256 hashes, no unsafe-inline
3. `grep "Content-Security-Policy" _headers` matches dist/_headers CSP line (same hashes)
4. `npm run check` exits 0 (all 17+ checks including check:csp-hashes)
5. `npm run test:smoke` exits 0 (including new reveal + footer-toggle functional tests)
6. `diff <(grep CSP dist/_headers) <(grep CSP _headers)` exits 0 (files match)
</verification>

<success_criteria>
- 'unsafe-inline' is absent from both script-src and style-src in dist/_headers and _headers
- SHA256 hashes cover: 3 sitewide script hashes (analytics-labels, consent x3 variants, site-contract), 1 sitewide style hash (merged SiteLayout+SiteFooter global CSS), and all per-page + legacy page inline content
- npm run build:astro exits 0 and produces correct dist/_headers automatically
- npm run check exits 0 with check:csp-hashes included
- npm run test:smoke passes including reveal animation and footer toggle functional checks
- Rollback path documented: re-add 'unsafe-inline' to _headers.tmpl + re-run injector
</success_criteria>

<risk_acknowledgments>
1. **consent-profile produces 3 distinct hashes.** SiteHead.astro emits 3 different bodies for eu_strict / us_open / global_strict. The injector captures all three automatically from the built dist. All three must be in the global script-src. Confirmed: this adds 3 sha256 tokens (not 1), all covered by the global CSP.

2. **__TM_SITE_CONTRACT__ content stability.** The siteContract object is produced by getPublicSiteContract(). If this output varies between builds (timestamp, key order), the hash changes every build and _headers is regenerated correctly — the injector handles this. The CI gate (check:csp-hashes) catches drift if someone edits dist without rebuilding. No code change needed; just ensure build:astro runs before any deploy.

3. **One global CSP rule on /* with union of all hashes.** Per the constraint, this plan uses a single /* CSP rule with the union of all hashes from all pages. The tradeoff: a hash that's only needed on /antwerp (e.g., a location-specific JSON-LD variant) is also permitted on /, /faq, etc. This is slightly weaker isolation than per-route rules but substantially simpler maintenance. For this static-marketing site with no authenticated routes or sensitive content, the tradeoff is acceptable. Per-route rules would require ~30 separate _headers blocks and would interact unpredictably with Cloudflare's CSP merging (comma-join + browser intersection).

4. **JSON-LD hashes vary per page.** 26 unique JSON-LD hashes in one global CSP line. At ~52 chars per hash, 26 hashes ≈ 1.35 KB for the JSON-LD portion. Combined with sitewide hashes, total CSP hash payload ≈ 1.5-2 KB. Within Cloudflare Pages limits (no hard truncation documented; research confirmed no issues for under 4 KB lines).

5. **Legacy pages (missions, groups, gift-cards, brussels, dallas, orland-park) have their own inline blocks.** The injector scans ALL dist HTML, not just Astro pages. These pages' inline hashes are automatically included in the global CSP. No special handling required.

6. **Playwright CSP test runs against astro preview which does NOT enforce HTTP _headers.** The functional tests (reveal animation, footer toggle) verify behavior still works, which is the meaningful post-hardening gate. The definitive CSP violation test must be done manually in a browser against the full Cloudflare preview or by running `wrangler pages dev dist` locally.

7. **Report-Only rehearsal strategy.** If there is any concern before going live, add `Content-Security-Policy-Report-Only: ...` as an additional header in _headers.tmpl alongside the enforcing CSP. Deploy to Cloudflare preview, observe violations via browser DevTools Network tab for 10-15 minutes of manual testing, then remove Report-Only. This is a manual step, not automated — add to docs/cloudflare-preview-validation.md checklist if desired.
</risk_acknowledgments>

<output>
After completion, create `.planning/quick/260506-bvu-drop-unsafe-inline-from-csp-via-sha256-h/260506-bvu-SUMMARY.md` using the summary template.

Key metrics to capture:
- Script hashes in final CSP (count)
- Style hashes in final CSP (count)
- Total CSP line length in dist/_headers (bytes)
- Commits created (one per task or one combined)
</output>
