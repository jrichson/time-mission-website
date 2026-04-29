# Codebase Structure

**Analysis Date:** 2026-04-29

## Directory Layout

```text
time-mission-website/
├── *.html                 # Root-level deployable static pages
├── _headers               # Static host header rules
├── _redirects             # Static host redirect and clean URL rules
├── .nojekyll              # Static host marker for GitHub Pages-style hosts
├── ads/                   # Ad creative capture files and ad-specific tooling
├── assets/                # Images, icons, logos, fonts, SVGs, and extracted art
├── components/            # Source HTML partials synced into runtime pages
├── css/                   # Shared CSS foundations and reusable stylesheets
├── data/                  # Runtime JSON data consumed by browser scripts
├── docs/                  # Project documentation, snapshots, and launch/review notes
├── groups/                # Group/event-specific SEO landing pages
├── js/                    # Shared vanilla browser scripts
├── locations/             # Locations index directory page
├── scripts/               # Node validation scripts for static-site contracts
├── tests/                 # Playwright smoke tests
├── build.sh               # Component sync script
├── package.json           # Verification and test commands
├── playwright.config.js   # Playwright local static server config
├── robots.txt             # Search crawler instructions
└── sitemap.xml            # XML sitemap for runtime pages
```

## Directory Purposes

**Project Root (`/`):**
- Purpose: Host deployable static pages and deployment metadata.
- Contains: Root HTML pages such as `index.html`, `about.html`, `missions.html`, `faq.html`, `contact.html`, `philadelphia.html`, `mount-prospect.html`, `404.html`, and static host files such as `_headers`, `_redirects`, `.nojekyll`, `robots.txt`, and `sitemap.xml`.
- Key files: `index.html`, `README.md`, `build.sh`, `package.json`, `playwright.config.js`, `_headers`, `_redirects`, `sitemap.xml`.
- Add new top-level marketing, legal, or location pages here when the desired URL is a root URL such as `/new-page.html`.

**`ads/`:**
- Purpose: Keep ad creative artifacts separate from runtime site pages.
- Contains: `ads/missions-1080.html`, `ads/capture.mjs`, `ads/package.json`, and `ads/README.md`.
- Key files: `ads/missions-1080.html`, `ads/capture.mjs`.
- Runtime HTML discovery and component sync exclude this directory in `build.sh` and `scripts/check-components.js`.

**`assets/`:**
- Purpose: Store static visual assets served by the site.
- Contains: Brand logos, extracted icons, SVG assets, news logos, mockup references, mission graphics, and generated/extracted HTML previews.
- Key files: `assets/logo/TM_Logo_White.svg`, `assets/news/NBC_logo.svg`, `assets/news/CBS_logo_(2020).svg`, `assets/news/Chicago_Tribune_Logo.svg`, `assets/extracted/icons/mission-wordmark.svg`, `assets/mission/mission.svg`.
- Use this directory for images, icons, fonts, videos, and other static files referenced by HTML and CSS.
- Generated or reference-only HTML under `assets/extracted/` is not treated as a runtime page by component sync.

**`components/`:**
- Purpose: Source reusable HTML partials for copied static components.
- Contains: `components/ticket-panel.html`.
- Key files: `components/ticket-panel.html`.
- Edit the partial here first, then run `./build.sh` so runtime pages with `<!-- Ticket Popup Panel -->` receive the updated markup.

**`css/`:**
- Purpose: Centralize CSS used by more than one page.
- Contains: `css/variables.css`, `css/base.css`, `css/nav.css`, `css/footer.css`, `css/newsletter.css`, `css/faq.css`, `css/ticket-panel.css`.
- Key files: `css/variables.css` for tokens, `css/base.css` for reset/base primitives, `css/nav.css` for ticker/nav/location overlay/mobile menu, `css/footer.css` for footer layout, `css/ticket-panel.css` for shared panel styles.
- Use `css/variables.css` for brand colors and fonts. Use `css/base.css` for global behavior and shared primitives. Put page-specific sections in the page's inline `<style>` block unless they are used by multiple pages.

