---
phase: 08-built-output-verification-cutover-readiness
plan: 02
subsystem: testing
requirements-completed: ["VER-03"]
completed: 2026-04-29
---

# Phase 8 plan 02 summary

**Playwright now serves built output via `astro preview` on `127.0.0.1:4173`**, matching what ships. Smoke tests use clean URLs (`/faq`, `/contact`, `/philadelphia`); legacy `/faq.html` is covered with a non-400 assertion; booking test no longer needs `page.route` rewrites for `/philadelphia`.

## Files

- `playwright.config.js` — `webServer` → `npm run preview:test`, 120s timeout
- `package.json` — `preview:test` script
- `tests/smoke/site.spec.js` — URL updates + legacy `.html` request test

## Verify

- `npm run verify` with smoke tests only: **8** Playwright tests passed (`site.spec.js`).
