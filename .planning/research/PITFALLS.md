# Domain Pitfalls

**Domain:** Brownfield static HTML to Astro static migration for Time Mission marketing/location site
**Researched:** 2026-04-29
**Overall confidence:** HIGH for project-specific pitfalls from codebase artifacts; MEDIUM for Astro URL behavior from current docs and ecosystem reports

## Critical Pitfalls

Mistakes that can break booking, SEO equity, analytics, or launch rollback.

### Pitfall 1: Clean URLs Fight Astro, Cloudflare, and Legacy `.html` Redirects

**What goes wrong:** The migrated site launches with multiple URL variants for the same page (`/philadelphia`, `/philadelphia/`, `/philadelphia.html`, `/philadelphia/index.html`) or with redirects that loop/404 on Cloudflare.

**Why it happens:** Astro static output can generate either file-style or directory-style output, `trailingSlash` changes pathname behavior, redirects can be defined in Astro config and/or `_redirects`, and Cloudflare has its own static URL behavior. The project already committed to no-trailing-slash extensionless canonicals plus direct `.html` redirects, so the migration has a narrow URL contract.

**Warning signs:**
- Astro config, sitemap, canonicals, nav links, and `_redirects` disagree on trailing slashes.
- Playwright tests still visit `/faq.html`, `/contact.html`, or other legacy routes as primary paths.
- Sitemap contains `.html` URLs or mixed trailing-slash variants.
- Redirect checks only assert that old URLs redirect somewhere, not that they redirect directly to the canonical URL.
- `_headers` or `_redirects` are missing from `dist/`.

**Consequences:** SEO duplication, lost link equity, redirect chains, broken indexed URLs, wrong canonical signals, and failed launch rollback diagnostics.

**Prevention:**
- In Phase 0, record one URL contract: clean extensionless, no trailing slash, direct 301 from each legacy `.html` path.
- In Phase 2, configure Astro static output and route generation to match that contract before bulk conversion.
- In Phase 3, generate or validate every legacy `.html` redirect from the page inventory; include both open locations and group subpages.
- In Phase 10, run route checks against built `dist/`, not source files: canonical URLs return 200, `.html` URLs return one 301, slash variants behave intentionally, sitemap/internal links/schema all use canonical URLs.
- Keep `_headers` and `_redirects` under `public/` or otherwise verify they are copied unchanged to `dist/`.

**Phase should address it:** Phase 0, Phase 2, Phase 3, Phase 10, Phase 11.

### Pitfall 2: Visual Parity Slips While Componentizing

**What goes wrong:** The Astro site is technically functional but no longer matches the current design: CSS cascade changes, DOM nesting changes, inline styles move at the wrong time, animations differ, or page-specific sections lose spacing/content.

**Why it happens:** Current pages are large hand-authored files with repeated inline CSS/JS and shared markup copied across pages. Converting shared pieces into `Nav.astro`, `Footer.astro`, `TicketPanel.astro`, and layouts can accidentally rename classes, alter selector specificity, reorder CSS, or remove page-local behavior.

**Warning signs:**
- Components are redesigned or cleaned up before reference screenshots exist.
- CSS files are reorganized during the same phase as markup extraction.
- Shared components render fewer wrapper elements/classes than the current HTML.
- Smoke tests pass but screenshots show changed hero spacing, nav overlays, footer layout, ticket panel, or mobile behavior.
- “Equivalent” components are accepted without comparing representative open/coming-soon location pages.

**Consequences:** Conversion paths and brand experience regress even though the migration was supposed to be parity-first.

**Prevention:**
- In Phase 1, capture screenshots and behavior notes for every template type before implementation.
- In Phase 5, preserve existing class names and DOM structure until the Astro output is proven equivalent.
- Convert one low-risk page first, then one open location and one coming-soon location before bulk page migration.
- Add visual regression snapshots once the first Astro template stabilizes.
- Treat visual improvements and CRO redesigns as post-migration work unless tied to a verified bug fix.

