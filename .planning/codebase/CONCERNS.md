# Codebase Concerns

**Analysis Date:** 2026-04-29

## Tech Debt

**Monolithic static pages with duplicated markup, CSS, and JavaScript:**
- Issue: Core pages are large hand-authored HTML files with page-specific inline styles, repeated footer/location overlays, repeated ticket panel markup, and repeated interactive scripts. Location pages such as `index.html`, `philadelphia.html`, `mount-prospect.html`, `west-nyack.html`, `lincoln.html`, `manassas.html`, and `antwerp.html` each carry several thousand lines of HTML/CSS/JS.
- Files: `index.html`, `philadelphia.html`, `mount-prospect.html`, `west-nyack.html`, `lincoln.html`, `manassas.html`, `antwerp.html`, `houston.html`, `orland-park.html`, `dallas.html`, `brussels.html`
- Impact: Small behavior changes require broad copy/paste edits. Location pages can diverge silently, increasing the chance of incorrect body metadata, stale CTAs, inconsistent accessibility fixes, and inconsistent performance improvements.
- Fix approach: Extract shared layout sections into generated partials or a static site build step. At minimum, move the repeated page interaction script into shared JavaScript modules and keep runtime page HTML focused on content/data.

**Location data has multiple sources of truth:**
- Issue: Location facts and booking metadata are stored in `data/locations.json`, duplicated as `FALLBACK` inside `js/locations.js`, duplicated again as `locationData` inside `js/nav.js`, and partially duplicated as hard-coded `<option>` lists in `components/ticket-panel.html` and synced page markup.
- Files: `data/locations.json`, `js/locations.js`, `js/nav.js`, `components/ticket-panel.html`, `index.html`, `faq.html`, `gift-cards.html`, `contact.html`, `missions.html`, location pages such as `philadelphia.html`
- Impact: A new location or changed booking URL requires edits in several places. Drift already exists: `data/locations.json` contains 10 locations, while `components/ticket-panel.html` only includes 7 static options before JavaScript hydration.
- Fix approach: Treat `data/locations.json` as the only authored location source. Generate fallback data and initial selects from it, or remove embedded fallbacks in favor of a small checked-in generated artifact.

**Manual cache busting is easy to forget:**
- Issue: Asset versions are manually embedded in HTML (`js/locations.js?v=9`, `js/ticket-panel.js?v=4`, `css/nav.css?v=17`) while `js/locations.js` also has an internal locations JSON cache string (`?v=8`) that must be updated by hand.
- Files: `js/locations.js`, `index.html`, `philadelphia.html`, `mount-prospect.html`, `west-nyack.html`, `lincoln.html`, `manassas.html`, `antwerp.html`, `houston.html`, `orland-park.html`, `dallas.html`, `brussels.html`, `faq.html`, `contact.html`, `gift-cards.html`, `missions.html`
- Impact: A deployment can serve stale location data or stale booking logic even when HTML has changed. The risk is highest for booking URLs, coming-soon status, and location metadata.
- Fix approach: Use filename hashing or a single generated version constant. If the site remains static with query-string busting, add a check that `data/locations.json` changes require the version in `js/locations.js` to change.

**Booking flow has overlapping controllers:**
- Issue: Booking clicks are handled by both `js/ticket-panel.js` and `js/roller-checkout.js`. `js/roller-checkout.js` runs in capture phase and stops propagation when a Roller checkout exists; otherwise `js/ticket-panel.js` handles the same buttons in bubble phase.
- Files: `js/ticket-panel.js`, `js/roller-checkout.js`, `data/locations.json`, `components/ticket-panel.html`
- Impact: Behavior depends on listener order and exact selectors. A new booking button class, a missing `rollerCheckoutUrl`, or a changed button target can route users to the wrong page, open a panel instead of checkout, or bypass the embedded Roller checkout.
- Fix approach: Create one booking orchestrator that resolves location, route type, and target URL, then have both the ticket panel and Roller widget call that single function.