**`data/`:**
- Purpose: Store runtime JSON data.
- Contains: `data/locations.json`.
- Key files: `data/locations.json`.
- Add or update location status, address, hours, booking URLs, gift-card URLs, map URLs, ticker copy, and Roller checkout URLs here.
- `scripts/check-location-contracts.js` requires every location record to have a matching root page at `{slug}.html`.

**`docs/`:**
- Purpose: Store human-readable planning, launch, review, and snapshot documents.
- Contains: `docs/DESIGN-DOCUMENTATION.md`, `docs/LAUNCH-TIMELINE.md`, `docs/prelaunch-review-2026-04-22.md`, `docs/redirect-map.md`, `docs/locations-snapshot-2026-04-22.json`, and `docs/review-sheet/`.
- Key files: `docs/redirect-map.md`, `docs/review-sheet/README.md`.
- Keep documentation and operational artifacts here rather than mixing them with deployable pages.

**`groups/`:**
- Purpose: Host event-type landing pages under group-oriented URLs.
- Contains: `groups/birthdays.html`, `groups/corporate.html`, `groups/field-trips.html`, `groups/private-events.html`, `groups/bachelor-ette.html`, `groups/holidays.html`.
- Key files: `groups/corporate.html` is a representative event-page template with shared event styles, FAQ blocks, quote CTA, footer, location overlay, and ticket panel.
- Add new event pages here. Start from the closest existing group page and preserve relative paths such as `../css/nav.css`, `../js/locations.js`, and `../assets/...`.