**Phase should address it:** Phase 1, Phase 2, Phase 5, Phase 10.

### Pitfall 3: Location Data Drift Survives the Migration

**What goes wrong:** Astro introduces cleaner components but still preserves multiple authored sources of truth for locations, booking URLs, nav labels, form options, sitemap entries, and fallback data.

**Why it happens:** The current site already duplicates location data across `data/locations.json`, `js/locations.js` fallback data, `js/nav.js`, hard-coded ticket panel options, pages, sitemap, and forms. A migration can wrap those copies in components without actually eliminating drift.

**Warning signs:**
- New `src/data/locations.*` exists but old fallback arrays remain manually maintained.
- Ticket panel options, footer links, nav links, sitemap entries, or schema are hardcoded in components.
- Adding one location still requires edits outside a data file and content page.
- Generated clean URL helpers are not used by booking, sitemap, redirects, and schema.
- Coming-soon locations appear in open-location booking lists.

**Consequences:** Wrong location identity, stale booking URLs, missing new locations, inconsistent local SEO, incorrect schema, and broken coming-soon behavior.

**Prevention:**
- In Phase 4, make validated location data the only authored source for IDs, slugs, status, NAP, hours, booking URLs, map URLs, gift cards, timezone, locale, currency, and schema inputs.
- Generate derived helpers for page paths, legacy paths, booking destinations, gift-card destinations, sitemap entries, schema, and local SEO.
- Either generate browser fallback data from the same source or remove embedded fallbacks that can diverge.
- Extend `check-location-contracts` to verify page route, legacy redirect, body/page identity, sitemap, nav, and booking behavior for every location.
- Convert group, mission, FAQ, navigation, footer, SEO metadata, and tracking labels only after the location contract is stable.

**Phase should address it:** Phase 4, Phase 5, Phase 9, Phase 10.

### Pitfall 4: Booking Flow Regresses During Roller Simplification

**What goes wrong:** The migration removes iframe checkout but fails to preserve the user path for ticket CTAs, `?book=1`, selected location persistence, open vs coming-soon routing, or outbound booking tracking.

**Why it happens:** Current booking behavior is split between `js/ticket-panel.js`, `js/roller-checkout.js`, `window.TM`, localStorage, button selectors, and location data. The new plan intentionally switches to tracked external checkout links, which changes both behavior and attribution.

**Warning signs:**
- CTAs use literal URLs instead of a shared booking helper.
- `rollerCheckoutUrl` and `bookingUrl` are both present but no canonical destination field/decision exists.
- Coming-soon pages have empty checkout links, disabled buttons without a fallback, or open-location schema.
- Playwright does not test `?book=1` or intercept outbound checkout navigation.
- GTM events are added after navigation, so they may not fire before users leave.

**Consequences:** Lost ticket revenue, users routed to the wrong venue, broken coming-soon lead paths, analytics undercounting, and rollback-worthy launch failure.

**Prevention:**
- In Phase 0, decide whether `bookingUrl`, `rollerCheckoutUrl`, or a renamed `checkoutUrl` is the canonical external destination.
- In Phase 4, centralize booking destination helpers and coming-soon fallback rules.
- In Phase 6, replace iframe-first behavior with normal anchors generated by the helper; keep iframe support default-off unless explicitly required.
- Track `booking_cta_clicked`/`outbound_checkout_clicked` before navigation and include location, CTA, page, destination, campaign, consent, and `event_id`.
- In Phase 10, test representative open locations, coming-soon locations, ticket panel selection, `?book=1`, and outbound navigation interception.
- In Phase 11, manually validate every open location booking URL and every coming-soon fallback in preview.

**Phase should address it:** Phase 0, Phase 4, Phase 6, Phase 7, Phase 10, Phase 11.

### Pitfall 5: Analytics Is Treated as Tags Instead of a Product Contract

