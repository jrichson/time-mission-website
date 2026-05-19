---
phase: quick-260506-ksu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/LocationOverlay.astro
  - css/nav.css
  - js/nav.js
autonomous: true
requirements:
  - QUICK-260506-ksu — Promote "Visit <City>" to primary action in location info preview panel; demote "Book Now" to secondary; "Contact" stays tertiary

must_haves:
  truths:
    - "When a user opens the location overlay and selects a city, the FIRST visible button in the actions row is 'Visit <City>' styled as the primary action (orange gradient, white text, prominent)."
    - "The 'Book Now' button is still present in the actions row but rendered with secondary visual weight (outline/transparent style — same family as the previous Contact style)."
    - "'Contact' remains visible as a tertiary text-link or de-emphasized control beneath/after the primary+secondary."
    - "The 'Visit <City>' label interpolates the selected location name (e.g. 'Visit Philadelphia' for Philadelphia, 'Visit Antwerp' for Antwerp) using data.name from getInfoPanelView."
    - "P0-7a smoke (mobile tap → overlay stays open + #locationInfo visible) continues to pass — no behavior change to the panel reveal flow."
    - "npm run check exits 0 and npm run test:smoke remains 58/58 pass after changes."
    - "npm run build:astro succeeds and dist/ is rebuilt; CSP hash regen runs cleanly via inject-csp-hashes.mjs."
  artifacts:
    - path: "src/components/LocationOverlay.astro"
      provides: "Reordered .location-info-actions with .location-info-page as the first child, then .location-info-book, then .location-info-contact; the standalone .location-info-page link below the actions row is removed."
      contains: '<div class="location-info-actions">'
    - path: "css/nav.css"
      provides: "Updated styles: .location-info-page becomes primary button (orange gradient — promoted from current cyan link); .location-info-book becomes secondary outline button (demoted from primary gradient); .location-info-contact stays tertiary."
    - path: "js/nav.js"
      provides: "showLocationInfo updated to set pageTour.textContent to 'Visit ' + data.shortName-or-name when data.pageUrl is present; aria-label retained."
  key_links:
    - from: "src/components/LocationOverlay.astro"
      to: "css/nav.css"
      via: ".location-info-page selector now styled as primary button"
      pattern: "location-dropdown.*location-info-page"
    - from: "js/nav.js showLocationInfo"
      to: "src/components/LocationOverlay.astro .location-info-page"
      via: "querySelector('.location-info-page') + textContent assignment"
      pattern: "location-info-page"
    - from: "tests/smoke/site.spec.js P0-7a"
      to: "src/components/LocationOverlay.astro #locationInfo"
      via: "selector unchanged — locator still resolves"
      pattern: "#locationInfo.*toBeVisible"
---

<objective>
Promote the "Full venue page" link to the PRIMARY action in the location info preview panel,
relabel it to verb-first "Visit <City>", demote "Book Now" to secondary, and keep "Contact"
as tertiary. This aligns with Card/Drawer UX best practice: the primary action on a preview
should be "navigate to the detail page", not a parallel transactional action.

Purpose: Today's panel inverts the preview-pattern hierarchy — Book Now gets the orange
gradient while "Full venue page" sits below the fold as a tertiary cyan text link. P0-7a
mobile users tap a city, see the preview, and have no obvious path forward. This change
makes the venue-page navigation the visually-loudest CTA where it belongs.

Output: Reordered LocationOverlay markup, restyled CSS button hierarchy, and a one-line
js/nav.js label update that interpolates `data.name` (or `data.shortName` if available).
Visual parity preserved everywhere else.
</objective>

<execution_context>
@$HOME/planning/workflows/execute-plan.md
@$HOME/planning/templates/summary.md
</execution_context>

<context>
@project guidance
@.planning/STATE.md
@js/nav.js
@src/components/LocationOverlay.astro
@css/nav.css
@tests/smoke/site.spec.js

<interfaces>
<!-- Key contracts the executor will work against. Extracted from codebase so no exploration needed. -->

Current LocationOverlay.astro markup (src/components/LocationOverlay.astro:64-68):
```astro
<div class="location-info-actions">
    <a href="#" class="location-info-book">Book Now</a>
    <a href="/contact" class="location-info-contact">Contact</a>
</div>
<a href="#" class="location-info-page">Full venue page</a>
```

Target markup after this plan:
```astro
<div class="location-info-actions">
    <a href="#" class="location-info-page">Full venue page</a>     <!-- text replaced at runtime by js/nav.js -->
    <a href="#" class="location-info-book">Book Now</a>
    <a href="/contact" class="location-info-contact">Contact</a>
</div>
<!-- standalone .location-info-page link below actions is REMOVED -->
```

