# Roadmap: Time Mission Website Astro Migration

## Overview

This roadmap migrates the existing Time Mission static website to Astro without redesigning the customer-facing experience. The order is contract-first: prove static output and rollback safety, lock URL and data rules, preserve shared UI parity through representative templates, then complete booking, analytics/forms, SEO/schema, and launch verification against the generated site.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Static Baseline & Rollback Guardrails** - Astro can emit deployable static output while current assets, host files, and old-site rollback remain protected.
- [ ] **Phase 2: Route Registry & Clean URL Contract** - Clean extensionless URLs, legacy redirects, and route-derived public references are enforced from one contract.
- [ ] **Phase 3: Validated Data Foundation** - Durable business facts move into validated Astro-consumable data modules before page scaling.
- [ ] **Phase 4: Shared Components & Template Parity** - Shared Astro components and representative templates preserve the current visual and behavior contract.
- [ ] **Phase 5: Booking & CTA Flow** - Open-location, coming-soon, gift card, and ROLLER checkout intent paths work through validated destinations.
- [ ] **Phase 6: Analytics, Consent & Forms Contract** - GTM, consent-aware event tracking, dedupe-ready payloads, and provider-flexible forms are launch-ready.
- [ ] **Phase 7: SEO, Schema & Local Search Baseline** - Metadata, sitemap, structured data, local SEO, and AI-search readiness are generated from route/data truth.
- [ ] **Phase 8: Built-Output Verification & Cutover Readiness** - The Astro `dist/` output, preview deployment, smoke flows, visual parity, and rollback plan pass launch gates.

## Phase Details

### Phase 1: Static Baseline & Rollback Guardrails
**Goal**: The site can be built and previewed as static Astro output without losing public assets, static-host assumptions, or the ability to redeploy the old static site.
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-03, FND-04
**Success Criteria** (what must be TRUE):
  1. Visitor can load the initial Astro static build from a preview-like environment with required CSS, fonts, images, videos, scripts, 404 behavior, robots behavior, and host files present.
  2. Site operator can run the Astro build and see static output suitable for Cloudflare Pages-style hosting.
  3. Site operator can still deploy the old static site while Astro launch validation is incomplete.
  4. Site operator can identify documented rollback steps and failure triggers before any cutover decision.
**Plans**: 3 (`01-PLAN.md` rollback/baseline, `02-PLAN.md` Astro skeleton, `03-PLAN.md` dist manifest + gate)

### Phase 2: Route Registry & Clean URL Contract
**Goal**: Users, crawlers, analytics, sitemap, schema, navigation, and redirects all observe one clean no-trailing-slash URL contract.
**Depends on**: Phase 1
**Requirements**: ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04
**Success Criteria** (what must be TRUE):
  1. Visitor can open every migrated page at a clean extensionless URL with no trailing slash.
  2. Visitor using any legacy `.html` URL lands directly on the matching clean canonical URL without a redirect loop.
  3. Search engines and analytics see canonical URLs, internal links, sitemap URLs, schema URLs, and page paths that agree.
  4. Site operator gets a failing validation result when a clean route, legacy redirect, canonical, sitemap entry, or internal link drifts from the route registry.
**Plans**: TBD

### Phase 3: Validated Data Foundation
**Goal**: Location and business facts are validated once and reused by pages, routes, SEO/schema, booking, navigation, and analytics labels.
**Depends on**: Phase 2
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. Visitor sees location, group, mission, FAQ, navigation, footer, SEO, schema, and tracking-label facts sourced from validated data rather than durable component literals.
  2. Visitor on open and coming-soon location pages sees appropriate booking, gift card, map, hours, contact, local SEO, and schema-eligible details.
  3. Site operator gets validation failures when required location fields or open/coming-soon rules are missing or inconsistent.
  4. Future international location data can express country, locale, timezone, phone format, currency, and `hreflang` inputs without launching translated pages.
**Plans**: TBD

