---
phase: 260505-qod
plan: 01
subsystem: astro-migration
tags: [location-pages, astro, partials, migration]
key-files:
  created:
    - src/pages/lincoln.astro
    - src/pages/mount-prospect.astro
    - src/pages/manassas.astro
    - src/pages/west-nyack.astro
    - src/partials/lincoln-inline.raw.css.txt
    - src/partials/lincoln-main.frag.txt
    - src/partials/lincoln-after.frag.txt
    - src/partials/mount-prospect-inline.raw.css.txt
    - src/partials/mount-prospect-main.frag.txt
    - src/partials/mount-prospect-after.frag.txt
    - src/partials/manassas-inline.raw.css.txt
    - src/partials/manassas-main.frag.txt
    - src/partials/manassas-after.frag.txt
    - src/partials/west-nyack-inline.raw.css.txt
    - src/partials/west-nyack-main.frag.txt
    - src/partials/west-nyack-after.frag.txt
  modified:
    - src/data/site/astro-rendered-output-files.json
decisions:
  - "Relative asset paths (assets/*) in legacy HTML converted to absolute (/assets/*) in main.frag files, matching the existing antwerp/houston/philadelphia precedent."
  - "game-popup-overlay HTML div omitted from all fragments (same as antwerp/houston/philadelphia), following precedent where only CSS and JS references are carried; JS references fail silently when DOM element is absent."
  - "astro-rendered-output-files.json included in commit because compile:routes regenerates it whenever new Astro pages are added — it is a build artifact that must stay in sync with src/pages/."
  - "check:hreflang-cluster pre-existing failure (antwerp.html, index.html, locations.html) documented as out-of-scope; the four new pages contain no hreflang tags."
metrics:
  duration: ~15 minutes
  completed: 2026-05-05
  tasks_completed: 1
  files_created: 16
  files_modified: 1
---

# Phase 260505-qod Plan 01: Migrate 4 Legacy Location Pages (Lincoln/Mount-Prospect/Manassas/West-Nyack) Summary