**Component sync is regex-based and narrow:**
- Issue: `build.sh` replaces the ticket panel by regex and only syncs the ticket panel partial. Check scripts verify marker presence and selected strings, not semantic equivalence of the full component or other repeated components.
- Files: `build.sh`, `components/ticket-panel.html`, `scripts/check-components.js`, `scripts/check-booking-architecture.js`
- Impact: Footer, nav, location overlays, newsletter forms, and inline interactive scripts can drift across pages without checks. The replacement regex can miss changed indentation/structure or replace the wrong block if nested markup changes.
- Fix approach: Replace regex sync with a deterministic build step that renders all shared components from partials. Expand drift checks to compare canonical component output or migrate to a template engine.

**Group page pricing and add-on content is explicitly unfinished:**
- Issue: Group subpages include TODO comments for final pricing and add-on details.
- Files: `groups/corporate.html`, `groups/bachelor-ette.html`, `groups/birthdays.html`, `groups/field-trips.html`, `groups/holidays.html`, `groups/private-events.html`
- Impact: Public-facing sales pages may ship incomplete or inaccurate package details.
- Fix approach: Confirm location-specific group pricing/add-ons and replace TODO placeholders with authoritative content or remove unconfirmed details.

## Known Bugs

**Coming-soon location pages identify themselves as Houston:**
- Symptoms: `orland-park.html`, `dallas.html`, and `brussels.html` use `<body data-location="houston">`. Scripts that resolve page location from `body.dataset.location` treat these pages as Houston.
- Files: `orland-park.html`, `dallas.html`, `brussels.html`, `js/ticket-panel.js`, `js/roller-checkout.js`
- Trigger: Visit `orland-park.html`, `dallas.html`, or `brussels.html`; any code path using `body[data-location]` receives `houston`.
- Workaround: None in code. Correct each page's `data-location` attribute to its canonical slug and add a check that every location page body matches its filename.

**Playwright smoke tests cannot run in the current environment until browsers are installed:**
- Symptoms: `npm run test:smoke` fails all 5 tests with `browserType.launch: Executable doesn't exist` for Chromium headless shell.
- Files: `package.json`, `playwright.config.js`, `tests/smoke/site.spec.js`
- Trigger: Run `npm run test:smoke` or `npm run verify` without Playwright browser binaries installed.
- Workaround: Run `npx playwright install` before the smoke suite. CI should run `npx playwright install --with-deps` or cache browser binaries.

**Fallback location data is incomplete for several locations:**
- Symptoms: If `data/locations.json` fails to load, `js/locations.js` uses `FALLBACK`. Several fallback entries only contain `shortName`, blank `bookingUrl`, and blank `giftCardUrl`, while `data/locations.json` contains richer status/address/ticker/map data.
- Files: `js/locations.js`, `data/locations.json`
- Trigger: Fetch failure, local file preview, offline browsing, or CDN/network issue before `data/locations.json` loads.
- Workaround: None beyond the embedded fallback. Generate fallback data from `data/locations.json` or remove features that depend on incomplete fallback fields.

**Contact and lead forms use divergent submission paths:**
- Symptoms: `contact.html` uses Netlify form handling with a local thank-you URL, while `groups.html` posts directly to FormSubmit with a personal email address. Newsletter forms across the site have no `action` or detected submission handler in the searched HTML/JS.
- Files: `contact.html`, `groups.html`, `index.html`, `faq.html`, `gift-cards.html`, `missions.html`, `locations/index.html`, `groups/corporate.html`, `groups/bachelor-ette.html`, `groups/birthdays.html`, `groups/field-trips.html`, `groups/holidays.html`, `groups/private-events.html`
- Trigger: Submit lead forms from different pages.
- Workaround: Contact form depends on Netlify deployment support; group inquiry depends on FormSubmit delivery; newsletter forms appear non-functional unless an external platform injects handling.

## Security Considerations

