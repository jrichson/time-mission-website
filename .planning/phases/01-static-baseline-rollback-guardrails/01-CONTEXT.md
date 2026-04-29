# Phase 1: Static Baseline & Rollback Guardrails - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 establishes a minimal Astro static build that can be built and previewed while preserving the current static site as a rollback-capable reference through a named git ref. It must capture the current site's baseline evidence, prove required static assets and host files can appear in Astro `dist/`, and define rollback triggers before any route registry, data-module migration, component migration, booking rewrite, analytics instrumentation, or SEO/schema generation work begins.

</domain>

<decisions>
## Implementation Decisions

### Baseline Evidence
- **D-01:** Capture visual baseline evidence for every public page before Astro migration changes begin, accepting extra snapshot/setup churn to create the strongest parity target.
- **D-02:** Capture all current smoke-test flows plus written behavior notes for template types, including location selection, ticket panel behavior, FAQ keyboard behavior, contact form configuration, mobile/nav overlays, and other current browser behavior that later componentization could break.
- **D-03:** Produce a full page-by-page SEO/static metadata inventory in Phase 1, covering titles, descriptions, canonicals, sitemap inclusion, robots behavior, headings, and schema presence.
- **D-04:** Keep performance evidence lightweight in Phase 1: record page weight and basic Lighthouse/manual notes for homepage, one open location page, and one coming-soon location page. A full Core Web Vitals optimization pass is not part of this phase.

### Astro Skeleton Shape
- **D-05:** Phase 1 should render only a minimal Astro shell/build proof. Do not migrate a customer-facing page into Astro in this phase.
- **D-06:** Add Astro source and scripts in parallel with the current site. Initially avoid unnecessary root static disruption, but rollback safety is ultimately based on a named pre-Astro git ref rather than preserving the root layout forever.
- **D-07:** Configure Astro's output shape from the start with `build.format: 'file'` and `trailingSlash: 'never'`; Phase 2 will fully enforce the clean URL contract.
- **D-08:** Add separate Astro scripts such as `build:astro` and `preview:astro` while preserving the current `npm run verify` behavior during Phase 1.

