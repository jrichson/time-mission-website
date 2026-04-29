# Project Research Summary

**Project:** Time Mission Website Astro Migration  
**Domain:** Brownfield static marketing/location website migration  
**Researched:** 2026-04-29  
**Confidence:** HIGH overall; MEDIUM where production GTM, consent, ROLLER, and form-provider decisions remain open

## Executive Summary

Time Mission is not migrating an app; it is migrating a high-value static marketing and location website whose revenue, local SEO, analytics, and form flows already depend on stable static HTML plus progressive browser enhancement. The right expert posture is parity-first and contract-first: use Astro to remove duplicated markup and data drift, but keep the site static, crawlable, visually consistent, and deployable with the current static-host rollback model.

The recommended foundation is Astro 6 static output with `.astro` components, TypeScript, validated data modules/content loaders, shared route/URL helpers, first-party SEO/schema helpers, first-party GTM/analytics helpers, existing CSS/assets, and Playwright plus Node contract checks as the launch gate. Do not introduce React, SSR, Tailwind, CMS, broad script rewrites, full i18n, or a booking-platform replacement in the foundation milestone.

The main risks are URL drift, visual parity loss, location data drift, booking regressions, inconsistent analytics, SEO/schema mismatches, and verification that keeps testing the old site shape. The mitigation is to establish baseline parity and route/data contracts before bulk conversion, then validate built `dist/` output for redirects, canonicals, sitemap, schema, internal links, booking destinations, analytics events, accessibility behavior, and rollback readiness.

## Key Findings

### Recommended Stack

Use Astro as a static site generator rather than an application framework. Astro should generate the same public experience while creating reusable layouts, components, data modules, route helpers, schema helpers, and verification contracts. Preserve current CSS, assets, and vanilla scripts during the first cutover; simplify them only after parity is proven.

**Core technologies:**
- Astro `^6.1.10`: static site generation, file-based routes, `.astro` components, dynamic static routes through `getStaticPaths()`.
- TypeScript `^6.0.3` plus `@astrojs/check`: typed data/helper modules and CI diagnostics for `.astro` and `.ts`.
- Astro content collections/file loaders and `astro/zod`: build-time validation for locations, routes, groups, FAQs, SEO, schema, navigation, and tracking labels.
- `@astrojs/sitemap`: generated sitemap from actual Astro routes and production `site` config.
- Existing CSS/assets and vanilla browser scripts: parity-first migration without adding client runtime framework risk.
- Playwright and custom Node checks: route, redirect, schema, internal link, analytics, accessibility, and smoke verification against built output.
- First-party GTM, consent, analytics, route, booking, and schema helpers: explicit control over timing, privacy, URL policy, and event payload shape.

### Expected Features

**Must have (table stakes):**
- Static Astro build output suitable for Cloudflare Pages-style hosting.
- Visual and content parity with current pages, CSS, typography, imagery, animations, nav, footer, overlays, CTAs, and copy.
- Clean extensionless canonical URLs with no trailing slash, plus direct legacy `.html` redirects.
- Shared layout components for nav, footer, ticket panel, location picker, SEO head, FAQ, breadcrumbs, and recurring sections.
- Validated data-driven location pages, including open and coming-soon location rules.
- Booking CTA preservation with tracked external ROLLER checkout links as the default path.
- GTM-first analytics foundation with Consent Mode v2 readiness, stable `event_id`, no PII, and dedupe-ready event payloads.
- SEO, local SEO, schema, sitemap, robots, host-file, 404, contact/form, and rollback parity.
- Verification against built Astro output, not just source files.

**Should have (quality upgrades):**
- Single source of truth for routes, locations, booking destinations, schema, sitemap, nav, footer, and tracking labels.
- Route, location identity, local SEO, analytics contract, and built-output checkers.
- Visual regression snapshots and keyboard/accessibility behavior tests for representative templates.
- Server-side analytics readiness via a documented payload contract, without requiring a server endpoint for static launch.
- International-ready location fields for country, locale, timezone, currency, and phone formatting without launching full translations.
- Optional AI/GEO launch asset such as `llms.txt` and answer-friendly content blocks if accepted.

