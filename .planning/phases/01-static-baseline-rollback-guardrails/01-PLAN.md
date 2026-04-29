---
wave: 1
depends_on: []
plan_id: 01-PLAN
requirements_addressed: [FND-04]
files_modified:
  - docs/rollback-runbook.md
  - .planning/baseline/README.md
  - .planning/baseline/seo-inventory.md
  - .planning/baseline/performance-notes.md
  - .planning/baseline/behavior-notes.md
autonomous: true
---

# Plan 01 — Rollback Git Ref & Baseline Evidence

<objective>
Create an immutable rollback pointer (`pre-astro-migration-baseline` tag) after confirming `npm run verify` passes, then capture baseline artifacts (SEO inventory, lightweight perf notes, behavior checklist) so later phases have parity targets—without migrating any page into Astro yet.
</objective>

<threat_model>
| ID | Severity | Threat | Mitigation |
|----|----------|--------|------------|
| T-static-01 | medium | Operators cannot find the legacy deploy commit after Astro lands | Tag + runbook with exact ref commands |
| T-static-02 | low | Baseline captured while verify is red hides regressions | Block baseline completion on `npm run verify` exit 0 or documented waiver in runbook |
</threat_model>

<must_haves>
- Git tag `pre-astro-migration-baseline` exists on the commit used as rollback source (or documented branch equivalent).
- `npm run verify` exit code 0 recorded in `.planning/baseline/README.md` (timestamp + commit SHA).
- `.planning/baseline/seo-inventory.md` lists every production HTML URL from `sitemap.xml` with title, meta description, canonical, robots, schema-present flag.
- `.planning/baseline/performance-notes.md` includes notes for `index.html`, one open location page (e.g. `philadelphia.html`), one coming-soon location page (pick from `data/locations.json` with `status: "coming-soon"`).
- `.planning/baseline/behavior-notes.md` references smoke test file paths and lists FAQ keyboard, ticket panel open/close, nav mobile menu, location persistence as checked or deferred with reason.
</must_haves>

<verification>
- `git tag -l pre-astro-migration-baseline` prints exactly one line.
- `grep -q "npm run verify" .planning/baseline/README.md` and file contains 40-character hex SHA pattern `[0-9a-f]\{7,40\}`.
</verification>

---

## Tasks

<task id="01-01-01">
  <objective>Ensure verification passes and create rollback tag</objective>
  <read_first>
    - package.json
    - .planning/phases/01-static-baseline-rollback-guardrails/01-CONTEXT.md (D-13, D-14, D-21)
  </read_first>
  <action>
    Run `npm run verify` from repo root. If exit code is non-zero, stop and document failures under `.planning/baseline/README.md` with heading `## Verify failures (must resolve or waive)` and do not create the tag until resolved or PM waiver text is recorded verbatim from stakeholder.
    Create `.planning/baseline/README.md` if missing with `## Baseline capture`, date, git SHA (`git rev-parse HEAD`), and result of `npm run verify`.
    When verify is green: `git tag -a pre-astro-migration-baseline -m "Rollback point before Astro migration Phase 1"` on current HEAD (or agreed SHA).
  </action>
  <acceptance_criteria>
    - Shell: `npm run verify` exits 0 immediately before tagging.
    - Shell: `git rev-parse pre-astro-migration-baseline^{}` matches `git rev-parse HEAD` at tag time unless README documents a different pinned SHA with reason.
    - File `.planning/baseline/README.md` exists and contains string `pre-astro-migration-baseline` and substring `npm run verify`.
  </acceptance_criteria>
</task>

<task id="01-01-02">
  <objective>Write SEO/static metadata inventory</objective>
  <read_first>
    - sitemap.xml
    - index.html
    - scripts/check-sitemap.js (URL discovery parity)
  </read_first>
  <action>
    Create `.planning/baseline/seo-inventory.md`. For each URL path listed in `sitemap.xml` under `https://timemission.com/` (strip domain), record columns: path, document title text, meta description content or `-`, link rel=canonical href or `-`, meta robots content or `-`, JSON-LD present (`yes`/`no`).
    Minimum row count: same count as `loc` entries in `sitemap.xml` for page URLs (excluding pure asset URLs if any).
  </action>
  <acceptance_criteria>
    - File `.planning/baseline/seo-inventory.md` contains heading `# SEO inventory`.
    - Line count for table rows ≥ number of `<loc>` entries in sitemap.xml (use `grep -c '<loc>' sitemap.xml` for numeric compare).
  </acceptance_criteria>
</task>

<task id="01-01-03">
  <objective>Record lightweight performance baseline</objective>
  <read_first>
    - data/locations.json (pick one open + one coming-soon slug)
  </read_first>
  <action>
    Create `.planning/baseline/performance-notes.md` with sections `## Homepage`, `## Open location`, `## Coming-soon location`. For each, record transfer-size estimate using DevTools Network total KB or `curl -s -o /dev/null -w '%{size_download}'` against local static server, plus optional Lighthouse scores if run—otherwise explicit note `Lighthouse not run (manual weight only)`.
    Map open location file to `{slug}.html` from JSON; coming-soon similarly.
  </action>
  <acceptance_criteria>
    - File contains literal substring `index`, `philadelphia` OR another `{slug}.html` matching an open location from `data/locations.json`.
    - File contains substring `coming-soon` or equivalent slug from a location where `"status"` is `coming-soon` in `data/locations.json`.
  </acceptance_criteria>
</task>

<task id="01-01-04">
  <objective>Document smoke-test behavior baseline</objective>
  <read_first>
    - tests/smoke/site.spec.js
    - playwright.config.js
  </read_first>
  <action>
    Create `.planning/baseline/behavior-notes.md` listing each `test(` or `test.describe` block title from `tests/smoke/site.spec.js` and whether it passed at baseline (`pass`) with command `npm run test:smoke`. Add free-text bullets for FAQ keyboard behavior, ticket panel, nav overlay, `localStorage` location persistence expectations referencing selectors from tests where present.
  </action>
  <acceptance_criteria>
    - File references string `tests/smoke/site.spec.js`.
    - File contains substring `Playwright` or `npm run test:smoke`.
  </acceptance_criteria>
</task>

<task id="01-01-05">
  <objective>Stub rollback runbook pointer</objective>
  <read_first>
    - .planning/phases/01-static-baseline-rollback-guardrails/01-CONTEXT.md (D-15–D-17)
  </read_first>
  <action>
    Create `docs/rollback-runbook.md` with sections: `## Rollback git ref` (points to tag `pre-astro-migration-baseline`), `## Failure triggers` (bullet list: broken checkout/booking, redirect loops, missing critical pages/assets, severe visual regression, contact form failure, major analytics failure), `## Operator steps` (placeholder: checkout tag, deploy static root), `## Phase 8 rehearsal` (note cross-link to future verification).
    Full Cloudflare-specific steps may remain TODO but triggers must match CONTEXT D-16 verbatim keywords.
  </action>
  <acceptance_criteria>
    - `docs/rollback-runbook.md` contains string `pre-astro-migration-baseline`.
    - Same file contains substring `redirect loops` and substring `contact form`.
  </acceptance_criteria>
</task>

---

## PLANNING COMPLETE