### Asset And Host-File Preservation
- **D-09:** Mirror the current public static surface needed for deployability into Astro output, including assets, CSS, JavaScript, data, host files, robots/sitemap, and 404 behavior.
- **D-10:** Treat `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `404.html`, favicon/logo assets, and static data as mandatory Phase 1 build output.
- **D-11:** Create a required-output manifest check for host files plus representative assets/media in `dist/`. Do not rely on manual spot checks alone.
- **D-12:** Copy the current `sitemap.xml` and `robots.txt` unchanged in Phase 1. Generated sitemap/robots behavior belongs to later route and SEO phases.

### Rollback Policy
- **D-13:** Use a named pre-Astro git tag or branch as the old-site rollback source.
- **D-14:** After the rollback tag/branch exists, root static files may be reorganized if Astro requires it. The planner must make the rollback ref creation an explicit prerequisite before any root static moves/deletes.
- **D-15:** Produce a rollback runbook in Phase 1 with failure triggers, Cloudflare/operator steps, and verification steps after rollback.
- **D-16:** Include these rollback triggers from the start: broken checkout/booking, redirect loops, missing critical pages/assets, severe visual regression, contact form failure, and major analytics failure.
- **D-17:** Document rollback in Phase 1, but rehearse rollback mechanics against preview/Cloudflare during Phase 8 before cutover.

### Phase 1 Verification Gate
- **D-18:** Phase 1 completion must be gated by current `npm run verify`, `npm run build:astro`, and the required `dist/` manifest check.
- **D-19:** Phase 1 must include a preview-like load check of Astro output: serve/preview `dist/` and confirm the shell, 404 behavior, host files, and representative assets load.
- **D-20:** Baseline artifacts are required for Phase 1 completion: screenshots/notes, full SEO inventory, lightweight performance baseline, and rollback runbook.
- **D-21:** If current verification fails before Astro changes, fix failures that are in scope. If a failure is pre-existing or outside Phase 1 scope, document it and get explicit acceptance before proceeding.

### Claude's Discretion
- The planner may choose the exact artifact filenames and manifest schema for baseline evidence, SEO inventory, performance notes, and rollback documentation as long as the required evidence is readable and referenced by later phases.
- The planner may choose the preview command/server implementation for the minimal Astro output, provided it validates `dist/` rather than only source files.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope And Requirements
- `.planning/ROADMAP.md` — Phase 1 goal, requirements mapping, and success criteria.
- `.planning/REQUIREMENTS.md` — FND-01, FND-03, FND-04, and verification/cutover constraints that Phase 1 supports.
- `.planning/PROJECT.md` — Project constraints, preflight decisions, dirty-worktree caution, and rollback requirement.
- `.planning/research/PITFALLS.md` — Migration pitfalls for static output, parity baselines, public assets, verification, and rollback.

### Existing Codebase Contracts
- `.planning/codebase/STACK.md` — Current stack, scripts, host files, and platform assumptions.
- `.planning/codebase/ARCHITECTURE.md` — Current static site architecture, data flow, host config, and verification flow.
- `.planning/codebase/TESTING.md` — Current `npm run verify`, Playwright smoke tests, and validation script patterns.
- `.planning/codebase/INTEGRATIONS.md` — Current external services, static-host assumptions, form handling, and deployment notes.
- `README.md` — Current verification, production notes, and modernization risks.

### Redirect And Hosting References
- `docs/redirect-map.md` — Existing redirect map and post-deploy redirect verification checklist; useful context for host-file preservation, though Phase 2 owns clean route enforcement.

### Astro Documentation Findings
- Astro docs via Context7 `/withastro/docs` — `public/` files are copied unchanged to build output; `build.format: 'file'` generates page HTML files; `trailingSlash: 'never'` aligns with file output for no-trailing-slash URLs; Cloudflare static assets deploy from `dist/`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `package.json` scripts — Current `check`, `test:smoke`, and `verify` scripts are the existing quality gate and should remain intact during Phase 1.
- `scripts/check-*.js` — Existing validation scripts use CommonJS, collect errors, and print actionable failures; new Phase 1 manifest/output checks should follow this pattern.
- `playwright.config.js` and `tests/smoke/site.spec.js` — Current smoke tests serve the repository root with Python; Phase 1 preview checks need to target Astro `dist/` separately.
- `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `404.html`, `assets/`, `css/`, `js/`, and `data/` — These are the static-host and public asset surface that Phase 1 must preserve in Astro output.

### Established Patterns
- The current site is static HTML/CSS/vanilla JavaScript with no production framework bundle.
- Browser behavior depends on stable IDs, classes, script order, `window.TM`, `localStorage`, and root-relative/static file paths.
- Static validation is script-based rather than type-system based; new guardrails should be small Node scripts wired into npm scripts.
- Host config is Netlify/Cloudflare Pages style, with `_headers` and `_redirects` expected at the published output root.

### Integration Points
- Phase 1 should introduce Astro configuration and minimal source files without starting component/page migration.
- Phase 1 should introduce a build-output preservation check for `dist/`, but route registry, generated sitemap, generated schema, booking helpers, analytics, and component parity are later phases.
- Rollback safety must be established before root static files are moved or deleted, because the selected rollback source is a named git ref.

</code_context>

<specifics>
## Specific Ideas

- Baseline evidence should be broad: every public page for visual evidence, full SEO/static metadata inventory, and template-level behavior notes.
- The first Astro proof should be deliberately small: a static shell that proves build/preview/output mechanics without migrating the homepage or another public page.
- Phase 1 should favor explicit output checks over trusting Astro defaults, especially for `_headers`, `_redirects`, static data, fonts, images, videos, `robots.txt`, `sitemap.xml`, and `404.html`.
- The current sitemap and robots files are copied as-is in Phase 1; they are not treated as generated truth until route/SEO phases.

</specifics>

<deferred>
## Deferred Ideas

- Customer-facing page migration is deferred to later template/component phases.
- Full route registry enforcement, legacy `.html` redirect generation, and canonical URL validation are deferred to Phase 2.
- Generated sitemap/schema/SEO data modules are deferred to data and SEO phases.
- Full Core Web Vitals optimization is deferred to built-output verification or post-launch performance work.

</deferred>

---

*Phase: 01-static-baseline-rollback-guardrails*
*Context gathered: 2026-04-29*
