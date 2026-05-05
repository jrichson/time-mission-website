---
phase: 10-audit-gap-closure-cutover-readiness
fixed_at: 2026-05-05T00:00:00Z
review_path: .planning/phases/10-audit-gap-closure-cutover-readiness/10-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 5
status: all_fixed
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-05-05
**Source review:** .planning/phases/10-audit-gap-closure-cutover-readiness/10-REVIEW.md
**Iteration:** 1
**Fix scope:** critical_warning

**Summary:**
- Findings in scope: 5 (all Warnings; 0 Critical)
- Fixed: 5
- Skipped: 5 (all Info, out of fix scope)

Post-fix verification: `npm run check` ran clean — location contracts, sitemap,
component drift, booking architecture, accessibility baseline, internal links,
route contract, site data, location/route alignment, FALLBACK sync, component
usage, site contract, analytics contract, consent contract, SEO catalog, and
SEO robots all passed.

## Fixed Issues

### WR-01: `showLocationInfo` calls unchecked `getInfoPanelView` on `context`

**Files modified:** `js/nav.js`
**Commit:** 983a582
**Applied fix:** Wrapped the existing silent-return guard at `js/nav.js:233`
in an explicit block that emits a `console.warn` when the
`context.getInfoPanelView` function is missing while the context object itself
exists. This surfaces the silent-empty-info-panel symptom during development
without changing runtime behavior. `js/locations.js:614` exposes
`getInfoPanelView` on `window.LocationContext` (verified via grep), so the
guard fires only when the context shim falls back to `window.TM` before
`window.LocationContext` is set.

### WR-02: Hero `<video>` poster used a relative path

**Files modified:** `src/partials/antwerp-main.frag.txt`
**Commit:** f36a6da
**Applied fix:** Changed `poster="assets/video/hero-poster.jpg"` to
`poster="/assets/video/hero-poster.jpg"` on line 4 to match the absolute-path
convention used by `index-main.frag.txt`. This makes the poster resolution
independent of the page's URL depth.

### WR-03: Detached preview server orphaned on `process.exit(1)`

**Files modified:** `scripts/check-img-alt-axe.js`
**Commit:** da4fece
**Applied fix:** Added an explicit `process.kill(-serverChild.pid, 'SIGTERM')`
(or `taskkill /F /T` on Windows) before the `process.exit(1)` call on the
"server didn't start within 30s" path. Wrapped the kill in try/catch to match
the pattern used in the outer `finally` block. This prevents an orphan preview
server from surviving when Node short-circuits the finally block via
`process.exit`.

### WR-04: `analytics.js` and `contact-form-analytics.js` parser-blocking on contact-thank-you page

**Files modified:** `src/pages/contact-thank-you.astro`
**Commit:** 4b928b5
**Applied fix:** Added `defer` to both `<script>` tags loading
`/js/analytics.js` and `/js/contact-form-analytics.js`, matching the
`defer is:inline` pattern already used by `consent-bridge.js` on the same
page and by `SiteScripts.astro`. The conversion-confirmation page no longer
parser-blocks on analytics setup.

### WR-05: Cookie policy copy said banner was "coming soon"

**Files modified:** `src/partials/cookies-main.frag.txt`
**Commit:** 480b162
**Applied fix:** Replaced the "rolling out an on-site consent banner... Until
that is live, please use your browser controls" sentence with the live-banner
copy: *"We provide an on-site consent banner that lets you accept or reject
non-essential cookie categories. Click 'Manage Preferences' in the site
footer to update your choices at any time."* Also updated the adjacent Do Not
Track paragraph to remove the "plan to add an on-site consent banner shortly"
language and instead point users at the now-live banner. Eliminates a legal
compliance risk where the Cookie Policy described a future state that no
longer matches what the site ships.

## Skipped Issues

All five Info findings were skipped per the configured `fix_scope =
critical_warning`. They were not attempted; they remain documented in
`10-REVIEW.md` for follow-up review.

### IN-01: `SiteNav.astro` nav-links use hash anchors on non-home pages

**File:** `src/components/SiteNav.astro:38-41`
**Reason:** info-severity, out of fix scope
**Original issue:** Desktop nav links (`#about`, `#experiences`, `#groups`,
`#faq`) are dead links on non-home pages.

### IN-02: `MobileMenu.astro` "Book Now" CTA uses `href="#"`

**File:** `src/components/MobileMenu.astro:26`
**Reason:** info-severity, out of fix scope
**Original issue:** Placeholder `href="#"` on the booking-trigger CTA causes a
page-top jump if JS fails or loads slowly.

### IN-03: `check-location-contracts.js` asserts root `.html` page exists

**File:** `scripts/check-location-contracts.js:127-130`
**Reason:** info-severity, out of fix scope
**Original issue:** The contract check asserts `${slug}.html` at the repo
root, which will incorrectly fail once locations are fully migrated to
`src/pages/{slug}.astro` and the legacy root files are removed.

### IN-04: `antwerp-after.frag.txt` uses `missions.html` URL

**File:** `src/partials/antwerp-after.frag.txt:359`
**Reason:** info-severity, out of fix scope
**Original issue:** The experience card click handler navigates to
`missions.html`, bypassing the canonical extensionless URL contract
(ROUTE-01).

### IN-05: `data/locations.json` — `west-nyack` missing `rollerCheckoutUrl`

**File:** `data/locations.json:203`
**Reason:** info-severity, out of fix scope
**Original issue:** West Nyack location entry omits `rollerCheckoutUrl`
entirely; checkout silently falls back to `bookingUrl` or a direct link
rather than the Roller overlay. Verify with the venue team whether overlay
checkout is supported and either set `null` or a real URL.

---

_Fixed: 2026-05-05_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
