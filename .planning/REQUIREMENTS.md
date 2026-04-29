# Requirements: Time Mission Website Astro Migration

**Defined:** 2026-04-29  
**Core Value:** The migrated site must preserve the existing customer-facing experience and conversion paths while making the site easier to maintain, measure, optimize, and scale.

## v1 Requirements

Requirements for the Astro migration milestone. Each requirement maps to roadmap phases.

### Foundation

- [ ] **FND-01**: The site can build as static Astro output suitable for Cloudflare Pages-style hosting.
- [ ] **FND-02**: The Astro build preserves the current visual design, copy, typography, imagery, animations, nav, footer, ticket panel, overlays, and page-specific behavior unless a change is explicitly documented as a bug fix.
- [ ] **FND-03**: Current public assets, fonts, images, videos, CSS, host files, robots behavior, 404 behavior, and static deployment assumptions are preserved in the generated output.
- [ ] **FND-04**: The old static site remains deployable until the Astro launch is verified and rollback steps are documented.

### Routing

- [ ] **ROUTE-01**: Clean extensionless URLs with no trailing slash are the canonical URLs for all migrated pages.
- [ ] **ROUTE-02**: Every legacy `.html` URL redirects directly to its clean canonical URL without redirect loops.
- [ ] **ROUTE-03**: Canonicals, internal links, navigation links, sitemap URLs, schema URLs, and analytics page paths all use the same clean route contract.
- [ ] **ROUTE-04**: A route validation check fails when a clean route, legacy redirect, canonical, sitemap entry, or internal link drifts from the route registry.

### Data

- [ ] **DATA-01**: Location data is represented as a validated Astro-consumable data module while preserving current location fields and behavior.
- [ ] **DATA-02**: Open and coming-soon locations have explicit validated rules for booking URLs, gift card URLs, map links, hours, contact fields, local SEO fields, and schema eligibility.
- [ ] **DATA-03**: Business facts for locations, groups, missions, FAQs, navigation, footer links, SEO metadata, schema inputs, and tracking labels live in validated data modules instead of durable component literals.
- [ ] **DATA-04**: Location data is international-ready for country, locale, timezone, phone format, currency, and future `hreflang` without launching translated pages.

### Components

- [ ] **COMP-01**: Shared nav, footer, location picker, ticket panel, SEO head, FAQ, breadcrumb, and recurring page sections render through Astro components.
- [ ] **COMP-02**: Componentized markup preserves CSS selectors, IDs, ARIA hooks, script hooks, and DOM structure needed for current behavior and visual parity.
- [ ] **COMP-03**: The `build.sh` ticket-panel sync workflow is retired only after Astro components render the shared ticket panel everywhere it is needed.
- [ ] **COMP-04**: Representative templates exist before bulk conversion: homepage, one marketing page, one group page, one open location page, one coming-soon location page, locations index, FAQ/contact pattern, and policy/utility pattern.

### Booking

- [ ] **BOOK-01**: Every open-location booking CTA resolves to a valid external ROLLER checkout destination from validated data or a booking helper.
- [ ] **BOOK-02**: Coming-soon location CTAs resolve to a deliberate non-checkout fallback such as location page, contact, or waitlist behavior.
- [ ] **BOOK-03**: The default Astro booking flow uses tracked external checkout links, with iframe/overlay checkout retained only if explicitly documented as an optional fallback.
- [ ] **BOOK-04**: Existing `?book=1` behavior is either preserved with clean URLs or replaced by an equivalent tested flow.
- [ ] **BOOK-05**: ROLLER GTM/GA4 setup and native purchase-event validation are included in launch readiness when Venue Manager or playground access is available.

### Analytics

- [ ] **ANLY-01**: GTM is installed through a shared Astro layout or component with configurable container ID and Consent Mode v2-ready loading behavior.
- [ ] **ANLY-02**: A shared `track()` helper pushes normalized non-PII events to `window.dataLayer`.
- [ ] **ANLY-03**: Analytics payloads include stable `event_id`, timestamp, source, page context, CTA context, location context where applicable, destination URL where applicable, campaign context, and consent state.
- [ ] **ANLY-04**: Browser analytics events and optional server-side `/api/events` payloads share one dedupe-ready event contract.
- [ ] **ANLY-05**: Outbound booking, gift card, group CTA, location selection, ticket panel, contact form, and mission card events fire once with required fields and no PII.
- [ ] **ANLY-06**: Cross-domain checkout attribution requirements for ROLLER are documented for GTM/GA4 configuration.

### SEO And Schema

- [ ] **SEO-01**: Existing titles, descriptions, Open Graph/Twitter metadata, headings, copy, robots behavior, and search-critical content are preserved unless intentionally improved.
- [ ] **SEO-02**: Sitemap generation uses the Astro route/data source of truth and includes only canonical clean URLs.
- [ ] **SEO-03**: Schema generation supports Organization/WebSite, BreadcrumbList, FAQPage, and eligible LocalBusiness/location JSON-LD from validated data.
- [ ] **SEO-04**: Open and coming-soon location pages use different local SEO and schema rules that accurately match visible page content.
- [ ] **SEO-05**: Location pages validate NAP consistency, map links, hours where applicable, clean canonical URLs, and location-specific FAQ/schema coverage where content exists.
- [ ] **SEO-06**: GEO/AI-search readiness is reviewed, including answer-first content opportunities, AI crawler policy, and optional `llms.txt`.

