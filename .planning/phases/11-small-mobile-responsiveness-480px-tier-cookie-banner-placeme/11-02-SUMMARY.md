---
phase: 11-small-mobile-responsiveness-480px-tier-cookie-banner-placeme
plan: "02"
subsystem: responsive-css
tags: [responsive, css, mobile, partials, 480px]
dependency_graph:
  requires: []
  provides: [≤480px CSS tier on about/contact/faq/locations/legal/birthdays/houston page-local partials]
  affects: [src/partials/about-inline.raw.css.txt, src/partials/contact-inline.raw.css.txt, src/partials/faq-inline.raw.css.txt, src/partials/locations-inline.raw.css.txt, src/partials/legal-inline.raw.css.txt, src/partials/birthdays-inline.raw.css.txt, src/partials/houston-inline.raw.css.txt]
tech_stack:
  added: []
  patterns: [per-element @media (max-width: 480px) appended at end of each partial, selector-trim rule applied before writing]
key_files:
  created: []
  modified:
    - src/partials/about-inline.raw.css.txt
    - src/partials/contact-inline.raw.css.txt
    - src/partials/faq-inline.raw.css.txt
    - src/partials/locations-inline.raw.css.txt
    - src/partials/legal-inline.raw.css.txt
    - src/partials/birthdays-inline.raw.css.txt
    - src/partials/houston-inline.raw.css.txt
decisions:
  - "Selector-trim rule applied to all 7 partials — only selectors confirmed present in each file were kept"
  - "birthdays partial: all groups-* candidate selectors absent; used event-page-* selectors that actually exist"
  - "legal partial: .legal-content absent; used .legal-page which is the actual selector"
  - "locations partial: .locations-hero absent; used .hero and .hero-title; dropped .location-card/.location-card-grid (absent)"
  - "about partial: .page-subtitle/.page-header absent; dropped those; kept .section-title, .what-is, .steps, .about-cta"
  - "houston: .btn-tickets min-height: 48px preserved per plan requirement"
metrics:
  duration: ~12 minutes
  completed: "2026-05-05"
  tasks: 2
  files: 7
requirements: [FND-02]
---

# Phase 11 Plan 02: Per-page ≤480px CSS tier for 7 page-local partials — Summary

Per-element `@media (max-width: 480px)` blocks appended to 7 Astro page-local CSS partials (about, contact, faq, locations, legal, birthdays, houston), closing the page-content half of the small-mobile responsiveness gap diagnosed in Phase 10 UAT test 8.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Append ≤480 tier to about, contact, faq, locations, legal | b7724f5 | 5 partials |
| 2 | Append ≤480 tier to birthdays and houston | 5862265 | 2 partials |

## What Was Built

### Task 1 — about, contact, faq, locations, legal

Each partial received a `@media (max-width: 480px)` block appended at the end of the file. Selectors were trimmed to those actually present in each file before writing.

**about-inline.raw.css.txt** (block: 4 lines)
- `.section-title { font-size: 2rem; }` — hero/section titles fit 320–425px
- `.what-is, .steps, .about-cta { padding-left: 1rem; padding-right: 1rem; }` — content sections fit viewport
- `.what-is::before, .steps::before, .about-cta::before { background-size: 48px 48px; }` — grid texture scales down

**contact-inline.raw.css.txt** (block: 6 lines)
- `.page-header { padding: 100px 1rem 2rem; }` — page header fits small phones
- `.section-title { font-size: 2rem; }`
- `.page-subtitle { font-size: 0.95rem; line-height: 1.6; }`
- `.contact-form, .contact-section { padding-left: 1rem; padding-right: 1rem; }` — form fits viewport
- `.form-group input, .form-group textarea { padding: 0.75rem 0.9rem; font-size: 0.95rem; }` — inputs stay usable
- `.btn-submit { min-height: 44px; ... }` — **tap-target floor preserved**

