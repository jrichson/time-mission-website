---
phase: 10
plan: 01
status: complete
completed: 2026-05-04
addresses: [P1-3, P0-4-partial, P1-12]
requirements_addressed: [COMP-02]
---

## What Was Built

SSR-visible accessibility scaffolding shipped to every Astro-rendered page:
- `SiteLayout.astro` now emits the skip-link as the first body child plus `<header role="banner">`, `<main id="main" tabindex="-1">`, and `<footer role="contentinfo">` landmarks. `<TicketPanel />` and `<SiteScripts />` remain direct body children outside `<footer>` (they are dialog overlays, not contentinfo).
- `src/partials/index-main.frag.txt` flags the hero `<video id="heroVideo">` decorative per locked CONTEXT decision D-01 (`aria-hidden="true" tabindex="-1"`), wraps the hero container with `aria-hidden="true"`, and adds `aria-hidden="true" focusable="false"` to all decorative inline SVGs.
- Shared components `LocationOverlay.astro`, `MobileMenu.astro`, and `SiteNav.astro` had every inline SVG swept with `aria-hidden="true" focusable="false"`.
- `js/a11y.js` `ensureSkipLink()` now carries an explanatory comment noting it is a no-op once SSR ships the skip-link, while keeping the existing guard verbatim. No legacy HTML pages broke.

`lang` prop addition on `SiteLayout.astro` was deliberately deferred to plan 10-04 per the plan's interface guard (D-04 ownership).

## Key Files Created / Modified

- `src/layouts/SiteLayout.astro` — modified (lines 52–66: skip-link, header, main, footer landmarks)
- `src/partials/index-main.frag.txt` — modified (line 3 hero container, line 4 hero video, 35 decorative SVG sweeps)
- `src/components/LocationOverlay.astro` — modified (4 SVGs: pin icon + 3 social icons)
- `src/components/MobileMenu.astro` — modified (3 social SVGs)
- `src/components/SiteNav.astro` — modified (location pin + dropdown chevron)
- `js/a11y.js` — modified (3-line comment above existing guard)

## Commits

- `c1346ca` — feat(10-01): add SSR semantic landmarks + skip-link to SiteLayout.astro
- `3d6b994` — feat(10-01): mark hero video + decorative SVGs aria-hidden in index-main partial
- `50b45d4` — feat(10-01): sweep decorative SVGs in shared components + add a11y.js no-op comment

## Verification

| Check | Expected | Actual |
|-------|----------|--------|
| `SiteLayout.astro` has `<a class="skip-link" href="#main">Skip to main content</a>` | 1 | 1 |
| `SiteLayout.astro` has `<header role="banner">` | 1 | 1 |
| `SiteLayout.astro` has `<main id="main" tabindex="-1">` | 1 | 1 |
| `SiteLayout.astro` has `<footer role="contentinfo">` | 1 | 1 |
| `index-main.frag.txt` `aria-hidden="true"` count | ≥ 36 | 44 |
| `index-main.frag.txt` `focusable="false"` count | ≥ 35 | 36 |
| `<video id="heroVideo" aria-hidden="true" tabindex="-1"` literal | 1 | 1 |
| LocationOverlay/MobileMenu/SiteNav SVGs `aria-hidden + focusable` | every | every (4/4, 3/3, 2/2) |
| `js/a11y.js` `SSR skip-link is now emitted` comment | 1 | 1 |
| `js/a11y.js` `if (document.querySelector('.skip-link')) return;` guard intact | 1 | 1 |

## Notes / Deviations

- `lang` prop on SiteLayout: explicitly NOT added — owned by plan 10-04 (Antwerp + hreflang).
- `npm run build:astro` was executed by the agent during task 1 to confirm dist output. Re-running after worktree merge is part of the post-wave hook validation owned by the orchestrator.
- An untracked `assets/video/hero-bg-web.mp4` exists in the worktree but is unrelated to this plan and was NOT committed.
- Final task 3 commit was made by the orchestrator on the agent's behalf after a permission gate; all changes match the agent's prepared diff verbatim.
