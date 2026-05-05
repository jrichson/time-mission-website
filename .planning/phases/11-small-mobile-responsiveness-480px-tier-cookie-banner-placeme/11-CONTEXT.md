# Phase 11: small-mobile responsiveness ≤480px tier + cookie banner placement polish — Context

**Gathered:** 2026-05-05
**Status:** Ready for planning
**Source:** Phase 10 UAT diagnosis (10-UAT.md commit 92703d2 + 084ad57) + POLISH-01 spec (docs/cutover-checklist.md)

<domain>
## Phase Boundary

This phase closes the launch-blocking responsive gap diagnosed during Phase 10 UAT (test 8, severity major) and ships POLISH-01 cookie-banner placement that was deferred from Phase 10 as non-blocking. After Phase 11, the Astro build must render correctly at 320–425px viewport widths (iPhone SE, foldables in single-pane mode, small Androids) and present the EU cookie banner as a brand-aligned bottom-left card without competing with the sticky `.btn-tickets` Book Now CTA.

**In-scope:**
- Add `@media (max-width: 480px)` tier to 5 shared CSS files and 6 page-local partials that currently jump from tablet (≤768px) sizing straight to 320px viewport.
- Switch `vanilla-cookieconsent` from `.cm--cloud` bottom-center to `.cm--box` bottom-left card per POLISH-01 spec — CSS-only, no JS or markup changes.
- Add a Playwright smoke assertion at 375×667 (iPhone SE) for 3–4 representative pages covering: no horizontal scroll, footer-legal row wraps, `.location-btn` ≥ 44×44px tap target.
- Update ROADMAP Phase 11 Goal/Requirements (currently "TBD").

**Out-of-scope (defer / not applicable):**
- Pages not yet migrated to Astro: brussels, dallas, gift-cards, lincoln, manassas, missions, mount-prospect, orland-park, west-nyack. The Phase 10 UAT root_cause listed 15 partials but 9 of them don't exist as `*-inline.raw.css.txt` files yet because the corresponding `.astro` pages haven't been created. Those pages will get their ≤480 tier when they're migrated in a later phase.
- Fluid typography via `clamp()` — explicitly rejected by Phase 10 diagnosis (visual-parity risk per project CLAUDE.md, no size tokens exist to retrofit, tap-target precision concerns).
- New design tokens for fluid size scale.
- Banner copy/JS/markup changes (vanilla-cookieconsent gate behavior in `js/cookie-consent.js` stays untouched).
- `.btn-tickets` minimum size changes (already meets ≥48px desktop / ≥44px mobile from Phase 10 — verify only).

</domain>

<decisions>
## Implementation Decisions

### Approach (locked by Phase 10 diagnosis)

- **D-A1: Per-element `@media (max-width: 480px)` rules** — every affected element gets an explicit ≤480px rule. Mirror the pattern already shipped in `index-inline.raw.css.txt`, `antwerp-inline.raw.css.txt`, `philadelphia-inline.raw.css.txt`. NO `clamp()` typography refactor.
- **D-A2: Visual parity is the design contract** — per CLAUDE.md project constraint. Changes are responsive resizing only. No copy edits, no color changes, no animation changes.
- **D-A3: Tap targets stay ≥44px** — every reduced button/link must keep `min-height: 44px` (and 48px for `.btn-tickets`). `npm run check:tap-targets` must continue exiting 0.
- **D-A4: Use existing CSS files** — no new CSS files for the responsive tier. Add the `@media` block at the end of each file that needs it.

### Cookie banner (POLISH-01 — locked by docs/cutover-checklist.md lines 70–98)