**`js/`:**
- Purpose: Store shared browser scripts loaded by runtime HTML pages.
- Contains: `js/locations.js`, `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `js/a11y.js`.
- Key files: `js/locations.js` exposes `window.TM`; `js/ticket-panel.js` owns ticket panel behavior; `js/roller-checkout.js` owns Roller overlay interception; `js/nav.js` owns nav/menu/location overlay behavior; `js/a11y.js` owns accessibility enhancements.
- Add cross-page browser behavior here as a standalone IIFE. Keep scripts tolerant of missing DOM elements because legal pages, location pages, group pages, and 404 pages do not all share identical markup.

**`locations/`:**
- Purpose: Host the location directory page.
- Contains: `locations/index.html`.
- Key files: `locations/index.html`.
- This directory is for `/locations/`. Individual location pages live at the root as `{slug}.html`, not under `locations/`.

**`scripts/`:**
- Purpose: Store Node-based validation scripts.
- Contains: `scripts/check-location-contracts.js`, `scripts/check-sitemap.js`, `scripts/check-components.js`, `scripts/check-booking-architecture.js`, `scripts/check-accessibility-baseline.js`, `scripts/check-internal-links.js`.
- Key files: `scripts/check-location-contracts.js` validates `data/locations.json`; `scripts/check-components.js` detects ticket panel drift; `scripts/check-booking-architecture.js` prevents duplicate booking URL maps.
- Add new validation scripts here and wire them into `package.json` under `scripts`.

**`tests/`:**
- Purpose: Store Playwright smoke tests.
- Contains: `tests/smoke/site.spec.js`.
- Key files: `tests/smoke/site.spec.js`.
- Add browser tests under `tests/smoke/` when the behavior should be verified against the static site served by `playwright.config.js`.

**`.planning/codebase/`:**
- Purpose: Store generated GSD codebase analysis documents.
- Contains: `ARCHITECTURE.md` and `STRUCTURE.md`.
- Generated: Yes.
- Committed: Project-dependent.
- Keep implementation code out of this directory.

## Key File Locations

**Entry Points:**
- `index.html`: Homepage and primary conversion entry.
- `404.html`: Static not-found page.
- `locations/index.html`: Locations directory entry.
- `groups.html`: Top-level groups/events overview.
- `groups/corporate.html`: Representative group/event landing page pattern.
- `philadelphia.html`: Representative open location page pattern.
- `houston.html`, `orland-park.html`, `brussels.html`, `dallas.html`: Coming-soon location page pattern.

**Configuration:**
- `package.json`: NPM scripts for checks, smoke tests, and verification.
- `package-lock.json`: Node dependency lockfile.
- `playwright.config.js`: Playwright test directory, base URL, and static server.
- `_headers`: Static host header configuration.
- `_redirects`: Static host redirect rules and clean URL routing.
- `robots.txt`: Search crawler configuration.
- `sitemap.xml`: Sitemap consumed by search engines and checked by `scripts/check-sitemap.js`.
- `.gitignore`: Git ignore rules.

**Core Logic:**
- `js/locations.js`: Location data loading, `window.TM`, persisted location state, DOM hydration, footer/location updates.
- `js/nav.js`: Ticker/nav scroll state, mobile menu, location overlay, legacy location display behavior.
- `js/ticket-panel.js`: Ticket panel open/close, option hydration, location-page `?book=1` redirect flow, booking URL resolution through `window.TM`.
- `js/roller-checkout.js`: Roller CDN script injection and capture-phase checkout interception.
- `js/a11y.js`: Skip-link insertion, dialog roles, focus traps for location and ticket panels.
- `data/locations.json`: Canonical location and booking data.
- `components/ticket-panel.html`: Canonical ticket panel markup.
- `build.sh`: Syncs `components/ticket-panel.html` into runtime pages.

**Shared Styles:**
- `css/variables.css`: Brand tokens and font-family variables.
- `css/base.css`: Global reset, font-face declarations, skip link styles, page header, reveal utility.
- `css/nav.css`: Shared ticker, navigation, mobile menu, location selector, and nav button styles.
- `css/footer.css`: Shared footer, newsletter, footer location info, and responsive footer layout.
- `css/newsletter.css`: Newsletter section/form styles shared by pages.
- `css/faq.css`: FAQ accordion styles shared by FAQ and event pages.
- `css/ticket-panel.css`: Shared ticket panel styles where pages choose external panel CSS.

**Testing and Validation:**
- `scripts/check-location-contracts.js`: Validates location records and root page existence.
- `scripts/check-components.js`: Validates copied ticket panel structure across runtime pages.
- `scripts/check-booking-architecture.js`: Ensures booking logic uses `data/locations.json` through `window.TM`.
- `scripts/check-accessibility-baseline.js`: Validates shared accessibility baseline expectations.
- `scripts/check-internal-links.js`: Validates local links and asset paths.
- `scripts/check-sitemap.js`: Validates sitemap coverage.
- `tests/smoke/site.spec.js`: Playwright smoke tests for homepage, booking panel, location persistence, FAQ controls, and contact form setup.

**Documentation:**
- `README.md`: Quick start, verification commands, production notes, and modernization risks.
- `HANDOFF.md`: Project handoff context.
- `docs/DESIGN-DOCUMENTATION.md`: Design documentation.
- `docs/LAUNCH-TIMELINE.md`: Launch timeline.
- `docs/redirect-map.md`: Redirect mapping.

## Naming Conventions

**Files:**
- Root HTML pages use lowercase kebab-case names: `gift-cards.html`, `code-of-conduct.html`, `mount-prospect.html`, `west-nyack.html`.
- Location pages use the same slug as their `data/locations.json` `id` and `slug`: `philadelphia.html`, `orland-park.html`, `brussels.html`.
- Group/event pages use lowercase kebab-case under `groups/`: `groups/private-events.html`, `groups/field-trips.html`.
- Shared JavaScript uses lowercase kebab-case: `js/ticket-panel.js`, `js/roller-checkout.js`.
- Shared CSS uses lowercase kebab-case or simple role names: `css/ticket-panel.css`, `css/newsletter.css`, `css/base.css`.
- Validation scripts use `check-*.js`: `scripts/check-components.js`, `scripts/check-internal-links.js`.
- Test files use `*.spec.js`: `tests/smoke/site.spec.js`.

**Directories:**
- Functional directories use lowercase names: `css/`, `js/`, `data/`, `scripts/`, `tests/`, `components/`, `groups/`, `locations/`.
- Asset subdirectories are purpose-based: `assets/logo/`, `assets/news/`, `assets/extracted/icons/`, `assets/mission/`.
- Documentation subdirectories are topic-based: `docs/review-sheet/`.

**HTML IDs and Classes:**
- Shared widgets depend on stable IDs: `#ticketPanel`, `#ticketOverlay`, `#ticketClose`, `#ticketLocation`, `#ticketBookBtn`, `#locationDropdown`, `#locationBtn`, `#locationText`, `#mobileMenu`, `#nav`.
- Shared behavior depends on classes such as `.btn-tickets`, `.btn-book-now`, `.btn-group-tickets`, `.location-info-book`, `.nav-logo`, `.location-dropdown-logo`, `.ticker-track`, `.testimonial-card`, `.faq-question`.
- New buttons that should participate in shared booking behavior should use an existing booking selector rather than inventing a new selector.

