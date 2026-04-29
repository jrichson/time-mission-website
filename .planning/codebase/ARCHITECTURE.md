# Architecture

**Analysis Date:** 2026-04-29

## Pattern Overview

**Overall:** Static marketing website with vanilla JavaScript hydration and data-driven location behavior.

**Key Characteristics:**
- HTML files at the repository root are the deployable pages; there is no application router or server-rendering layer.
- Shared browser behavior is centralized in `js/`, while most page presentation remains inline in each `.html` page with shared foundation CSS from `css/`.
- Location, booking, gift-card, and Roller checkout data is centralized in `data/locations.json` and exposed at runtime through `window.TM` in `js/locations.js`.
- The ticket panel HTML is maintained as a partial in `components/ticket-panel.html` and copied into runtime pages by `build.sh`.
- Architecture checks in `scripts/` protect central contracts that are otherwise easy to drift in a static HTML site.

## Layers

**Runtime HTML Pages:**
- Purpose: Define page content, SEO metadata, schema markup, nav/footer markup, page-local sections, and page-local styles.
- Location: `*.html`, `groups/*.html`, `locations/index.html`
- Contains: Marketing pages, location landing pages, group/event pages, legal pages, contact pages, error page.
- Depends on: Shared CSS in `css/`, shared scripts in `js/`, assets in `assets/`, location data in `data/locations.json`.
- Used by: Static host and Playwright smoke tests in `tests/smoke/site.spec.js`.
- Use this layer for new public pages. Place root-level pages at `new-page.html`; place event-type group pages under `groups/new-event.html`; place index-style directories like locations under `locations/index.html`.

**Design Foundation:**
- Purpose: Provide brand tokens, baseline typography, global reset, shared page-header utilities, nav/ticker/mobile-menu styles, footer styles, FAQ styles, newsletter styles, and ticket-panel styles.
- Location: `css/`
- Contains: `css/variables.css`, `css/base.css`, `css/nav.css`, `css/footer.css`, `css/faq.css`, `css/newsletter.css`, `css/ticket-panel.css`.
- Depends on: Font assets in `assets/fonts/`, CSS variables from `css/variables.css`, images and icons in `assets/`.
- Used by: Most runtime pages through `<link rel="stylesheet">` tags.
- Use `css/variables.css` for design tokens, `css/base.css` for global primitives, and page-local `<style>` blocks for page-specific sections unless the style is shared across multiple pages.

**Shared Browser Behavior:**
- Purpose: Hydrate static pages with interactive behavior after the HTML loads.
- Location: `js/`
- Contains: `js/locations.js`, `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `js/a11y.js`.
- Depends on: Browser DOM APIs, `localStorage`, `fetch`, `data/locations.json`, and the Roller checkout CDN injected by `js/roller-checkout.js`.
- Used by: Runtime pages that include the shared script tags near the end of the body.
- Keep new cross-page behavior in `js/` as standalone IIFEs. Avoid introducing module syntax unless the whole static deployment approach changes.

**Location Data:**
- Purpose: Single source of truth for location identity, status, addresses, contact info, hours, booking URLs, gift-card URLs, Roller checkout URLs, map URLs, nav labels, ticker copy, and location page slugs.
- Location: `data/locations.json`
- Contains: A top-level `locations` array keyed by `id`/`slug`.
- Depends on: None at runtime; consumed with `fetch` from `js/locations.js`.
- Used by: `js/locations.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, checks in `scripts/check-location-contracts.js` and `scripts/check-booking-architecture.js`.
- Add and update location data here first. Do not add independent booking URL maps in scripts or pages.

**Component Source Partials:**
- Purpose: Maintain shared HTML snippets that are manually synced into deployable static pages.
- Location: `components/`
- Contains: `components/ticket-panel.html`.
- Depends on: Sync logic in `build.sh`.
- Used by: Runtime pages that contain the `<!-- Ticket Popup Panel -->` marker and `#ticketPanel`.
- Edit `components/ticket-panel.html` for structural ticket panel changes, then run `./build.sh` to sync pages.