- **D-B1: Layout** — bottom-left card, 380px max-width desktop / `calc(100vw - 32px)` mobile. Anchor 16–24px from bottom and left edges. Z-index above page content but below `.btn-tickets` on mobile so the sticky CTA stays clickable through the gap.
- **D-B2: Visual treatment** — dark surface `rgba(20,20,24,0.92)` background + `backdrop-filter: blur(12px) saturate(1.1)`, 1px `var(--orange)` border at 18% opacity, 12px radius, `0 10px 40px rgba(0,0,0,0.4)` shadow.
- **D-B3: Hierarchy** — Orbitron 14px uppercase heading; DM Sans 14px body; equal-prominence Accept all (`var(--orange)` filled) and Reject all (outlined `var(--orange)`); Manage Preferences as text-only tertiary below the button row.
- **D-B4: Motion** — slide-up + fade in 220ms `cubic-bezier(0.32, 0.72, 0, 1)` on mount.
- **D-B5: Mobile (< 640px)** — full-width minus 16px gutter, anchored 16px above bottom edge to clear iOS Safari home indicator. Buttons stack vertically with 8px gap; Accept on top.
- **D-B6: Implementation surface** — `vanilla-cookieconsent` exposes `.cm--cloud` / `.cm--bar` / `.cm--box` layout classes. Switch to `.cm--box` and override position + alignment in `css/cookie-consent.css`. CSS-only; no changes to `js/cookie-consent.js`.

### Files in scope (verified to exist + lack ≤480px tier)

**Shared CSS** (`css/`):
- `css/nav.css` — `.btn-tickets` padding/font-size reduction preserving `min-height: 44px`; `.nav-logo` min-width reduction; `.nav` padding `0.625rem 0.75rem`. At 320–375px the location button (44px) + brand mark + Book Now currently exceeds viewport width.
- `css/footer.css` — `.footer-legal` row needs `flex-wrap: wrap` cleanly at ≤425px; `.footer` padding currently 32px sides eats useful width below 375px → reduce to `2.5rem 1.25rem`.
- `css/faq.css` — `.faq-question` padding `16px`, font-size `15px` at ≤480px (currently only has 768px tier).
- `css/base.css` — `.page-header` padding-top reduction at ≤480px (currently 768 tier only).
- `css/newsletter.css` — review form layout / button stacking at ≤480px.

**Page-local partials** (`src/partials/`):
- `src/partials/about-inline.raw.css.txt` (29.9K, no ≤480 rules)
- `src/partials/contact-inline.raw.css.txt` (12.2K, no ≤480 rules)
- `src/partials/faq-inline.raw.css.txt` (7.2K, no ≤480 rules)
- `src/partials/locations-inline.raw.css.txt` (10.1K, no ≤480 rules)
- `src/partials/birthdays-inline.raw.css.txt` (20.0K) — used by ALL 6 group event pages (`birthdays`, `corporate`, `field-trips`, `bachelor-ette`, `holidays`, `private-events`) via shared `groupEventPageCss` import. Has 1 existing ≤480 rule for `.groups-cta-buttons`; needs more for hero h1, multi-column grids → 1fr.
- `src/partials/legal-inline.raw.css.txt` (1.3K, no ≤480 rules) — used by 6 legal pages (terms, privacy, code-of-conduct, accessibility, cookies, waiver). Small file; minor adjustments needed.
- `src/partials/houston-inline.raw.css.txt` (81.5K) — has 2 hits but they are `max-width: 480px;` width constraints, not media queries. Add tier following the index/antwerp/philly pattern.

**Reference partials (already shipped — mirror these patterns):**
- `src/partials/index-inline.raw.css.txt` — see `.groups-cta-buttons` block lines around the `@media (max-width: 480px)` rule for the intended pattern.
- `src/partials/antwerp-inline.raw.css.txt`
- `src/partials/philadelphia-inline.raw.css.txt`

**Cookie banner CSS:**
- `css/cookie-consent.css` (810B) — currently small override file; expand to implement POLISH-01.

**Smoke test:**
- `tests/smoke/site.spec.js` — add `test.describe('small mobile (375x667)', ...)` block with viewport override and assertions for index, antwerp, faq, locations.

### Wave structure

