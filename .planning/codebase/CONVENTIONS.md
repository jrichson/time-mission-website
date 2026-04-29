# Coding Conventions

**Analysis Date:** 2026-04-29

## Naming Patterns

**Files:**
- Use lowercase kebab-case for static pages and assets that are part of the public URL surface: `mount-prospect.html`, `orland-park.html`, `contact-thank-you.html`, `css/ticket-panel.css`, `scripts/check-internal-links.js`.
- Use descriptive script names with the `check-*.js` prefix for repository validation scripts: `scripts/check-location-contracts.js`, `scripts/check-sitemap.js`, `scripts/check-components.js`, `scripts/check-booking-architecture.js`, `scripts/check-accessibility-baseline.js`, `scripts/check-internal-links.js`.
- Use shared browser modules under `js/` with feature-oriented names: `js/nav.js`, `js/locations.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `js/a11y.js`.
- Use shared CSS modules under `css/` by responsibility: `css/variables.css` for tokens, `css/base.css` for reset/shared primitives, `css/nav.css` for navigation, `css/footer.css` for footer, `css/newsletter.css` for newsletter, `css/faq.css` for FAQ UI, `css/ticket-panel.css` for the ticket panel.
- Use HTML component fragments only for copyable/shared markup snapshots: `components/ticket-panel.html`. Runtime pages currently inline the shared ticket panel markup and validation enforces marker consistency through `scripts/check-components.js`.

**Functions:**
- Use camelCase for JavaScript functions in both Node scripts and browser scripts: `walk()`, `stripQueryAndHash()`, `requireString()`, `normalizeLocation()`, `syncLocationOptions()`, `openTicketPanel()`, `closeTicketPanel()`, `resolveLocationForButton()`, `ensureSkipLink()`, `trapFocus()`.
- Use verb-first names for functions that cause side effects: `syncBookingBtn()`, `scheduleAutoRedirect()`, `openLocationOverlay()`, `closeLocationOverlay()`, `showLocationInfo()`, `updateDOM()`, `updateFooterLocation()`.
- Use predicate-style names for booleans and checks: `isDirectBookingUrl()`, `isIndexPage()`, `hasBooking`, `hasVisible`, `hasLocationData`.
- Methods exposed on `window.TM` in `js/locations.js` use concise action names: `load()`, `get()`, `getOpen()`, `getByRegion()`, `select()`, `clear()`, `restore()`, `updateDOM()`.

**Variables:**
- Use camelCase for local variables in JavaScript: `root`, `errors`, `dataPath`, `runtimePages`, `ticketPanel`, `ticketLocationSelect`, `pageLocation`, `bookingButtons`.
- Use uppercase snake case for constants whose values are intended as module-level invariants: `STORAGE_KEY`, `FALLBACK` in `js/locations.js`.
- Use lowercase object property names matching the data contract in `data/locations.json`: `id`, `slug`, `name`, `shortName`, `venueName`, `region`, `status`, `address`, `contact`, `hours`, `bookingUrl`, `rollerCheckoutUrl`, `giftCardUrl`, `navLabel`, `mapUrl`, `ticker`.
- Use hyphenated slugs for locations and URL-derived values: `mount-prospect`, `west-nyack`, `orland-park`. Validation in `scripts/check-location-contracts.js` requires `id` and `slug` to match.
- Use `errors` arrays in validation scripts, accumulate all failures, then print them together before exiting. This pattern appears in `scripts/check-location-contracts.js`, `scripts/check-components.js`, `scripts/check-internal-links.js`, `scripts/check-booking-architecture.js`, `scripts/check-accessibility-baseline.js`, and `scripts/check-sitemap.js`.

**Types:**
- TypeScript is not used. There are no `.ts` or `.tsx` source files and no `tsconfig.json`.
- Use data-shape validation in Node scripts instead of TypeScript interfaces. The location schema is enforced in `scripts/check-location-contracts.js` against `data/locations.json`.
- In browser code, use object shape checks and DOM existence checks before use: `window.TM && typeof window.TM.get === 'function'` in `js/ticket-panel.js`, `loc && loc.rollerCheckoutUrl` in `js/roller-checkout.js`, and `if (!dialog) return` in `js/a11y.js`.

## Code Style

**Formatting:**
- No formatter config is detected. There is no `.prettierrc`, `eslint.config.*`, `.eslintrc*`, or `biome.json`.
- Use 2-space indentation in CommonJS Node scripts and Playwright tests: `scripts/check-components.js`, `scripts/check-internal-links.js`, `scripts/check-location-contracts.js`, `tests/smoke/site.spec.js`, `playwright.config.js`.
- Use 4-space indentation in browser IIFE files and CSS: `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `js/a11y.js`, `css/base.css`, `css/nav.css`, `css/variables.css`.
- Use semicolons consistently in JavaScript.
- Use single quotes in JavaScript strings unless the string contains single quotes or is inline HTML/JSON requiring double quotes. Examples: `require('node:fs')` in `scripts/check-components.js`, `document.querySelector('.skip-link')` in `js/a11y.js`.
- Use trailing commas sparingly. Object literals in `playwright.config.js` include trailing commas; most runtime browser object literals do not.
- Use line breaks for multi-condition filters and long selectors. Examples: the `runtimePages` filter in `scripts/check-components.js`, the `pages` filter in `scripts/check-internal-links.js`, and the `querySelectorAll()` selector list in `js/ticket-panel.js`.

