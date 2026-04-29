# Feature Landscape

**Domain:** Astro migration of a static marketing/location website
**Researched:** 2026-04-29
**Scope:** Migration deliverables only. This does not define new Time Mission product features.
**Overall confidence:** HIGH, based on `.planning/PROJECT.md`, the codebase architecture map, codebase concerns, and the approved migration planning context.

## Table Stakes

Features required for the migration to be considered successful. Missing any of these creates parity, SEO, analytics, booking, or cutover risk.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Static Astro build output | The current site is static and should remain deployable to Cloudflare Pages-style hosting without SSR complexity. | Medium | Use Astro static output and verify generated `dist/` can serve the full public site. |
| Visual and content parity | The existing static site is the design and copy contract for this milestone. | High | Preserve current layouts, CSS cascade, typography, imagery, animations, nav, footer, overlays, page copy, and CTAs unless a bug fix is intentional. |
| Clean extensionless canonical URLs | The milestone explicitly moves public URLs from `.html` to clean no-trailing-slash paths. | Medium | Canonicals, nav links, sitemap URLs, schema URLs, and internal links must all use clean paths like `/missions` and `/philadelphia`. |
| Legacy `.html` redirects | Existing indexed links, bookmarks, ads, and shared URLs must keep working. | Medium | Every old `.html` page needs a direct redirect to the clean canonical URL with no redirect loops. |
| Shared layout components | Repeated nav, footer, ticket panel, location picker, SEO head, and recurring sections are core reasons to migrate. | High | Components should preserve DOM/classes where practical so existing styling and scripts do not regress during conversion. |
| Data-driven location pages | Location pages are the primary local SEO and booking surface. | High | Generate or render pages from validated location data, including open and coming-soon locations with distinct rules. |
| Validated business data modules | Current durable facts are duplicated across HTML, JSON, and scripts. | High | Locations first, then navigation, groups, missions, FAQs, SEO metadata, schema inputs, and tracking labels. |
| Booking CTA preservation | Booking is the highest-value conversion path and must not regress. | High | Every open location CTA needs a valid external destination; coming-soon locations need deliberate non-checkout fallbacks. |
| External Roller checkout links as default | The migration plan calls for replacing iframe-first behavior with tracked outbound links. | Medium | Iframe support can remain optional/legacy only if explicitly documented and default-off. |
| GTM-first analytics foundation | Migration must preserve and improve observability for conversion paths. | High | GTM bootstrap, `dataLayer` events, shared event contract, consent state, event identity, and outbound tracking are launch requirements. |
| Consent Mode v2-ready tracking | Analytics must support privacy-aware behavior from the first Astro release. | Medium | Browser and future server-side event paths must honor the same consent state. |
| Stable event identity and dedupe fields | Browser and server-side analytics need a normalized payload before forwarding is added. | Medium | Include `event_id`, timestamp, source, page context, CTA context, location context, destination, and consent state. |
| SEO metadata preservation | Migration cannot lose existing titles, descriptions, Open Graph tags, headings, robots behavior, or search coverage. | High | Preserve current metadata while updating canonicals and internal links to clean URLs. |
| GEO and AI-search extractability baseline | The project explicitly treats AI-search readiness as a migration requirement, not a later enhancement. | Medium | Add answer-first structure, extractable FAQs, crawler policy review, and optional `llms.txt` if accepted. |
| Schema generation | Existing inline schema should become consistent and data-driven. | High | Generate Organization/WebSite, BreadcrumbList, FAQ, and eligible LocalBusiness JSON-LD from validated data. |
| Local SEO baseline | Location pages must remain locally coherent after migration. | High | Validate NAP, hours where applicable, map links, canonical URLs, local FAQs, open vs coming-soon rules, and LocalBusiness eligibility. |
| International-ready location data | The first release remains English-only, but Belgium and future markets require better structured facts. | Medium | Add country, locale, timezone, phone formatting, currency, and future `hreflang` inputs without translating the site yet. |
| Contact and lead form parity | Existing contact/group/newsletter paths are fragile and must not silently break during migration. | Medium | Preserve visible behavior and thank-you states while keeping the backend provider flexible. |
| Static host configuration parity | Current `_headers`, `_redirects`, `robots.txt`, sitemap, and 404 behavior support deployment and search. | Medium | Ensure equivalent files land in `dist/` and are verified against the preview build. |
| Verification against built output | Existing checks are a strength and must evolve for Astro output. | High | `npm run verify` or equivalent should build Astro, inspect `dist/`, and run smoke tests against preview output. |
| Browser smoke coverage for critical flows | Current tests cover parts of booking, location persistence, FAQ, and forms; migration increases risk. | High | Add/retain tests for nav, location picker, ticket panel or external checkout, `?book=1`, forms, redirects, and accessibility basics. |
| Cutover and rollback readiness | Brownfield migration requires a proven fallback if checkout, redirects, SEO, or forms fail. | Medium | Keep old static site deployable, document Cloudflare rollback, and define failure triggers. |

