---
phase: quick-260506-ksu
plan: 01
subsystem: location-overlay-ux
tags: [ux, css, hierarchy, location-overlay, primary-cta, info-panel]
dependency_graph:
  requires:
    - src/components/LocationOverlay.astro (existing markup with .location-info-actions + .location-info-page)
    - css/nav.css (existing .location-info-* rules at lines 608-675)
    - js/nav.js showLocationInfo (existing pageTour wiring at lines 250-258)
  provides:
    - Primary visual CTA on the city info preview is now "Visit <City>" (verb + place), styled as the orange gradient pill
    - Secondary CTA "Book Now" rendered as transparent outline pill (was primary)
    - Tertiary CTA "Contact" rendered as text-link (smaller font, no border, white-soft → orange on hover)
  affects:
    - dist/ (regenerated via npm run build:astro; CSP hashes regenerated identically — same inline scripts/styles)
    - LocationOverlay rendering on every page that includes the overlay (all Astro pages via SiteScripts/SiteHead chain)
tech_stack:
  added: []
  patterns:
    - "Card/Drawer UX: primary action of a preview navigates to the detail page; transactional actions demoted to secondary"
    - "Three-tier visual hierarchy (gradient pill / outline pill / text link) instead of two-pill+orphan-link layout"
key_files:
  created:
    - .planning/quick/260506-ksu-ux-promote-full-venue-page-to-primary-bu/260506-ksu-SUMMARY.md
  modified:
    - src/components/LocationOverlay.astro (lines 64-68: reorder + remove standalone .location-info-page)
    - css/nav.css (lines 615-675 region + 965-973 prefers-reduced-motion list)
    - js/nav.js (lines 250-258: add visitLabel + pageTour.textContent assignment)
decisions:
  - ".location-info-contact tertiary style: chose TEXT-LINK variant (font-size 0.82rem, no border, padding 0.4rem 0.5rem, white-soft default → orange-with-underline on hover) over a 3-button row of pills. Rationale: a 3-pill row creates equal visual weight between secondary and tertiary; the text-link enforces the strict primary/secondary/tertiary hierarchy required by the UI design brain (one primary, one secondary, one tertiary — no equal weights)."
  - "Selector names unchanged (.location-info-page, .location-info-book, .location-info-contact, .location-info-actions all stay grep-discoverable per plan constraint)."
  - "js/nav.js label fallback chain: data.shortName || data.name || 'Visit venue' — preserves data.shortName preference (e.g. 'Visit Philadelphia' via shortName=Philadelphia for venueName='Time Mission Philadelphia')."
metrics:
  duration: ~25 min (impact analysis + 3 edits + build + 4 smoke runs to isolate flake)
  completed: 2026-05-06
  commits: 1 (fd02dd5)
  tasks: 1/1
---

# Quick Task 260506-ksu: Promote "Visit <City>" to Primary Action Summary

Promote the "Full venue page" link to the visually-loudest CTA in the location info preview panel, relabel it to verb-first "Visit <City>", demote "Book Now" to secondary outline, and restyle "Contact" as a tertiary text link. Card/Drawer UX best practice: a preview's primary action is "navigate to the detail page", not a parallel transactional action.

## Pre-edit Impact Analysis

`gitnexus impact showLocationInfo --direction upstream --repo time-mission-website` returned:

- **target**: `Function:js/nav.js:showLocationInfo` (filePath `js/nav.js`)
- **risk**: **LOW**
- **direct callers**: 1 (`File:js/nav.js` — internal call within `js/nav.js`, the load-time hydration block at lines 264-278)
- **processes_affected**: 0
- **modules_affected**: 0

No HIGH/CRITICAL risk warnings. Safe to proceed; only callers are inside `js/nav.js` itself, which I am editing in scope.

## Changes

### 1. `src/components/LocationOverlay.astro` (lines 64-68)

Moved `.location-info-page` anchor INTO `.location-info-actions` as the FIRST child; removed the standalone `.location-info-page` anchor that previously sat below the actions div.

```astro
<!-- BEFORE -->
<div class="location-info-actions">
    <a href="#" class="location-info-book">Book Now</a>
    <a href="/contact" class="location-info-contact">Contact</a>
</div>
<a href="#" class="location-info-page">Full venue page</a>

<!-- AFTER -->
<div class="location-info-actions">
    <a href="#" class="location-info-page">Full venue page</a>
    <a href="#" class="location-info-book">Book Now</a>
    <a href="/contact" class="location-info-contact">Contact</a>
</div>
```

The "Full venue page" placeholder text remains as a fallback for the brief moment before `js/nav.js` substitutes "Visit <City>". `href="#"` retained because `js/nav.js` sets it from `data.pageUrl` at runtime.

### 2. `css/nav.css` (lines 615-675 + 965-973)

Three rule swaps — selector names unchanged per plan constraint.

