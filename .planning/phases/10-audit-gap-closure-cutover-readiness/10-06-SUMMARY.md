---
phase: 10
plan: 06
status: complete
completed: 2026-05-05
addresses: [P2-4, P1-1]
requirements_addressed: [ANLY-01, COMP-02]
executed_by: orchestrator (inline) — user chose Option 1 at the plan's checkpoint:human-verify gate after subagent bash was consistently denied this session
---

## What Was Built

Closes audit P2-4 (cookie banner / CMP) and P1-1 (tap targets). Honors locked decisions D-03 (EU pages only) and D-05 ("Manage Preferences" button copy, NOT "Customize").

`vanilla-cookieconsent@3.1.0` is exact-pinned and shipped from `node_modules` to `public/js/` + `public/css/` via the existing `sync-static-to-public.mjs` `mandatoryDirs` mechanism. The IIFE wrapper at `js/cookie-consent.js` early-returns on `consent_profile === 'us_open'` (so US visitors never see the banner), uses the exact UI-SPEC copy verbatim, and on accept calls `gtag('consent','update', …)`, mutates `window.__TM_CONSENT_STATE__`, and dispatches a `tm:consent-updated` CustomEvent. The web-vitals RUM script from plan 10-05 listens for that event and activates measurement after a late grant.

Tap-target floor for `.btn-tickets` lifted to 48 px desktop; `.location-btn` had no min-height at all and was patched to 44 px. New `scripts/check-tap-targets.js` validator enforces UI-SPEC's 44/48 px floors against `css/base.css` + `css/nav.css` and is wired into `verify-site-output.mjs` between `check:hreflang-cluster` and `check:sitemap-output`.

## Versions Installed

| Package | Version | Block | Lockfile |
|---------|---------|-------|----------|
| `vanilla-cookieconsent` | `3.1.0` (exact pin, no caret) | `dependencies` | `package-lock.json` resolved 3.1.0 |

## Banner Copy Verification

Every UI-SPEC copy value is byte-identical in `js/cookie-consent.js`:

| Surface | Value |
|---------|-------|
| Banner heading | `We use cookies` |
| Banner description | `We use cookies to improve your experience and measure site performance. You can accept all cookies, reject non-essential cookies, or manage your preferences.` |
| Accept button | `Accept all` |
| Reject button | `Reject all` |
| Manage button | `Manage Preferences` (D-05 — renamed from "Customize") |
| Preferences modal title | `Cookie Preferences` |
| Necessary | `Necessary` / `Required for the site to function. Cannot be disabled.` |
| Analytics | `Analytics` / `Help us understand how visitors use the site. Off by default.` |
| Marketing | `Marketing` / `Used to deliver relevant ads. Off by default.` |
| Footer re-open link | `Cookie Preferences` |

The literal string `Customize` does NOT appear in `js/cookie-consent.js` (D-05 satisfied — the doc comment was reworded to avoid the rejected term).

## Task 2 Measurements + min-height Additions

| Selector | Method | Verdict | CSS Action |
|----------|--------|---------|-----------|
| `.btn-tickets` | Static CSS analysis (Option 1, user-approved) | ~44 px (padding 0.75rem×2 + ~20 px line-height for 0.85rem sans-serif) — under 48 px | Added `min-height: 48px` to `css/nav.css:866` desktop ruleset |
| `.btn-primary` | Static CSS scope check | Page-local CSS only (lives in `src/partials/*-inline.raw.css.txt`) — outside validator scope per UI-SPEC line 642-660 | Skipped with informational note in validator output |
| `.mobile-menu-cta a` | Static CSS analysis | `padding: 1rem` (32 px vertical) + line-height comfortably exceeds 48 px | No change needed |
| `.location-btn` | Validator surfaced gap | Desktop ruleset declared no `min-height`/`height`/`padding`; relied on font-size + flex auto-sizing → ~20 px | **Added `min-height: 44px`** to `css/nav.css:326` desktop ruleset |

`.location-btn` was a real un-flagged tap-target gap that the validator caught even though it wasn't in the user's Task 2 spot-check list. Closing it satisfied the validator and is a defensible a11y improvement.

## Validator Selector List + Verify Chain Placement

`scripts/check-tap-targets.js`:

```javascript
const REQUIRES_44PX = [
    '.nav-menu-btn',
    '.location-btn',
    '.location-dropdown-close',
    '.mobile-menu-socials a',
    '.btn-secondary',           // page-local; skipped with note
    '.mobile-menu-links a',
];

const REQUIRES_48PX = [
    '.btn-tickets',
    '.btn-primary',              // page-local; skipped with note
    '.mobile-menu-cta a',
];
```

Verify chain insertion in `scripts/verify-site-output.mjs`:

```javascript
['check:img-alt-axe', []],
['check:hreflang-cluster', []],
['check:tap-targets', []],        // ← inserted here
['check:sitemap-output', []],
```

**Result**: `check-tap-targets passed: 7/9 selectors validated against css/base.css + css/nav.css.` Two informational skip notes for `.btn-secondary` and `.btn-primary` (both are page-local in `src/partials/*-inline.raw.css.txt`).

## Validator Behavior Notes

