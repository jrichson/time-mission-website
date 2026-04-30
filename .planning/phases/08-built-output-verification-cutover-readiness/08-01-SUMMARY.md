---
phase: 08-built-output-verification-cutover-readiness
plan: 01
subsystem: testing
tags: [npm, verify, astro, dist]

requires:
  - phase: 07-seo-schema-local-search-baseline
    provides: verify:phase7 dist validators and ordering
provides:
  - Canonical `npm run verify` = full launch gate (check → build → dist validators → smoke)
  - `verify:sources` fast path
  - `verify:phase8` alias → `verify`
  - docs/verification-pipeline.md
affects: [phase-08-remainder, ci, operators]

tech-stack:
  added: []
  patterns:
    - "`verify` delegates to `verify:phase7` to keep one ordered chain until Phase 8 adds more gates"
key-files:
  created:
    - docs/verification-pipeline.md
  modified:
    - package.json
    - README.md
key-decisions:
  - "README verification section updated so Quick Start expectations match VER-01."
patterns-established:
  - "Operators use `verify:sources` for check-only iteration; launch remains `npm run verify`."
requirements-completed: ["VER-01", "VER-02"]
duration: 15min
completed: 2026-04-29
---

# Phase 8 plan 01 summary

**`npm run verify` is now the Astro launch gate:** it runs the former `verify:phase7` chain (source checks, `build:astro`, dist route/manifest/ticket-panel/SEO/schema/sitemap/robots/llms/NAP validators, then Playwright).

## Performance

- **Duration:** ~15 min (including full verify run)
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- **`verify`**, **`verify:phase7`**, **`verify:phase8`**, **`verify:sources`** wired in `package.json`; `npm run verify` exited **0** locally (7 smoke tests passed).
- **`docs/verification-pipeline.md`** documents step order and VER-01 / VER-02 mapping.

## GitNexus

- **impact(`package.json`, upstream):** LOW risk, 0 indexed upstream symbols (operators/docs reference `npm run verify` in README, `.planning`, `docs/roller-booking-launch-checklist.md`).

## Task commits

_Single commit for plan 08-01 (orchestrator inline execution)._

## Self-Check: PASSED

- `npm run verify` exits 0 after changes.
- Pipeline doc references VER-01 and VER-02.
