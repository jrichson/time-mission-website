# Phase 10 — Audit-Gap Closure & Cutover Readiness

**Status:** Not planned yet
**Depends on:** Phase 9 (architecture deepening complete; verify gate stable)
**Created:** 2026-05-04

## Origin

External SEO / A11y / Security / Performance audit produced 39 findings against the **legacy live site** at `timemission.com`. Source: `~/Downloads/Time Mission Website Audit - Findings.csv`.

Phases 1–9 of the Astro migration close most findings, but a coverage analysis (2026-05-04) showed **13 code gaps** still remain plus **9 external/host dependencies**. Phase 10 tracks closure of those gaps before cutover so that every P0/P1 finding either:

1. Ships fixed in the Astro `dist/` output, or
2. Has a documented host-config change in the cutover runbook, or
3. Is explicitly deferred with rationale.

## Goal

Every P0 and P1 audit finding either ships fixed in Astro `dist/` output, has a documented host-config change in the cutover runbook, or is explicitly deferred with rationale. Phase 10 is the final pre-cutover hardening pass.

## Scope (no new v1 requirement IDs)

This phase extends existing SEO / COMP / DATA / ANLY / VER practices. It does **not** add new requirement rows to REQUIREMENTS.md.

### Code gaps that must ship in Astro before cutover

| # | Finding | Summary |
|---|---------|---------|
| 1 | **P0-5 / P0-8** | Schema brand names — Antwerp `data/locations.json` still says `"Experience Factory Antwerp"`. Rename to `"Time Mission Antwerp"`, add `alternateName` field support to `src/lib/schema/localBusiness.ts` `LocalBusinessNode` interface, emit `alternateName: "Experience Factory Antwerp"` for Antwerp. Extend `check-schema-output.js` to assert all 6 open locations declare `name="Time Mission [City]"`. |
| 2 | **P0-4** | Image alt coverage — add axe-core run against `dist/` HTML in `verify` chain; add `aria-hidden="true"` to decorative SVGs in `src/partials/*-main.frag.txt`. |
| 3 | **P0-7a** | Mobile location selector double-tap bug — Playwright mobile-viewport test asserting location-link tap navigates to location page; investigate `js/nav.js` handler that double-toggles. |
| 4 | **P1-3** | SSR landmarks + skip-link — wrap `SiteLayout.astro` slots in semantic `<header>`, `<main id="main">`, `<footer>`; add SSR-visible skip-link as first body child instead of relying on `js/a11y.js` runtime injection. |
| 5 | **P1-8** | Add missing legacy redirects to `_redirects`: `/wp-login.php`, `/wp-admin*`, `/cart/*`, `/checkout/*`, `/shop/*`, `/feed`, `/atom.xml`, `/wp-sitemap.xml`, `/palisades`. Use 410 Gone for WordPress-era paths where Cloudflare supports it, otherwise 301 to `/`. |
| 6 | **P1-9** | Per-route lang + hreflang — `SiteLayout` accepts optional `lang` prop derived from location region (`nl-BE` for Antwerp, `nl-BE` or `fr-BE` for Brussels); `SiteHead` emits `<link rel="alternate" hreflang>` cluster on EU and US location pages. |
| 7 | **P1-12** | Hero `<video>` captions or aria-hidden — in `src/partials/index-main.frag.txt` add `<track kind="captions" srclang="en" src="..." default>` OR mark decorative with `aria-hidden="true" tabindex="-1"`. **Brand decision required.** |
| 8 | **P1-16** | Migrate remaining legal pages to Astro — create `src/pages/terms.astro`, `code-of-conduct.astro`, `licensing.astro`, `cookies.astro`, `accessibility.astro`, `waiver.astro`. Currently only `privacy.astro` exists; rest serve from legacy HTML. |
| 9 | **P1-18** | Per-location hero srcset — replace single hero `<img>` with `<picture>` + `srcset` (1920×1080 base, 2x retina) in location partials. |
| 10 | **P2-1** | RUM beacon — integrate `web-vitals` library pushing LCP / CLS / INP to dataLayer; alternative: enable Cloudflare Web Analytics. |
| 11 | **P2-4** | Cookie banner / CMP — implement consent banner wrapped in `<aside aria-label="Cookie consent">`. Resolves open blocker tracked in `STATE.md`. |
| 12 | **P2-6** | Brand compliance review — scripted check or manual review against `assets/mockup-reference/` and brand-dna folder. |
| 13 | **P1-1** | Tap target sizes — Playwright bounding-box check or extend `check-accessibility-baseline.js` to assert ≥44 px height on nav buttons + pagination, ≥48 px on booking CTAs. |

