---
status: diagnosed
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
  root_cause: "Shared CSS (base.css, nav.css, footer.css, newsletter.css, faq.css) has only 768px and 1024px @media breakpoints — no third tier for ≤480px small mobile. Three page-local partials (index, philadelphia, antwerp) already use @media (max-width: 480px), but 15 of 18 partials do not. Result: layouts that compress at 768px keep tablet sizing all the way down to 320px viewport. Typography is not fluid (no clamp() size tokens — only font-family tokens), so single-token fix is not viable. Each affected element needs an explicit ≤480px rule."
  artifacts:
    - path: "css/footer.css"
      issue: "footer-legal row doesn't wrap cleanly at ≤425; .footer padding (32px sides) eats useful width below 375px"
    - path: "css/nav.css"
      issue: ".btn-tickets and .nav-logo don't tighten at ≤480 — at 320–375 with location-btn (44px) + brand mark + tickets, total exceeds viewport"
    - path: "css/faq.css"
      issue: "no ≤480 padding/font-size reduction (768 only)"
    - path: "css/base.css"
      issue: "page-header padding has 768 tier only; no ≤480 reduction"
    - path: "src/partials/{about,brussels,contact,dallas,faq,gift-cards,groups,houston,lincoln,locations,manassas,missions,mount-prospect,orland-park,west-nyack}-inline.raw.css.txt"
      issue: "15 partials missing @media (max-width: 480px) tier; hero h1, CTAs, grids, stat cards, testimonials don't recompress for small phones"
  missing:
    - "Add @media (max-width: 480px) tier to css/footer.css (footer-legal flex-wrap, .footer padding 2.5rem 1.25rem)"
    - "Add @media (max-width: 480px) tier to css/nav.css (.btn-tickets padding/font-size reduction preserving min-height: 44px; .nav-logo min-width 88px; .nav padding 0.625rem 0.75rem)"
    - "Add @media (max-width: 480px) tier to css/faq.css (.faq-question padding 16px, font-size 15px)"
    - "Optional: add @media (max-width: 480px) tier to css/base.css (.page-header padding-top reduction)"
    - "Add @media (max-width: 480px) tier to 15 page-local partials following the index/philadelphia/antwerp pattern (hero h1, .cta-row → column stack + 100% width, multi-column grids → 1fr)"
    - "Add Playwright smoke assertion at viewport 375×667 for 3-4 representative pages (no horizontal scroll, footer-legal wraps, .location-btn = 44×44)"
    - "Approach: per-element @media (max-width: 480px) rules — NOT clamp() typography refactor (visual-parity risk per CLAUDE.md; no size tokens exist to retrofit; tap-target precision concerns)"
  debug_session: "(inline diagnosis from gsd-debugger agent — see commit 92703d2 → diagnose run 2026-05-05)"