**Trusted data is inserted with `innerHTML`:**
- Risk: Location address, hours, map iframe markup, and icon preview content are rendered with `innerHTML`. The current sources are first-party static data, but future CMS/API-backed location data would create an XSS path unless sanitized.
- Files: `js/locations.js`, `js/nav.js`, `assets/extracted/icons/preview.html`, `data/locations.json`
- Current mitigation: Most values originate from checked-in JSON or hard-coded objects, and some fields are assembled from known properties.
- Recommendations: Prefer DOM node creation and `textContent` for address/hour rows. For map iframes, build elements with `setAttribute` and URL-encode dynamic parts.

**Third-party checkout script is loaded without integrity pinning:**
- Risk: `js/roller-checkout.js` injects `https://cdn.rollerdigital.com/scripts/widget/checkout_iframe.js` at runtime. If the CDN script changes or is compromised, it executes on every page that loads the checkout helper.
- Files: `js/roller-checkout.js`, pages loading `js/roller-checkout.js`
- Current mitigation: Script source is HTTPS and limited to a single vendor URL.
- Recommendations: Use a vendor-supported pinned version if available, add CSP that restricts script/connect/frame origins, and document the trust boundary for Roller checkout.

**External lead capture endpoint exposes a personal recipient:**
- Risk: `groups.html` posts to `https://formsubmit.co/jeffersonkrichardson@gmail.com`, exposing an individual's email address in public source and coupling business lead flow to a personal mailbox.
- Files: `groups.html`
- Current mitigation: Hidden honeypot and disabled CAPTCHA fields are present.
- Recommendations: Move group inquiries to a business-controlled endpoint or form service account, and use environment/deployment config for routing.

**Local storage influences navigation and booking state:**
- Risk: `tm_location` and `timeMissionLocation` values from `localStorage` are used to set active location, route logos, preselect booking locations, and resolve checkout behavior.
- Files: `js/nav.js`, `js/locations.js`, `js/ticket-panel.js`, `js/roller-checkout.js`
- Current mitigation: `js/locations.js` validates selected ids against loaded locations in most paths.
- Recommendations: Normalize and validate storage values at the boundary in one helper. Avoid constructing navigation URLs from raw storage values in `js/nav.js` without checking against `data/locations.json`.

## Performance Bottlenecks

**Large duplicated pages increase transfer and parse cost:**
- Problem: Primary location pages are about 160-170 KB each before assets, with substantial inline CSS and inline JS repeated per page.
- Files: `index.html`, `philadelphia.html`, `mount-prospect.html`, `west-nyack.html`, `lincoln.html`, `manassas.html`, `antwerp.html`, `houston.html`, `orland-park.html`, `dallas.html`, `brussels.html`
- Cause: Shared layout, animation code, page CSS, footer, nav, overlays, and ticket panel are embedded into each page.
- Improvement path: Move shared CSS/JS into cacheable assets and render shared HTML through a template/build step. Keep page-specific content as data or partials.

**Hero media and large image galleries load on many pages:**
- Problem: Location pages preload hero poster imagery, autoplay a hero video, and include multiple 1920px experience images plus Instagram thumbnails.
- Files: `philadelphia.html`, `mount-prospect.html`, `west-nyack.html`, `lincoln.html`, `manassas.html`, `antwerp.html`, `houston.html`, `orland-park.html`, `dallas.html`, `brussels.html`
- Cause: Heavy media is embedded per page and repeated across locations.
- Improvement path: Audit LCP per page, ensure the video is not competing with the LCP image, lazy-load below-the-fold carousels, and consider responsive image sizes smaller than 1920px for cards.

**Intervals and animation loops continue regardless of visibility:**
- Problem: Repeated inline scripts start intervals for taglines, minute counters, point counters, carousels, and popups.
- Files: `index.html`, `philadelphia.html`, `mount-prospect.html`, `west-nyack.html`, `lincoln.html`, `manassas.html`, `antwerp.html`, `houston.html`, `orland-park.html`, `dallas.html`, `brussels.html`, `about.html`, `gift-cards.html`
- Cause: Scripts call `setInterval`/`setTimeout` without page visibility pausing or centralized lifecycle management.
- Improvement path: Wrap decorative animations in a shared controller that pauses on `document.hidden`, respects `prefers-reduced-motion`, and only starts when the target section is present/intersecting.

