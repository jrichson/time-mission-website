---
phase: 11-small-mobile-responsiveness-480px-tier-cookie-banner-placeme
reviewed: 2026-05-05T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - css/nav.css
  - css/footer.css
  - css/faq.css
  - css/base.css
  - css/newsletter.css
  - css/cookie-consent.css
  - src/partials/about-inline.raw.css.txt
  - src/partials/contact-inline.raw.css.txt
  - src/partials/faq-inline.raw.css.txt
  - src/partials/locations-inline.raw.css.txt
  - src/partials/legal-inline.raw.css.txt
  - src/partials/birthdays-inline.raw.css.txt
  - src/partials/houston-inline.raw.css.txt
  - tests/smoke/site.spec.js
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: minor-issues
---

# Phase 11: Code Review Report

**Reviewed:** 2026-05-05
**Depth:** standard
**Files Reviewed:** 14
**Status:** minor-issues

## Summary

Phase 11 shipped two distinct workstreams: (1) `@media (max-width: 480px)` responsive blocks appended to 13 CSS files, and (2) a full rewrite of `css/cookie-consent.css` implementing the POLISH-01 bottom-left card placement. The new Playwright `test.describe('small mobile (375x667)')` block closes the Phase 10 UAT gap.

The responsive CSS work is well-disciplined: tap-target floors are preserved, `prefers-reduced-motion` is respected, `env(safe-area-inset-*)` is carried through in the cookie banner, and CSS variable tokens are used throughout. No security issues, no bugs in the responsive rules themselves.

Two warnings deserve attention before cutover: one is a CSS specificity mismatch in the cookie banner that will prevent the intended bottom-left placement at desktop widths, and one is a loose test assertion on tap-target height that could pass even if the 48px min-height regresses. Two info items note minor style inconsistencies that do not affect correctness.

---

## Warnings

### WR-01: Cookie banner position override will not take effect at desktop — JS sets `position: 'bottom center'`, CSS targets `.cm--box` without overriding the library's position classes

**File:** `css/cookie-consent.css:39-58`
**Issue:**
The vanilla-cookieconsent library reads `guiOptions.consentModal.position` from JS and appends the corresponding BEM modifier classes to the consent modal element. With `position: 'bottom center'` (set in `js/cookie-consent.js:59`), the library adds `cm--bottom` and `cm--center` to the element alongside `cm--box`. The library's own stylesheet positions each layout+position combination using rules like `.cm--box.cm--bottom.cm--center { bottom: 16px; ... }` which place it centered at the bottom.

The Phase 11 CSS adds `position: fixed; bottom: 24px; left: 24px; right: auto;` to `.cm--box` and `.cm.cm--box` (lines 39-58). However, the library's more specific `.cm--box.cm--bottom.cm--center` rule (which carries three classes) will win over the two-class `.cm--box` / `.cm.cm--box` rule when both apply — unless the library's rules happen to not set `left`/`right`. The outcome depends entirely on rule ordering and the library's specificity. If the library loads its stylesheet after `cookie-consent.css`, its position rules will override the Phase 11 intent, rendering the bottom-left placement ineffective at desktop widths.

To guarantee the intended bottom-left placement, the CSS selector must be at least as specific as the library's position selector, or must use `!important` sparingly on only the position properties.

**Impact:** POLISH-01 (the primary deliverable of the cookie banner sub-phase) may silently not apply at desktop viewports, leaving the banner centered rather than bottom-left. The `≤640px` mobile block already overrides to full-width and is not affected since it covers the entire width anyway.

**Suggested fix:**
Add position-class-qualified selectors alongside the current `.cm--box` rule:
```css
.cm--box,
.cm.cm--box,
.cm--box.cm--bottom.cm--center,
.cm--box.cm--bottom.cm--left {
    position: fixed;
    bottom: 24px;
    left: 24px;
    right: auto;
    top: auto;
    /* rest of D-B1 properties */
}
```
Alternatively, add `!important` to only `left`, `right`, and `bottom` — the three positioning properties the library might override — rather than the entire block.

**Confidence:** medium (depends on library stylesheet load order; requires browser QA to confirm)

---

### WR-02: Test `book-now button` assertion uses `≥44` floor for a button required to be `≥48px`