## Differentiators / Quality Upgrades

Capabilities that go beyond minimal migration parity and make the Astro foundation materially better for maintenance, search, analytics, and future growth.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Single source of truth for page generation | Makes adding or changing locations/groups safer and cheaper. | High | Clean URLs, redirects, sitemap, schema, nav, footer, ticket options, and page content should derive from shared validated data where possible. |
| Generated sitemap from actual routes/data | Prevents stale or missing search URLs after migration. | Medium | More reliable than maintaining `sitemap.xml` manually as routes and locations change. |
| Route contract checker | Prevents mismatches between legacy URLs, clean routes, canonicals, redirects, and internal links. | Medium | Should catch missing redirects, stale `.html` references, route loops, and non-existent clean paths. |
| Location identity contract checker | Prevents current class of bugs where coming-soon pages identify as the wrong city. | Medium | Validate filename/slug, route path, data id, canonical URL, body/page identity, sitemap entry, and generated schema agreement. |
| Data-driven local SEO validation | Turns local SEO from a manual content task into a migration gate. | Medium | Check NAP, map links, hours, status-specific schema rules, and required location fields. |
| Analytics event contract documentation | Makes GTM, future server-side tracking, and ROLLER validation easier to coordinate. | Low | A tracking plan should list event names, required properties, consent behavior, PII rules, and dedupe rules. |
| Analytics test harness | Confirms events fire once, before navigation, with required non-PII payload fields. | Medium | Especially valuable for outbound booking, gift cards, contact forms, and group CTAs. |
| Server-side tracking readiness without premature infrastructure | Avoids painting the site into a browser-only analytics corner. | Medium | Define payload shape and optional endpoint interface now; full forwarding can remain a later phase if needed. |
| Visual regression snapshots | Protects the parity-first mandate during page-by-page conversion. | Medium | Cover representative templates: homepage, missions, groups, one group subpage, one open location, one coming-soon location, FAQ, contact. |
| Accessibility behavior tests | Moves beyond static labels into actual keyboard behavior. | Medium | Test focus trap, Escape close, focus restore, reduced motion, FAQ keyboard interaction, and overlay usability. |
| Performance budgets for migrated templates | Ensures componentization does not hide regressions in images, scripts, or layout shifts. | Medium | Track LCP/CLS/INP proxies, page weight, large media, and unnecessary third-party script loading. |
| Default-off legacy Roller iframe fallback | Reduces third-party script risk while preserving an escape hatch if the business requires iframe checkout. | Medium | Document the trust boundary, fallback behavior, and conditions for re-enabling. |
| International-ready schema helpers | Supports future country/locale expansion without launching full i18n now. | Medium | Keep English-only pages but structure location and schema data for future localized URLs and `hreflang`. |
| AI/GEO launch asset | Improves machine readability without redesigning pages. | Low | Optional `llms.txt` and concise answer blocks can help AI systems understand locations, booking, groups, and contact paths. |
| Provider-flexible form contract | Avoids locking the migration to Netlify Forms, FormSubmit, Cloudflare Functions, or a CRM too early. | Medium | Markup and analytics should survive backend provider changes. |
| Build-time schema syntax validation | Catches malformed JSON-LD before deployment. | Low | Pair syntax checks with representative manual rich-results validation for eligibility. |

## Anti-Features