## Fragile Areas

**Location page identity and booking routing:**
- Files: `orland-park.html`, `dallas.html`, `brussels.html`, `js/ticket-panel.js`, `js/roller-checkout.js`, `data/locations.json`
- Why fragile: Page identity is derived from manually-authored `body[data-location]`, while booking behavior also depends on `data/locations.json`, local storage, current URL, and button class selectors.
- Safe modification: When adding or changing a location, update `data/locations.json` first, then verify page filename, `body[data-location]`, nav link `data-city`, sitemap entry, ticket flow, and smoke tests.
- Test coverage: No check currently asserts that every location page has matching `body[data-location]`.

**Accessibility is partly retrofitted by JavaScript:**
- Files: `js/a11y.js`, `scripts/check-accessibility-baseline.js`, `faq.html`, pages with `#locationDropdown`, pages with `#ticketPanel`
- Why fragile: The baseline script checks string presence and `js/a11y.js` adds roles, labels, skip links, and focus traps at runtime. Markup can pass static checks while still having focus restore, Escape handling, inert background, or initial focus issues.
- Safe modification: Prefer semantic attributes in authored HTML and keep `js/a11y.js` as enhancement only. Add Playwright keyboard tests for the location dialog and ticket panel.
- Test coverage: Smoke tests cover FAQ keyboard behavior and ticket close label, but not dialog focus trapping, focus restoration, reduced motion, or all page templates.

**Static checks rely on regex/string matching:**
- Files: `scripts/check-components.js`, `scripts/check-internal-links.js`, `scripts/check-accessibility-baseline.js`, `scripts/check-booking-architecture.js`, `scripts/check-sitemap.js`
- Why fragile: Checks can miss malformed HTML, duplicate IDs, wrong `data-location` values, unsafe `innerHTML`, stale location copies, and behavior-level regressions.
- Safe modification: Keep these checks for quick guardrails, but add structured parsers for HTML/JSON contracts and Playwright coverage for high-value user flows.
- Test coverage: `npm run check` passes, but it does not catch the wrong `body[data-location]` values on `orland-park.html`, `dallas.html`, and `brussels.html`.

## Scaling Limits

**Adding locations does not scale cleanly:**
- Current capacity: 10 locations are present in `data/locations.json`.
- Limit: A new location currently requires updates across JSON data, fallback data, nav data, page templates, sitemap, form options, ticket panel markup, location overlay links, footer links, and smoke expectations.
- Files: `data/locations.json`, `js/locations.js`, `js/nav.js`, `components/ticket-panel.html`, `sitemap.xml`, `contact.html`, `locations/index.html`, `scripts/check-location-contracts.js`, `tests/smoke/site.spec.js`
- Scaling path: Generate navigation, footer location lists, form location options, sitemap entries, and ticket options from `data/locations.json`.

**Manual static HTML limits content governance:**
- Current capacity: Dozens of pages can be maintained by direct editing, but repeated legal/footer/nav/CTA content grows linearly with pages.
- Limit: Consistency, review, and compliance changes become expensive as pages increase.
- Files: `terms.html`, `privacy.html`, `cookies.html`, `code-of-conduct.html`, `accessibility.html`, `licensing.html`, group pages in `groups/`, location pages in project root
- Scaling path: Introduce a static site generator or lightweight templating pipeline for shared shells, metadata, and content blocks.

## Dependencies at Risk

**Playwright browser binaries are not guaranteed by install scripts:**
- Risk: `@playwright/test` is listed as a dev dependency, but browser installation is not automated in `package.json`.
- Impact: `npm run test:smoke` and `npm run verify` fail on fresh machines until `npx playwright install` runs.
- Files: `package.json`, `playwright.config.js`, `tests/smoke/site.spec.js`
- Migration plan: Add a documented setup step or a `postinstall`/CI step for Playwright browsers. Keep CI explicit with `npx playwright install --with-deps`.