**Defer (v2+):**
- Full redesign or CRO pass.
- Full translations/i18n and `hreflang` rollout.
- Completed-purchase attribution as a hard launch blocker, unless ROLLER/GTM access is available.
- Server-side analytics forwarding infrastructure.
- Broad client-script rewrites and image optimization beyond targeted, verified wins.
- CMS, SSR/hybrid rendering, Tailwind migration, React/Vue/Svelte islands, or booking platform replacement.

### Architecture Approach

Architecture should flow one way: validated data modules feed route, SEO/schema, booking, and analytics helpers; helpers feed Astro page templates and components; Astro emits static `dist/`; verification inspects the emitted output. Components should render semantic HTML, stable selectors, and prepared props. Browser scripts should enhance static markup and own runtime side effects such as selected-location persistence, ticket panel behavior, outbound navigation, and analytics dispatch.

**Major components:**
1. `BaseLayout.astro` and `SeoHead.astro` — HTML shell, metadata, schema slots, global CSS/scripts, canonical URL policy.
2. Shared UI components — nav, location picker, footer, ticket panel, FAQ, and breadcrumbs with preserved DOM/classes where practical.
3. Page templates — homepage, marketing/policy pages, groups, location pages, locations index, FAQ/contact, and 404.
4. Data modules — locations, routes, groups, navigation, SEO metadata, schema inputs, FAQs, and tracking labels.
5. Helper modules — canonical paths, legacy redirects, booking destinations, schema builders, analytics contract, consent-safe event handling.
6. Verification layer — source-data validation plus built-output checks and Playwright smoke/behavior tests.

### Critical Pitfalls

1. **Clean URL drift** — avoid by defining one URL contract early and generating/validating canonicals, redirects, sitemap, schema URLs, and internal links from one route helper.
2. **Visual parity loss during componentization** — avoid by capturing baseline screenshots, preserving selectors/classes/DOM structure, and converting representative templates before bulk pages.
3. **Location data drift survives migration** — avoid by making validated location data the only authored source for IDs, slugs, status, NAP, booking URLs, map URLs, schema inputs, and international-ready fields.
4. **Booking flow regression** — avoid by centralizing booking destination helpers, testing open and coming-soon flows, preserving `?book=1` behavior intentionally, and firing outbound tracking before navigation.
5. **Analytics treated as scattered tags** — avoid with one event contract, one browser `track()` helper, consent defaults, PII checks, stable `event_id`, and Playwright assertions for single event dispatch.
6. **SEO/schema rebuilt after routes instead of with routes** — avoid by generating metadata, sitemap, JSON-LD, breadcrumbs, FAQ schema, and local SEO checks from the same route/data helpers.
7. **Verification tests the old site shape** — avoid by making `npm run verify` build Astro, serve preview/static output, and validate `dist/` behavior.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Baseline Parity And Preflight Decisions
**Rationale:** The current site is the contract; unresolved URL, checkout, analytics, forms, iframe, and rollback decisions should not leak into implementation.  
**Delivers:** URL inventory, screenshot/behavior baseline, SEO/schema inventory, current verification state, rollback triggers, and decisions on checkout URL fields and form ownership.  
**Addresses:** Visual/content parity, cutover readiness, rollback readiness.  
**Avoids:** Visual parity drift, booking ambiguity, rollback documented too late.

### Phase 2: Astro Static Skeleton
**Rationale:** Prove Astro can emit static output without changing the visual system or deployment model.  
**Delivers:** Astro config with `output: "static"`, production `site`, `trailingSlash: "never"`, `build.format: "file"`, base layout, global CSS/assets/host file pass-through, one low-risk parity page, and initial `astro check/build/preview` scripts.  
**Uses:** Astro, TypeScript, existing CSS/assets, `@astrojs/check`.  
**Avoids:** Missing public assets, static host control files disappearing, premature redesign.

### Phase 3: Route Registry And Clean URL Contract
**Rationale:** Routes feed every later concern: pages, canonicals, redirects, sitemap, schema, analytics context, and booking fallbacks.  
**Delivers:** `src/data/routes.ts`, `src/lib/routes.ts`, clean canonical helpers, legacy `.html` redirect map, route checks, sitemap generation/checking, and no stale `.html` internal links.  
**Addresses:** Clean extensionless canonical URLs, legacy redirects, host configuration parity.  
**Avoids:** URL variants, redirect loops, duplicate SEO signals, hand-maintained route strings.

