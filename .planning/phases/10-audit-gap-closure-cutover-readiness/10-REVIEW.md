---
phase: 10-audit-gap-closure-cutover-readiness
reviewed: 2026-05-04T00:00:00Z
depth: standard
files_reviewed: 43
files_reviewed_list:
  - css/cookie-consent.css
  - css/nav.css
  - data/locations.json
  - docs/cutover-checklist.md
  - docs/hero-medium-audit.md
  - js/a11y.js
  - js/cookie-consent.js
  - js/nav.js
  - js/web-vitals-rum.js
  - package.json
  - playwright.config.js
  - scripts/check-hreflang-cluster.js
  - scripts/check-img-alt-axe.js
  - scripts/check-location-contracts.js
  - scripts/check-schema-output.js
  - scripts/check-tap-targets.js
  - scripts/verify-site-output.mjs
  - src/components/LocationOverlay.astro
  - src/components/MobileMenu.astro
  - src/components/SiteFooter.astro
  - src/components/SiteNav.astro
  - src/components/SiteScripts.astro
  - src/data/site/astro-rendered-output-files.json
  - src/layouts/SiteLayout.astro
  - src/pages/accessibility.astro
  - src/pages/antwerp.astro
  - src/pages/code-of-conduct.astro
  - src/pages/contact-thank-you.astro
  - src/pages/cookies.astro
  - src/pages/licensing.astro
  - src/pages/privacy.astro
  - src/pages/terms.astro
  - src/pages/waiver.astro
  - src/partials/accessibility-main.frag.txt
  - src/partials/antwerp-after.frag.txt
  - src/partials/antwerp-inline.raw.css.txt
  - src/partials/antwerp-main.frag.txt
  - src/partials/code-of-conduct-main.frag.txt
  - src/partials/cookies-main.frag.txt
  - src/partials/index-main.frag.txt
  - src/partials/legal-inline.raw.css.txt
  - src/partials/licensing-main.frag.txt
  - src/partials/terms-main.frag.txt
  - src/partials/waiver-main.frag.txt
  - tests/smoke/site.spec.js
findings:
  critical: 0
  warning: 5
  info: 5
  total: 10
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-05-04
**Depth:** standard
**Files Reviewed:** 43
**Status:** issues_found

## Summary

Phase 10 delivers a substantial and well-structured batch of changes: six legal page Astro migrations, the Antwerp page migration with `lang="nl-BE"`, the mobile location-tap fix (P0-7a), the axe image-alt validator, the hreflang cluster validator, the web-vitals RUM beacon, the EU-routed cookie consent banner, the tap-target CSS heuristic validator, and the cutover checklist.

The overall code quality is high. The Astro layout is well-composed with correct landmark structure (SSR `<header role="banner">`, `<main id="main">`, `<footer role="contentinfo">`, SSR skip-link). The cookie consent integration correctly gates on `consent_profile`, uses Consent Mode v2, and degrades gracefully. The hreflang validator correctly implements the locked D-02 decision (no cross-city `<link rel="alternate">` clusters). The `check-img-alt-axe.js` validator handles browser/server lifecycle correctly.

Five warnings and five info items are flagged below. None are blocking correctness on the critical paths, but three of the warnings can produce silent runtime failures that are worth addressing before cutover.

---

## Warnings

### WR-01: `showLocationInfo` calls unchecked methods on `context` — `getInfoPanelView` is not part of the `window.TM` public API

**File:** `js/nav.js:233`
**Issue:** `showLocationInfo` calls `context.getInfoPanelView(locationRef)`, but the `getLocationContext()` shim (lines 23-31) only exposes `ready`, `getCurrent`, and `select`. If `window.LocationContext` is absent and `window.TM` is the backing store, `getInfoPanelView` will be `undefined`, making line 235 (`const data = context.getInfoPanelView(locationRef)`) silently return `undefined` rather than throw (it returns `undefined` from `undefined()`... actually it will throw `TypeError: context.getInfoPanelView is not a function`). The guard on line 233 only checks `typeof context.getInfoPanelView !== 'function'` — that guard is correct — but it causes the entire info panel to stay blank on any page where `window.LocationContext` is not defined and `window.TM` does not also expose `getInfoPanelView`. This means location overlay info panels will silently not populate on Astro pages if `window.LocationContext` is the expected provider and it hasn't been set yet when `navLoadContext.ready` resolves.

