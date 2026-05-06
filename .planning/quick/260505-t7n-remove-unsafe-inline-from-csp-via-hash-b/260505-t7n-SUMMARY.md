---
phase: quick-260505-t7n
plan: 01
subsystem: build-pipeline / astro-pages / css / js
tags: [csp, inline-extraction, css, js, astro, caching]
dependency_graph:
  requires: []
  provides:
    - css/page-*.css (14 files — page-specific CSS served as external stylesheets)
    - js/page-*-after.js (12 files — page-specific after-JS served as external scripts)
  affects:
    - src/pages/*.astro (19 root pages)
    - src/pages/groups/*.astro (6 group pages)
    - dist/ (all 26 built HTML pages)
tech_stack:
  added:
    - 14 new css/page-*.css files (root, source-of-truth)
    - 12 new js/page-*-after.js files (root, source-of-truth)
  patterns:
    - External stylesheet delivery via <link rel="stylesheet" href="/css/page-<slug>.css?v=1">
    - External deferred script delivery via <script defer src="/js/page-<slug>-after.js?v=1">
    - Python-based multi-block script-tag stripping for frag extraction
key_files:
  created:
    - css/page-index.css
    - css/page-about.css
    - css/page-contact.css
    - css/page-faq.css
    - css/page-locations.css
    - css/page-legal.css
    - css/page-group-event.css
    - css/page-antwerp.css
    - css/page-houston.css
    - css/page-philadelphia.css
    - css/page-lincoln.css
    - css/page-manassas.css
    - css/page-mount-prospect.css
    - css/page-west-nyack.css
    - js/page-index-after.js
    - js/page-about-after.js
    - js/page-contact-after.js
    - js/page-faq-after.js
    - js/page-group-event-after.js
    - js/page-antwerp-after.js
    - js/page-houston-after.js
    - js/page-philadelphia-after.js
    - js/page-lincoln-after.js
    - js/page-manassas-after.js
    - js/page-mount-prospect-after.js
    - js/page-west-nyack-after.js
  modified:
    - src/pages/index.astro
    - src/pages/about.astro
    - src/pages/contact.astro
    - src/pages/faq.astro
    - src/pages/locations.astro
    - src/pages/accessibility.astro
    - src/pages/code-of-conduct.astro
    - src/pages/cookies.astro
    - src/pages/licensing.astro
    - src/pages/privacy.astro
    - src/pages/terms.astro
    - src/pages/waiver.astro
    - src/pages/antwerp.astro
    - src/pages/houston.astro
    - src/pages/philadelphia.astro
    - src/pages/lincoln.astro
    - src/pages/manassas.astro
    - src/pages/mount-prospect.astro
    - src/pages/west-nyack.astro
    - src/pages/groups/birthdays.astro
    - src/pages/groups/bachelor-ette.astro
    - src/pages/groups/corporate.astro
    - src/pages/groups/field-trips.astro
    - src/pages/groups/holidays.astro
    - src/pages/groups/private-events.astro
decisions:
  - Extract page-CSS and page-after-JS to root css/ and js/ directories (not public/) so sync-static-to-public.mjs mandatoryDirs auto-mirrors on build
  - Strip ALL <script>/<\/script> lines from frag extraction (not just first/last) to handle multi-block frags
  - Drop legacy duplicate <script src="js/locations.js"> etc. from about-inline-scripts.frag.txt (already served by SiteScripts.astro)
  - Use <link> in head-extra slot as last entry to preserve cascade order (page CSS loads after shared chrome CSS)
  - Use <script defer src="..."> in after-site-scripts slot to preserve end-of-body deferred timing
  - css/page-legal.css shared across 7 legal pages; css/page-group-event.css + js/page-group-event-after.js shared across 6 group pages
metrics:
  duration: ~90 minutes
  completed: 2026-05-06
  tasks_completed: 4
  files_created: 26
  files_modified: 25
---

# Phase quick-260505-t7n Plan 01: Extract page-CSS and page-after-JS to external files

**One-liner:** Moved 757 KB of page-specific CSS and 184 KB of page-specific JS from inline `set:html` injections in 25 Astro page wrappers into 14 external `css/page-*.css` and 12 external `js/page-*-after.js` files served as cacheable static assets, reducing antwerp.html inline style from ~83 KB to 906 bytes and inline no-src script from ~21 KB to 5.6 KB.

## What Was Built

### Files Created

**14 CSS files** (`css/page-*.css`) — verbatim copies from `src/partials/*-inline.raw.css.txt`:

| File | Source partial | Pages using it | Size |
|------|---------------|----------------|------|
| css/page-index.css | index-inline.raw.css.txt | index | 84 KB |
| css/page-about.css | about-inline.raw.css.txt | about | 32 KB |
| css/page-contact.css | contact-inline.raw.css.txt | contact | 16 KB |
| css/page-faq.css | faq-inline.raw.css.txt | faq | 8 KB |
| css/page-locations.css | locations-inline.raw.css.txt | locations | 12 KB |
| css/page-legal.css | legal-inline.raw.css.txt | 7 legal pages | 4 KB |
| css/page-group-event.css | birthdays-inline.raw.css.txt | 6 group pages | 24 KB |
| css/page-antwerp.css | antwerp-inline.raw.css.txt | antwerp | 84 KB |
| css/page-houston.css | houston-inline.raw.css.txt | houston | 84 KB |
| css/page-philadelphia.css | philadelphia-inline.raw.css.txt | philadelphia | 84 KB |
| css/page-lincoln.css | lincoln-inline.raw.css.txt | lincoln | 84 KB |
| css/page-manassas.css | manassas-inline.raw.css.txt | manassas | 84 KB |
| css/page-mount-prospect.css | mount-prospect-inline.raw.css.txt | mount-prospect | 84 KB |
| css/page-west-nyack.css | west-nyack-inline.raw.css.txt | west-nyack | 84 KB |

**Total CSS moved out of HTML: 757,510 bytes (~740 KB)**

**12 JS files** (`js/page-*-after.js`) — stripped JS bodies from `src/partials/*-after.frag.txt`:

| File | Source partial | Pages using it | Size |
|------|---------------|----------------|------|
| js/page-index-after.js | index-after.frag.txt | index | 28 KB |
| js/page-about-after.js | about-inline-scripts.frag.txt | about | 1.9 KB |
| js/page-contact-after.js | contact-after.frag.txt | contact | 1.4 KB |
| js/page-faq-after.js | faq-after.frag.txt | faq | 975 B |
| js/page-group-event-after.js | birthdays-after.frag.txt | 6 group pages | 698 B |
| js/page-antwerp-after.js | antwerp-after.frag.txt | antwerp | 21 KB |
| js/page-houston-after.js | houston-after.frag.txt | houston | 21 KB |
| js/page-philadelphia-after.js | philadelphia-after.frag.txt | philadelphia | 21 KB |
| js/page-lincoln-after.js | lincoln-after.frag.txt | lincoln | 21 KB |
| js/page-manassas-after.js | manassas-after.frag.txt | manassas | 21 KB |
| js/page-mount-prospect-after.js | mount-prospect-after.frag.txt | mount-prospect | 21 KB |
| js/page-west-nyack-after.js | west-nyack-after.frag.txt | west-nyack | 21 KB |

**Total JS moved out of HTML: 183,697 bytes (~180 KB)**

### Wrappers Modified: 25

All 25 Astro page wrappers updated with the same pattern:
1. Removed `import *Css from '../partials/*-inline.raw.css.txt?raw'`
2. Removed `import *After from '../partials/*-after.frag.txt?raw'`
3. Removed `<Fragment slot="page-style"><style is:global set:html={...}></style></Fragment>`
4. Added `<link rel="stylesheet" href="/css/page-<slug>.css?v=1" />` as last entry in `head-extra` slot
5. Replaced `<Fragment slot="after-site-scripts" set:html={...} />` with `<Fragment slot="after-site-scripts"><script defer src="/js/page-<slug>-after.js?v=1"></script></Fragment>`

Pages without after-JS (CSS-only update): `locations`, `accessibility`, `code-of-conduct`, `cookies`, `licensing`, `privacy`, `terms`, `waiver` (8 pages).

## Cascade Preservation Decision

The new `<link rel="stylesheet">` was placed as the **last entry in the `head-extra` slot** (appended after footer.css, newsletter.css, ticket-panel.css). This preserves the original cascade: the inline `<style is:global>` previously rendered in `page-style` slot which follows `head-extra` in SiteLayout. Since `head-extra` CSS now loads first and the page-CSS `<link>` is last in that block, the relative order of shared → page-specific CSS is maintained.

The cascade-preservation fallback (moving `<link>` into `page-style` slot) was NOT needed — build and verify passed without it.

## Measured Inline Content Reduction

| Page | Before (inline style) | After (inline style) | Before (inline no-src script) | After (inline no-src script) |
|------|----------------------|---------------------|-------------------------------|------------------------------|
| antwerp.html | ~83 KB | 906 bytes | ~21 KB | 5,606 bytes |
| groups/birthdays.html | ~21 KB | 906 bytes | ~713 bytes | ~700 bytes |

The remaining inline style (906 bytes) is the `.page-last-updated` block from SiteLayout — intentionally left inline (out of scope for this plan). The remaining inline no-src script (5,606 bytes) is the SiteScripts.astro reveal-observer + footer-toggle blocks — also out of scope.

## Verification Results

- `npm run build:astro`: SUCCESS — 26 pages built, 0 minify errors, 46 files minified
- All 14 CSS files present in `dist/css/`
- All 12 JS files present in `dist/js/`
- All 25 affected page HTML files reference new CSS via `<link>`
- `npm run check`: EXIT 0 — all 17 contract checks passed
- `npm run verify:phase10`: EXIT 0 — cutover gate green
- `git diff _headers`: empty — `_headers` byte-identical to baseline

Note: `npm run verify` exits 1 due to `check-hreflang-cluster` failing on antwerp/index/locations pages. This is a **pre-existing failure** present at base commit `d78bfc85` — `SiteHead.astro` emits hreflang tags that conflict with locked decision D-02. The failure predates this plan and is unrelated to CSS/JS extraction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Multi-block after-frag extraction stripped only outer script tags**

- **Found during:** Task 4 (build revealed esbuild minify errors on 6 JS files)
- **Issue:** The awk-based extraction strategy stripped only the first and last lines of each frag file. Several frags (`about-inline-scripts.frag.txt`, `faq-after.frag.txt`, `index-after.frag.txt`, `houston-after.frag.txt`, `philadelphia-after.frag.txt`, `group-event-after.frag.txt`) contain multiple `<script>...</script>` blocks concatenated. Inner `</script>` and `<script>` boundary lines remained in the extracted JS body, causing esbuild to error with "JSX syntax extension not enabled" when it encountered `</`.
- **Fix:** Replaced awk with Python that strips **every line** containing `<script` or `</script>` (not just first/last). Also dropped legacy duplicate `<script src="js/locations.js?v=9">` etc. lines from `about-inline-scripts.frag.txt` — these are already served by `SiteScripts.astro` and would have double-loaded.
- **Files modified:** All 12 `js/page-*-after.js` files (re-extracted)
- **Commit:** d13791c

## Orphaned Partials (Intentional)

The following `src/partials/` files are no longer imported by any page wrapper but remain on disk. They will be deleted in a follow-up cleanup PR after t7n-2 lands:

**CSS partials (now orphaned):**
- `src/partials/index-inline.raw.css.txt`
- `src/partials/about-inline.raw.css.txt`
- `src/partials/contact-inline.raw.css.txt`
- `src/partials/faq-inline.raw.css.txt`
- `src/partials/locations-inline.raw.css.txt`
- `src/partials/legal-inline.raw.css.txt`
- `src/partials/birthdays-inline.raw.css.txt`
- `src/partials/antwerp-inline.raw.css.txt`
- `src/partials/houston-inline.raw.css.txt`
- `src/partials/philadelphia-inline.raw.css.txt`
- `src/partials/lincoln-inline.raw.css.txt`
- `src/partials/manassas-inline.raw.css.txt`
- `src/partials/mount-prospect-inline.raw.css.txt`
- `src/partials/west-nyack-inline.raw.css.txt`

**JS/frag partials (now orphaned):**
- `src/partials/index-after.frag.txt`
- `src/partials/about-inline-scripts.frag.txt`
- `src/partials/contact-after.frag.txt`
- `src/partials/faq-after.frag.txt`
- `src/partials/birthdays-after.frag.txt`
- `src/partials/antwerp-after.frag.txt`
- `src/partials/houston-after.frag.txt`
- `src/partials/philadelphia-after.frag.txt`
- `src/partials/lincoln-after.frag.txt`
- `src/partials/manassas-after.frag.txt`
- `src/partials/mount-prospect-after.frag.txt`
- `src/partials/west-nyack-after.frag.txt`

## Follow-up: t7n-2

The next plan in this CSP hardening series will:
1. Extract `SiteScripts.astro` reveal-observer + footer-toggle to `/js/site-progressive.js`
2. Compute SHA256 hashes for the remaining inline blocks (Consent Mode bootstrap, `__TM_SITE_CONTRACT__`, `__TM_ANALYTICS_LABELS__`, `.page-last-updated` style, JSON-LD per-page)
3. Inject hashes into a `_headers.tmpl`, render to `dist/_headers`
4. Drop `'unsafe-inline'` from `script-src` and `style-src` in the CSP
5. Add `scripts/check-csp-hashes.js` to `npm run check`

After this plan, the remaining inline content in `dist/<page>.html` is:
- `.page-last-updated` style block (1 sitewide, ~1.5 KB)
- SiteScripts reveal-observer (~0.5 KB per page) + footer-toggle (~0.3 KB per page)
- `__TM_ANALYTICS_LABELS__` + `__TM_TAGGING_CONFIG__` (3 consent-profile variants) + `__TM_SITE_CONTRACT__` (~4 KB total sitewide)
- GTM bootstrap loader (1 hash when env set)
- JSON-LD per page (25 unique hashes)

This is a manageable bounded set (~30 total hashes) suitable for the hash-injection approach.

## Known Stubs

None — all extracted CSS and JS are byte-faithful copies/strips of the source partials. No placeholder content introduced.

## Threat Flags

None — this plan only moves existing CSS/JS from inline delivery to external file delivery. No new network endpoints, auth paths, or trust boundaries introduced.

## Self-Check: PASSED

All created files verified:
- [x] `css/page-*.css` (14 files) — present and non-empty
- [x] `js/page-*-after.js` (12 files) — present, non-empty, no residual script tags
- [x] All 25 `src/pages/**/*.astro` modified — no residual `set:html={...Css}` or `set:html={...After}`
- [x] `dist/css/page-*.css` (14 files) — present after build
- [x] `dist/js/page-*-after.js` (12 files) — present after build
- [x] `npm run check` exits 0
- [x] `npm run verify:phase10` exits 0
- [x] `git diff _headers` is empty

Commits verified:
- [x] 0e81d31 — Task 1 CSS extraction
- [x] 7cbc40b — Task 2 JS extraction (initial)
- [x] 90f0f17 — Task 3 wrapper updates
- [x] d13791c — Task 2 fix (multi-block stripping)