**What goes wrong:** GTM loads on pages, but events are inconsistent, fire twice, include PII, ignore consent, or cannot be deduped with future server-side events.

**Why it happens:** Static migrations often bolt analytics onto rendered pages after content parity. This project requires GTM-first browser analytics, Consent Mode v2 readiness, server-side forwarding readiness, stable `event_id`, and no PII.

**Warning signs:**
- Events are pushed directly from components instead of one shared `track()` helper.
- Event names/properties vary across ticket panel, nav, contact forms, and group CTAs.
- Server-side event forwarding is postponed without defining the browser payload shape.
- Contact forms push names, emails, phone numbers, message text, or raw query strings to GTM.
- Consent state is represented in the UI but not included in event behavior.

**Consequences:** Unusable conversion data, privacy risk, inability to dedupe browser/server events, and failed launch analytics validation.

**Prevention:**
- In Phase 7, define a shared event contract before instrumenting individual components.
- Include required fields: `event_id`, timestamp, event source, consent state, page context, location context where applicable, CTA context, destination URL, campaign parameters, and dedupe rules.
- Push through one browser helper and reserve a compatible server payload shape even if the server endpoint starts as no-op/backlog.
- Add PII lint/check rules for event payloads and form analytics.
- In Phase 10, use Playwright to assert one event per action, required properties, consent behavior, and no PII before outbound navigation.

**Phase should address it:** Phase 0, Phase 7, Phase 8, Phase 10, Phase 11.

### Pitfall 6: SEO, GEO, Schema, and Local SEO Are Rebuilt After Routes Instead of With Routes

**What goes wrong:** Clean pages launch but metadata, sitemap, canonicals, Open Graph, JSON-LD, internal links, local SEO facts, AI crawler policy, or answer-friendly content are missing/inconsistent.

**Why it happens:** Astro makes static rendering straightforward, but SEO parity is easy to lose when page heads move into a layout. Location pages also require different rules for open vs coming-soon venues.

**Warning signs:**
- `SeoHead.astro` accepts freeform strings instead of validated metadata/schema inputs.
- LocalBusiness schema is generated for coming-soon pages as if they are open.
- Visible NAP/hours differ from JSON-LD.
- Sitemap is hand-maintained after Astro routes are generated.
- Canonicals point to `.html`, trailing-slash, or non-existent paths.
- AI/GEO extractability is discussed as a post-launch enhancement.

**Consequences:** Search ranking loss, rich result ineligibility, local SEO inconsistency, inaccurate business facts, and poor AI-answer extractability.

**Prevention:**
- In Phase 1, inventory existing titles, descriptions, canonicals, headings, sitemap, robots, schema, and priority answer/FAQ opportunities.
- In Phase 4, store durable SEO/schema inputs in validated data modules.
- In Phase 9, generate metadata, sitemap, Organization/WebSite, BreadcrumbList, FAQ, and location JSON-LD from the same route/data helpers.
- Encode explicit open vs coming-soon schema rules.
- Add local SEO checks for NAP consistency, hours, map links, status, FAQ eligibility, and visible/schema agreement.
- In Phase 10, validate JSON-LD syntax and route/metadata consistency against built output.

**Phase should address it:** Phase 1, Phase 4, Phase 9, Phase 10, Phase 11.

### Pitfall 7: Verification Keeps Testing the Old Site Shape

**What goes wrong:** `npm run verify` passes but it is still checking source HTML assumptions, legacy `.html` routes, string markers, or the old static server root instead of the built Astro output.

**Why it happens:** Current checks are valuable but regex/string-based. Playwright currently serves the repository root with `python3 -m http.server`, and existing smoke tests visit legacy paths like `/faq.html` and `/contact.html`.

**Warning signs:**
- Playwright `webServer` still serves project root after Astro build exists.
- Static checks scan old `*.html` source files rather than `dist/`.
- Tests verify ticket panel marker comments instead of rendered Astro components.
- Redirect behavior is not tested because the local server does not model deployment redirects.
- Browser binaries remain a manual setup step in CI/launch verification.