**File:** `tests/smoke/site.spec.js:298`
**Issue:**
The test comment on line 297 says "`.btn-tickets` keeps `min-height: 48px` desktop floor in `nav.css` ≤480 block (D-A3)" but the assertion on line 298 only checks `box.height >= 44`:

```js
expect(box.height).toBeGreaterThanOrEqual(44); // mobile floor; 48 still preserved at 375 in our ≤480 rule
```

The inline comment acknowledges 48px is the preserved floor, but the assertion only enforces 44px. If a future change accidentally reduces `min-height` on `.btn-tickets` from 48px to 46px, this test will not catch the regression. The `check:tap-targets` script enforces 48px in a static analysis pass, but the Playwright test — which exercises the actual rendered layout — should guard the same boundary.

**Impact:** Test coverage gap. A rendering regression reducing `.btn-tickets` from 48px to anywhere in the [44,48) range would go undetected in the smoke suite.

**Suggested fix:**
```js
// .btn-tickets preserves 48px min-height per D-A3, even on small mobile
expect(box.height).toBeGreaterThanOrEqual(48);
```
Remove the comment that weakens the intent.

**Confidence:** high

---

## Info

### IN-01: `legal-inline.raw.css.txt` ≤480 block increases `h2` font-size from `1rem` to `1.25rem`

**File:** `src/partials/legal-inline.raw.css.txt:81`
**Issue:**
The base rule for `.legal-page h2` sets `font-size: 1rem` (line 11). The `@media (max-width: 480px)` block on line 81 overrides it to `font-size: 1.25rem`. This means legal section headings are 25% larger on small phones than on desktop — the inverse of the general Phase 11 approach (tightening sizes for narrow viewports). The intent may have been to improve readability at small sizes, but it runs counter to the visual-parity constraint.

**Impact:** Not a bug; legal pages still render correctly. The increase is small and does not cause overflow. However it is the only element across all 13 reviewed files where the ≤480px block makes type larger rather than smaller or equal.

**Suggested fix:** If the increase is intentional for legibility, add a comment noting it. If unintentional, revert to `1rem` or an intermediate size like `0.95rem`:
```css
.legal-page h2 { font-size: 0.95rem; }
```

**Confidence:** medium (may be intentional; does not break anything)

---

### IN-02: `contact-inline.raw.css.txt` ≤480 block keeps `page-header` top padding at `100px` (pixel value), inconsistent with `base.css` shift to `6.5rem`

**File:** `src/partials/contact-inline.raw.css.txt:456`
**Issue:**
`css/base.css` reduces `.page-header` top padding to `6.5rem` (≈104px) at `≤480px` (line 167). The contact page partial's inline `@media (max-width: 480px)` block sets `padding: 100px 1rem 2rem` (line 456), which uses a raw pixel value (`100px`) rather than a rem unit. This is a minor inconsistency with the project convention of using rem values and also slightly undercuts `base.css`'s `6.5rem` — but since the contact partial rule is scoped inside a `<style>` block in the Astro page, it will take precedence over `base.css`, so the contact page will use `100px` not `6.5rem`.

The practical delta is tiny (4px at default font size), but it uses a magic pixel number where the rest of the codebase uses rem, and it defeats the `base.css` change for this one page without a comment explaining why.

**Impact:** Cosmetically minor; no overflow or layout breakage.

**Suggested fix:** Align with rem units and consider whether the contact page should also use `6.5rem`:
```css
@media (max-width: 480px) {
    .page-header { padding: 6.5rem 1rem 2rem; }
    /* ... rest of block */
}
```

**Confidence:** high (factual inconsistency; low severity)

---

## Verdict

**minor-issues** — Two warnings, both fixable before or at cutover:

1. WR-01 (cookie banner placement specificity) is the more consequential: if the library's stylesheet loads after `cookie-consent.css`, POLISH-01 placement will not visually apply at desktop. This needs browser QA confirmation and a selector fix if confirmed.
2. WR-02 (test assertion floor) is a test coverage gap that does not block launch but should be tightened.

The responsive CSS work (≤480px blocks across shared CSS and partials) is clean, correctly preserves tap targets, and respects `prefers-reduced-motion`. No regressions to existing rules were found.

---

_Reviewed: 2026-05-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