**Data Attributes:**
- Location pages should set `body[data-location="{slug}"]`.
- Location links may use `data-tm-location="{slug}"` and/or `data-city="Display Name"`.
- Location text fields should use `data-tm-field="path.to.field"` when hydrated by `js/locations.js`.
- Location href fields should use `data-tm-href="path.to.field"` when hydrated by `js/locations.js`.
- Use `data-tm-booking` for links that should receive the selected location booking URL from `js/locations.js`.

## Where to Add New Code

**New Top-Level Marketing Page:**
- Primary code: Create `new-page.html` at the project root.
- Styles: Use shared CSS links to `css/variables.css`, `css/base.css`, `css/nav.css`, and only add page-specific CSS inline unless shared reuse is clear.
- Scripts: Include shared scripts from `js/` as needed, preserving the existing order used by similar pages.
- Tests: Add smoke coverage to `tests/smoke/site.spec.js` when the page includes a critical conversion, form, booking, or accessibility interaction.
- Sitemap: Add the page to `sitemap.xml` and ensure `scripts/check-sitemap.js` passes.

**New Location Page:**
- Primary code: Create `{slug}.html` at the project root.
- Data: Add the matching record to `data/locations.json` with identical `id` and `slug`.
- Required page contract: Add `body[data-location="{slug}"]` for location-specific booking behavior.
- Booking: Store `bookingUrl`, `rollerCheckoutUrl`, and `giftCardUrl` in `data/locations.json`, not in page-specific scripts.
- Tests/checks: Run `npm run check:locations`, `npm run check:booking`, and `npm run verify`.

**New Group/Event Page:**
- Primary code: Create `groups/{event-slug}.html`.
- Starting point: Copy the closest existing page from `groups/`, such as `groups/corporate.html` for broad event pages or `groups/birthdays.html` for party pages.
- Relative paths: Use `../css/...`, `../js/...`, and `../assets/...`.
- Component sync: Keep `<!-- Ticket Popup Panel -->` and run `./build.sh groups/{event-slug}.html` after editing shared panel structure.
- Sitemap: Add the group page to `sitemap.xml`.

**New Shared Browser Behavior:**
- Implementation: Add a new file under `js/` or extend the closest existing shared script.
- Pattern: Use an IIFE, `'use strict'`, DOM queries guarded by element existence checks, and no bundler-specific syntax.
- Data access: Use `window.TM.ready` and `window.TM.get(...)` for location-dependent behavior.
- Tests: Add Playwright smoke coverage in `tests/smoke/site.spec.js` when the behavior is user-facing.

