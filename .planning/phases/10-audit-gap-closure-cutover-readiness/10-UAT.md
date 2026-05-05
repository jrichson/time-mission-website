---
status: complete
phase: 10-audit-gap-closure-cutover-readiness
source:
  - 10-01-SUMMARY.md
  - 10-02-SUMMARY.md
  - 10-03-SUMMARY.md
  - 10-04-SUMMARY.md
  - 10-05-SUMMARY.md
  - 10-06-SUMMARY.md
  - 10-07-SUMMARY.md
started: 2026-05-05T00:00:00Z
updated: 2026-05-05T10:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Verify chain — npm run verify:phase10
expected: Run `npm run verify:phase10` from repo root. Exits 0; prints "verify-site-output.mjs: all steps passed."; all 18 stages pass.
result: pass

### 2. Skip-link on focus (a11y SSR landmarks — 10-01)
expected: Open `dist/index.html` in browser. Press Tab once. A "Skip to main content" link appears visibly at the top-left of the viewport, focused. Press Enter and focus jumps to `<main id="main">` (page scroll position resets / focus indicator on main content).
result: pass

### 3. Antwerp page renders with nl-BE lang (10-04)
expected: Navigate to `/antwerp` (or `dist/antwerp.html`). Page loads with shared site nav, hero video, content sections, and footer. View source / DevTools shows `<html lang="nl-BE">` (not `lang="en"`). Brand chrome present. Schema includes `"name":"Time Mission Antwerp"`.
result: pass

### 4. Six legal pages render with brand chrome (10-03)
expected: Navigate in turn to `/terms`, `/code-of-conduct`, `/licensing`, `/cookies`, `/accessibility`, `/waiver`. Each loads with the shared nav, page-header section, legal-page content section, and footer. No raw HTML / missing styles. BreadcrumbList renders implicitly via JSON-LD (visible via View Source).
result: pass

### 5. Cookie banner appears on EU page (10-06)
expected: Open `/antwerp` in incognito browser window. Cookie banner appears bottom-center within ~1s with heading "We use cookies", description text, and three buttons: "Accept all", "Reject all", "Manage Preferences" (NOT "Customize").
result: pass
note: Banner copy and behavior match spec. Placement deferred to POLISH-01 in docs/cutover-checklist.md (non-blocking — bottom-left card layout per ui-design-brain recommendation).

### 6. Cookie banner does NOT appear on US page (10-06 D-03)
expected: Open `/` (or `/philadelphia`) in a fresh incognito window. NO cookie banner appears. Page renders normally.
result: pass

### 7. Footer "Cookie Preferences" re-opens modal (10-06)
expected: On `/antwerp`, scroll to footer. Click the "Cookie Preferences" link/button in the footer-legal area. The Cookie Preferences modal opens showing toggles for Necessary (locked on), Analytics (off by default), Marketing (off by default).
result: pass

### 8. Mobile location-tap regression (P0-7a — 10-02)
expected: Open DevTools, switch to Pixel 5 (or any ~393×851 mobile) viewport, reload `/`. Tap the "Location" button in nav — `#locationDropdown` opens. Tap a city link (e.g., Philadelphia). Location info displays AND the dropdown does NOT close on first tap (no double-tap required).
result: issue
reported: "on small screens 425 and below - we have some serious responsiveness issues with button sizes, copy sizes, footer links not stacking, etc"
severity: major

### 9. Tap targets feel comfortable on touch (10-06)
expected: On a touch device or DevTools touch emulation, the "Book Now" button (`.btn-tickets`) and the Location button (`.location-btn`) are easy to tap accurately on first try — no tiny hit areas. Both visibly ≥44px tall (Book Now ≥48px desktop).
result: pass

### 10. Cutover checklist present and complete (10-07)
expected: Open `docs/cutover-checklist.md`. File exists with: Code Changes auto-verified table (maps to audit findings P0-4 through P2-10), Host Dependencies table with 7 rows (P1-7, P1-10, P1-11, P1-17, P2-8, P2-9, P2-10) each with Owner / Action / Verification Step / `[ ]` checkbox, Manual Reviews section (P2-6 + P1-12), Final Pre-Cutover Sequence (8 steps), and cross-links to rollback-runbook / cloudflare-preview-validation / roller-booking-launch-checklist.
result: pass

## Summary

total: 10
passed: 9
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Site renders correctly on small mobile screens (≤425px width — iPhone SE, small Androids, foldables in single-pane mode)"
  status: failed
  reason: "User reported: on small screens 425 and below - we have some serious responsiveness issues with button sizes, copy sizes, footer links not stacking, etc"
  severity: major
  test: 8
  artifacts: []
  missing: []
  diagnosis_hint: |
    Shared CSS (css/nav.css, css/base.css, css/footer.css, css/newsletter.css, css/faq.css)
    has breakpoints at 768px and 1024px only. css/ticket-panel.css has one at 400px.
    No ≤480px tier exists in shared CSS. Page-local partials only have @media (max-width: 480px)
    in 3 of ~12 inline.raw.css.txt files (index, antwerp, philadelphia). Likely root cause:
    layouts that compress acceptably at 768px don't have a second compression tier for
    small phones, so footer columns, button rows, and body copy stay at 768px sizing
    down through 320px viewport.