### Phase 4: Shared Components & Template Parity
**Goal**: Shared UI and representative page templates render through Astro components while preserving the current visual design and browser behavior.
**Depends on**: Phase 3
**Requirements**: FND-02, COMP-01, COMP-02, COMP-03, COMP-04
**Success Criteria** (what must be TRUE):
  1. Visitor sees the same copy, typography, imagery, animations, navigation, footer, ticket panel, overlays, and page-specific behavior as the current site unless a bug fix is explicitly documented.
  2. Visitor can use shared nav, footer, location picker, ticket panel, FAQ, breadcrumbs, and recurring sections rendered by Astro components.
  3. Browser behavior depending on CSS selectors, IDs, ARIA hooks, script hooks, and DOM structure continues to work on componentized pages.
  4. Site operator can retire the `build.sh` ticket-panel sync workflow only after the Astro ticket panel renders everywhere it is needed.
  5. Representative homepage, marketing, group, open-location, coming-soon-location, locations index, FAQ/contact, and policy/utility templates exist before bulk conversion.
**Plans**: TBD
**UI hint**: yes

### Phase 5: Booking & CTA Flow
**Goal**: Booking and revenue-adjacent CTAs resolve predictably through validated destinations, with tracked external checkout links as the default path.
**Depends on**: Phase 4
**Requirements**: BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05
**Success Criteria** (what must be TRUE):
  1. Visitor selecting an open-location booking CTA reaches the correct external ROLLER checkout destination.
  2. Visitor selecting a coming-soon location CTA receives a deliberate non-checkout fallback such as a location page, contact path, or waitlist behavior.
  3. Visitor using the existing `?book=1` entry path gets preserved clean-URL behavior or an equivalent tested booking flow.
  4. Site operator can tell whether iframe/overlay checkout support remains as an optional fallback or has been intentionally removed.
  5. Site operator has ROLLER GTM/GA4 setup and purchase-event validation included in launch readiness when Venue Manager or playground access exists.
**Plans**: TBD
**UI hint**: yes

### Phase 6: Analytics, Consent & Forms Contract
**Goal**: Site interactions, forms, and outbound intent are measurable through a privacy-conscious GTM-first event contract that is ready for browser and future server-side dedupe.
**Depends on**: Phase 5
**Requirements**: ANLY-01, ANLY-02, ANLY-03, ANLY-04, ANLY-05, ANLY-06, FORM-01, FORM-02, FORM-03, FORM-04
**Success Criteria** (what must be TRUE):
  1. Site operator can configure GTM through shared Astro integration with Consent Mode v2-ready loading behavior.
  2. Site operator can observe normalized non-PII `dataLayer` events for outbound booking, gift card, group CTA, location selection, ticket panel, contact form, and mission card interactions.
  3. Analytics payloads include stable `event_id`, timestamp, source, page context, CTA context, location context, destination URL, campaign context, and consent state where applicable.
  4. Browser events and optional server-side `/api/events` payloads share one dedupe-ready contract.
  5. Visitor can use contact and lead forms with provider-flexible markup, equivalent success/failure behavior, and clean `/contact-thank-you` routing.
**Plans**: TBD
**UI hint**: yes

### Phase 7: SEO, Schema & Local Search Baseline
**Goal**: Search engines, AI crawlers, and local search surfaces receive coherent metadata, schema, sitemap, content, and location signals generated from the same route/data contracts as pages.
**Depends on**: Phase 6
**Requirements**: SEO-01, SEO-02, SEO-03, SEO-04, SEO-05, SEO-06
**Success Criteria** (what must be TRUE):
  1. Search engines can read preserved titles, descriptions, Open Graph/Twitter metadata, headings, copy, robots behavior, and search-critical content.
  2. Search engines can discover only canonical clean URLs in the generated sitemap.
  3. Search engines can parse valid Organization/WebSite, BreadcrumbList, FAQPage, and eligible LocalBusiness/location JSON-LD.
  4. Visitor and crawler-visible location facts agree for NAP, map links, hours where applicable, open vs coming-soon status, canonicals, and location FAQ/schema coverage where content exists.
  5. AI-search and GEO readiness are reviewed through answer-first content opportunities, AI crawler policy, and optional `llms.txt`.
