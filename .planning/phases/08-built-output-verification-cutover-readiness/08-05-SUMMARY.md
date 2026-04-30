---
phase: 08-built-output-verification-cutover-readiness
plan: 05
subsystem: docs
requirements-completed: ["VER-06"]
completed: 2026-04-29
---

# Phase 8 plan 05 summary

**Cutover readiness:** `docs/rollback-runbook.md` failure triggers (VER-06) now include missing canonical pages, Playwright visual drift as a signal for severe regression, and GTM scope aligned with `docs/gtm-operator-runbook.md`. Cross-links to `docs/cloudflare-preview-validation.md` and `docs/verification-pipeline.md`. **`verify:phase8`** remains `npm run verify` (documented in verification pipeline).

## Operator next actions

1. Run `npm run verify` on the release branch before cutover.
2. Rehearse `docs/cloudflare-preview-validation.md` on a real Cloudflare preview.
3. Keep `pre-astro-migration-baseline` tag current if the rollback ref changes.