**Consequences:** Broken Astro output, missing public assets, route mismatches, analytics regressions, and inaccessible overlays can ship despite green checks.

**Prevention:**
- In Phase 2, add Astro build/check scripts and keep `npm run verify` as the migration gate.
- In Phase 10, update Playwright to serve `dist/` via `npm run preview` or an equivalent static server after `astro build`.
- Split checks into source-data validation and built-output validation so each verifies the correct layer.
- Keep regex checks only as quick guardrails; add structured HTML/JSON parsing for route, schema, link, redirect, and location contracts.
- Add CI/setup guidance for Playwright browser installation (`npx playwright install --with-deps` or cached equivalent).

**Phase should address it:** Phase 2, Phase 10, Phase 11.

### Pitfall 8: Forms Remain Provider-Fragile and Unobservable

**What goes wrong:** Contact and group inquiry forms appear migrated but submissions fail, expose personal routing, lose thank-you behavior, or lack success/failure analytics.

**Why it happens:** Current forms are inconsistent: contact uses Netlify-style handling, groups posts to FormSubmit with a personal email address, and newsletter forms appear unwired. Astro static output and Cloudflare-style hosting may not support Netlify form detection unless intentionally configured.

**Warning signs:**
- `contact.html` markup is copied into Astro without deciding the backend contract.
- Group forms still post to a personal email endpoint.
- `/contact-thank-you.html` is not mapped to `/contact-thank-you` with redirect coverage.
- Newsletter forms render without action, disabled behavior, or explicit backlog decision.
- Analytics track form submission attempts but not success/failure.

**Consequences:** Silent lead loss, public exposure of personal email routing, spam risk, and inability to measure lead capture.

**Prevention:**
- In Phase 0, leave provider selection open but define ownership/security criteria.
- In Phase 8, create a provider-flexible frontend contract that can point to Cloudflare Pages Functions, a business-owned form service, CRM forms, or another backend without redesigning markup.
- Preserve or regenerate thank-you paths and redirects.
- Add server-side validation/spam protection if a first-party endpoint is selected.
- Track form started/submitted/failed without PII.
- In Phase 10, test form configuration, thank-you routing, failure state where applicable, and analytics payload shape.

**Phase should address it:** Phase 0, Phase 8, Phase 10, Phase 11.

## Moderate Pitfalls

### Pitfall 9: Browser JavaScript Assumptions Break in Astro

**What goes wrong:** Location picker, ticket panel, FAQ keyboard behavior, animations, or page-local scripts stop working because logic that previously ran in the browser is moved into frontmatter/build-time code or because selectors no longer match rendered HTML.

**Why it happens:** Astro frontmatter runs at build time, while browser code must live in client scripts. Astro also strips unnecessary client JavaScript from framework components by default. This is good for performance but risky when migrating vanilla interactivity.

**Warning signs:**
- Code that reads `window`, `document`, or `localStorage` appears in `.astro` frontmatter or data modules.
- Existing scripts are bundled/relocated before component parity is proven.
- Components render IDs/classes differently from current scripts' selectors.
- Page-specific scripts run on every page without target checks.

**Prevention:**
- In Phase 5, keep browser scripts as separate client files at first and preserve selectors.
- Move logic into Astro build-time code only when it produces static markup/data and does not depend on browser state.
- Add Playwright coverage for location dropdown, localStorage persistence, ticket panel, FAQ keyboard behavior, mobile nav, and overlays.
- Later simplification should happen only after component parity tests are green.

**Phase should address it:** Phase 5, Phase 10.

### Pitfall 10: Public Assets and Hosting Control Files Disappear