One-liner: Astro three-fragment wrappers for lincoln, mount-prospect, manassas, west-nyack — extracting page-local CSS, hero→footer markup, and after-footer scripts into src/partials/* per the established antwerp/houston/philadelphia pattern.

## Slugs Migrated

All four target slugs successfully migrated:

| Slug | Wrapper | CSS Fragment | Main Fragment | After Fragment |
|------|---------|--------------|---------------|----------------|
| lincoln | src/pages/lincoln.astro | lincoln-inline.raw.css.txt | lincoln-main.frag.txt | lincoln-after.frag.txt |
| mount-prospect | src/pages/mount-prospect.astro | mount-prospect-inline.raw.css.txt | mount-prospect-main.frag.txt | mount-prospect-after.frag.txt |
| manassas | src/pages/manassas.astro | manassas-inline.raw.css.txt | manassas-main.frag.txt | manassas-after.frag.txt |
| west-nyack | src/pages/west-nyack.astro | west-nyack-inline.raw.css.txt | west-nyack-main.frag.txt | west-nyack-after.frag.txt |

## Legacy Boundary Verification

Actual line boundaries matched the plan's boundary table exactly:

| Slug | style#1 | style#2 | body tag | hero start | footer close | nav.js script |
|------|---------|---------|----------|------------|--------------|---------------|
| lincoln | 33–2841 | 2846–2863 | 2865 | 3056 | 3659 | 4294 |
| mount-prospect | 33–2841 | 2846–2863 | 2865 | 3056 | 3650 | 4284 |
| manassas | 33–2841 | 2846–2863 | 2865 | 3056 | 3650 | 4285 |
| west-nyack | 33–2841 | 2846–2863 | 2865 | 3056 | 3650 | 4285 |

Note: lincoln.html has 4328 lines (vs ~4319 for the others) due to an extra testimonial card section in the main fragment.

## Touch-only @media Block Confirmed

The second `<style>` block (lines 2846–2863 in all four files — the `@media (hover: none)` footer-hover override) was confirmed present and concatenated into each `<slug>-inline.raw.css.txt` separated by a blank line. This block is absent from the antwerp/houston/philadelphia CSS, confirming the US location pages have an additional hover override.

## Per-slug Deviations from Philadelphia Precedent

1. **No `lang=` prop** — All four slugs are US (`region='us'`, `locale=null`), so `SiteLayout` default `lang='en'` is used. No `lang` prop passed (matching the plan spec; antwerp uses `lang="nl-BE"` as the European exception).

2. **Relative→absolute asset path conversion** — Legacy HTML files use relative `assets/...` paths. All `poster="..."`, `src="..."`, and `srcset="..."` attributes in the main fragments were converted to `/assets/...` absolute paths, matching the philadelphia-main.frag.txt convention. The `{{TM_MEDIA_BASE}}/assets/video/hero-bg-*.mp4` tokens were already present in the legacy files (not relative), so no additional token substitution was needed.

3. **game-popup-overlay HTML omitted** — The `<div class="game-popup-overlay" id="gamePopup">` div (present between `<body>` and `<!-- Hero Section -->` in each legacy file) was not included in any fragment. This matches the antwerp/houston/philadelphia precedent where only the CSS selectors and JS getElementById references are carried; the DOM element is absent from the built output without breaking anything (JS fails soft when element is not found).

4. **CSS content varies between lincoln/mount-prospect vs manassas/west-nyack** — lincoln.html and mount-prospect.html share identical CSS content (2807 lines in style#1, 16 lines in style#2). Manassas and west-nyack have identical CSS to each other but contain additional inline comments (+66 lines) versus lincoln/mount-prospect. No functional difference — all four use the same selectors and rules. Each slug gets its own copy of the CSS as extracted (per the plan's three-fragment pattern).

5. **After-fragment location-name strings are slug-specific** — The rotating tagline initializer in each after.frag contains the location display name hardcoded (e.g., `'Time Mission Lincoln'`, `'Time Mission Mount Prospect'`). These were preserved verbatim from the legacy HTML — no substitution was made.

## Verification Output

```
npm run check → passed (all 18 sub-checks including route contract, locations, sitemap, components, booking, a11y, links, site-data, analytics, consent, SEO)

npm run build:astro → 26 page(s) built in 1.29s
  Includes: /lincoln.html /mount-prospect.html /manassas.html /west-nyack.html

npm run check:routes -- --dist → Route contract check passed.

npm run check:schema-output → Schema output check passed for 25 Astro-rendered routes.

npm run check:hreflang-cluster → FAILED (pre-existing, not caused by this migration)
  - antwerp.html, index.html, locations.html (unchanged files)
  - New pages contain no hreflang tags

npm run verify:phase10 → All checks pass EXCEPT check:hreflang-cluster (pre-existing failure)
```

## Pre-existing Failure: check:hreflang-cluster

`check:hreflang-cluster` fails on three files that were not modified: `antwerp.html`, `index.html`, `locations.html`. Confirmed pre-existing by running the check against the baseline commit (166db25) without the new pages — same three failures. The four new Astro wrappers contain no hreflang tags and do not contribute to this failure.

## GitNexus Impact Analysis

The new pages only CALL existing symbols (`buildLocationGraph`, `serializeGraph`, `applyTmMediaBase`, `definePage`, `allLocations`) without modifying any of them. No upstream symbol was altered, so WILL BREAK impact is zero. The GitNexus index was noted as stale after commit; `npx gitnexus analyze` should be run to update the knowledge graph with the four new page symbols.

## Known Stubs

None. All four wrappers wire live location data from `allLocations`, use real `buildLocationGraph` graph output, and render the actual hero/body/footer markup from the legacy pages.

## Threat Flags

None. No new network endpoints, auth paths, or trust boundary changes. The new pages are static Astro-rendered HTML following the established pattern.

## Self-Check: PASSED

Files confirmed created:
- src/pages/lincoln.astro ✓
- src/pages/mount-prospect.astro ✓
- src/pages/manassas.astro ✓
- src/pages/west-nyack.astro ✓
- src/partials/lincoln-inline.raw.css.txt ✓
- src/partials/lincoln-main.frag.txt ✓
- src/partials/lincoln-after.frag.txt ✓
- src/partials/mount-prospect-inline.raw.css.txt ✓
- src/partials/mount-prospect-main.frag.txt ✓
- src/partials/mount-prospect-after.frag.txt ✓
- src/partials/manassas-inline.raw.css.txt ✓
- src/partials/manassas-main.frag.txt ✓
- src/partials/manassas-after.frag.txt ✓
- src/partials/west-nyack-inline.raw.css.txt ✓
- src/partials/west-nyack-main.frag.txt ✓
- src/partials/west-nyack-after.frag.txt ✓

Commit f3240ab confirmed in git log.