Features or directions to explicitly avoid because they expand scope, increase risk, or conflict with the migration goal.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full visual redesign during migration | Redesign expands scope and makes parity failures hard to distinguish from intentional changes. | Preserve current visual experience; defer CRO/redesign to a post-migration milestone. |
| SSR or hybrid rendering by default | The site does not need runtime server rendering for the migration and static output is a constraint. | Use Astro static output and only add server functions where a chosen form or analytics endpoint requires them. |
| React/Vue/Svelte component rewrite for static sections | Adds client-side complexity without clear value for mostly static marketing pages. | Use `.astro` components and plain client scripts only where behavior needs browser state. |
| Content collections for every data type | The current migration data is structured business data, not primarily Markdown content. | Use JSON/TypeScript data modules with validation; introduce content collections only where authoring workflows justify them. |
| Booking platform replacement | ROLLER remains the checkout system and replacing it is out of scope. | Track outbound intent and document ROLLER GTM/GA4 purchase validation requirements. |
| Blocking launch on completed-purchase attribution | ROLLER admin/playground access may be unavailable and purchase tracking depends on external configuration. | Require outbound booking intent tracking; include ROLLER purchase validation in launch readiness when access exists. |
| Hardcoded durable business facts in components | Recreates the current drift problem inside Astro. | Put locations, booking URLs, SEO facts, schema inputs, FAQs, nav links, and tracking labels in validated data modules. |
| Maintaining parallel old and new data sources | Duplicates would undermine the main maintainability benefit of migration. | Generate derived values and fallbacks from one source of truth. |
| Iframe-first Roller checkout as the default | The current iframe dependency is fragile and harder to measure reliably. | Use tracked external checkout links by default; keep iframe support only as documented legacy fallback if needed. |
| Sending PII to GTM or analytics forwarding | Violates the privacy constraint and creates avoidable compliance risk. | Track event context, form state, CTA, location, page, and destination only; exclude names, emails, phone numbers, and free-text messages. |
| Uncontrolled `.html` and clean URL coexistence | Duplicate accessible URLs can split SEO signals and create inconsistent canonicals. | Make clean URLs canonical and redirect old `.html` URLs directly. |
| Full translation/i18n launch | Internationalization would multiply content, schema, and QA scope. | Keep first Astro release English-only while making data/schema international-ready. |
| Manual sitemap/schema maintenance after migration | Manual files will drift as generated routes and data evolve. | Generate sitemap and schema from the same data/routes used to render pages. |
| Replacing all vanilla scripts before parity | Behavior rewrites can break proven flows and slow the migration. | Preserve scripts initially, then simplify after component parity and tests are stable. |
| Launching without rollback criteria | Redirect, booking, form, or analytics regressions could require fast rollback. | Keep old static deployment available and define explicit rollback triggers. |

## Feature Dependencies

```text
Baseline parity capture -> Visual/content parity validation
Astro static skeleton -> Clean extensionless routes
Clean extensionless routes -> Legacy .html redirects
Clean extensionless routes -> Canonicals/internal links/sitemap/schema agreement

Validated location data -> Data-driven location pages
Validated location data -> Booking CTA destinations
Validated location data -> Local SEO validation
Validated location data -> Location schema generation
Validated location data -> Location identity contract checker
Validated location data -> International-ready fields

Shared layout components -> Removal of regex component sync
Shared layout components -> Visual regression snapshots
Shared layout components -> Accessibility behavior tests

Booking destination helper -> External Roller checkout links
External Roller checkout links -> Outbound booking analytics
Outbound booking analytics -> GTM-first event contract
GTM-first event contract -> Consent Mode v2 readiness
GTM-first event contract -> Event identity/dedupe fields
GTM-first event contract -> Server-side tracking readiness
GTM-first event contract -> Analytics test harness

SEO metadata preservation -> Clean canonical URL rollout
Data-driven schema inputs -> Schema generation
Schema generation -> Schema validation
Local SEO baseline -> Open vs coming-soon schema rules

Static host config parity -> Preview deployment validation
Verification against built output -> Cutover readiness
Cutover readiness -> Rollback plan approval
```

## MVP Recommendation

Prioritize these migration capabilities first:

1. Baseline parity capture and static Astro skeleton.
2. Clean URL routing, legacy redirects, static host config, and route contract checks.
3. Validated location data with generated or data-driven location pages.
4. Shared layout components for nav, footer, SEO head, location picker, and ticket panel.
5. Booking CTA preservation with tracked external Roller checkout links.
6. SEO/local SEO/schema preservation and generation.
7. Verification against built Astro output, including smoke, redirect, schema, analytics, accessibility, and visual parity gates.

Defer:

- Full redesign/CRO: defer until Astro parity is stable.
- Full translations/i18n: keep data/schema ready, but do not translate in this milestone.
- Completed purchase attribution as a hard launch blocker: require outbound intent tracking and document ROLLER-side validation.
- Full server-side analytics forwarding: define the payload and consent rules now; implement forwarding only when endpoint/destination decisions are firm.
- Broad client-script rewrites: preserve working behavior first, then refactor behind tests.

## Requirements Definition Notes

- Treat table-stakes items as acceptance criteria for migration phases, not optional enhancements.
- Treat differentiators as quality upgrades that should be pulled forward when they reduce cutover risk, especially contract checks, analytics tests, visual snapshots, and local SEO validation.
- Keep anti-features visible in planning to prevent scope creep during page conversion.
- Any requirement touching booking, redirects, location identity, analytics, SEO/schema, forms, or rollback should include explicit verification.

## Sources

- `.planning/PROJECT.md` — project scope, active requirements, constraints, and preflight decisions.
- `.planning/codebase/ARCHITECTURE.md` — current site architecture, runtime flows, abstractions, and verification model.
- `.planning/codebase/CONCERNS.md` — migration risks, known bugs, fragile areas, missing checks, and test gaps.
- `/Users/arisimon/.cursor/plans/astro_migration_rebuild_b5408d44.plan.md` — rebuilt Astro migration plan and phase success criteria.
