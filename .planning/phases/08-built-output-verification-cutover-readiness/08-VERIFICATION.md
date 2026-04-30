---
phase: 08-built-output-verification-cutover-readiness
status: passed
verified: 2026-04-30
requirements: VER-01, VER-02, VER-03, VER-04, VER-05, VER-06
---

# Phase 8 verification

## Must-haves

| ID | Evidence |
|----|----------|
| VER-01 | `npm run verify` runs `build:astro` before dist validators and Playwright; verified by `package.json` chain and successful `npm run verify`. |
| VER-02 | Same command runs `check`, all Phase 7 dist validators (`check:seo-output` … `check:nap-parity`), ticket-panel parity; documented in `docs/verification-pipeline.md`. |
| VER-03 | `playwright.config.js` uses `npm run preview:test` (Astro preview of `dist/`); `site.spec.js` uses clean URLs + legacy `/faq.html` probe. |
| VER-04 | `tests/smoke/visual.spec.js` + committed PNGs under `visual.spec.js-snapshots/` for six routes. |
| VER-05 | `docs/cloudflare-preview-validation.md` checklist; rollback runbook links. |
| VER-06 | `docs/rollback-runbook.md` failure triggers expanded; cross-links to preview + pipeline docs. |

## Automated proof

```bash
npm run verify
```

Last run: **14** Playwright tests passed (8 smoke + 6 visual).

## Human-needed (non-blocking)

- Rehearse Cloudflare preview checklist on a real deployment URL.
- Add `*-chromium-linux.png` (or equivalent) if CI runs on Linux.