### Phase 4: Validated Data Foundation
**Rationale:** Location and business facts must stabilize before components and pages scale.  
**Delivers:** Validated location data, route/location identity checks, booking helper inputs, schema/SEO inputs, local SEO fields, international-ready fields, and generated browser compatibility payloads if needed.  
**Addresses:** Data-driven location pages, local SEO baseline, booking destination preservation.  
**Avoids:** Location drift, wrong city identity, hardcoded booking/schema/nav/footer facts.

### Phase 5: Shared Components And Representative Templates
**Rationale:** Components reduce repeated migration work, but they must preserve CSS and script contracts before broad conversion.  
**Delivers:** Base layout, SEO head, nav, footer, location picker, ticket panel, FAQ, breadcrumbs, homepage, one marketing page, one group page, one open location, one coming-soon location, locations index, FAQ/contact/policy pattern.  
**Addresses:** Shared layout components, visual/content parity, browser behavior parity.  
**Avoids:** CSS cascade regressions, selector breakage, build-time/runtime confusion.

### Phase 6: Bulk Page Conversion
**Rationale:** After templates, routes, and data are stable, remaining pages should be content mapping rather than architecture work.  
**Delivers:** Remaining marketing, group, location, legal, thank-you, and 404 pages rendered through Astro templates and validated data.  
**Addresses:** Full static Astro output and clean public route coverage.  
**Avoids:** Manual sitemap/schema maintenance and parallel old/new page sources.

### Phase 7: Booking Flow Modernization
**Rationale:** Booking is the highest-value conversion flow and should be modernized only after route/data/component contracts exist.  
**Delivers:** External ROLLER checkout links as default, default-off legacy iframe fallback if required, `?book=1` behavior decision/tests, coming-soon fallbacks, and outbound booking smoke tests.  
**Addresses:** Booking CTA preservation, external ROLLER checkout default.  
**Avoids:** Lost ticket revenue, wrong-venue links, broken coming-soon paths.

### Phase 8: Analytics, Consent, And Forms Contract
**Rationale:** Analytics and forms need stable CTA/page markup, but the event/form contracts must be explicit before launch.  
**Delivers:** First-party GTM component, Consent Mode v2 defaults, browser `track()` helper, event contract docs/tests, no-PII checks, dedupe fields, provider-flexible form markup, thank-you routes, and success/failure analytics where possible.  
**Addresses:** GTM-first foundation, consent readiness, form parity, server-side tracking readiness.  
**Avoids:** Inconsistent events, privacy leakage, form provider fragility, unobservable lead loss.

### Phase 9: SEO, Schema, Local SEO, And AI Readiness
**Rationale:** Metadata and structured data must be generated from the same route/data helpers as pages.  
**Delivers:** Generated canonical metadata, sitemap, Organization/WebSite, BreadcrumbList, FAQ, location JSON-LD, open vs coming-soon schema rules, local SEO validation, robots review, and optional `llms.txt`.  
**Addresses:** SEO preservation, GEO/AI extractability, schema generation, local SEO baseline.  
**Avoids:** Search ranking loss, malformed/misleading schema, local fact inconsistency.

### Phase 10: Verification And Cutover Readiness
**Rationale:** Source correctness is not enough; the emitted static site and preview deployment are what users and crawlers experience.  
**Delivers:** `npm run verify` as the launch gate, built-output checks, Playwright against Astro preview/static output, visual snapshots, accessibility behavior tests, performance budget/manual gates, Cloudflare preview validation, GTM DebugView checks, ROLLER URL validation, and rollback rehearsal.  
**Addresses:** Verification against built output, smoke coverage, cutover and rollback readiness.  
**Avoids:** Green tests on old assumptions, broken production redirects/assets/forms/analytics.

### Phase Ordering Rationale