**Roller checkout widget is a runtime dependency outside repository control:**
- Risk: Booking modal behavior depends on `https://cdn.rollerdigital.com/scripts/widget/checkout_iframe.js` and the global `window.RollerCheckout` API.
- Impact: Vendor API changes or CDN outages can break embedded booking on pages using `rollerCheckoutUrl`.
- Files: `js/roller-checkout.js`, `data/locations.json`
- Migration plan: Detect widget load failure, expose a visible fallback link to `bookingUrl`, and monitor checkout open failures.

## Missing Critical Features

**No detected CI workflow:**
- Problem: `.github/` is present but no workflow files were detected by glob search, and test setup is not automated.
- Files: `.github/`, `package.json`, `playwright.config.js`, `scripts/check-*.js`, `tests/smoke/site.spec.js`
- Blocks: Regressions in booking, location data, forms, accessibility, and internal links depend on local verification.

**No generated contract for page identity:**
- Problem: There is no check that location page filenames, canonical URLs, `body[data-location]`, location JSON ids, sitemap entries, and nav links agree.
- Files: `data/locations.json`, `sitemap.xml`, `orland-park.html`, `dallas.html`, `brussels.html`, `scripts/check-location-contracts.js`, `scripts/check-sitemap.js`
- Blocks: Incorrect routing and booking metadata can ship even when all current static checks pass.

**Newsletter capture is not wired consistently:**
- Problem: Newsletter forms appear across many pages as `<form class="newsletter-form">` without a detected action or shared submission script.
- Files: `index.html`, `faq.html`, `gift-cards.html`, `missions.html`, `locations/index.html`, `groups/corporate.html`, `groups/bachelor-ette.html`, `groups/birthdays.html`, `groups/field-trips.html`, `groups/holidays.html`, `groups/private-events.html`
- Blocks: Email capture, attribution, spam protection, success states, and analytics for newsletter submissions.

## Test Coverage Gaps

**Booking and location identity contracts:**
- What's not tested: Correct `body[data-location]` per page, correct behavior on each location page with `?book=1`, embedded Roller fallback behavior, and coming-soon page routing.
- Files: `tests/smoke/site.spec.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `data/locations.json`, `orland-park.html`, `dallas.html`, `brussels.html`
- Risk: Users can be routed to the wrong location or booking target without tests failing.
- Priority: High

**Forms and lead capture flows:**
- What's not tested: Netlify form hidden fields, FormSubmit path, newsletter form behavior, thank-you state, validation errors, spam honeypots, and analytics.
- Files: `contact.html`, `groups.html`, `contact-thank-you.html`, newsletter forms across `index.html`, `faq.html`, `gift-cards.html`, `missions.html`, `locations/index.html`, `groups/*.html`
- Risk: Lead capture can silently fail while the site appears healthy.
- Priority: High

**Accessibility behavior beyond labels:**
- What's not tested: Focus trap loops, initial focus, focus restoration, Escape-to-close on location overlay, background scroll lock, reduced motion, and keyboard navigation through generated overlays.
- Files: `js/a11y.js`, `js/nav.js`, `js/ticket-panel.js`, `faq.html`, `tests/smoke/site.spec.js`
- Risk: Users relying on keyboard or assistive tech may get stuck in overlays or miss content even when static label checks pass.
- Priority: Medium

**Performance budgets:**
- What's not tested: LCP, CLS, INP, total page weight, image payload, video cost, and long-running animation CPU usage.
- Files: `index.html`, location pages in project root, `css/base.css`, `css/nav.css`, `js/nav.js`
- Risk: Visual changes can degrade mobile load time or interaction responsiveness without any failing check.
- Priority: Medium

---

*Concerns audit: 2026-04-29*