Current showLocationInfo() pageTour wiring (js/nav.js:250-258):
```js
var pageTour = infoPanel.querySelector('.location-info-page');
if (pageTour && data.pageUrl) {
    pageTour.href = data.pageUrl;
    pageTour.hidden = !!data.comingSoon;
    pageTour.setAttribute(
        'aria-label',
        data.name ? 'Open venue landing page — ' + data.name : 'Open venue landing page'
    );
}
```

Target showLocationInfo() pageTour wiring:
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

Current CSS (css/nav.css:608-675):
- .location-info-actions: flex row, gap 0.75rem, margin-top 1.5rem
- .location-dropdown a.location-info-book: PRIMARY — gradient bg, white text, box-shadow (orange glow)
- .location-dropdown a.location-info-contact: SECONDARY — transparent, white border 25%, white text
- .location-dropdown .location-info-page: TERTIARY — inline-flex, cyan text link, margin-top 0.85rem

Target CSS rebalance (selectors unchanged — only the property values for the three rules swap):
- .location-dropdown .location-info-page: PRIMARY — gradient bg, white text, orange box-shadow (was cyan link)
- .location-dropdown a.location-info-book: SECONDARY — transparent, white border 25%, white text (was primary)
- .location-dropdown a.location-info-contact: TERTIARY — text-link / minimal (was secondary outline) — OR keep current outline if preserving 3-button row reads better; choose the variant that matches preview hierarchy from a visual scan.

Note: `.location-info-page` previously had `margin-top: 0.85rem` because it sat OUTSIDE
`.location-info-actions`. After the move it becomes a flex child and that margin must be
removed; the row's existing `gap: 0.75rem` handles spacing.
</interfaces>

<gitnexus>
Per project project guidance, before editing showLocationInfo run:
- `gitnexus_impact({target: "showLocationInfo", direction: "upstream"})` and report blast radius.
After edits, run:
- `gitnexus_detect_changes({scope: "all"})` to verify scope matches expected files.
</gitnexus>

</context>

<tasks>

<task type="auto">
  <name>Task 1: Reorder markup, restyle hierarchy, relabel link</name>
  <files>src/components/LocationOverlay.astro, css/nav.css, js/nav.js</files>
  <action>
Run `gitnexus_impact({target: "showLocationInfo", direction: "upstream"})` FIRST and
report the blast radius (callers, processes, risk). Halt if HIGH/CRITICAL and warn user.

Then apply three coordinated edits:

(A) src/components/LocationOverlay.astro (lines 64-68): Move the `.location-info-page`
anchor INTO `.location-info-actions` as the FIRST child. Remove the standalone
`.location-info-page` line below the actions div. Final shape:

```astro
<div class="location-info-actions">
    <a href="#" class="location-info-page">Full venue page</a>
    <a href="#" class="location-info-book">Book Now</a>
    <a href="/contact" class="location-info-contact">Contact</a>
</div>
```

The "Full venue page" placeholder text remains as a fallback for the brief moment before
js/nav.js runs showLocationInfo and substitutes "Visit <City>". Keep `href="#"` because
js/nav.js sets it from `data.pageUrl` at runtime.

(B) css/nav.css (lines 608-675 region + the prefers-reduced-motion list at 969-970):
Swap the visual hierarchy by editing the property values of the three existing rules.
DO NOT rename any selectors.

  - `.location-dropdown .location-info-page` (line 661 region): Promote to PRIMARY.
    Replace the current cyan inline-link styles with the gradient-button styles currently
    on `.location-info-book`. Specifically: display: inline-block; padding: 0.7rem 2rem;
    background: var(--gradient-primary); color: var(--white); text-decoration: none;
    font-family: 'Monument Extended', 'Orbitron', sans-serif; font-size: 0.75rem;
    font-weight: 400; letter-spacing: 0.05em; text-transform: uppercase;
    border-radius: 100px; box-shadow: 0 4px 15px rgba(239, 75, 35, 0.4);
    transition: transform 0.3s ease, box-shadow 0.3s ease.
    REMOVE `margin-top: 0.85rem` — element is now a flex child, gap handles spacing.
    Add a hover rule that mirrors the old `.location-info-book:hover` (translateY(-2px)
    + larger shadow).

  - `.location-dropdown a.location-info-book` (line 615 region): Demote to SECONDARY.
    Replace the gradient-button styles with the outline styles currently on
    `.location-info-contact`: background: transparent; color: var(--white);
    border: 1px solid rgba(255, 255, 255, 0.25); transition includes border-color and
    background; keep padding/typography identical to the new primary so they read as a
    button pair. Update its `:hover` rule to mirror the old `.location-info-contact:hover`
    (border-color/color goes orange, subtle bg tint).

  - `.location-dropdown a.location-info-contact` (line 638 region): Stay TERTIARY but
    visually de-emphasized — keep current outline styles OR convert to a text-link with
    smaller font (0.82rem) to clearly read as tertiary. Choose the text-link variant
    UNLESS the 3-button row visually reads cleaner; document the choice in the SUMMARY.

  - `.prefers-reduced-motion` selector list (line 965-973): Add
    `.location-dropdown a.location-info-page` to the list of selectors that disable
    transform on hover, so the new primary respects reduced-motion just like the old one.

