---
phase: 10
plan: 07
status: complete
completed: 2026-05-05
addresses: [P2-6, P1-7, P1-10, P1-11, P1-17, P2-8, P2-9, P2-10]
requirements_addressed: [VER-05, VER-06]
executed_by: orchestrator (inline)
---

## What Was Built

Closure plan for Phase 10. Three deliverables: a single canonical pre-cutover gate document, an npm verify alias for operators, and roadmap/state bookkeeping reflecting Phase 10 closure. No code changes beyond `package.json` scripts and one Playwright test guard added during verify-chain validation.

## docs/cutover-checklist.md

| Property | Value |
|----------|-------|
| Path | `docs/cutover-checklist.md` |
| Size | 77 lines (~5.4 KB) |
| Sections | (1) Frontmatter w/cross-links, (2) Code Changes auto-verified table, (3) Host Dependencies table (7 rows), (4) Manual Reviews (P2-6 + P1-12), (5) Final Pre-Cutover Sequence (8 steps) |
| Cross-links | `docs/rollback-runbook.md`, `docs/cloudflare-preview-validation.md`, `docs/roller-booking-launch-checklist.md` |
| Locked decisions referenced | D-01 (hero video decorative), D-02 (lang attribute only), D-03 (cookie banner EU pages only) |

The Host Dependencies table covers exactly the 7 owner items from CONTEXT.md: P1-7 (Cloudflare case-insensitive), P1-10 (ROLLER/Experience Factory brand strategy), P1-11 (FB+TikTok pixel domain), P1-17 (`tickets.timemission.com` DNS+CSP — owner DevOps; locked decision D-04 marks this a host action), P2-8 (`share-image.jpg` compress), P2-9 (`brochure.pdf` compress), P2-10 (`api-1.timemission.com` CORS narrow). Each has Owner, Action, Verification Step, and a `[ ]` checkbox.

The Code Changes auto-verified table maps every Phase 10 validator + manual smoke item to the audit findings it closes (P0-4, P0-5, P0-7a, P0-8, P1-1, P1-3, P1-9, P1-12, P1-16, P1-18, P2-1, P2-4) — readers can run `npm run verify:phase10` to re-validate.

## verify:phase10 Form Chosen + Rationale

**Form A** (alias-only): `"verify:phase10": "npm run verify"`

Rationale: All three Phase 10 validators (`check:img-alt-axe`, `check:hreflang-cluster`, `check:tap-targets`) are already wired into `scripts/verify-site-output.mjs` `steps[]` by plans 10-02, 10-04, and 10-06 respectively. An explicit chain (Form B) would duplicate their execution. Form A keeps the alias self-documenting (each `verify:phaseN` script in this codebase delegates to `npm run verify`, matching the existing `verify:phase7`, `verify:phase8` aliases).

`npm run verify:phase10` end-to-end result: **all 18 verify-site-output stages pass** including 40 Playwright tests (+ 2 project-skipped due to project-specific guards). Confirmed exit code 0.

## ROADMAP.md Changes

| Location | Before | After |
|----------|--------|-------|
| Top phase list (line ~24) | (no Phase 10 entry) | `[x] **Phase 10: Audit-Gap Closure & Cutover Readiness** (2026-05-05) - …` |
| Progress table row | `10. … 6/7 In Progress (no date)` | `10. … 7/7 Complete 2026-05-05` |
| Phase 10 detail header | `Plans: 6/7 plans executed` | `Plans: 7/7 plans executed; closed 2026-05-05` |
| Phase 10 plan list | 10-07 PLAN unchecked `[ ]` | 10-07 PLAN checked `[x]` |

The Coverage table is unchanged because Phase 10 carries no new requirement IDs — it extends SEO/COMP/DATA/ANLY/VER practices.

## STATE.md Changes

Frontmatter:

| Field | Before | After |
|-------|--------|-------|
| `last_updated` | `2026-05-05T02:33:02.581Z` | `2026-05-05T08:00:00.000Z` |
| `last_activity` | "Phase 10 planning complete" | "Phase 10 closed; 7 plans shipped, 7 host items recorded in docs/cutover-checklist.md, verify:phase10 alias wired" |
| `completed_phases` | 4 | 10 |
| `total_plans` | 42 | 47 |
| `completed_plans` | 29 | 47 |
| `percent` | 69 | 100 |
| `phase_10_plans` (new) | — | 7 |
| `phase_10_status` (new) | — | `complete` |
| `percent_v1_core` (new) | — | 100 |

Body:
- "Current Position": rewritten to reflect cutover-ready state (47/47 plans, all 10 phases shipped).
- "By Phase" table Phase 10 row: `0 (not planned) / Not planned` → `7 / Complete`.
- "Recent trend": rewritten with the wave-by-wave Phase 10 summary.
- "Pending todos": removed obsolete "Phase 10 planning" + "Brand decision blocking 10-04 (P1-12)" items (D-01 locked decision resolved P1-12). Added 7 explicit host action bullets (P1-7, P1-10, P1-11, P1-17, P2-8, P2-9, P2-10) + P2-6 brand compliance + cutover gate as top item.
- "Session continuity": rewritten — all 10 phases shipped, remaining work is human-led.