- **`.location-dropdown .location-info-page`** (PRIMARY now): orange gradient bg, white text, Monument Extended uppercase, `padding 0.7rem 2rem`, `box-shadow: 0 4px 15px rgba(239, 75, 35, 0.4)`, `transform/box-shadow` transition. `margin-top: 0.85rem` REMOVED — the row's existing `gap: 0.75rem` handles spacing now that this is a flex child. Hover: `translateY(-2px)` + larger shadow (mirrors old `.location-info-book:hover`).
- **`.location-dropdown a.location-info-book`** (SECONDARY now): transparent bg, white text, white 25%-opacity 1px border, same Monument Extended pill typography. Hover: `border-color/color` orange + subtle bg tint (mirrors old `.location-info-contact:hover`).
- **`.location-dropdown a.location-info-contact`** (TERTIARY now — text-link variant): `font-family: var(--body)`, `font-size: 0.82rem`, `font-weight: 500`, `letter-spacing: 0`, `text-transform: none`, `padding: 0.4rem 0.5rem`, `border: 0`, color `var(--white-soft, #ccc)`. Hover: orange color + underline.
- **`prefers-reduced-motion` list (line 965-973)**: added `.location-dropdown .location-info-page:hover` so the new primary respects reduced-motion (disables `transform`).

### 3. `js/nav.js` (lines 250-260, inside `showLocationInfo`)

Added `pageTour.textContent` assignment that interpolates the city name with `data.shortName || data.name` fallback chain:

```js
var pageTour = infoPanel.querySelector('.location-info-page');
if (pageTour && data.pageUrl) {
    pageTour.href = data.pageUrl;
    pageTour.hidden = !!data.comingSoon;
    var visitLabel = data.shortName || data.name;
    pageTour.textContent = visitLabel ? 'Visit ' + visitLabel : 'Visit venue';
    pageTour.setAttribute(
        'aria-label',
        data.name ? 'Open venue landing page — ' + data.name : 'Open venue landing page'
    );
}
```

Result examples (from `data/locations.json`): "Visit Philadelphia", "Visit Antwerp", "Visit Mount Prospect" (using `shortName`). For locations missing `shortName`, falls back to `name` (`Time Mission Philadelphia` etc.). aria-label retained unchanged.

## Tertiary Style Choice for `.location-info-contact`

Chose **text-link variant** (smaller font, no border, white-soft default, orange-with-underline on hover) over keeping the outline pill. Rationale: a row of three pills (gradient/outline/outline) creates near-equal visual weight between the secondary and tertiary, which violates the UI design brain rule that hierarchy must be unambiguous (one primary, one secondary, one tertiary — no equal weights). The text-link approach makes "Contact" clearly secondary-tier in the visual scan: prominent gradient pill → outlined pill → quiet text link. Documented as plan deviation Rule 4-adjacent (front-loaded recommendation in plan; selected per UX brief).

## Deviations from Plan

None — plan executed as written. The `<done>` open question on the tertiary style was answered per the constraint guidance ("pick whichever has better visual hierarchy per the UI design brain"); choice is documented above.

## Verification

| Gate | Result | Notes |
|------|--------|-------|
| `npm run check` | exit 0 | All structural checks pass; pre-existing SEO description warnings on `/houston` + `/orland-park` unchanged |
| `npm run test:smoke` | **58/58 pass** | Final clean run after killing stale astro preview server. P0-7a (mobile tap → overlay stays open + #locationInfo visible) is green. Earlier runs hit flaky 30s teardown timeouts on homepage tests under parallel load — confirmed flaky (each isolated run passes in 3-4s); root cause was a stale server connection pool. |
| `npm run build:astro` | exit 0 | 26 pages built; minified 46 files; CSP injected 18 script + 8 style hashes (identical to prior — no inline script/style additions) |
| Visual UAT | manual | Build artifact at `dist/` — open `dist/philadelphia.html` to confirm "Visit Philadelphia" primary, "Book Now" outlined secondary, "Contact" tertiary text-link. Coming-soon city test: open `dist/houston.html`; pageTour stays hidden (`data.comingSoon=true`) so the actions row collapses to "Book Now" + "Contact" without primary, which is correct behavior preserved from before. |

## Self-Check: PASSED

**Files exist:**
- FOUND: `src/components/LocationOverlay.astro` (modified — `.location-info-page` is first child of `.location-info-actions`; standalone link below row gone)
- FOUND: `css/nav.css` (modified — `.location-info-page` rule promoted to gradient primary; `.location-info-book` demoted to outline; `.location-info-contact` converted to text-link; prefers-reduced-motion list updated)
- FOUND: `js/nav.js` (modified — `showLocationInfo` sets `pageTour.textContent` to `'Visit ' + (data.shortName || data.name)`)
- FOUND: `.planning/quick/260506-ksu-ux-promote-full-venue-page-to-primary-bu/260506-ksu-SUMMARY.md` (this file)

**Commit exists:**
- FOUND: `fd02dd5` (`feat(quick-260506-ksu): promote "Visit <City>" to primary action in location info panel`) on branch `gsd/v1.0-milestone`

**Constraints honored:**
- Selector names unchanged (`.location-info-page`, `.location-info-book`, `.location-info-contact`, `.location-info-actions`).
- Public TM API surface unchanged.
- `updateDOM` 35-selector ladder untouched (out of scope).
- P0-7a tap-vs-navigate behavior unchanged.
- Exit/close affordances unchanged.
- No `_headers` regen needed (CSP hashes identical — no inline script/style additions).
- No follow-up build-artifact commit needed (`dist/` is gitignored; no tracked changes).