(C) js/nav.js (lines 250-258 inside showLocationInfo): Add a `pageTour.textContent`
assignment that interpolates the city name. Prefer `data.shortName` when available,
fall back to `data.name`, fall back to "Visit venue":

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

After all three edits, rebuild dist so CSP hashes regenerate:
`npm run build:astro` (this triggers inject-csp-hashes.mjs as part of the build chain).

Then run `gitnexus_detect_changes({scope: "all"})` and confirm only the three expected
files (LocationOverlay.astro, nav.css, nav.js) plus the regenerated dist + _headers
appear in scope.
  </action>
  <verify>
    <automated>npm run check &amp;&amp; npm run test:smoke &amp;&amp; npm run build:astro</automated>
  </verify>
  <done>
- LocationOverlay.astro shows .location-info-page as the FIRST child of .location-info-actions; the old standalone .location-info-page anchor below the actions row is gone.
- css/nav.css: .location-info-page renders as orange-gradient primary button (no margin-top); .location-info-book renders as outline secondary; .location-info-contact remains visibly tertiary.
- js/nav.js showLocationInfo sets pageTour.textContent to "Visit Philadelphia" / "Visit Antwerp" / etc. based on data.shortName || data.name.
- `npm run check` exits 0.
- `npm run test:smoke` reports 58/58 pass (P0-7a stays green — selector #locationInfo unchanged).
- `npm run build:astro` succeeds; dist/ is rebuilt; _headers CSP hashes regenerated by inject-csp-hashes.mjs without errors.
- `gitnexus_detect_changes` shows scope limited to LocationOverlay.astro, css/nav.css, js/nav.js, and expected dist regeneration.
- Manual visual UAT: open dist/index.html (or `open -a "Google Chrome" dist/index.html`), open the location overlay, tap any open city (e.g. Philadelphia), confirm the FIRST button in the row reads "Visit Philadelphia" with the orange gradient, "Book Now" reads as outlined secondary, "Contact" reads as tertiary.
  </done>
</task>

</tasks>

<verification>
1. `gitnexus_impact({target: "showLocationInfo", direction: "upstream"})` reported pre-edit (no HIGH/CRITICAL ignored).
2. `npm run check` exits 0 (location contracts, sitemap, components, booking architecture, accessibility baseline, internal links).
3. `npm run test:smoke` reports 58/58 pass — P0-7a (mobile tap location → overlay stays open + #locationInfo visible) specifically must not regress.
4. `npm run build:astro` succeeds; dist regenerated; `inject-csp-hashes.mjs` runs cleanly (no stale hash diffs).
5. `gitnexus_detect_changes({scope: "all"})` shows scope limited to the 3 source files + expected dist regeneration.
6. Visual UAT against dist/: Philadelphia preview shows "Visit Philadelphia" primary, "Book Now" secondary, "Contact" tertiary — same hierarchy verified for at least one coming-soon city (e.g. Houston) where pageTour may be hidden via `data.comingSoon`.
</verification>

<success_criteria>
- All 5 must-have truths observable in the rebuilt dist/.
- Smoke tests: 58/58 (no P0-7a regression).
- `npm run check` and `npm run build:astro` both exit 0.
- No selector renames; no public TM API changes; no behavior change to overlay open/close/tap flow.
- updateDOM 35-selector ladder untouched (out of scope).
</success_criteria>

<output>
After completion, create `.planning/quick/260506-ksu-ux-promote-full-venue-page-to-primary-bu/260506-ksu-SUMMARY.md`
documenting: gitnexus_impact result for showLocationInfo, the tertiary-style choice for
.location-info-contact (kept-outline vs text-link), exact lines edited, smoke result,
and a screenshot path or manual-UAT note for the rebuilt dist.
</output>
