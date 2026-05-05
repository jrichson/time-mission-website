---
phase: 11-small-mobile-responsiveness-480px-tier-cookie-banner-placeme
plan: "01"
subsystem: css-responsive
tags: [responsive, mobile, css, nav, footer, faq, base, newsletter]
dependency_graph:
  requires: []
  provides: ["≤480px responsive tier in all 5 shared CSS files"]
  affects: ["every page that loads css/nav.css, css/footer.css, css/faq.css, css/base.css, css/newsletter.css"]
tech_stack:
  added: []
  patterns: ["per-element @media (max-width: 480px) tier appended at file end, mirroring index/antwerp/philly pattern"]
key_files:
  modified:
    - css/nav.css
    - css/footer.css
    - css/faq.css
    - css/base.css
    - css/newsletter.css
decisions:
  - "Per-element 480px rules (no clamp()) per D-A1 — visual-parity constraint from CLAUDE.md"
  - "min-height: 48px preserved on .btn-tickets in ≤480 override per D-A3 tap-target floor"
  - "All blocks appended at file end per D-A4 — no new CSS files"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-05"
  tasks_completed: 2
  files_modified: 5
---

# Phase 11 Plan 01: Add ≤480px Responsive Tier to 5 Shared CSS Files — Summary

**One-liner:** Per-element `@media (max-width: 480px)` tier appended to all 5 shared CSS files (nav, footer, faq, base, newsletter), closing the shared-chrome half of the Phase 10 UAT test-8 responsive gap for 320–425px viewports.

## What Was Done

Appended one `@media (max-width: 480px)` block to the end of each of the 5 shared CSS files. No existing rules were modified or removed. No new files were created.

### Task 1: css/nav.css + css/footer.css (commit c7ccb32)

**css/nav.css** — 35 lines added (lines 979–1009):
- `.ticker-item`: font-size 0.55rem, letter-spacing 0.12em — prevents ticker overflow at 320px
- `.nav`: padding reduced to `0.625rem 0.75rem` so location-btn (44px) + brand mark + Book Now fit ≤375px without overflow
- `.nav-left` / `.nav-right`: gap reduced to 0.5rem
- `.nav-logo img`: height 32px, min-width 88px (per UAT directive)
- `.btn-tickets`: `min-height: 48px` preserved (tap-target floor); padding/font-size reduced for compact fit

**css/footer.css** — 40 lines added (lines 432–467):
- `.footer`: side padding reduced to 1.25rem (from 4rem) to recover useful width below 375px
- `.footer-grid`: gap tightened to 1.5rem
- `.footer-newsletter`: padding reduced to 1.5rem 1rem
- `.footer-bottom`: gap reduced, text-align center
- `.footer-legal`: `flex-wrap: wrap` + `justify-content: center` so legal links wrap cleanly at ≤425px
- `.footer-legal a`: font-size 0.7rem

### Task 2: css/faq.css + css/base.css + css/newsletter.css (commit f1eb95c)

**css/faq.css** — 23 lines added (lines 175–193):
- `.faq-question`: padding 1rem 1rem (from 1.25rem), gap 0.75rem — prevents 4+ line question wraps on iPhone SE; vertical padding 16px keeps combined row height ≥ 44px
- `.faq-question h3/h4/.faq-question-text`: font-size 0.9rem
- `.faq-answer-content`: padding 0 1rem 1rem, font-size 0.85rem

**css/base.css** — 19 lines added (lines 166–181):
- `.page-header`: padding reduced to `6.5rem 1rem 2rem` (from 8rem 1.5rem 3rem at 768) — hero title visible above fold
- `.page-header::before`: constrained to 480×480px
- `.section-badge`: font-size 0.6rem, padding tightened

**css/newsletter.css** — 32 lines added (lines 171–199):
- `.newsletter-section`: padding 4rem 1rem
- `.newsletter-inner > p`: font-size 0.95rem
- `.newsletter-form`: gap 0.5rem
- `input`: padding/font-size reduced for narrow columns
- `.btn-subscribe`: min-width 8rem, padding/font-size reduced
- `.newsletter-legal`: font-size 0.78rem

## Verification

```
node scripts/check-tap-targets.js
→ check-tap-targets passed: 7/9 selectors validated against css/base.css + css/nav.css.
  note: .btn-secondary: not found (page-local; skipped)
  note: .btn-primary: not found (page-local; skipped)
```

All 5 files confirmed to contain `@media (max-width: 480px)` block. No existing rules modified.

## Deviations from Plan

None — plan executed exactly as written. All verbatim values from the action were used without modification.

## Known Stubs

None — this plan modifies shared CSS only; no data flow or rendering stubs exist.

## Threat Flags

None — CSS-only changes, no new network surface, no script execution, no data flow changes.

## Self-Check: PASSED

- `css/nav.css` exists and contains `@media (max-width: 480px)` at line 979
- `css/footer.css` exists and contains `@media (max-width: 480px)` at line 432
- `css/faq.css` exists and contains `@media (max-width: 480px)` at line 175
- `css/base.css` exists and contains `@media (max-width: 480px)` at line 166
- `css/newsletter.css` exists and contains `@media (max-width: 480px)` at line 171
- Task 1 commit c7ccb32 confirmed in git log
- Task 2 commit f1eb95c confirmed in git log
- `check-tap-targets` exits 0 after all edits