**Fix:** Either document that `window.LocationContext.getInfoPanelView` is mandatory and ensure `locations.js` exposes it on `window.TM`, or add a defensive log when the guard fires so the failure is visible during development:
```js
if (!context || typeof context.getInfoPanelView !== 'function' || !details) {
    // getInfoPanelView missing — LocationContext not fully initialized yet
    return;
}
```
The guard already silently returns — confirm `window.TM` in `locations.js` does expose `getInfoPanelView` (it is not visible in the files reviewed here). If it does not, the info panel will never populate.

---

### WR-02: `antwerp-main.frag.txt` hero `<video>` uses relative `poster` path — will break from Astro dist

**File:** `src/partials/antwerp-main.frag.txt:4`
**Issue:** The `<video>` element has `poster="assets/video/hero-poster.jpg"` (relative path, no leading `/`). The `index-main.frag.txt` counterpart uses `poster="/assets/video/hero-poster.jpg"` (absolute). When Astro renders `antwerp.html` into `dist/`, the HTML file sits at `dist/antwerp.html`. A relative `assets/video/...` URL resolves correctly for a page at the root, but it is inconsistent with the rest of the codebase and will resolve to `dist/assets/video/hero-poster.jpg` only if the server serves from `dist/`. If a path mismatch occurs (e.g., a preview served from a subpath, or the file is referenced from a sub-page during testing), the poster will silently 404 and the video element will show a blank frame before playback starts.

**Fix:** Change line 4 to use the absolute path:
```html
<video id="heroVideo" autoplay muted loop playsinline webkit-playsinline poster="/assets/video/hero-poster.jpg" preload="metadata">
```

---

### WR-03: `check-img-alt-axe.js` spawns a detached child process but never sends SIGTERM on early exit paths

**File:** `scripts/check-img-alt-axe.js:124-130`
**Issue:** The `finally` block correctly attempts to kill `serverChild`, but `spawnSync` is imported at line 16 and then re-called via `require('node:child_process').spawn` at line 71 (a redundant second require, using `spawn` not `spawnSync`). The `serverChild` is spawned with `detached: !isWin` on non-Windows platforms. If `browser.close()` throws inside the `try` block before reaching the `finally`, or if `process.exit(1)` is called from the `waitForServer` failure path (line 78), the finally block is still reached in the `waitForServer(1500)` failure branch (line 77 calls `process.exit(1)` before the finally), leaving the detached server child running as an orphan process. Specifically: `process.exit(1)` at line 79 bypasses the `finally` block entirely because `process.exit` terminates without running pending `finally` handlers in Node.js.

**Fix:** Kill the server child before calling `process.exit(1)` on the "server didn't start" path:
```js
if (!ready) {
    try {
        if (process.platform === 'win32') {
            spawnSync('taskkill', ['/PID', String(serverChild.pid), '/F', '/T']);
        } else {
            process.kill(-serverChild.pid, 'SIGTERM');
        }
    } catch (_) {}
    console.error('check-img-alt-axe: preview server did not start within 30s');
    process.exit(1);
}
```

---

### WR-04: `contact-thank-you.astro` loads `analytics.js` without `defer` — blocks parser on a conversion confirmation page

**File:** `src/pages/contact-thank-you.astro:75`
**Issue:** Line 73 loads `consent-bridge.js` with `defer`, but line 75 loads `analytics.js` with `is:inline src` and no `defer` attribute. This causes `analytics.js` to be a parser-blocking script on the contact thank-you confirmation page. This is the most important page for conversion measurement, so a parser-blocking script also delays GTM initialization (if analytics.js sets up `dataLayer`). Line 76 similarly lacks `defer` for `contact-form-analytics.js`.

**Fix:** Add `defer` to match the pattern used in `SiteScripts.astro`:
```astro
<script defer is:inline src="/js/analytics.js?v=1"></script>
<script defer is:inline src="/js/contact-form-analytics.js?v=1"></script>
```

---

### WR-05: `cookies-main.frag.txt` cookie consent copy says banner is "coming soon" — shipped banner contradicts this text

**File:** `src/partials/cookies-main.frag.txt:27`
**Issue:** Line 27 reads: *"We are rolling out an on-site consent banner that will let you accept or reject non-essential cookie categories. Until that is live, please use your browser controls..."* — but Phase 10 ships a live cookie consent banner (`js/cookie-consent.js` + `css/cookie-consent.css`). This copy will be inaccurate after cutover, which is a legal compliance risk: the Cookie Policy page should accurately describe the consent mechanism that is actually in use.