- **Multi-ruleset awareness**: collects ALL rulesets matching a selector across `css/base.css` + `css/nav.css`, including those nested inside `@media` queries.
- **`display: none` skip**: a ruleset that hides the element is not a candidate for size-floor enforcement (e.g., `.nav-menu-btn` desktop variant is `display: none`; the @media (max-width: 1024px) variant where it actually renders carries `min-height: 44px` and is correctly chosen as the primary).
- **Sizing-decl scoring**: prefers rulesets with `min-height` (10 pts), `height` (5), `padding` (3), `font-size` (1).
- **Heuristic estimation**: when no `min-height`/`height` is declared, the validator computes `padding-vertical + font-size × 1.4`. Documented in the script's header comment as a heuristic; runtime Playwright remains the definitive measurement.
- **Compound selectors excluded**: regex requires `(^|})\s*SELECTOR\s*[,{]` so it won't match `.nav.menu-open .btn-tickets` or `.btn-tickets:hover` as the canonical declaration.

## CSP Review

**No `_headers` change.** The current `script-src 'self' 'unsafe-inline' https://cdn.rollerdigital.com https://www.googletagmanager.com` already permits the new same-origin scripts (`/js/cookieconsent.umd.js`, `/js/cookie-consent.js`). The vanilla-cookieconsent library makes no third-party fetch — all consent state lives in `localStorage` and `dataLayer`. No `connect-src` change needed.

## Key Files Created / Modified

- `package.json` — `vanilla-cookieconsent` 3.1.0 dependency + `check:tap-targets` npm script
- `package-lock.json` — lockfile entry
- `js/cookieconsent.umd.js` — vendor UMD bundle (created from node_modules)
- `js/cookie-consent.js` — IIFE wrapper (created)
- `css/cookieconsent.css` — vendor default styles (created from node_modules)
- `css/cookie-consent.css` — brand-token overrides (created)
- `src/components/SiteScripts.astro` — added `<link>` + `<script>` tags between `a11y.js` and `web-vitals.iife.js`
- `src/components/SiteFooter.astro` — added `<button data-cc="show-preferencesModal">Cookie Preferences</button>` to `footer-legal` + matching `.footer-link-button` style
- `css/nav.css` — `.btn-tickets` gained `min-height: 48px`; `.location-btn` gained `min-height: 44px`
- `scripts/check-tap-targets.js` — new static CSS validator (created)
- `scripts/verify-site-output.mjs` — added `['check:tap-targets', []]` to steps array
- `_headers` — unchanged (CSP review only)

## Commits

- `ac8d464` — feat(10-06): EU cookie consent banner integrated with Phase 6 Consent Mode v2
- `53ff879` — fix(10-06): add min-height: 48px to .btn-tickets desktop ruleset (CONTEXT 3.4)
- `cffbe3d` — feat(10-06): add scripts/check-tap-targets.js + close .location-btn 44px gap

## Verification

| Check | Result |
|-------|--------|
| `npm run build:astro` | 22 pages built |
| `dist/js/cookieconsent.umd.js` (23.4 KB) | ✓ |
| `dist/js/cookie-consent.js` (4.1 KB) | ✓ |
| `dist/css/cookieconsent.css` (32.2 KB) | ✓ |
| `dist/css/cookie-consent.css` (810 B) | ✓ |
| `dist/antwerp.html` contains `Cookie Preferences` + `data-cc="show-preferencesModal"` | ✓ |
| `npm run check:tap-targets` | passed 7/9 + 2 noted skips |
| `npm run check:hreflang-cluster` | passed 22 files |
| `npm run check:img-alt-axe` | passed 22 pages |
| `_headers` git diff | unchanged |

Manual smoke (deferred to cutover-checklist tracked in plan 10-07):

- Open `dist/antwerp.html` in incognito Chrome — banner appears bottom-center.
- Click "Accept all" — `dataLayer` shows `consent` `update` payload, banner closes, cookie persists.
- Open `dist/philadelphia.html` — banner does NOT appear (`consent_profile=us_open`).
- Click footer "Cookie Preferences" — preferences modal opens.

## Notes / Deviations

- **Inline execution + checkpoint resolved by user choice**: the plan was executed inline by the orchestrator; subagent dispatch in this session was consistently denied bash. At the `checkpoint:human-verify` gate (Task 2), the user chose Option 1 (trust static analysis) and the orchestrator added `min-height: 48px` to `.btn-tickets` defensively. UI-SPEC line 666-668 anticipated this exact path.
- **`.location-btn` gap discovered by validator**: not in the original CONTEXT.md item 3.4 spot-check list; surfaced because the desktop ruleset had no sizing declarations. Patched in the same Task 3 commit.
- **Validator scope limitation**: `.btn-secondary` and `.btn-primary` only exist in page inline CSS partials. Per UI-SPEC line 642-660 the validator scope is shared CSS only; page-local enforcement would require a different validator (e.g., scan `src/partials/*-inline.raw.css.txt`). Flagged as informational skip notes; not a phase blocker.
- **Stale GitNexus index**: not refreshed during this wave; should run `npx gitnexus analyze` at phase close.
- **Untracked workspace**: `.claude/worktrees/` and `assets/video/hero-bg-web.mp4` remain untracked from prior agent runs; not part of this plan and not committed.