**Plans**: TBD
**UI hint**: yes

### Phase 8: Built-Output Verification & Cutover Readiness
**Goal**: The generated Astro site, preview deployment, user-critical flows, and rollback process are verified before launch.
**Depends on**: Phase 7
**Requirements**: VER-01, VER-02, VER-03, VER-04, VER-05, VER-06
**Success Criteria** (what must be TRUE):
  1. Site operator can run `npm run verify` or its Astro equivalent and validate the generated output rather than only source files.
  2. Site operator sees static checks cover location contracts, routes/redirects, sitemap, internal links, component parity, booking architecture, analytics contracts, schema, local SEO, accessibility, and public asset/host file output.
  3. Visitor-critical flows pass Playwright coverage for homepage loading, location persistence, booking flow, outbound booking interception, FAQ keyboard behavior, contact form behavior, and clean URL/legacy redirect behavior.
  4. Site operator can review visual regression or screenshot comparison for representative templates before cutover.
  5. Cloudflare preview validation covers headers, redirects, clean URLs, legacy redirects, sitemap, robots, 404, schema, assets, analytics debug behavior, ROLLER links, and rollback triggers.
**Plans**: TBD

## Coverage

| Requirement | Phase |
|-------------|-------|
| FND-01 | Phase 1 |
| FND-02 | Phase 4 |
| FND-03 | Phase 1 |
| FND-04 | Phase 1 |
| ROUTE-01 | Phase 2 |
| ROUTE-02 | Phase 2 |
| ROUTE-03 | Phase 2 |
| ROUTE-04 | Phase 2 |
| DATA-01 | Phase 3 |
| DATA-02 | Phase 3 |
| DATA-03 | Phase 3 |
| DATA-04 | Phase 3 |
| COMP-01 | Phase 4 |
| COMP-02 | Phase 4 |
| COMP-03 | Phase 4 |
| COMP-04 | Phase 4 |
| BOOK-01 | Phase 5 |
| BOOK-02 | Phase 5 |
| BOOK-03 | Phase 5 |
| BOOK-04 | Phase 5 |
| BOOK-05 | Phase 5 |
| ANLY-01 | Phase 6 |
| ANLY-02 | Phase 6 |
| ANLY-03 | Phase 6 |
| ANLY-04 | Phase 6 |
| ANLY-05 | Phase 6 |
| ANLY-06 | Phase 6 |
| SEO-01 | Phase 7 |
| SEO-02 | Phase 7 |
| SEO-03 | Phase 7 |
| SEO-04 | Phase 7 |
| SEO-05 | Phase 7 |
| SEO-06 | Phase 7 |
| FORM-01 | Phase 6 |
| FORM-02 | Phase 6 |
| FORM-03 | Phase 6 |
| FORM-04 | Phase 6 |
| VER-01 | Phase 8 |
| VER-02 | Phase 8 |
| VER-03 | Phase 8 |
| VER-04 | Phase 8 |
| VER-05 | Phase 8 |
| VER-06 | Phase 8 |

**Coverage status:** 43/43 v1 requirements mapped exactly once.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Static Baseline & Rollback Guardrails | 3/3 planned | Ready to execute | - |
| 2. Route Registry & Clean URL Contract | 0/TBD | Not started | - |
| 3. Validated Data Foundation | 0/TBD | Not started | - |
| 4. Shared Components & Template Parity | 0/TBD | Not started | - |
| 5. Booking & CTA Flow | 0/TBD | Not started | - |
| 6. Analytics, Consent & Forms Contract | 0/TBD | Not started | - |
| 7. SEO, Schema & Local Search Baseline | 0/TBD | Not started | - |
| 8. Built-Output Verification & Cutover Readiness | 0/TBD | Not started | - |