**What goes wrong:** Images, fonts, videos, `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, favicon, or vendor assets are missing from `dist/` or referenced with wrong paths.

**Why it happens:** Astro copies `public/` assets unchanged, while imported assets are processed by the build. Existing root-level static hosting files must be deliberately placed where Astro will emit them.

**Warning signs:**
- Root files are left outside `public/` after Astro is introduced.
- Build output lacks `_headers`, `_redirects`, `robots.txt`, or expected assets.
- Internal link checker scans source paths but not emitted `dist/` paths.
- CSS still references relative paths that changed after moving styles into `src/`.

**Prevention:**
- In Phase 2, decide which assets stay in `public/` unchanged and which are imported/processed.
- Add built-output checks for required deployment files and representative media.
- Use root-relative URLs for public assets that should remain stable.
- In Phase 11, validate preview environment headers, redirects, robots, sitemap, 404, and static asset loading.

**Phase should address it:** Phase 2, Phase 10, Phase 11.

### Pitfall 11: Accessibility Fixes Stay as Runtime Patches

**What goes wrong:** The Astro output visually works but overlays, dialogs, FAQ controls, skip links, focus restore, Escape handling, and reduced-motion behavior regress or depend on fragile runtime patching.

**Why it happens:** Current accessibility is partly added by `js/a11y.js`; static checks only verify labels and script presence. Componentization is a chance to encode semantics directly, but migration pressure can preserve the patch-based model.

**Warning signs:**
- Accessibility checks only assert that `js/a11y.js` loads.
- Dialog markup lacks semantic roles/labels until JavaScript mutates it.
- Visual parity snapshots replace keyboard/screen-reader behavior checks.
- Focus trap and focus restoration are not tested.

**Prevention:**
- In Phase 5, render semantic attributes in Astro components by default and keep JS as enhancement.
- In Phase 9, preserve existing a11y improvements while improving page heading/alt text structure where needed for SEO/GEO.
- In Phase 10, add Playwright keyboard tests for ticket panel, location picker, FAQ controls, Escape-to-close, initial focus, and focus restoration.
- Respect `prefers-reduced-motion` in migrated animation controllers.

**Phase should address it:** Phase 5, Phase 9, Phase 10.

### Pitfall 12: Performance Gets Worse Despite Astro

**What goes wrong:** The site moves to Astro but still ships heavy duplicated CSS/JS, autoplay video competes with LCP, large 1920px galleries load too early, or animation intervals burn CPU in background tabs.

**Why it happens:** Astro can reduce JavaScript, but only if the migration avoids carrying all page-local scripts/styles forward indiscriminately. Current location pages contain repeated heavy media and intervals.

**Warning signs:**
- The first Astro pages import all legacy scripts/styles globally.
- Hero media behavior changes without LCP measurement.
- Below-the-fold gallery images are not lazy-loaded/responsive.
- Decorative intervals ignore visibility and reduced-motion preferences.
- No performance budgets or Lighthouse/WebPageTest checks exist for representative pages.

**Prevention:**
- In Phase 1, record representative baseline performance/page weight for homepage and location pages.
- In Phase 5, keep CSS/JS parity first but identify shared cacheable assets and page-scoped scripts.
- In Phase 10, add performance budget checks or at least manual launch gates for LCP, CLS, page weight, and long-running animation CPU.
- Defer nonessential media optimization if needed, but explicitly track it rather than assuming Astro solved it.

**Phase should address it:** Phase 1, Phase 5, Phase 10, post-launch optimization backlog.

## Minor Pitfalls

### Pitfall 13: Content Governance Gaps Are Preserved as Components

**What goes wrong:** TODO pricing/add-on content, stale legal/footer content, and divergent group page messaging become harder to notice after being wrapped in Astro components.

**Warning signs:** Group page TODOs remain; business facts appear in prose and data files; legal/footer updates require multiple edits.

**Prevention:** During Phase 4/5 extraction, separate durable business facts from page copy, flag unresolved pricing/add-ons, and make unverified content explicit in launch readiness.

**Phase should address it:** Phase 4, Phase 5, Phase 11.

### Pitfall 14: International Readiness Becomes Premature i18n

**What goes wrong:** The project overbuilds translations/routing before launch, or underbuilds data fields needed for Belgium and future locale/schema accuracy.

**Warning signs:** Locale routing appears in Phase 2; `hreflang` is generated without translated pages; phone/currency/timezone/country remain freeform strings.

**Prevention:** Keep launch English-only, but add validated country, locale, timezone, currency, phone metadata, and future `hreflang` inputs in Phase 4. Do not emit multilingual SEO signals until real localized pages exist.

**Phase should address it:** Phase 0, Phase 4, Phase 9.

### Pitfall 15: Rollback Is Documented Too Late

**What goes wrong:** The Astro launch fails in production, but the team lacks a tested path to restore the old static site or identify rollback triggers quickly.

**Warning signs:** Old static output is deleted before Astro parity is proven; Cloudflare rollback steps are not written; no explicit triggers for checkout, redirects, analytics, SEO, or forms exist.

**Prevention:** In Phase 0, define rollback triggers. In Phase 1, preserve the old static site as reference. In Phase 11, document and rehearse Cloudflare rollback before production cutover.

**Phase should address it:** Phase 0, Phase 1, Phase 11.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Phase 0: Preflight Decisions | Ambiguous URL, checkout, analytics, form, iframe, and rollback decisions leak into implementation | Record decisions before adding Astro files; unresolved decisions become explicit launch risks |
| Phase 1: Baseline Lock | No objective parity target | Capture screenshots, behavior notes, SEO inventory, analytics inventory, and current verification state |
| Phase 2: Astro Static Skeleton | Build works locally but deploy output misses routes/assets/control files | Verify `dist/`, `_headers`, `_redirects`, public assets, preview server, one parity page |
| Phase 3: Clean Routing | Canonicals, sitemap, redirects, and internal links diverge | Generate/validate all routes and legacy redirects from one inventory |
| Phase 4: Data Modules | Data is moved but not de-duplicated | Centralize authored facts and derive URLs/schema/tracking labels from helpers |
| Phase 5: Component Parity | Components clean up markup and break CSS/scripts | Preserve DOM/classes first; add visual and behavior checks before refactoring |
| Phase 6: External Roller Checkout | Removing iframe breaks booking intent flow | Use one booking helper, tested fallbacks, and pre-navigation tracking |
| Phase 7: Analytics | GTM exists but events are inconsistent or noncompliant | Build one event contract with consent, PII rules, and dedupe fields |
| Phase 8: Contact Forms | Static deployment does not support copied form assumptions | Define provider-flexible contract; test success/failure/thank-you behavior |
| Phase 9: SEO/GEO/Schema/A11y | Metadata/schema are rebuilt manually and drift | Generate from validated data; test visible/schema/route consistency |
| Phase 10: Verification | Checks target source files instead of built Astro output | Make `npm run verify` build, serve, and validate `dist/` |
| Phase 11: Cutover | Preview looks fine but production dependencies fail | Validate Cloudflare behavior, GTM DebugView, checkout URLs, ROLLER setup, forms, rollback |

## Sources

- `.planning/PROJECT.md` - project requirements, constraints, and preflight decisions (HIGH confidence)
- `.planning/codebase/CONCERNS.md` - existing codebase risks, known bugs, fragile areas, and coverage gaps (HIGH confidence)
- `.planning/codebase/TESTING.md` - current verification scripts and Playwright patterns (HIGH confidence)
- `/Users/arisimon/.cursor/plans/astro_migration_rebuild_b5408d44.plan.md` - proposed phase structure and migration decisions (HIGH confidence)
- Astro docs via Context7 `/withastro/docs` - static output, build format, public assets, redirects, and client-script behavior (HIGH confidence)
- Web ecosystem search, 2026 queries - trailing slash/Cloudflare redirect reports and migration SEO reminders (LOW to MEDIUM confidence; used only to reinforce URL-routing cautions)