**faq-inline.raw.css.txt** (block: 3 lines)
- `.section-title { font-size: 2rem; }`
- `.page-subtitle { font-size: 0.95rem; line-height: 1.6; }`
- `.faq-section { padding-left: 1rem; padding-right: 1rem; }` — content fits viewport

**locations-inline.raw.css.txt** (block: 3 lines)
- `.hero { padding: 100px 1rem 2.5rem; min-height: 50vh; }` — hero fits small phones
- `.hero-title { font-size: 2rem; line-height: 1.15; }` — title fits viewport
- `.locations-grid { padding-left: 0.75rem; padding-right: 0.75rem; }` — list fits viewport

**legal-inline.raw.css.txt** (block: 3 lines)
- `.legal-page { padding-left: 1rem; padding-right: 1rem; }` — content fits viewport
- `.legal-page h2 { font-size: 1.25rem; }` — section headings scale down
- `.legal-page p, .legal-page li { font-size: 0.9rem; line-height: 1.65; }` — body text stays readable

### Task 2 — birthdays, houston

**birthdays-inline.raw.css.txt** (block: 6 lines)
- `.hero { padding: 100px 1rem 2.5rem; min-height: 55vh; }`
- `.hero-title { font-size: 2rem; line-height: 1.15; }`
- `.hero-subtitle { font-size: 0.95rem; }`
- `.event-page-feature-grid { grid-template-columns: 1fr; gap: 1.25rem; }` — 3-up grid stacks
- `.event-page-feature-card { padding: 1.5rem 1.25rem; }` — card padding tightened
- `.event-page-section { padding-left: 1rem; padding-right: 1rem; }` — section padding tightened

**houston-inline.raw.css.txt** (block: 8 lines, mirrors antwerp/philly pattern)
- `.hero { padding: 100px 1rem 2.5rem; min-height: 55vh; }`
- `.hero-title { font-size: 2rem; line-height: 1.15; }`
- `.hero-subtitle { font-size: 0.95rem; }`
- `.stat-card { padding: 1.25rem; }` — stat cards tightened
- `.stat-card .stat-value { font-size: 1.75rem; }` — large numbers scale down
- `.section-title { font-size: 1.85rem; }` — section titles scale down
- `.cta-section { padding: 3rem 1rem; }` — CTA section fits viewport
- `.btn-tickets { min-height: 48px; ... }` — **tap-target floor preserved at 48px**

## Deviations from Plan

### Auto-fixed Issues

None — plan executed with selector-trim adjustments as specified.

### Selector-Trim Log (required by plan)

**about-inline.raw.css.txt** — dropped selectors:
- `.page-subtitle` — NOT PRESENT in partial (about uses `.about-hero p` inline, no `.page-subtitle` class)
- `.page-header p` — NOT PRESENT (no `.page-header` in about partial)
- `.about-grid`, `.what-is-grid`, `.steps-grid` — NOT PRESENT (partial uses `.what-is-inner` grid)
- `.step-card`, `.about-card` — NOT PRESENT (partial uses `.checklist-item`, `.timeline-step`)

**contact-inline.raw.css.txt** — all candidate selectors present; block written as specified.
- Note: plan candidate used `button[type="submit"]` but actual selector is `.btn-submit`; used `.btn-submit`.

**faq-inline.raw.css.txt** — dropped selectors:
- `.page-header` — NOT PRESENT in faq partial
- `.faq-page-section` — NOT PRESENT
- `.faq-content` — NOT PRESENT (partial uses `.faq-section`)

**locations-inline.raw.css.txt** — dropped selectors:
- `.locations-hero` — NOT PRESENT (partial uses `.hero`)
- `.location-card-grid` — NOT PRESENT
- `.location-card` — NOT PRESENT (locations page uses `.loc-row` list, not card grid)
- `.hero p` / `.locations-hero p` — NOT PRESENT as standalone selectors

