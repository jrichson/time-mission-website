---
wave: 2
depends_on: [01-PLAN]
plan_id: 02-PLAN
requirements_addressed: [FND-01]
files_modified:
  - package.json
  - package-lock.json
  - astro.config.mjs
  - tsconfig.json
  - src/env.d.ts
  - src/pages/index.astro
  - scripts/sync-static-to-public.mjs
  - public/
autonomous: true
---

# Plan 02 — Astro Project Skeleton & Static Shell Proof

<objective>
Add Astro (`astro`), configure static output with `build.format: 'file'` and `trailingSlash: 'never'`, mirror mandatory static-host files and public assets into `public/` via an explicit sync script, expose `npm run build:astro` and `npm run preview:astro`, and ship only a minimal placeholder page at `/`—no migration of production homepage markup (01-CONTEXT D-05).
</objective>

<threat_model>
| ID | Severity | Threat | Mitigation |
|----|----------|--------|------------|
| T-dep-01 | medium | Supply-chain compromise via unpinned deps | package-lock.json committed; conservative astro version range |
| T-path-01 | low | Wrong `public/` layout drops `_headers` from dist | Sync script lists mandatory files explicitly |
</threat_model>

<must_haves>
- `astro.config.mjs` sets `output: 'static'`, `build.format: 'file'`, `trailingSlash: 'never'` (verify by grep).
- `npm run build:astro` produces `dist/index.html` from placeholder route.
- `public/` receives `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `404.html`, `assets/`, `css/`, `js/`, `data/` synced from repo root via checked-in script.
- `npm run verify` still passes unchanged after dependency add (lockfile updated).
</must_haves>

<verification>
- `npm run build:astro` exits 0.
- `test -f dist/_headers && test -f dist/_redirects && test -f dist/robots.txt`
</verification>

---

## Tasks

<task id="02-02-01">
  <objective>Install Astro and baseline tooling</objective>
  <read_first>
    - package.json
    - .planning/phases/01-static-baseline-rollback-guardrails/01-CONTEXT.md (D-07, D-08)
  </read_first>
  <action>
    Run `npm install -D astro @astrojs/check typescript`. Add npm scripts exactly (or equivalent names if adjusted—then update Plan 03 accordingly): `"build:astro": "node scripts/sync-static-to-public.mjs && astro build"` and `"preview:astro": "astro preview"`.
    Ensure `"verify"` script still runs only legacy checks: keep existing `"verify": "npm run check && npm run test:smoke"` until Plan 03 adds astro gate.
  </action>
  <acceptance_criteria>
    - `package.json` contains substring `"build:astro"` and substring `"preview:astro"`.
    - `package-lock.json` lists `astro` package.
    - `npm run verify` exits 0 after install.
  </acceptance_criteria>
</task>

<task id="02-02-02">
  <objective>Add sync script for public mirror</objective>
  <read_first>
    - .planning/codebase/STACK.md (public asset paths)
  </read_first>
  <action>
    Create `scripts/sync-static-to-public.mjs` using Node `fs`/`fs.promises` or `cpSync` that copies from repo root to `public/` these paths: `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `404.html`, directories `assets`, `css`, `js`, `data`. Skip `node_modules`, `.git`, `dist`, `.astro`. Create parent dirs as needed. Exit non-zero if any mandatory file missing at source.
    Mandatory files at minimum: `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `404.html`, `data/locations.json`.
  </action>
  <acceptance_criteria>
    - File `scripts/sync-static-to-public.mjs` exists.
    - Running `node scripts/sync-static-to-public.mjs` creates `public/_headers` with identical sha256 or size to root `_headers` (use `cmp public/_headers _headers` or Node compare).
  </acceptance_criteria>
</task>

<task id="02-02-03">
  <objective>Configure Astro static output</objective>
  <read_first>
    - https://docs.astro.build/en/reference/configuration-reference/ (external—match CONTEXT D-07)
  </read_first>
  <action>
    Add root `astro.config.mjs` ESM default export with `import { defineConfig } from 'astro/config'` setting `output: 'static'`, `build.format: 'file'`, `trailingSlash: 'never'`, `site: 'https://timemission.com'` (canonical base for future phases).
    Add `src/env.d.ts` with `/// <reference types="astro/client" />` if TypeScript check enabled.
  </action>
  <acceptance_criteria>
    - File `astro.config.mjs` contains substring `build.format` and substring `'file'` on the same line or adjacent lines.
    - Same file contains substring `trailingSlash` and substring `'never'`.
    - Same file contains `output:` and `static` (static output mode enabled).
  </acceptance_criteria>
</task>

<task id="02-02-04">
  <objective>Minimal placeholder page</objective>
  <read_first>
    - .planning/phases/01-static-baseline-rollback-guardrails/01-CONTEXT.md (D-05)
  </read_first>
  <action>
    Create `src/pages/index.astro` containing only a minimal proof UI: outer template includes `<title>Astro shell proof</title>` and paragraph text `Astro static baseline` (plain Astro/HTML). Do **not** import existing site CSS or copy homepage markup.
  </action>
  <acceptance_criteria>
    - `src/pages/index.astro` contains literal string `Astro static baseline`.
    - Built `dist/index.html` exists after `npm run build:astro` and contains substring `Astro static baseline`.
  </acceptance_criteria>
</task>

---

## PLANNING COMPLETE
