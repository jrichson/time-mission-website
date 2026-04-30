---
phase: 08-built-output-verification-cutover-readiness
plan: 03
subsystem: testing
requirements-completed: ["VER-04"]
completed: 2026-04-29
---

# Phase 8 plan 03 summary

**Playwright screenshot baselines** added for six representative routes (viewport only, `animations: 'disabled'`, `maxDiffPixels: 3000`). Videos are paused via `stabilizeForScreenshot()` before capture.

## Snapshotted URLs

| Snapshot name | Path |
|---------------|------|
| `homepage.png` | `/` |
| `location-open.png` | `/philadelphia` |
| `location-coming-soon.png` | `/houston` |
| `groups-corporate.png` | `/groups/corporate` |
| `faq.png` | `/faq` |
| `contact.png` | `/contact` |

## Artifacts

- `tests/smoke/visual.spec.js`
- `tests/smoke/visual.spec.js-snapshots/*-chromium-darwin.png` (6 files on macOS; add Linux counterparts for Linux CI)

## Docs

- `docs/verification-pipeline.md` — visual update workflow (`--update-snapshots`)

## Verify

- `npm run verify` — **14** Playwright tests (8 smoke + 6 visual)