**Validation and Test Tooling:**
- Purpose: Enforce static-site contracts and run browser smoke tests.
- Location: `scripts/`, `tests/smoke/`, `playwright.config.js`, `package.json`
- Contains: Node checks for locations, sitemap, component drift, booking architecture, accessibility baseline, internal links, and Playwright smoke tests.
- Depends on: Node CommonJS, `@playwright/test`, filesystem reads of project files.
- Used by: `npm run verify` in `package.json`.
- Add a check under `scripts/` when a static-site rule must hold across many HTML files.

**Static Host Configuration:**
- Purpose: Configure headers and routing for static deployment.
- Location: `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `.nojekyll`
- Contains: Security/cache header rules, redirect rules, crawler instructions, XML sitemap entries, and static host compatibility marker.
- Depends on: Hosting platform support for Netlify/Cloudflare Pages style files.
- Used by: Production deployment and verification scripts such as `scripts/check-sitemap.js`.

## Data Flow

**Page Load and Hydration:**

1. The static host serves an HTML file such as `index.html`, `philadelphia.html`, `groups/corporate.html`, or `locations/index.html`.
2. The page loads shared CSS from `css/variables.css`, `css/base.css`, `css/nav.css`, and page-specific shared styles such as `css/footer.css`, `css/newsletter.css`, or `css/faq.css`.
3. Page-local inline CSS defines the unique layout and section styles for that page.
4. The page loads shared scripts near the end of the body, typically `js/nav.js`, `js/locations.js`, `js/roller-checkout.js`, `js/ticket-panel.js`, and `js/a11y.js`.
5. `js/locations.js` exposes `window.TM`, fetches `data/locations.json`, restores a selected location outside the homepage, and updates DOM fields and links.
6. `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, and `js/a11y.js` attach event listeners and enhance existing markup.

**State Management:**
- `localStorage['tm_location']` is the canonical persisted selected location slug.
- `localStorage['timeMissionLocation']` is a legacy display-name key still read and healed by `js/locations.js` and written by `js/nav.js`.
- `window.TM.current` holds the in-memory selected location object.
- DOM state uses classes such as `.open`, `.active`, `.scrolled`, `.menu-open`, and `.location-open`.
- Location pages use `body[data-location]` to identify page-specific booking behavior.

**Location Selection Flow:**

1. A user opens the location picker through markup controlled by `js/nav.js`.
2. Location links use attributes such as `data-city` and `data-tm-location`.
3. `js/nav.js` writes location display data to localStorage and lets links navigate to the selected location page.
4. `js/locations.js` restores the canonical slug, sets `window.TM.current`, dispatches `tm:location-changed`, and updates DOM fields, ticker copy, footer location info, nav logo links, and booking links.
5. Location pages such as `philadelphia.html`, `mount-prospect.html`, and `antwerp.html` mark the selected location with `body[data-location="..."]`.

**Booking Flow:**

1. Shared booking buttons use selectors including `.btn-tickets`, `.btn-book-now`, `.btn-group-tickets`, `.location-info-book`, and `#ticketBookBtn`.
2. `js/roller-checkout.js` listens in capture phase and opens the Roller checkout overlay when `window.TM.get(slug).rollerCheckoutUrl` is available.
3. If Roller is unavailable for the selected location, `js/ticket-panel.js` handles the click.
4. On non-location pages, `js/ticket-panel.js` opens `#ticketPanel`, hydrates `#ticketLocation` from `window.TM.locations`, and routes `#ticketBookBtn` through `{slug}.html?book=1`.
5. On location pages with `?book=1`, `js/ticket-panel.js` cleans the URL with `history.replaceState` and redirects to the location booking URL after load.
6. Coming-soon locations route to their location page instead of an external checkout.

**Component Sync Flow:**

1. The canonical ticket panel markup lives in `components/ticket-panel.html`.
2. `build.sh` discovers runtime HTML pages, excluding `assets/`, `ads/`, `components/`, `node_modules/`, and `404.html`.
3. For pages containing `<!-- Ticket Popup Panel -->`, `build.sh` replaces the existing panel block with the component partial.
4. `scripts/check-components.js` verifies pages that load ticket panel behavior still include the marker and `#ticketPanel`.

**Verification Flow:**

