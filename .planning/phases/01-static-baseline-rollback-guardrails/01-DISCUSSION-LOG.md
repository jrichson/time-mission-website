# Phase 1: Static Baseline & Rollback Guardrails - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 01-static-baseline-rollback-guardrails
**Areas discussed:** Baseline evidence, Astro skeleton shape, Asset and host-file preservation, Rollback policy, Phase 1 verification gate

---

## Baseline Evidence

| Option | Description | Selected |
|--------|-------------|----------|
| Representative templates | Homepage, marketing, group, open location, coming-soon location, locations index, FAQ/contact, policy/utility. | |
| Every public page | Strongest evidence, more setup and snapshot churn. | Yes |
| Minimal | Only homepage plus one location; fastest, higher parity risk later. | |

**User's choice:** Every public page.
**Notes:** Baseline evidence is intentionally broad for visual parity.

| Option | Description | Selected |
|--------|-------------|----------|
| Critical flows only | Location picker, ticket panel, FAQ keyboard, contact form config, mobile nav. | |
| All current smoke plus notes | Existing smoke coverage plus written behavior notes for template types. | Yes |
| Existing tests only | No extra behavior notes yet. | |

**User's choice:** All current smoke flows plus written behavior notes.
**Notes:** Notes should capture behavior that later componentization could break.

| Option | Description | Selected |
|--------|-------------|----------|
| Lightweight inventory | Representative metadata/schema inventory. | |
| Full inventory | Full page-by-page metadata/schema inventory now. | Yes |
| Defer | Defer SEO inventory mostly to Phase 7. | |

**User's choice:** Full page-by-page SEO/static metadata inventory.
**Notes:** Phase 7 still owns generated SEO/schema, but Phase 1 captures the current baseline.

| Option | Description | Selected |
|--------|-------------|----------|
| Lightweight performance | Homepage, open location, coming-soon location page weight plus basic Lighthouse/manual notes. | Yes |
| None | No performance baseline until built-output verification. | |
| Full Core Web Vitals | Broader than Phase 1. | |

**User's choice:** Lightweight performance baseline.
**Notes:** Full performance optimization remains out of scope for Phase 1.

---

## Astro Skeleton Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal shell | Minimal Astro shell/build proof only, no customer page migration yet. | Yes |
| Homepage first | Migrate homepage into Astro during Phase 1. | |
| Representative page | Migrate one low-risk representative page during Phase 1. | |

**User's choice:** Minimal Astro shell/build proof only.
**Notes:** Phase 1 should prove build mechanics without starting page migration.

| Option | Description | Selected |
|--------|-------------|----------|
| Parallel source | Add Astro source/scripts while leaving root legacy HTML deployable and untouched. | Yes |
| Move assets now | Move assets/host files into Astro structure immediately. | |
| Branch-only reference | Rely on git history for old-site rollback. | |

**User's choice:** Add Astro source/scripts in parallel.
**Notes:** Later rollback clarification allows root static reorganization after creating a rollback git ref.

| Option | Description | Selected |
|--------|-------------|----------|
| Set contract | Set `build.format: 'file'` and `trailingSlash: 'never'` now, enforce in Phase 2. | Yes |
| Defer config | Use Astro defaults in Phase 1. | |
| Directory output | Use directory output and hosting translation. | |

**User's choice:** Set `build.format: 'file'` and `trailingSlash: 'never'` now.
**Notes:** Context7 Astro docs confirmed `build.format` controls output file shape and `trailingSlash: 'never'` aligns with file output.

| Option | Description | Selected |
|--------|-------------|----------|
| Add Astro scripts | Add `build:astro`, `preview:astro` while preserving current `verify`. | Yes |
| Replace verify | Immediately make `npm run verify` build Astro too. | |
| Manual only | Keep Astro build manual. | |

**User's choice:** Add separate Astro scripts while preserving current `verify`.
**Notes:** Phase 1 gate still includes Astro build and output checks.

---

## Asset And Host-File Preservation

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror static surface | Assets, CSS, JS, data, host files, robots/sitemap/404. | Yes |
| Minimal assets | Only files needed by the minimal shell. | |
| Defer copying | Document what must move later. | |

**User's choice:** Mirror the current public static surface.
**Notes:** The Astro output should prove deployability, not just render a shell.