**New Shared Styles:**
- Implementation: Add to the most specific shared stylesheet in `css/`.
- Tokens: Add reusable colors, fonts, gradients, or brand primitives to `css/variables.css`.
- Global primitives: Add baseline utilities to `css/base.css`.
- Widget styles: Add nav/menu styles to `css/nav.css`, footer styles to `css/footer.css`, FAQ styles to `css/faq.css`, ticket panel styles to `css/ticket-panel.css`.
- Page-only styles: Keep unique section styles inline in the relevant `.html` file.

**New Shared Component Partial:**
- Implementation: Add a partial under `components/`.
- Sync: Add sync logic to `build.sh` for the new marker and partial.
- Drift check: Extend `scripts/check-components.js` so runtime pages cannot silently drift.
- Runtime script: Add behavior under `js/` only if the partial needs interaction.

**New Validation Rule:**
- Implementation: Add `scripts/check-{rule}.js`.
- Package script: Add a targeted command to `package.json`, then include it in `npm run check`.
- Style: Follow existing scripts by collecting errors, printing each error, and exiting with status 1 when errors exist.

**New Smoke Test:**
- Implementation: Add to `tests/smoke/site.spec.js` or create another `*.spec.js` under `tests/smoke/`.
- Server: Use `page.goto(...)` paths relative to `playwright.config.js` `baseURL`.
- Scope: Prefer tests for cross-page contracts, booking flows, forms, location persistence, accessibility controls, and links that can break revenue-critical paths.

**Utilities:**
- Shared browser helpers: `js/`.
- Node filesystem checks: `scripts/`.
- Static data: `data/`.
- Visual assets: `assets/`.
- Documentation or generated references: `docs/`.

## Special Directories

**`assets/extracted/`:**
- Purpose: Store extracted icons, SVGs, preview files, and animation reference HTML.
- Generated: Partly.
- Committed: Yes.
- Runtime page checks exclude this directory when syncing ticket panel markup.

**`ads/`:**
- Purpose: Store ad creative pages and capture tooling.
- Generated: Partly.
- Committed: Yes.
- Runtime page checks exclude this directory.

**`components/`:**
- Purpose: Store source partials, not deployable routes.
- Generated: No.
- Committed: Yes.
- Pages consume copies of these partials after `build.sh` runs.

**`docs/review-sheet/`:**
- Purpose: Store review sheet documentation and CSV inputs.
- Generated: Data/reference.
- Committed: Yes.

**`node_modules/`:**
- Purpose: Local npm dependencies.
- Generated: Yes.
- Committed: No.
- Do not edit or reference implementation patterns from this directory.

**`test-results/`:**
- Purpose: Playwright runtime results.
- Generated: Yes.
- Committed: No.
- Safe to delete or regenerate through Playwright.

**`.planning/codebase/`:**
- Purpose: GSD mapping output consumed by planning/execution workflows.
- Generated: Yes.
- Committed: Project-dependent.
- Do not place runtime site code here.

## Practical Structure Rules

- Keep deployable pages as plain `.html` files unless the project explicitly adopts a static-site generator.
- Keep location data in `data/locations.json`; do not duplicate booking maps in `js/ticket-panel.js`, `js/roller-checkout.js`, or inline page scripts.
- Keep copied ticket panel markup synchronized from `components/ticket-panel.html` with `build.sh`.
- Preserve shared script order on pages that use booking: `js/nav.js`, `js/locations.js`, `js/roller-checkout.js`, `js/ticket-panel.js`, then `js/a11y.js`.
- Use root-relative awareness carefully. Root pages link to `css/...` and `js/...`; pages under `groups/` and `locations/` link to `../css/...` and `../js/...`.
- Add checks in `scripts/` for cross-file rules instead of relying on manual review.
- Add Playwright smoke tests for revenue, navigation, accessibility, and form flows.

---

*Structure analysis: 2026-04-29*