1. `npm run verify` runs `npm run check` followed by `npm run test:smoke`.
2. `npm run check` runs all contract scripts defined in `package.json`.
3. `playwright.config.js` starts `python3 -m http.server 4173` and runs Chromium smoke tests from `tests/smoke/site.spec.js`.
4. Smoke tests validate homepage loading, ticket panel hydration, location persistence, FAQ keyboard controls, and contact form configuration.

## Key Abstractions

**Location Manager (`window.TM`):**
- Purpose: Provide a global runtime API for location data, selected location state, DOM updates, and helper queries.
- Examples: `js/locations.js`, `data/locations.json`
- Pattern: Single global namespace exposed from an IIFE with methods `load`, `get`, `getOpen`, `getByRegion`, `select`, `clear`, `restore`, `updateDOM`, and a `ready` promise.
- Use this API for any behavior that needs location data. Wait for `window.TM.ready` when markup must be hydrated from `data/locations.json`.

**Location Records:**
- Purpose: Represent all page, nav, booking, gift-card, map, and operational data for a venue.
- Examples: `data/locations.json`, `scripts/check-location-contracts.js`
- Pattern: JSON objects with required `id`, `slug`, `name`, `shortName`, `status`, `navLabel`, and optional checkout fields such as `bookingUrl`, `rollerCheckoutUrl`, and `giftCardUrl`.
- Keep `id` and `slug` identical because `scripts/check-location-contracts.js` enforces that invariant.

**Static Page Templates by Convention:**
- Purpose: Keep similar pages consistent without a templating engine.
- Examples: root location pages such as `philadelphia.html`, `lincoln.html`, `manassas.html`; group event pages such as `groups/birthdays.html`, `groups/corporate.html`, `groups/field-trips.html`.
- Pattern: Copy-based static templates with repeated nav, footer, ticket panel, inline section styles, JSON-LD, and shared script includes.
- When adding a similar page, start from the closest existing page and preserve shared markers, script order, schema patterns, and data attributes.

**Ticket Panel Partial:**
- Purpose: Shared booking panel markup used across runtime pages.
- Examples: `components/ticket-panel.html`, copied markup in `index.html`, `groups/corporate.html`, `locations/index.html`
- Pattern: Source partial plus shell sync plus component drift check.
- Keep IDs stable: `#ticketOverlay`, `#ticketPanel`, `#ticketClose`, `#ticketLocation`, and `#ticketBookBtn` are consumed by `js/ticket-panel.js` and `js/a11y.js`.