- **Wave 1 (parallel):** shared CSS responsive tier + page-local partials responsive tier + cookie banner CSS rewrite. These touch independent files.
- **Wave 2 (sequential after wave 1):** Playwright smoke assertion at 375×667 — depends on the CSS work being in place to not produce flake.
- **Wave 3:** ROADMAP goal/requirements update + verification chain (`npm run verify`).

### Claude's Discretion

- Exact pixel/rem values inside each `@media (max-width: 480px)` block — pick sensible numbers that mirror the index/antwerp/philly precedent. Document any non-obvious reduction with a brief WHY comment if it isn't a straight pattern match.
- Which exact 3–4 pages to assert in the smoke test (index + antwerp are mandatory; pick 1–2 more from faq/locations/about/contact).
- Whether to consolidate the cookie banner overrides into a single `@media` block or split between desktop and `< 640px` mobile.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Diagnosis & spec
- `.planning/phases/10-audit-gap-closure-cutover-readiness/10-UAT.md` — Phase 10 UAT test 8 (`Mobile location-tap regression`) gap entry. Includes root_cause and `missing` list — this is the de-facto requirements source for Phase 11 responsive work.
- `docs/cutover-checklist.md` lines 70–98 (POLISH-01) — Cookie banner placement spec including exact CSS values, motion easing, mobile breakpoint, and pass criteria.

### Reference implementations (responsive ≤480 pattern already shipped)
- `src/partials/index-inline.raw.css.txt` — example `@media (max-width: 480px)` block for `.groups-cta-buttons`. Mirror this style and depth.
- `src/partials/antwerp-inline.raw.css.txt` — full location-page treatment.
- `src/partials/philadelphia-inline.raw.css.txt` — full location-page treatment.

### Project constraints
- `CLAUDE.md` (root) — visual parity rule; static-site conventions; tap-target script `npm run check:tap-targets`.
- `.claude/CLAUDE.md` — design token sources (`css/variables.css` for `--orange`, `--display`, `--body`).
- `playwright.config.js` — `mobile` project (Pixel 5 = 393×851) is already wired; add new viewport in test override rather than as a new project unless the planner decides otherwise.

### Verification surface
- `package.json` `verify` / `verify:phase10` scripts — must continue exiting 0.
- `tests/smoke/site.spec.js` — extend with the 375×667 assertion block.
- `npm run check:tap-targets` — must continue passing after CSS reductions.

</canonical_refs>

<specifics>
## Specific Ideas

- The Phase 10 UAT root_cause names exact CSS file targets and the rationale for the per-element approach. Treat that text as the implementation brief — copy the directives verbatim into PLAN tasks where they're concrete (e.g., `.footer padding 2.5rem 1.25rem`, `.nav padding 0.625rem 0.75rem`).
- POLISH-01 in `docs/cutover-checklist.md` provides exact rgba values, easing curve, gutter, and z-index intent — these go directly into the `css/cookie-consent.css` override block.
- The smoke assertion should at minimum verify: `expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)` (no horizontal scroll), `.location-btn` bounding box ≥ 44×44, `.footer-legal` children stack/wrap (test by computing total width vs. row width).

</specifics>

<deferred>
## Deferred Ideas

- Migrating the 9 not-yet-Astro pages (brussels, dallas, gift-cards, lincoln, manassas, missions, mount-prospect, orland-park, west-nyack) is out of scope — handled in a future migration phase. They will adopt the same per-element ≤480 pattern when they land.
- Fluid clamp()-based typography refactor and a size-scale token set — explicitly rejected per Phase 10 diagnosis. Revisit only after launch and only if maintenance overhead of per-element rules becomes a real cost.
- Banner color customization beyond POLISH-01 spec, custom illustration, or animation tweaks — out of POLISH-01 scope.
- Visual regression snapshots for ≤480px (covered separately by `tests/smoke/visual.spec.js` if desired in a follow-up).

</deferred>

---

*Phase: 11-small-mobile-responsiveness-480px-tier-cookie-banner-placeme*
*Context gathered: 2026-05-05 — derived from Phase 10 UAT diagnosis (no separate /gsd-discuss-phase run)*
