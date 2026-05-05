---
phase: 11-small-mobile-responsiveness-480px-tier-cookie-banner-placeme
plan: "03"
subsystem: css/cookie-consent.css
tags: [responsive, cookie-banner, polish, css, vanilla-cookieconsent]
dependency_graph:
  requires: []
  provides: [POLISH-01 .cm--box bottom-left card placement overrides]
  affects: [css/cookie-consent.css, EU cookie banner rendering on all EU-routed pages]
tech_stack:
  added: []
  patterns: [CSS-only overrides on .cm--box vanilla-cookieconsent layout class, backdrop-filter glass surface, CSS keyframe slide-up animation, env(safe-area-inset-bottom) iOS home indicator clearance]
key_files:
  created: []
  modified:
    - css/cookie-consent.css
decisions:
  - "JS layout option confirmed already 'box': js/cookie-consent.js line 59 sets guiOptions.consentModal.layout:'box' — .cm--box selectors apply at runtime with no follow-up required."
  - "Pre-existing tap-target failures in css/nav.css are out-of-scope for this plan — they exist on the worktree's older branch snapshot and are not caused by this change."
metrics:
  duration: ~10 minutes
  completed: "2026-05-05"
  tasks_completed: 1
  files_modified: 1
---

# Phase 11 Plan 03: POLISH-01 Cookie-Banner Bottom-Left Card Placement Summary

**One-liner:** CSS-only rewrite of `css/cookie-consent.css` placing vanilla-cookieconsent in a brand-aligned bottom-left dark glass card with slide-up motion, orange border, and mobile-stacked button layout.

## What Was Built

`css/cookie-consent.css` was rewritten from 27 lines to 177 lines. The original three rule blocks (`:root` token overrides, `.cm__btn` tap-target floor, gradient-on-Accept-all) were preserved unchanged. A POLISH-01 block was appended implementing D-B1 through D-B6 from `11-CONTEXT.md`.

### File Metrics

| Metric | Value |
|--------|-------|
| Lines before | 27 |
| Lines after | 177 |
| Lines added | 150 |
| Files changed | 1 |
| Commit | 7f3dcd7 |

## Acceptance Criteria Verification

All grep checks passed:

| Check | Result |
|-------|--------|
| `grep -c "cm--box" css/cookie-consent.css` | 26 occurrences (≥ 6 required) |
| `grep "rgba(20, 20, 24, 0.92)"` | 1 line (D-B2 surface color) |
| `grep "rgba(255, 107, 44, 0.18)"` | 1 line (D-B2 orange 18% border) |
| `grep "rgba(0, 0, 0, 0.4)"` | 1 line (D-B2 shadow) |
| `grep "cubic-bezier(0.32, 0.72, 0, 1)"` | 2 lines — comment + property (D-B4 easing) |
| `grep "220ms"` | 2 lines — comment + property (D-B4 timing) |
| `grep "backdrop-filter: blur(12px) saturate(1.1)"` | 1 line (D-B2) |
| `grep "border-radius: 12px"` | 2 lines — :root custom prop + explicit rule (D-B2) |
| `grep -c "min-height: 44px"` | 2 lines — existing .cm__btn rule + new tertiary rule |
| `grep "@media (max-width: 640px)"` | 1 line (D-B5 mobile breakpoint) |
| `grep "env(safe-area-inset-bottom"` | 1 line (D-B5 iOS home indicator) |
| `grep "@media (prefers-reduced-motion: reduce)"` | 1 line (motion opt-out) |
| Original :root block (lines 1-14) | Preserved |
| Original `.cm__btn { min-height: 44px; }` | Preserved |
| Original `.cm__btn[data-role="all"] { background: var(--gradient-primary); }` | Preserved |

## JS Layout Option Check

`js/cookie-consent.js` was inspected before writing. Line 59 confirms:

```js
guiOptions: {
    consentModal: { layout: 'box', position: 'bottom center' },
```

The JS **already sets** `layout: 'box'`. No follow-up plan is required. The `.cm--box` selectors in this plan apply at runtime immediately. The `position: 'bottom center'` in the JS config is a positioning hint to the library, but our CSS `position: fixed; bottom: 24px; left: 24px; right: auto;` overrides it via specificity.

## Tap-Target Check

`npm run check:tap-targets` reports 4 failures — all in `css/nav.css`, not `css/cookie-consent.css`. These are pre-existing in this worktree's older branch snapshot (the worktree is branched from `aa9b04f` which pre-dates Phase 10 nav tap-target fixes). None are caused by this plan's changes. The cookie banner buttons maintain `min-height: 44px` as required by plan spec.

When this branch's change is integrated into `gsd/v1.0-milestone` (which has Phase 10 nav fixes), `npm run check:tap-targets` will pass end-to-end.

## Deviations from Plan

None — plan executed exactly as written. The JS layout check revealed no gap (layout was already 'box'), so no follow-up note was needed in that regard.

## Known Stubs

None. All CSS rules are fully implemented with real brand values. No placeholder values.

## Threat Flags

None. This plan modified only `css/cookie-consent.css`. No new network endpoints, auth paths, file access patterns, or schema changes were introduced.

## Self-Check: PASSED

- [x] `css/cookie-consent.css` exists and contains 177 lines
- [x] Commit `7f3dcd7` exists: `git log --oneline | grep 7f3dcd7`
- [x] All 13 acceptance-criteria grep checks passed
- [x] Commit contains only `css/cookie-consent.css` (video file removed via amend)