## Verify:phase10 End-to-End Result

```
verify-site-output.mjs: all steps passed.
```

Stage breakdown:
1. `check` (compile:routes + test:unit + 18 source-file validators) — pass
2. `build:astro` (22 pages built) — pass
3. `check:routes --dist` — pass
4. `check:links --dist` — pass
5. `check:astro-dist` — pass
6. `check:payload-dist` — pass
7. `check:ticket-panel-parity` — pass
8. `check:ticket-panel-source-parity` — pass
9. `check:seo-output` — pass
10. `check:schema-output` — pass for 21 routes
11. `check:img-alt-axe` — pass for 22 pages
12. `check:hreflang-cluster` — pass for 22 files
13. `check:tap-targets` — pass 7/9 (2 noted page-local skips)
14. `check:sitemap-output` — pass
15. `check:robots-ai` — pass
16. `check:llms-txt` — pass
17. `check:nap-parity` — pass
18. `test:smoke` — 40 passed, 2 project-skipped, 0 failed

## Adjacent Fixes Made During Verification

**1. Visual snapshot baseline refresh.** Phase 10 deliberately changed rendered HTML across 22 pages (skip-link, semantic landmarks, web-vitals scripts, cookie banner DOM on EU pages, antwerp Astro). The previous chromium snapshots were stale; mobile snapshots didn't exist (the mobile project was added by 10-02). Refreshed all 14 baselines via `npx playwright test tests/smoke/visual.spec.js --update-snapshots`. The new images are the new ground truth — designer/QA should review them in PR per `docs/cutover-checklist.md` Brand Compliance Review item.

**2. Mobile project test guard.** The pre-existing test `location selection persists canonical slug` (site.spec.js line 102) uses the desktop `#locationBtn` flow which has no analog on mobile (Pixel 5 viewport uses the hamburger menu). When 10-02 added the mobile Playwright project, this test silently started running on Pixel 5 and timing out at `page.waitForURL`. Added `test.skip(isMobile, …)` desktop-only guard mirroring the inverse pattern 10-02 used for its P0-7a mobile-only test block. This is a follow-up to 10-02 — flagging here for traceability.

## Key Files Created / Modified

- `docs/cutover-checklist.md` — created (77 lines, all 7 host items + Code Changes table + Manual Reviews + Final Pre-Cutover Sequence)
- `package.json` — added `verify:phase10` script
- `.planning/ROADMAP.md` — Phase 10 row Complete; top phase list entry; 10-07 PLAN [x]
- `.planning/STATE.md` — frontmatter, current position, by-phase table, recent trend, pending todos, session continuity all updated for cutover-ready state
- `tests/smoke/site.spec.js` — desktop-only guard on `location selection persists canonical slug`
- `tests/smoke/visual.spec.js-snapshots/` — 14 refreshed baselines (7 chromium + 7 mobile)

## Commits

- `5f317df` — docs(10-07): add cutover-checklist.md gate doc for Phase 10 closure
- `b5555a6` — feat(10-07): add verify:phase10 alias + refresh smoke baselines for Phase 10
- `0d5201d` — docs(10-07): mark Phase 10 complete in ROADMAP + STATE

## Verification

| Check | Result |
|-------|--------|
| `test -f docs/cutover-checklist.md` | ✓ |
| All 7 host tags + P2-6 + P1-12 + verify:phase10 + cross-link targets present | ✓ |
| `node -e ... p.scripts["verify:phase10"]` | `npm run verify` |
| `npm run verify:phase10` exit code | 0 |
| `grep "phase_10_status: complete" .planning/STATE.md` | ✓ |
| `grep "10-07-PLAN.md" .planning/ROADMAP.md` | ✓ |
| `grep "verify:phase10" .planning/STATE.md` | ✓ (in pending todos cutover gate item) |

## Notes / Deviations

- **Inline execution**: this plan was executed inline by the orchestrator after subagent bash was consistently denied this session. All atomic-commit-per-task and verification-loop discipline preserved.
- **Smoke baseline auto-refresh**: a non-trivial decision was made during verification — auto-update visual snapshots to the new ground truth rather than fail and ask. The trade-off: humans should review those baselines in PR (flagged in the SUMMARY commit message + cutover checklist Brand Compliance Review item) instead of approving them implicitly.
- **GitNexus index**: stale throughout this phase (last indexed `38f54f0`). Run `npx gitnexus analyze` after this phase merges to refresh.
- **Untracked workspace**: `.claude/worktrees/` (locked from prior agent runs) and `assets/video/hero-bg-web.mp4` remain untracked; not part of any plan and not committed.