### Forms

- [ ] **FORM-01**: Contact and lead form markup remains provider-flexible until the final backend/provider decision is made.
- [ ] **FORM-02**: Contact form success and failure paths are preserved or replaced with equivalent tested behavior.
- [ ] **FORM-03**: Form analytics track start, submit attempt, success, and failure without sending names, emails, phone numbers, or message text to analytics.
- [ ] **FORM-04**: `/contact-thank-you` is generated as the clean canonical thank-you URL and `/contact-thank-you.html` redirects to it.

### Verification And Cutover

- [ ] **VER-01**: `npm run verify` or its Astro equivalent builds the Astro site and verifies generated output, not only source files.
- [ ] **VER-02**: Static checks cover location contracts, route/redirect contracts, sitemap, internal links, component parity, booking architecture, analytics event contracts, schema presence, local SEO rules, accessibility baseline, and public asset/host file output.
- [ ] **VER-03**: Playwright smoke tests cover homepage loading, location selection persistence, ticket panel or equivalent booking flow, outbound booking navigation interception, FAQ keyboard behavior, contact form behavior, and representative clean URL/legacy redirect behavior.
- [ ] **VER-04**: Visual regression or screenshot comparison covers representative templates before cutover.
- [ ] **VER-05**: Cloudflare preview validation covers `_headers`, `_redirects`, clean URLs, legacy redirects, sitemap, robots, 404, schema, assets, analytics debug behavior, and ROLLER link behavior.
- [ ] **VER-06**: Launch has documented rollback triggers for broken checkout, redirect loops, missing canonical pages, major analytics failure, severe visual regression, contact form failure, or missing critical assets.

## v2 Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Design And CRO

- **CRO-01**: Run a post-migration redesign or CRO pass after visual parity and routing stability are proven.
- **CRO-02**: Add A/B testing for major CTA, booking, and local SEO landing page experiments.

### Internationalization

- **I18N-01**: Add translated routes, localized content, and `hreflang` once the English Astro foundation is stable.

### Analytics Infrastructure

- **ANLY2-01**: Enable full server-side analytics forwarding after destination, consent, and dedupe requirements are confirmed.
- **ANLY2-02**: Make completed purchase attribution a hard gate only if ROLLER access and business requirements make it necessary.

### Content Operations

- **CMS-01**: Evaluate a CMS or editorial workflow after data modules and Astro templates prove current maintenance needs.

## Out of Scope

Explicitly excluded from v1 to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full visual redesign | Migration is parity-first; redesign makes regressions harder to identify. |
| Full translation/i18n rollout | Initial goal is English-only with international-ready data/schema. |
| Booking platform replacement | ROLLER remains the checkout platform. |
| Required completed-purchase attribution before launch | Purchase tracking depends on ROLLER access/configuration; outbound intent tracking is required for launch. |
| React/Vue/Svelte/Tailwind rewrite | Adds runtime and styling risk without serving the parity-first migration goal. |
| SSR or hybrid rendering by default | The site should remain static unless a specific provider endpoint requires backend behavior. |
| CMS implementation | Data modules are sufficient for the migration milestone; CMS can be evaluated later. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Unmapped | Pending |
| FND-02 | Unmapped | Pending |
| FND-03 | Unmapped | Pending |
| FND-04 | Unmapped | Pending |
| ROUTE-01 | Unmapped | Pending |
| ROUTE-02 | Unmapped | Pending |
| ROUTE-03 | Unmapped | Pending |
| ROUTE-04 | Unmapped | Pending |
| DATA-01 | Unmapped | Pending |
| DATA-02 | Unmapped | Pending |
| DATA-03 | Unmapped | Pending |
| DATA-04 | Unmapped | Pending |
| COMP-01 | Unmapped | Pending |
| COMP-02 | Unmapped | Pending |
| COMP-03 | Unmapped | Pending |
| COMP-04 | Unmapped | Pending |
| BOOK-01 | Unmapped | Pending |
| BOOK-02 | Unmapped | Pending |
| BOOK-03 | Unmapped | Pending |
| BOOK-04 | Unmapped | Pending |
| BOOK-05 | Unmapped | Pending |
| ANLY-01 | Unmapped | Pending |
| ANLY-02 | Unmapped | Pending |
| ANLY-03 | Unmapped | Pending |
| ANLY-04 | Unmapped | Pending |
| ANLY-05 | Unmapped | Pending |
| ANLY-06 | Unmapped | Pending |
| SEO-01 | Unmapped | Pending |
| SEO-02 | Unmapped | Pending |
| SEO-03 | Unmapped | Pending |
| SEO-04 | Unmapped | Pending |
| SEO-05 | Unmapped | Pending |
| SEO-06 | Unmapped | Pending |
| FORM-01 | Unmapped | Pending |
| FORM-02 | Unmapped | Pending |
| FORM-03 | Unmapped | Pending |
| FORM-04 | Unmapped | Pending |
| VER-01 | Unmapped | Pending |
| VER-02 | Unmapped | Pending |
| VER-03 | Unmapped | Pending |
| VER-04 | Unmapped | Pending |
| VER-05 | Unmapped | Pending |
| VER-06 | Unmapped | Pending |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 0
- Unmapped: 43 pending roadmap

---
*Requirements defined: 2026-04-29*
*Last updated: 2026-04-29 after initial definition*