- Baseline and preflight decisions come first because they define what parity, rollback, and launch failure mean.
- Astro skeleton comes before route/data conversion to prove the static deployment model and CSS/assets survive.
- Routes and data must precede broad component/page conversion because they feed every durable public contract.
- Shared components and representative templates should stabilize before bulk page migration.
- Booking, analytics, forms, SEO/schema, and cutover verification are grouped by risk and should validate built output rather than source intent.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 7:** ROLLER/GTM behavior, iframe fallback requirements, and purchase attribution depend on production access and business decisions.
- **Phase 8:** Consent provider, GTM container policy, form backend, spam protection, and optional server-side event forwarding need implementation-specific decisions.
- **Phase 10:** Cloudflare Pages redirect/header behavior, preview parity, and production rollback process should be validated against actual hosting configuration.

Phases with standard patterns where additional research can usually be skipped:
- **Phase 1:** Baseline capture and parity inventory are project-specific execution, not external research.
- **Phase 2:** Astro static skeleton is well documented by official Astro and Cloudflare Pages docs.
- **Phase 3:** Route registry, redirects, and sitemap checks follow established static-site patterns.
- **Phase 4:** Data validation and helper-module boundaries are clear from current codebase risks.
- **Phase 5 and Phase 6:** Component/template conversion should be driven by existing HTML/CSS parity rather than new external research.
- **Phase 9:** SEO/schema implementation can mostly proceed from documented schema and current site inventory, with page-by-page validation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Astro static output, routing, content/data validation, sitemap, TypeScript checking, Cloudflare Pages, and Playwright choices are backed by official docs and current project fit. |
| Features | HIGH | Table-stakes deliverables come directly from project requirements, current architecture, concerns, and migration constraints. |
| Architecture | HIGH | Data/helper/component/runtime boundaries align with current static site behavior and Astro's documented static model. |
| Pitfalls | HIGH | Most pitfalls are project-specific and grounded in current duplication, scripts, verification gaps, URL policy, booking, analytics, and SEO risks. |
| Analytics/forms/ROLLER details | MEDIUM | Contract shape is clear, but final provider behavior depends on production GTM, consent tooling, ROLLER access, and form backend choices. |

**Overall confidence:** HIGH for roadmap structure and static migration direction; MEDIUM for provider-specific analytics, consent, forms, and ROLLER validation details.

### Gaps to Address

- Consent/CMP choice: decide whether consent is first-party, GTM-template-driven, or provided by a third-party CMP before final analytics implementation.
- ROLLER access and attribution: validate outbound links at minimum; validate purchase events only when ROLLER/GTM access exists.
- Form backend: choose a business-owned, static-host-compatible form path or explicitly defer backend changes while preserving frontend contract and analytics.
- Cloudflare production assumptions: confirm `_headers`, `_redirects`, clean URL behavior, preview deploy, and rollback steps in the real deploy environment.
- Image optimization scope: decide whether to defer all media optimization or allow targeted, measured improvements after parity.

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — recommended Astro, TypeScript, sitemap, data, analytics, verification, and hosting stack.
- `.planning/research/FEATURES.md` — table-stakes migration deliverables, differentiators, anti-features, and dependencies.
- `.planning/research/ARCHITECTURE.md` — target boundaries, data flow, URL strategy, analytics/SEO responsibilities, and build order.
- `.planning/research/PITFALLS.md` — critical migration pitfalls, prevention strategies, and phase-specific warnings.
- `.planning/PROJECT.md` — project requirements, constraints, preflight decisions, and migration scope.
- `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/TESTING.md`, `.planning/codebase/STRUCTURE.md` — current architecture, risks, test posture, and directory responsibilities.
- Astro official documentation via Context7 and linked docs — static output, routing, `getStaticPaths()`, config, content collections, sitemap, images, TypeScript, CLI.
- Cloudflare Pages Astro deploy guide — static build command and output directory assumptions.
- Google Consent Mode and Tag Manager consent API docs — consent defaults and privacy-aware measurement requirements.

### Secondary (MEDIUM confidence)
- Current npm version checks for Astro, `@astrojs/sitemap`, `@astrojs/check`, TypeScript, Sharp, and Playwright from 2026-04-29.
- Web ecosystem reports on trailing slash and Cloudflare redirect behavior, used only to reinforce URL-routing caution.

---
*Research completed: 2026-04-29*  
*Ready for roadmap: yes*