**Shared Enhancement Scripts:**
- Purpose: Add progressive interactivity without replacing static HTML.
- Examples: `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `js/a11y.js`
- Pattern: Browser IIFEs that query existing DOM, guard missing elements, and attach listeners only when the expected markup exists.
- New scripts should follow the same missing-element tolerant pattern because not every page contains every widget.

**Contract Checks:**
- Purpose: Convert static-site conventions into executable checks.
- Examples: `scripts/check-location-contracts.js`, `scripts/check-components.js`, `scripts/check-booking-architecture.js`, `scripts/check-internal-links.js`, `scripts/check-sitemap.js`, `scripts/check-accessibility-baseline.js`
- Pattern: Node CommonJS scripts that read files from disk, collect errors, print actionable messages, and exit non-zero on failure.
- Add checks when a rule spans many files or prevents drift between copied markup and shared scripts.

## Entry Points

**Homepage:**
- Location: `index.html`
- Triggers: Browser request for `/` or `/index.html`.
- Responsibilities: Main brand/mission landing page, hero video, core navigation, booking panel entry, location selection, testimonials, FAQs, and conversion CTAs.

**Root Marketing Pages:**
- Location: `about.html`, `missions.html`, `groups.html`, `gift-cards.html`, `faq.html`, `contact.html`, `licensing.html`, legal pages such as `privacy.html` and `terms.html`
- Triggers: Static page navigation and sitemap entries.
- Responsibilities: Top-level marketing, informational, legal, and lead-capture flows.

**Location Pages:**
- Location: `philadelphia.html`, `mount-prospect.html`, `west-nyack.html`, `lincoln.html`, `manassas.html`, `antwerp.html`, `houston.html`, `orland-park.html`, `brussels.html`, `dallas.html`
- Triggers: Direct static URLs, location picker links, and booking handoff URLs like `{slug}.html?book=1`.
- Responsibilities: Location-specific SEO metadata, schema markup, selected-location context through `body[data-location]`, local details, map/contact links, booking CTAs, and coming-soon signup CTAs.

**Locations Index:**
- Location: `locations/index.html`
- Triggers: Browser request for `/locations/`.
- Responsibilities: List open and coming-soon locations with links into root location pages and shared booking behavior.

**Group/Event Pages:**
- Location: `groups/birthdays.html`, `groups/corporate.html`, `groups/field-trips.html`, `groups/private-events.html`, `groups/bachelor-ette.html`, `groups/holidays.html`
- Triggers: Navigation from `groups.html`, sitemap entries, direct SEO landing URLs.
- Responsibilities: Event-type landing pages with shared event page layout conventions, FAQ content, quote/booking CTAs, nav/footer, and shared ticket panel behavior.

**Shared Runtime Scripts:**
- Location: `js/locations.js`, `js/nav.js`, `js/roller-checkout.js`, `js/ticket-panel.js`, `js/a11y.js`
- Triggers: Script tags in runtime HTML pages.
- Responsibilities: Location data loading, selection persistence, nav interaction, booking routing, Roller overlay integration, and accessibility enhancements.

**Build/Sync Script:**
- Location: `build.sh`
- Triggers: Manual run after editing `components/ticket-panel.html`; optional targeted run with a page path.
- Responsibilities: Copy ticket panel partial markup into runtime pages with the panel marker.

**Verification Commands:**
- Location: `package.json`, `playwright.config.js`, `scripts/`, `tests/smoke/site.spec.js`
- Triggers: `npm run check`, `npm run test:smoke`, or `npm run verify`.
- Responsibilities: Validate cross-file contracts and smoke-test critical browser flows.

## Error Handling

**Strategy:** Fail fast in validation scripts, degrade gracefully in browser scripts.

**Patterns:**
- Validation scripts such as `scripts/check-location-contracts.js` collect all detected errors, print them, and call `process.exit(1)`.
- `js/locations.js` catches `fetch` failures for `data/locations.json`, logs a warning, resolves `window.TM.ready`, and keeps fallback behavior available for persisted locations.
- DOM enhancement scripts check for expected elements before attaching listeners, for example `js/ticket-panel.js` returns when `#ticketPanel` or `#ticketLocation` is absent.
- Browser storage access is wrapped in `try/catch` in `js/nav.js`, `js/ticket-panel.js`, and `js/locations.js` so private browsing or blocked storage does not break page rendering.
- Booking behavior falls back from Roller overlay to ticket-panel or direct-link navigation depending on available location data and URL schemes.

## Cross-Cutting Concerns

**Logging:** Browser logging is minimal and uses `console.warn` in `js/locations.js` when location data fails to load. Validation scripts write failures to stderr with `console.error`.

**Validation:** Static contracts are enforced by `scripts/check-location-contracts.js`, `scripts/check-sitemap.js`, `scripts/check-components.js`, `scripts/check-booking-architecture.js`, `scripts/check-accessibility-baseline.js`, and `scripts/check-internal-links.js`. Browser behavior is covered by `tests/smoke/site.spec.js`.

**Authentication:** Not applicable. The site has no app authentication layer. External booking and form systems are reached through links or static form configuration.

**Accessibility:** `js/a11y.js` injects a skip link when missing, marks location and ticket panels as dialogs, labels close buttons, and traps focus while overlays are open. FAQ keyboard controls are verified in `tests/smoke/site.spec.js`.

**SEO and Structured Data:** Each runtime page owns its page-specific metadata. Location pages include inline JSON-LD for organization and entertainment business data. `sitemap.xml`, `robots.txt`, and `scripts/check-sitemap.js` support crawl coverage.

**Performance:** Runtime uses static HTML/CSS/vanilla JS with no bundler. Large pages inline substantial CSS and schema data. `js/roller-checkout.js` injects the Roller CDN script only once per page.

**Deployment:** `_headers`, `_redirects`, `.nojekyll`, `robots.txt`, and `sitemap.xml` sit at the project root for static hosting. `README.md` identifies the production path as static HTML/CSS/vanilla JS.

---

*Architecture analysis: 2026-04-29*