**Linting:**
- No linting framework is configured. `package.json` has validation scripts but no `lint` script.
- Treat repository checks as the quality gate. `npm run check` runs location contract, sitemap, component drift, booking architecture, accessibility baseline, and internal-link checks from `package.json`.
- Add new structural rules as small Node scripts in `scripts/check-*.js` and wire them into the `check` script in `package.json`.

## Import Organization

**Order:**
1. CommonJS built-in modules first in Node scripts: `const fs = require('node:fs');`, `const path = require('node:path');`.
2. Third-party test imports first in tests and config: `const { test, expect } = require('@playwright/test');` in `tests/smoke/site.spec.js`, `const { defineConfig, devices } = require('@playwright/test');` in `playwright.config.js`.
3. Derived constants immediately after imports: `root`, `errors`, file paths, data reads.
4. Helper functions before main loops or checks: `walk()` in `scripts/check-components.js`, `stripQueryAndHash()` in `scripts/check-internal-links.js`, `requireString()` in `scripts/check-location-contracts.js`.
5. Main validation logic after helpers, followed by a single failure-reporting block and a success message.

**Path Aliases:**
- No JavaScript path aliases are configured.
- Use Node built-in path resolution in scripts: `path.resolve(__dirname, '..')`, `path.join(root, 'data', 'locations.json')`.
- In HTML, use relative public paths with explicit `../` prefixes for subdirectories. Root pages load `css/variables.css`, `js/nav.js`, and `js/locations.js`; group pages load `../css/variables.css`, `../js/nav.js`, and `../js/locations.js`.

## Error Handling

**Patterns:**
- Validation scripts should collect every issue into `errors`, print a header with `console.error()`, print each issue as `- ${error}`, and exit with `process.exit(1)`. Follow `scripts/check-location-contracts.js`, `scripts/check-components.js`, and `scripts/check-internal-links.js`.
- Validation scripts should print a single success summary with `console.log()` when all checks pass. Examples: `Location contract check passed for ${locations.length} locations.` in `scripts/check-location-contracts.js` and `Internal link check passed for ${pages.length} pages.` in `scripts/check-internal-links.js`.
- Browser scripts should fail soft when optional DOM elements are missing. Use early returns like `if (!ticketPanel || !ticketLocationSelect) return;` in `js/ticket-panel.js`, `if (!dialog) return;` in `js/a11y.js`, and `if (!btn) return;` in `js/roller-checkout.js`.
- Browser scripts should wrap storage access in `try/catch` because `localStorage` may be unavailable. Existing examples are in `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, and `js/locations.js`.
- Data-loading failures in `js/locations.js` should degrade gracefully: catch fetch failures, log `console.warn()`, set `TM.locations = []`, resolve `TM.ready`, and rely on fallback behavior where available.
- Throw explicit errors only for exceptional data-loading failures where the thrown message is immediately caught and converted to a soft failure, as in `js/locations.js`.

## Logging

**Framework:** console

**Patterns:**
- Use `console.error()` only in validation scripts that are meant to fail CI or local verification: `scripts/check-location-contracts.js`, `scripts/check-sitemap.js`, `scripts/check-components.js`, `scripts/check-booking-architecture.js`, `scripts/check-accessibility-baseline.js`, `scripts/check-internal-links.js`.
- Use `console.log()` for successful validation summaries only.
- Use `console.warn()` sparingly in browser runtime for degraded-but-recoverable states, as in `js/locations.js` when `data/locations.json` cannot be loaded.
- Avoid routine runtime logging in browser scripts. `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, and `js/a11y.js` do not log normal interactions.