**Fix:** Update the paragraph to reflect the live banner:
```html
<p><strong>Consent Tools.</strong> We provide an on-site consent banner that lets you accept or reject non-essential cookie categories. Click "Manage Preferences" in the site footer to update your choices at any time.</p>
```
Also remove or update the adjacent "Do Not Track" paragraph (line 30+) which says "plan to add an on-site consent banner shortly" — this is now live.

---

## Info

### IN-01: `SiteNav.astro` nav-links point to hash anchors (`#about`, `#experiences`) — dead links on non-home pages

**File:** `src/components/SiteNav.astro:38-41`
**Issue:** The desktop nav links use fragment-only hrefs (`#about`, `#experiences`, `#groups`, `#faq`). On non-home pages (legal pages, antwerp, etc.) these will not scroll to any element and will just add the hash to the URL. This was presumably carried over from the legacy static site where all pages included the full nav. The footer nav correctly uses absolute paths (`/about`, `/faq`).

**Fix:** Either use absolute paths in the shared nav component, or accept this as intentional (since the nav may be considered home-page-centric) and document it. The footer's approach is the pattern to follow:
```html
<li><a href="/about">About</a></li>
<li><a href="/missions">Missions</a></li>
```

---

### IN-02: `MobileMenu.astro` "Book Now" CTA has `href="#"` — placeholder link

**File:** `src/components/MobileMenu.astro:26`
**Issue:** `<a href="#" class="btn-tickets" data-tm-booking-trigger>Book Now</a>` uses `href="#"` as a placeholder. The `data-tm-booking-trigger` attribute is used by the booking controller to intercept the click, so this works at runtime. However, if JavaScript fails or loads slowly, clicking the CTA triggers a page-top jump. The same pattern exists in `SiteNav.astro:56`. This is consistent with the existing codebase pattern and is intentional by design (booking controller intercepts), but the info is noted.

**Fix (optional):** Replace `href="#"` with `href="/locations"` as a graceful fallback for JS-disabled users, matching the behavior of the old site:
```html
<a href="/locations" class="btn-tickets" data-tm-booking-trigger>Book Now</a>
```

---

### IN-03: `check-location-contracts.js` checks for static `.html` page existence — will always pass/fail incorrectly in Astro

**File:** `scripts/check-location-contracts.js:127-130`
**Issue:** The contract check at lines 127-130 asserts that `${location.slug}.html` exists at the repo root (`pagePath = path.join(root, location.slug + '.html')`). Under the Astro migration, location pages are served from `src/pages/{slug}.astro` and the built output is `dist/{slug}.html`, not a static HTML file at the repo root. For fully-migrated location slugs, the root-level `.html` file will eventually not exist, meaning this check will begin failing for migrated locations even when they are correctly implemented in Astro.

**Fix:** This check should be updated to also accept `src/pages/${location.slug}.astro` as a valid page source, or the check should be split into pre-migration (root `.html`) and post-migration (Astro source) variants. For now, if legacy `.html` files are still maintained alongside Astro pages, this is not a blocking issue, but it will become one as the migration progresses.

---

### IN-04: `antwerp-after.frag.txt` references `missions.html` with `.html` extension in card click handler

**File:** `src/partials/antwerp-after.frag.txt:359`
**Issue:** The experience card click handler navigates to `missions.html` (with extension): `window.location.href = 'missions.html'`. Under the Astro URL contract (extensionless URLs, ROUTE-01), the canonical URL is `/missions` not `/missions.html`. The `.html` URL either redirects (in production via `_redirects`) or serves a 200 in preview. This is a stale relative URL that bypasses the redirect infrastructure.

**Fix:**
```js
window.location.href = '/missions';
```

---

### IN-05: `data/locations.json` — `west-nyack` location is missing `rollerCheckoutUrl`

**File:** `data/locations.json:203`
**Issue:** The `west-nyack` location entry does not have a `rollerCheckoutUrl` field (it is absent entirely, unlike other locations which have `null` or a value). The `check-location-contracts.js` validator only checks `rollerCheckoutUrl` when it exists (`if (location.rollerCheckoutUrl)`), so this passes validation. However, `js/roller-checkout.js` (not in review scope but referenced by the codebase) resolves the Roller overlay URL from this field. If the Roller checkout widget is expected to function for West Nyack, the missing field means it silently falls back to `bookingUrl` or opens a direct link rather than the overlay. This is potentially a conversion-path gap.

**Fix:** Either explicitly set `"rollerCheckoutUrl": null` (to match the schema pattern and make the absence intentional), or add the correct Roller URL if the venue supports overlay checkout. Confirm with the West Nyack venue team which checkout mode is active.

---

_Reviewed: 2026-05-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