### External / host dependencies (track in cutover runbook, NOT this phase's code)

| Finding | Owner | Action |
|---------|-------|--------|
| **P1-7** | Web Dev | Cloudflare case-insensitive routing — verify on preview per `docs/cloudflare-preview-validation.md`. |
| **P1-10** | Product + Brand | ROLLER / Experience Factory brand strategy decision. |
| **P1-11** | GTM Admin | FB & TikTok pixel `domain=.timemission.com` — fix in GTM container, not repo. |
| **P1-17** | DevOps | `tickets.timemission.com` DNS — deploy subdomain or remove from `_headers` CSP. |
| **P2-8** | Designer | Re-export `share-image.jpg` (586 KB → ~150 KB). |
| **P2-9** | Designer + Web Dev | Compress `brochure.pdf` (11.7 MB → ~2–3 MB). |
| **P2-10** | DevOps | Document `api-1.timemission.com` open CORS — narrow to canonical host if PII-bound. |

## Success Criteria

What must be TRUE when Phase 10 closes:

1. All 6 open-location LocalBusiness JSON-LD nodes declare `name="Time Mission [City]"`; legacy operator names appear only in `alternateName`.
2. axe-core run against built `dist/` reports zero critical image-alt violations.
3. Every `SiteLayout` page renders `<main id="main">` and an SSR-visible skip-link as first focusable element.
4. Antwerp page emits `<html lang="nl-BE">` and hreflang cluster pairs Antwerp ↔ US locations.
5. All 6 remaining legal pages render via Astro routes; legacy `terms.html`, `code-of-conduct.html`, `licensing.html`, `cookies.html`, `accessibility.html`, `waiver.html` serve via 301 redirect or Astro page (not direct legacy HTML).
6. WordPress-era URLs (`/wp-login.php`, `/cart`, `/checkout`, `/shop`, `/feed`, `/atom.xml`, `/wp-sitemap.xml`) return 410 or 301.
7. RUM signal (LCP / CLS / INP) appears in dataLayer for at least homepage and one location page.
8. `verify` chain runs new checks: `check-img-alt-axe`, `check-schema-altname`, `check-tap-targets`, `check-hreflang-cluster`.
9. Cutover runbook (`docs/rollback-runbook.md` or new `docs/cutover-checklist.md`) lists every P0/P1 host-dependency with owner + verification step.

## Suggested Wave Breakdown

These are starting points for `/gsd-plan-phase 10` to refine.

| Wave | Plan | Focus |
|------|------|-------|
| 1 | 10-01 | Antwerp rename + `alternateName` + `check-schema-altname` |
| 1 (parallel) | 10-02 | Missing redirects added to `_redirects` + `check-route-contract` assertions |
| 2 | 10-03 | SSR landmarks + skip-link in `SiteLayout`, decorative SVG `aria-hidden` sweep |
| 2 (parallel) | 10-04 | axe `dist` scan + `check-img-alt-axe` |
| 3 | 10-05 | Terms / code-of-conduct / licensing / cookies / accessibility / waiver Astro pages with parity to legacy HTML |
| 4 | 10-06 | Per-route `lang` prop + hreflang cluster on location pages |
| 5 | 10-07 | Hero srcset + `web-vitals` beacon |
| 6 | 10-08 | Cookie banner / CMP + tap-target check |
| 7 | 10-09 | `cutover-checklist.md` with host-dependency owners + `verify:phase10` gate |

## UI Hint

Yes — this phase touches:

- Legal page parity (6 new Astro pages)
- Cookie banner visual states
- Skip-link visual states (focus-visible styling)
- Hero `<picture>` srcset behavior at multiple breakpoints

## Inputs to consult during planning

- Audit CSV (source): `~/Downloads/Time Mission Website Audit - Findings.csv`
- Coverage analysis (2026-05-04): conversation transcript producing the 13-gap punch list
- `_headers`, `_redirects` (current host config)
- `src/lib/schema/localBusiness.ts`, `src/data/site/seo-routes.json`, `data/locations.json`
- `docs/rollback-runbook.md`, `docs/cloudflare-preview-validation.md`, `docs/roller-booking-launch-checklist.md`
- `js/a11y.js` (current runtime skip-link injection — to be replaced by SSR landmark)
- `scripts/check-schema-output.js`, `scripts/check-accessibility-baseline.js`, `scripts/check-route-contract.js` (validators to extend)

## Next step

`/gsd-plan-phase 10` to break this scope into sequenced plans with task lists.