## Comments

**When to Comment:**
- Use section header comments for shared browser modules and major CSS files: `js/ticket-panel.js`, `js/nav.js`, `css/base.css`, `css/nav.css`, `css/variables.css`.
- Comment cross-file contracts and data-source expectations. Examples: `js/locations.js` notes that `FALLBACK` mirrors `data/locations.json`, and `js/nav.js` notes where location data must stay in sync.
- Comment non-obvious browser behavior, especially event ordering and browser quirks. Examples: capture-phase handling in `js/roller-checkout.js`, URL cleanup before auto-redirect in `js/ticket-panel.js`, and deferred scroll locking in `js/nav.js`.
- Keep comments short and practical. Prefer explaining why a guard exists over restating what the next line does.

**JSDoc/TSDoc:**
- Use file-level block comments for shared browser modules that define public behavior: `js/locations.js` documents `window.TM`, `js/roller-checkout.js` documents location resolution and Roller behavior.
- Use short JSDoc-style comments for public-ish methods inside `window.TM`: `load()`, `get()`, `getOpen()`, `getByRegion()`, `select()`, `clear()`, `restore()`, `updateDOM()`, `getTodayHours()`, and `isOpenNow()` in `js/locations.js`.
- TSDoc is not applicable because TypeScript is not used.

## Function Design

**Size:** Keep validation helpers small and single-purpose. In scripts, helper functions like `walk()`, `stripQueryAndHash()`, and `requireString()` should remain short, then main validation logic should be readable top-to-bottom.

**Parameters:** Prefer passing primitive values and DOM elements directly. Examples: `normalizeLocation(value)` in `js/ticket-panel.js`, `resolveLocationForButton(btn)` in `js/roller-checkout.js`, `trapFocus(container, isOpen)` in `js/a11y.js`, and `requireString(location, field, value)` in `scripts/check-location-contracts.js`.

**Return Values:** Use simple return contracts. Predicates return booleans (`isDirectBookingUrl()`), lookups return object-or-null (`TM.get()`), DOM formatters return strings (`formatHoursTable()` and `formatAddress()`), and event handlers return early when no action is needed.

## Module Design

**Exports:** 
- Node scripts are executable CommonJS scripts and do not export functions. They run from `package.json` scripts.
- Browser modules use IIFEs to avoid leaking locals: `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `js/a11y.js`, `js/locations.js`.
- Only expose globals when other scripts/pages need them. `js/locations.js` exposes `window.TM`, and `js/ticket-panel.js` exposes `window.TMTicketPanel`.

**Barrel Files:** Not applicable. There are no import/export barrel files.

**Shared State:** Use `data/locations.json` as the primary source of truth for location metadata. `js/locations.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, and `scripts/check-location-contracts.js` depend on this contract. Avoid adding new hardcoded booking maps; `scripts/check-booking-architecture.js` enforces this for `js/ticket-panel.js` and `js/roller-checkout.js`.

**HTML/CSS Conventions:**
- Load shared tokens before shared base styles, then component/page styles: `css/variables.css`, `css/base.css`, `css/nav.css`, optional shared CSS such as `css/footer.css`, `css/newsletter.css`, `css/faq.css`, and page-local `<style>` blocks.
- Use CSS variables from `css/variables.css` for colors, typography, gradients, and glows. Prefer `var(--orange)`, `var(--dark)`, `var(--white)`, `var(--gradient-primary)`, `var(--display)`, `var(--body)`, and `var(--tech)` instead of hardcoded values in new shared CSS.
- Use hyphenated BEM-like utility/component classes rather than camelCase classes: `.ticket-panel`, `.ticket-overlay`, `.location-dropdown`, `.mobile-menu`, `.hero-title`, `.section-badge`, `.reveal`.
- Preserve accessibility attributes on interactive markup. `components/ticket-panel.html`, runtime pages with `id="ticketPanel"`, `js/a11y.js`, and `tests/smoke/site.spec.js` all depend on accessible close controls, roles, and `aria-expanded`.
- For location-aware pages, set `body[data-location]` to the canonical slug, as seen in `mount-prospect.html`, `philadelphia.html`, and `antwerp.html`.

---

*Convention analysis: 2026-04-29*