| Option | Description | Selected |
|--------|-------------|----------|
| Full host set | `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `404.html`, favicon/logo assets, static data. | Yes |
| Core host only | Only `_headers`, `_redirects`, and `robots.txt`. | |
| Document only | Enforce later. | |

**User's choice:** Full host/control set is mandatory build output.
**Notes:** This supports Cloudflare/Netlify-style static hosting assumptions.

| Option | Description | Selected |
|--------|-------------|----------|
| Manifest check | Required-output manifest for host files plus representative assets/media. | Yes |
| Exhaustive compare | Compare all current public files against `dist/`. | |
| Spot-check | Manual spot checks. | |

**User's choice:** Required-output manifest check.
**Notes:** Stronger than manual checks, less brittle than exhaustive comparison.

| Option | Description | Selected |
|--------|-------------|----------|
| Copy current | Copy current `sitemap.xml` and `robots.txt`, defer generation. | Yes |
| Generate now | Start generating sitemap/robots immediately. | |
| Exclude now | Leave out until routing is planned. | |

**User's choice:** Copy current sitemap and robots unchanged.
**Notes:** Route generation and SEO data ownership remain later-phase work.

---

## Rollback Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Root static remains deployable | Current root site remains deployable until cutover. | |
| Snapshot copy | Create separate legacy snapshot directory/package. | |
| Git ref | Use a named git tag/branch as rollback source. | Yes |

**User's choice:** Use a named git tag/branch as rollback source.
**Notes:** This modifies the default expectation: root static files do not need to stay deployable forever after rollback ref creation.

| Option | Description | Selected |
|--------|-------------|----------|
| Triggered runbook | Failure triggers, Cloudflare/operator steps, verification after rollback. | Yes |
| Trigger list only | Detailed runbook later. | |
| Deployment notes | General notes only. | |

**User's choice:** Trigger-based rollback runbook.
**Notes:** Runbook should be produced in Phase 1.

| Option | Description | Selected |
|--------|-------------|----------|
| Critical trigger set | Broken checkout, redirect loops, missing pages/assets, severe visual regression, contact form failure, major analytics failure. | Yes |
| Checkout/routes only | Only checkout and route failures. | |
| All launch risks | Include every known risk. | |

**User's choice:** Critical trigger set.
**Notes:** Moderate SEO/content/performance concerns can be launch risks without all being automatic rollback triggers.

| Option | Description | Selected |
|--------|-------------|----------|
| Document now, rehearse later | Document Phase 1; rehearse in Phase 8. | Yes |
| Rehearse now | Try rollback mechanics immediately. | |
| Defer all | Defer documentation and rehearsal. | |

**User's choice:** Document now, rehearse against preview/Cloudflare in Phase 8.
**Notes:** Phase 1 should not require Cloudflare preview deployment.

| Option | Description | Selected |
|--------|-------------|----------|
| Tag and avoid overwrite | Create rollback ref and avoid root static disruption until cutover. | |
| Tag only; root can change | Create rollback ref; root static files may be reorganized if Astro needs it. | Yes |
| Ask before root changes | Require explicit approval before root static file moves/deletes. | |

**User's choice:** Create rollback ref; root static files may be reorganized if Astro needs it.
**Notes:** Planner must make rollback ref creation an explicit prerequisite before any root static reorganization.

---

## Phase 1 Verification Gate

| Option | Description | Selected |
|--------|-------------|----------|
| Current plus Astro | Current `npm run verify`, `npm run build:astro`, and required `dist/` manifest check. | Yes |
| Astro only | Astro build and manifest check only. | |
| Current only | Current `verify`; Astro advisory. | |

**User's choice:** Current `verify` plus Astro build plus manifest check.
**Notes:** This preserves the current gate while proving Astro output.

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal preview | Serve/preview `dist/` and confirm shell, 404, host files, representative assets. | Yes |
| Build only | File checks are enough. | |
| Cloudflare preview now | Require real Cloudflare preview in Phase 1. | |

**User's choice:** Minimal preview-like load check.
**Notes:** Real Cloudflare preview validation belongs later.

| Option | Description | Selected |
|--------|-------------|----------|
| Required | Screenshots/notes, full SEO inventory, lightweight performance baseline, rollback runbook. | Yes |
| Partial | Only rollback runbook and manifest. | |
| Optional | Baseline artifacts advisory only. | |

**User's choice:** Baseline artifacts are required.
**Notes:** These artifacts are part of the Phase 1 done definition.

| Option | Description | Selected |
|--------|-------------|----------|
| Fix or document | Fix in-scope failures; document pre-existing/out-of-scope failures and get acceptance. | Yes |
| Block all | Block until every current check passes. | |
| Document only | Do not block Astro baseline work. | |

**User's choice:** Fix in-scope failures or document pre-existing failures with explicit acceptance.
**Notes:** Avoids hiding current-site failures while respecting phase scope.

---

## Claude's Discretion

- Exact artifact filenames and manifest schema.
- Exact preview server implementation, as long as it validates Astro `dist/`.

## Deferred Ideas

- Customer-facing page migration.
- Full route registry and legacy `.html` redirect enforcement.
- Generated sitemap/schema/data modules.
- Full Core Web Vitals optimization.
