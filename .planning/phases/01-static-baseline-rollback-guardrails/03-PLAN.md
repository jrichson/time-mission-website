---
wave: 3
depends_on: [02-PLAN]
plan_id: 03-PLAN
requirements_addressed: [FND-03, FND-04]
files_modified:
  - package.json
  - scripts/check-astro-dist-manifest.js
  - docs/rollback-runbook.md
  - .planning/ROADMAP.md
autonomous: true
---

# Plan 03 — Dist Manifest Check, Verify Gate & Rollback Documentation

<objective>
Add `scripts/check-astro-dist-manifest.js` to fail CI when Cloudflare-critical files or representative assets are missing from `dist/`, extend npm scripts so Phase 1 completion requires legacy verify + astro build + manifest, finalize rollback runbook Cloudflare steps placeholder boundaries, and update roadmap plan counts.
</objective>

<threat_model>
| ID | Severity | Threat | Mitigation |
|----|----------|--------|------------|
| T-manifest-01 | medium | Silent omission of `_headers` breaks CSP/HSTS in prod | Manifest asserts byte existence for host files |
| T-verify-01 | low | Gate drift—developers skip astro build | Single `verify:phase1` or documented composite |
</threat_model>

<must_haves>
- Manifest script exits 1 when `dist/_headers` or other mandatory entries missing after build.
- `package.json` exposes one composite command documented in README or `.planning/baseline/README.md` that runs `npm run verify`, `npm run build:astro`, and manifest check in order.
- `docs/rollback-runbook.md` ties triggers to deploy procedure at high level.
</must_haves>

<verification>
- `node scripts/check-astro-dist-manifest.js` exits non-zero when `dist/` missing mandatory file (test by temporarily renaming).
</verification>

---

## Tasks

<task id="03-03-01">
  <objective>Implement dist manifest checker</objective>
  <read_first>
    - scripts/check-sitemap.js (error pattern)
    - .planning/phases/01-static-baseline-rollback-guardrails/01-CONTEXT.md (D-09–D-12)
  </read_first>
  <action>
    Create `scripts/check-astro-dist-manifest.js` CommonJS: resolve repo root `path.resolve(__dirname,'..')`, require `dist/` directory exists. Assert files exist: `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `404.html`, `data/locations.json`, `css/base.css` (or first css file found if renamed—prefer explicit `css/base.css`), `js/locations.js`, `assets/fonts` directory non-empty OR one known asset path such as `assets/site.webmanifest` if present—if `css/base.css` missing, print clear error listing expected contract from CONTEXT.
    Use synchronous `fs.existsSync`; accumulate errors array; `console.error` each line; `process.exit(1)` on any failure; success log `Astro dist manifest check passed.`
  </action>
  <acceptance_criteria>
    - Running `node scripts/check-astro-dist-manifest.js` exits non-zero when `dist/_headers` absent (verified after removing file in temp copy—not committed).
    - Script file contains string `check-astro-dist-manifest` OR title comment `Astro dist manifest`.
    - Script validates at least six paths including `_headers`, `_redirects`, `robots.txt`.
  </acceptance_criteria>
</task>

<task id="03-03-02">
  <objective>Wire npm scripts for Phase 1 gate</objective>
  <read_first>
    - package.json
    - .planning/phases/01-static-baseline-rollback-guardrails/01-CONTEXT.md (D-18)
  </read_first>
  <action>
    Add scripts: `"check:astro-dist": "node scripts/check-astro-dist-manifest.js"` and `"verify:phase1": "npm run verify && npm run build:astro && npm run check:astro-dist"`.
    Append to `.planning/baseline/README.md` section `## Phase 1 gate` documenting exact command `npm run verify:phase1`.
    Do **not** change production meaning of `npm run verify` for unrelated workstreams—composite is opt-in `verify:phase1`.
  </action>
  <acceptance_criteria>
    - `package.json` contains literal `"verify:phase1"` with substring `build:astro`.
    - `.planning/baseline/README.md` contains string `verify:phase1`.
  </acceptance_criteria>
</task>

<task id="03-03-03">
  <objective>Expand rollback runbook</objective>
  <read_first>
    - docs/rollback-runbook.md (from Plan 01)
    - .planning/phases/01-static-baseline-rollback-guardrails/01-CONTEXT.md (D-15)
  </read_first>
  <action>
    Add subsection `## Cloudflare Pages (outline)` with bullets: attach checkout deploy to tag tarball or branch; verify DNS unchanged; purge cache optional; confirm `_headers` served—mark detailed dashboard clicks as TODO for Phase 8 rehearsal per D-17.
  </action>
  <acceptance_criteria>
    - `docs/rollback-runbook.md` contains substring `Cloudflare`.
    - Same file contains substring `Phase 8` or `rehears`.
  </acceptance_criteria>
</task>

<task id="03-03-04">
  <objective>Update roadmap progress metadata</objective>
  <read_first>
    - .planning/ROADMAP.md (Phase Details Phase 1)
  </read_first>
  <action>
    In `.planning/ROADMAP.md`, set Phase 1 line under **Plans** from `TBD` to `3` and Progress table Plans Complete from `0/TBD` to `3/3` only after Plans 01–03 executed (executor updates during verification); for planning completion now, set text to `3 plans (01–03)` in **Plans** field under Phase 1 Details.
  </action>
  <acceptance_criteria>
    - `grep '3 plans' .planning/ROADMAP.md` or Plans line shows explicit plan count not `TBD`.
  </acceptance_criteria>
</task>

---

## PLANNING COMPLETE