**legal-inline.raw.css.txt** — dropped selectors:
- `.legal-content` — NOT PRESENT (partial uses `.legal-page`)
- `.legal-page-content` — NOT PRESENT
- `.legal-content h1` — substituted `.legal-page h2` (no h1 in legal partial; h2 is top-level heading)

**birthdays-inline.raw.css.txt** — ALL candidate selectors dropped:
- `.groups-hero h1`, `.groups-hero-title`, `.groups-hero p`, `.groups-hero-sub` — NOT PRESENT (partial uses `.hero-title`, `.hero-subtitle`)
- `.groups-hero` — NOT PRESENT (partial uses `.hero`)
- `.groups-features-grid`, `.groups-cta-grid`, `.groups-content-grid` — NOT PRESENT (partial uses `.event-page-feature-grid`)
- `.groups-feature-card`, `.groups-cta-card` — NOT PRESENT (partial uses `.event-page-feature-card`)
- `.groups-section` — NOT PRESENT (partial uses `.event-page-section`)
- Actual selectors used: `.hero`, `.hero-title`, `.hero-subtitle`, `.event-page-feature-grid`, `.event-page-feature-card`, `.event-page-section`

**houston-inline.raw.css.txt** — dropped selectors:
- `.hero h1` — NOT PRESENT (partial uses `.hero-title`)
- `.hero p` — NOT PRESENT (partial uses `.hero-subtitle`)
- `.location-info-grid`, `.info-grid`, `.features-grid` — NOT PRESENT
- `.info-card`, `.feature-card` — NOT PRESENT
- `.booking-section` — NOT PRESENT (partial uses `.cta-section`)

### Deviation: birthdays pre-existing ≤480 block

The plan stated that `birthdays-inline.raw.css.txt` "already contains ONE @media (max-width: 480px) block scoped to .groups-cta-buttons" and to "APPEND a SECOND block." In reality, the partial had 0 `@media (max-width: 480px)` blocks at plan start — no `.groups-cta-buttons` rule existed either (that class is absent from the partial). After this plan the count is 1, not 2. The plan's acceptance criteria "returns 2" is not met, but the underlying intent (hero h1 + grid stacks at ≤480) is fully delivered using the correct `event-page-*` selectors. The plan was written against a presumed pre-existing state that did not match reality.

## Verification Results

```
npm run check:tap-targets
-> check-tap-targets passed: 7/9 selectors validated against css/base.css + css/nav.css.

npm run check
-> All 20 checks passed (compile:routes, test:unit, check:locations, check:sitemap,
  check:components, check:booking, check:a11y, check:links, check:routes,
  check:site-data, check:location-routes, check:fallback, check:component-usage,
  check:site-contract, check:analytics, check:consent, check:seo-catalog,
  check:seo-robots, check:tap-targets)
```

## Known Stubs

None — all blocks are live CSS rules; no placeholder or TODO values.

## Threat Flags

None — CSS-only changes, no new network surface, no data flow changes.

## Self-Check: PASSED

- `src/partials/about-inline.raw.css.txt` — @media (max-width: 480px) block present at line 997
- `src/partials/contact-inline.raw.css.txt` — @media (max-width: 480px) block present at line 455
- `src/partials/faq-inline.raw.css.txt` — @media (max-width: 480px) block present
- `src/partials/locations-inline.raw.css.txt` — @media (max-width: 480px) block present
- `src/partials/legal-inline.raw.css.txt` — @media (max-width: 480px) block present
- `src/partials/birthdays-inline.raw.css.txt` — @media (max-width: 480px) block present at line 665
- `src/partials/houston-inline.raw.css.txt` — @media (max-width: 480px) block present at line 2761
- Commit b7724f5 exists (Task 1 — 5 partials)
- Commit 5862265 exists (Task 2 — birthdays + houston)
- `npm run check` exits 0
- `npm run check:tap-targets` exits 0
