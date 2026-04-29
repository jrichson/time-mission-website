# Phase 1 Research — Static Baseline & Rollback Guardrails

**Phase:** 01-static-baseline-rollback-guardrails  
**Status:** Complete  
**Answers:** What must be known to plan Phase 1 execution well?

---

## Summary

Phase 1 proves Astro static output (`output: 'static'`), `build.format: 'file'`, and `trailingSlash: 'never'` against Cloudflare Pages-style deployment while keeping the legacy HTML/CSS/JS tree intact for rollback via a **named git ref created before** any destructive root moves. Public deploy surface (`public/` → `dist/`) must mirror `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `404.html`, `assets/`, `css/`, `js/`, `data/` without redesigning pages—only a **minimal** `src/pages/*` shell proves the pipeline.

Baseline evidence (screenshots, SEO inventory, perf notes, smoke behavior notes) is captured **against the current static site** before migration work skews parity comparisons.

---

## Astro Static Output (2026 baseline)

| Topic | Finding |
|-------|---------|
| Output mode | `output: 'static'` (default for static sites; explicit for clarity). |
| File URLs | `build.format: 'file'` yields `dist/foo.html` for `/foo` routes—matches extensionless hosting patterns when paired with host rules (Phase 2 deepens URL contract). |
| Trailing slash | `trailingSlash: 'never'` aligns with roadmap canonical URLs. |
| `public/` | Files copy verbatim to `dist/` root; no bundling. Essential for `_headers`, `_redirects`, binary assets. |
| Minimal route | A tiny `src/pages/index.astro` (or `placeholder.astro`) satisfies “shell proof” without migrating real homepage markup (per `01-CONTEXT.md` D-05). |

**References:** `.planning/phases/01-static-baseline-rollback-guardrails/01-CONTEXT.md` canonical Astro notes; Context7 `/withastro/docs` project structure.

---

## Brownfield Layout Risks

| Risk | Mitigation in Phase 1 |
|------|------------------------|
| Duplicate truth (`public/` vs repo root) | Pre-build sync script copies/mirrors required paths into `public/`; document until Phase 4 replaces with single source. |
| `npm run verify` regression | Add **parallel** scripts `build:astro`, `preview:astro`; gate Phase 1 with `npm run verify && npm run build:astro && node scripts/check-astro-dist-manifest.js` (exact names from plans). |
| Rollback ambiguity | Tag or branch **`pre-astro-baseline`** (or name from plan) **before** deleting/moving root static files. |

---

## Baseline Evidence Scope

| Artifact | Scope |
|----------|--------|
| Visual | Representative capture list: all **deployable** HTML pages enumerated by existing checks (`scripts/check-internal-links.js`, `scripts/check-sitemap.js`), excluding `ads/`, `components/`, and non-production HTML under `assets/extracted/` unless explicitly included. |
| SEO inventory | Per-page: title, meta description, canonical link if present, robots meta, major headings count, JSON-LD presence flag—stored as Markdown or CSV under `.planning/` or `docs/` per executor. |
| Performance | Lightweight: Home + one open location + one coming-soon location—record transfer size and Lighthouse category scores or manual notes (D-04). |
| Behavior | Extend or reference `tests/smoke/site.spec.js` coverage notes; document ticket panel, FAQ keyboard, nav overlays, contact form as checklist. |

---

## Verification Hooks

Existing gate: `npm run verify` = `check:*` + Playwright. Phase 1 adds **manifest verification on `dist/`** after `astro build`, not only source checks—supports future VER-01 alignment.

---

## Validation Architecture

Phase 1 validation is **Node/npm-centric** with Playwright for legacy site smoke tests and optional manual browser checks against `astro preview` output.

| Dimension | Approach |
|-----------|----------|
| Automated baseline | `npm run verify` must exit 0 before Phase 1 closes (existing scripts). |
| Astro build | `npm run build:astro` exits 0; `dist/` exists. |
| Manifest | New script exits 0 when required files exist under `dist/` (list from plan). |
| Preview | Manual or scripted HTTP GET samples against preview server—document in runbook. |
| Security testing | No auth surface in Phase 1; dependency audit optional (`npm audit`) as advisory. |

**Nyquist note:** Wave 0 does not require new Playwright projects for Astro-only routes until routes exist beyond placeholder; manifest + build + existing verify provide automated feedback every wave.

---

## RESEARCH COMPLETE

Next: executable plans in `01-PLAN.md`, `02-PLAN.md`, `03-PLAN.md`; validation mapping in `01-VALIDATION.md`.
