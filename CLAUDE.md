<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **time-mission-website** (884 symbols, 1448 relationships, 61 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/time-mission-website/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/time-mission-website/context` | Codebase overview, check index freshness |
| `gitnexus://repo/time-mission-website/clusters` | All functional areas |
| `gitnexus://repo/time-mission-website/processes` | All execution flows |
| `gitnexus://repo/time-mission-website/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Time Mission Website Astro Migration**

Time Mission Website is a static marketing and location website for Time Mission venues. The current site is hand-authored HTML/CSS/JavaScript with data-driven location behavior, booking CTAs, group/event landing pages, location pages, SEO metadata, static hosting config, and verification scripts.

This project migrates that existing verified site to an Astro-based static foundation without redesigning it. The migration should preserve the current visual experience while improving maintainability, clean URL structure, analytics instrumentation, SEO/GEO readiness, schema generation, and cutover safety.

**Core Value:** The migrated site must preserve the existing customer-facing experience and conversion paths while making the site easier to maintain, measure, optimize, and scale.

### Constraints

- **Visual parity:** The current static site is the design contract; Astro migration work should not introduce a redesign.
- **Static output:** Astro should produce static output suitable for Cloudflare Pages-style hosting.
- **URL migration:** Extensionless no-trailing-slash URLs are canonical; `.html` URLs must redirect without loops.
- **Analytics:** GTM-first browser tracking, Consent Mode v2 readiness, and server-side event compatibility must be considered from the start.
- **Privacy:** No PII should be sent to GTM or server-side analytics endpoints.
- **ROLLER dependency:** Completed purchase event visibility depends on ROLLER progressive checkout settings, plan/access level, and cross-domain configuration.
- **SEO:** Search metadata, sitemap entries, canonicals, internal links, structured data, and AI crawler policy must remain coherent during migration.
- **Data governance:** Durable business facts should be represented in validated data modules.
- **Verification:** `npm run verify` or its Astro equivalent must remain the cutover gate.
- **Dirty worktree:** The repository currently contains many unrelated modified and untracked files. Migration commits must be scoped carefully and avoid reverting unrelated work.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- HTML5 - Static site pages at the project root such as `index.html`, `contact.html`, `groups.html`, location pages such as `philadelphia.html`, and nested pages under `groups/` and `locations/`.
- CSS3 - Shared styling in `css/variables.css`, `css/base.css`, `css/nav.css`, `css/footer.css`, `css/newsletter.css`, and `css/faq.css`, with substantial page-local `<style>` blocks in large HTML pages.
- JavaScript - Browser behavior in `js/locations.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `js/nav.js`, and `js/a11y.js`; Node-based verification scripts in `scripts/`; Playwright smoke tests in `tests/smoke/site.spec.js`.
- Bash - Component synchronization workflow in `build.sh`.
- Python 3 - Local static file server for Playwright via `python3 -m http.server 4173` in `playwright.config.js`; multiline HTML replacement helper inside `build.sh`.
- JSON - Location data in `data/locations.json`, npm metadata in `package.json` and `package-lock.json`, and snapshot data in `docs/locations-snapshot-2026-04-22.json`.
- XML - Static sitemap in `sitemap.xml`.
## Runtime
- Browser runtime - The production site is static HTML/CSS/JS with no client-side framework bundle. Runtime state uses DOM APIs, `fetch`, `localStorage`, `CustomEvent`, and global browser objects exposed as `window.TM` and `window.TMTicketPanel`.
- Node.js >=18 - Required by `@playwright/test` and `playwright` according to `package-lock.json`; verification scripts use CommonJS and built-in Node modules from `node:fs` and `node:path`.
- Python 3 - Required for local smoke-test serving through `playwright.config.js` and for the replacement snippet executed by `build.sh`.
- Bash - Required to run `build.sh` on Unix-like shells.
- ffmpeg - Required only for ad video generation in `ads/capture.mjs`; documented by that script as `brew install ffmpeg`.
- npm - Root package scripts are defined in `package.json`.
- Lockfile: present at `package-lock.json` with lockfile version 3.
- Nested npm package: `ads/package.json` is a separate module for ad capture tooling and has its own dependency declaration.
## Frameworks
- Not detected - The public website is hand-authored static HTML/CSS/JS. There is no React, Vue, Next.js, Astro, Vite, webpack, or server framework configured in `package.json`.
- `@playwright/test` 1.59.1 - Browser smoke tests configured by `playwright.config.js` and implemented in `tests/smoke/site.spec.js`.
- `playwright` 1.59.1 - Transitive test browser automation dependency in `package-lock.json`.
- npm scripts - Verification entry points live in `package.json`: `check`, `test:smoke`, `test`, and `verify`.
- Node validation scripts - Static checks in `scripts/check-location-contracts.js`, `scripts/check-sitemap.js`, `scripts/check-components.js`, `scripts/check-booking-architecture.js`, `scripts/check-accessibility-baseline.js`, and `scripts/check-internal-links.js`.
- `build.sh` - Syncs `components/ticket-panel.html` into every runtime HTML page that contains the ticket panel marker.
- Python HTTP server - `playwright.config.js` starts `python3 -m http.server 4173` as the local web server for smoke tests.
- Playwright Chromium - `playwright.config.js` runs the `chromium` project using `devices['Desktop Chrome']`.
- Ad capture tooling - `ads/capture.mjs` uses Playwright Chromium and ffmpeg to capture `ads/missions-1080.html` into an MP4.
## Key Dependencies
- `@playwright/test` `^1.59.1` - Provides test runner, assertions, device presets, and web server integration for `tests/smoke/site.spec.js`.
- `playwright` 1.59.1 - Installed through `@playwright/test`; also directly used by the nested ad package in `ads/package.json` at `^1.48.0`.
- `playwright-core` 1.59.1 - Transitive browser automation core in `package-lock.json`.
- `fsevents` 2.3.2 - Optional macOS dependency pulled by Playwright.
- No production npm dependencies - Root `package.json` contains only `devDependencies`.
- Browser-hosted Roller widget - The site injects `https://cdn.rollerdigital.com/scripts/widget/checkout_iframe.js` in `js/roller-checkout.js`, but it is not managed by npm.
- Google Fonts - Pages load Bebas Neue, DM Sans, and Orbitron from `https://fonts.googleapis.com` and `https://fonts.gstatic.com`; local Monument Extended font files are preloaded by major pages from `assets/fonts/`.
## Configuration
- No `.env` files detected at the project root.
- No runtime environment variable system is used by the public site.
- Root verification and tests are configured through `package.json` and `playwright.config.js`.
- `ads/capture.mjs` accepts optional environment overrides: `FPS`, `DURATION`, `OUT`, `URL`, and `CRF`.
- `js/locations.js` expects `data/locations.json` to be served from the site root or from a path derived from `meta[name="tm-base"]`; it appends a cache-busting `v=8` query string.
- `build.sh` reads `components/ticket-panel.html`, discovers HTML pages with `find`, skips `assets/`, `ads/`, `components/`, `node_modules/`, and `404.html`, and replaces the ticket panel region using Python regex substitution.
- `_headers` defines production security headers, including CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- `_redirects` defines Netlify/Cloudflare Pages-style redirects for legacy URLs, renamed policy pages, location slug migration, and coming-soon city pages.
- `docs/redirect-map.md` documents equivalent Netlify and Vercel redirect formats.
- `sitemap.xml` is checked by `scripts/check-sitemap.js` against HTML files in the root and `groups/`, plus `locations/`.
## Platform Requirements
- Install root dev dependencies with `npm install`.
- Run all static checks with `npm run check`.
- Run smoke tests with `npm run test:smoke`; this starts `python3 -m http.server 4173` automatically.
- Run full verification with `npm run verify`.
- Run component sync with `./build.sh` after editing `components/ticket-panel.html`.
- For ad capture, run `npm install` inside `ads/`, serve the site at `http://localhost:8080`, ensure `ffmpeg` is on `PATH`, then run `node capture.mjs`.
- Static hosting target - The presence of `_headers` and `_redirects` points to Netlify-style or Cloudflare Pages-style static deployment. `docs/redirect-map.md` also provides a Vercel redirect translation.
- Public canonical domain - Pages and sitemap use `https://timemission.com`.
- No application server, database server, SSR process, or build artifact directory is required for the main site.
- Hosting must serve HTML, CSS, JS, JSON, XML, images, video, and fonts directly from the repository root.
- Hosting should honor `_headers` and `_redirects` or equivalent platform configuration so CSP, security headers, and SEO redirects are active.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Use lowercase kebab-case for static pages and assets that are part of the public URL surface: `mount-prospect.html`, `orland-park.html`, `contact-thank-you.html`, `css/ticket-panel.css`, `scripts/check-internal-links.js`.
- Use descriptive script names with the `check-*.js` prefix for repository validation scripts: `scripts/check-location-contracts.js`, `scripts/check-sitemap.js`, `scripts/check-components.js`, `scripts/check-booking-architecture.js`, `scripts/check-accessibility-baseline.js`, `scripts/check-internal-links.js`.
- Use shared browser modules under `js/` with feature-oriented names: `js/nav.js`, `js/locations.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `js/a11y.js`.
- Use shared CSS modules under `css/` by responsibility: `css/variables.css` for tokens, `css/base.css` for reset/shared primitives, `css/nav.css` for navigation, `css/footer.css` for footer, `css/newsletter.css` for newsletter, `css/faq.css` for FAQ UI, `css/ticket-panel.css` for the ticket panel.
- Use HTML component fragments only for copyable/shared markup snapshots: `components/ticket-panel.html`. Runtime pages currently inline the shared ticket panel markup and validation enforces marker consistency through `scripts/check-components.js`.
- Use camelCase for JavaScript functions in both Node scripts and browser scripts: `walk()`, `stripQueryAndHash()`, `requireString()`, `normalizeLocation()`, `syncLocationOptions()`, `openTicketPanel()`, `closeTicketPanel()`, `resolveLocationForButton()`, `ensureSkipLink()`, `trapFocus()`.
- Use verb-first names for functions that cause side effects: `syncBookingBtn()`, `scheduleAutoRedirect()`, `openLocationOverlay()`, `closeLocationOverlay()`, `showLocationInfo()`, `updateDOM()`, `updateFooterLocation()`.
- Use predicate-style names for booleans and checks: `isDirectBookingUrl()`, `isIndexPage()`, `hasBooking`, `hasVisible`, `hasLocationData`.
- Methods exposed on `window.TM` in `js/locations.js` use concise action names: `load()`, `get()`, `getOpen()`, `getByRegion()`, `select()`, `clear()`, `restore()`, `updateDOM()`.
- Use camelCase for local variables in JavaScript: `root`, `errors`, `dataPath`, `runtimePages`, `ticketPanel`, `ticketLocationSelect`, `pageLocation`, `bookingButtons`.
- Use uppercase snake case for constants whose values are intended as module-level invariants: `STORAGE_KEY`, `FALLBACK` in `js/locations.js`.
- Use lowercase object property names matching the data contract in `data/locations.json`: `id`, `slug`, `name`, `shortName`, `venueName`, `region`, `status`, `address`, `contact`, `hours`, `bookingUrl`, `rollerCheckoutUrl`, `giftCardUrl`, `navLabel`, `mapUrl`, `ticker`.
- Use hyphenated slugs for locations and URL-derived values: `mount-prospect`, `west-nyack`, `orland-park`. Validation in `scripts/check-location-contracts.js` requires `id` and `slug` to match.
- Use `errors` arrays in validation scripts, accumulate all failures, then print them together before exiting. This pattern appears in `scripts/check-location-contracts.js`, `scripts/check-components.js`, `scripts/check-internal-links.js`, `scripts/check-booking-architecture.js`, `scripts/check-accessibility-baseline.js`, and `scripts/check-sitemap.js`.
- TypeScript is not used. There are no `.ts` or `.tsx` source files and no `tsconfig.json`.
- Use data-shape validation in Node scripts instead of TypeScript interfaces. The location schema is enforced in `scripts/check-location-contracts.js` against `data/locations.json`.
- In browser code, use object shape checks and DOM existence checks before use: `window.TM && typeof window.TM.get === 'function'` in `js/ticket-panel.js`, `loc && loc.rollerCheckoutUrl` in `js/roller-checkout.js`, and `if (!dialog) return` in `js/a11y.js`.
## Code Style
- No formatter config is detected. There is no `.prettierrc`, `eslint.config.*`, `.eslintrc*`, or `biome.json`.
- Use 2-space indentation in CommonJS Node scripts and Playwright tests: `scripts/check-components.js`, `scripts/check-internal-links.js`, `scripts/check-location-contracts.js`, `tests/smoke/site.spec.js`, `playwright.config.js`.
- Use 4-space indentation in browser IIFE files and CSS: `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `js/a11y.js`, `css/base.css`, `css/nav.css`, `css/variables.css`.
- Use semicolons consistently in JavaScript.
- Use single quotes in JavaScript strings unless the string contains single quotes or is inline HTML/JSON requiring double quotes. Examples: `require('node:fs')` in `scripts/check-components.js`, `document.querySelector('.skip-link')` in `js/a11y.js`.
- Use trailing commas sparingly. Object literals in `playwright.config.js` include trailing commas; most runtime browser object literals do not.
- Use line breaks for multi-condition filters and long selectors. Examples: the `runtimePages` filter in `scripts/check-components.js`, the `pages` filter in `scripts/check-internal-links.js`, and the `querySelectorAll()` selector list in `js/ticket-panel.js`.
- No linting framework is configured. `package.json` has validation scripts but no `lint` script.
- Treat repository checks as the quality gate. `npm run check` runs location contract, sitemap, component drift, booking architecture, accessibility baseline, and internal-link checks from `package.json`.
- Add new structural rules as small Node scripts in `scripts/check-*.js` and wire them into the `check` script in `package.json`.
## Import Organization
- No JavaScript path aliases are configured.
- Use Node built-in path resolution in scripts: `path.resolve(__dirname, '..')`, `path.join(root, 'data', 'locations.json')`.
- In HTML, use relative public paths with explicit `../` prefixes for subdirectories. Root pages load `css/variables.css`, `js/nav.js`, and `js/locations.js`; group pages load `../css/variables.css`, `../js/nav.js`, and `../js/locations.js`.
## Error Handling
- Validation scripts should collect every issue into `errors`, print a header with `console.error()`, print each issue as `- ${error}`, and exit with `process.exit(1)`. Follow `scripts/check-location-contracts.js`, `scripts/check-components.js`, and `scripts/check-internal-links.js`.
- Validation scripts should print a single success summary with `console.log()` when all checks pass. Examples: `Location contract check passed for ${locations.length} locations.` in `scripts/check-location-contracts.js` and `Internal link check passed for ${pages.length} pages.` in `scripts/check-internal-links.js`.
- Browser scripts should fail soft when optional DOM elements are missing. Use early returns like `if (!ticketPanel || !ticketLocationSelect) return;` in `js/ticket-panel.js`, `if (!dialog) return;` in `js/a11y.js`, and `if (!btn) return;` in `js/roller-checkout.js`.
- Browser scripts should wrap storage access in `try/catch` because `localStorage` may be unavailable. Existing examples are in `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, and `js/locations.js`.
- Data-loading failures in `js/locations.js` should degrade gracefully: catch fetch failures, log `console.warn()`, set `TM.locations = []`, resolve `TM.ready`, and rely on fallback behavior where available.
- Throw explicit errors only for exceptional data-loading failures where the thrown message is immediately caught and converted to a soft failure, as in `js/locations.js`.
## Logging
- Use `console.error()` only in validation scripts that are meant to fail CI or local verification: `scripts/check-location-contracts.js`, `scripts/check-sitemap.js`, `scripts/check-components.js`, `scripts/check-booking-architecture.js`, `scripts/check-accessibility-baseline.js`, `scripts/check-internal-links.js`.
- Use `console.log()` for successful validation summaries only.
- Use `console.warn()` sparingly in browser runtime for degraded-but-recoverable states, as in `js/locations.js` when `data/locations.json` cannot be loaded.
- Avoid routine runtime logging in browser scripts. `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, and `js/a11y.js` do not log normal interactions.
## Comments
- Use section header comments for shared browser modules and major CSS files: `js/ticket-panel.js`, `js/nav.js`, `css/base.css`, `css/nav.css`, `css/variables.css`.
- Comment cross-file contracts and data-source expectations. Examples: `js/locations.js` notes that `FALLBACK` mirrors `data/locations.json`, and `js/nav.js` notes where location data must stay in sync.
- Comment non-obvious browser behavior, especially event ordering and browser quirks. Examples: capture-phase handling in `js/roller-checkout.js`, URL cleanup before auto-redirect in `js/ticket-panel.js`, and deferred scroll locking in `js/nav.js`.
- Keep comments short and practical. Prefer explaining why a guard exists over restating what the next line does.
- Use file-level block comments for shared browser modules that define public behavior: `js/locations.js` documents `window.TM`, `js/roller-checkout.js` documents location resolution and Roller behavior.
- Use short JSDoc-style comments for public-ish methods inside `window.TM`: `load()`, `get()`, `getOpen()`, `getByRegion()`, `select()`, `clear()`, `restore()`, `updateDOM()`, `getTodayHours()`, and `isOpenNow()` in `js/locations.js`.
- TSDoc is not applicable because TypeScript is not used.
## Function Design
## Module Design
- Node scripts are executable CommonJS scripts and do not export functions. They run from `package.json` scripts.
- Browser modules use IIFEs to avoid leaking locals: `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `js/a11y.js`, `js/locations.js`.
- Only expose globals when other scripts/pages need them. `js/locations.js` exposes `window.TM`, and `js/ticket-panel.js` exposes `window.TMTicketPanel`.
- Load shared tokens before shared base styles, then component/page styles: `css/variables.css`, `css/base.css`, `css/nav.css`, optional shared CSS such as `css/footer.css`, `css/newsletter.css`, `css/faq.css`, and page-local `<style>` blocks.
- Use CSS variables from `css/variables.css` for colors, typography, gradients, and glows. Prefer `var(--orange)`, `var(--dark)`, `var(--white)`, `var(--gradient-primary)`, `var(--display)`, `var(--body)`, and `var(--tech)` instead of hardcoded values in new shared CSS.
- Use hyphenated BEM-like utility/component classes rather than camelCase classes: `.ticket-panel`, `.ticket-overlay`, `.location-dropdown`, `.mobile-menu`, `.hero-title`, `.section-badge`, `.reveal`.
- Preserve accessibility attributes on interactive markup. `components/ticket-panel.html`, runtime pages with `id="ticketPanel"`, `js/a11y.js`, and `tests/smoke/site.spec.js` all depend on accessible close controls, roles, and `aria-expanded`.
- For location-aware pages, set `body[data-location]` to the canonical slug, as seen in `mount-prospect.html`, `philadelphia.html`, and `antwerp.html`.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- HTML files at the repository root are the deployable pages; there is no application router or server-rendering layer.
- Shared browser behavior is centralized in `js/`, while most page presentation remains inline in each `.html` page with shared foundation CSS from `css/`.
- Location, booking, gift-card, and Roller checkout data is centralized in `data/locations.json` and exposed at runtime through `window.TM` in `js/locations.js`.
- The ticket panel HTML is maintained as a partial in `components/ticket-panel.html` and copied into runtime pages by `build.sh`.
- Architecture checks in `scripts/` protect central contracts that are otherwise easy to drift in a static HTML site.
## Layers
- Purpose: Define page content, SEO metadata, schema markup, nav/footer markup, page-local sections, and page-local styles.
- Location: `*.html`, `groups/*.html`, `locations/index.html`
- Contains: Marketing pages, location landing pages, group/event pages, legal pages, contact pages, error page.
- Depends on: Shared CSS in `css/`, shared scripts in `js/`, assets in `assets/`, location data in `data/locations.json`.
- Used by: Static host and Playwright smoke tests in `tests/smoke/site.spec.js`.
- Use this layer for new public pages. Place root-level pages at `new-page.html`; place event-type group pages under `groups/new-event.html`; place index-style directories like locations under `locations/index.html`.
- Purpose: Provide brand tokens, baseline typography, global reset, shared page-header utilities, nav/ticker/mobile-menu styles, footer styles, FAQ styles, newsletter styles, and ticket-panel styles.
- Location: `css/`
- Contains: `css/variables.css`, `css/base.css`, `css/nav.css`, `css/footer.css`, `css/faq.css`, `css/newsletter.css`, `css/ticket-panel.css`.
- Depends on: Font assets in `assets/fonts/`, CSS variables from `css/variables.css`, images and icons in `assets/`.
- Used by: Most runtime pages through `<link rel="stylesheet">` tags.
- Use `css/variables.css` for design tokens, `css/base.css` for global primitives, and page-local `<style>` blocks for page-specific sections unless the style is shared across multiple pages.
- Purpose: Hydrate static pages with interactive behavior after the HTML loads.
- Location: `js/`
- Contains: `js/locations.js`, `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `js/a11y.js`.
- Depends on: Browser DOM APIs, `localStorage`, `fetch`, `data/locations.json`, and the Roller checkout CDN injected by `js/roller-checkout.js`.
- Used by: Runtime pages that include the shared script tags near the end of the body.
- Keep new cross-page behavior in `js/` as standalone IIFEs. Avoid introducing module syntax unless the whole static deployment approach changes.
- Purpose: Single source of truth for location identity, status, addresses, contact info, hours, booking URLs, gift-card URLs, Roller checkout URLs, map URLs, nav labels, ticker copy, and location page slugs.
- Location: `data/locations.json`
- Contains: A top-level `locations` array keyed by `id`/`slug`.
- Depends on: None at runtime; consumed with `fetch` from `js/locations.js`.
- Used by: `js/locations.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, checks in `scripts/check-location-contracts.js` and `scripts/check-booking-architecture.js`.
- Add and update location data here first. Do not add independent booking URL maps in scripts or pages.
- Purpose: Maintain shared HTML snippets that are manually synced into deployable static pages.
- Location: `components/`
- Contains: `components/ticket-panel.html`.
- Depends on: Sync logic in `build.sh`.
- Used by: Runtime pages that contain the `<!-- Ticket Popup Panel -->` marker and `#ticketPanel`.
- Edit `components/ticket-panel.html` for structural ticket panel changes, then run `./build.sh` to sync pages.
- Purpose: Enforce static-site contracts and run browser smoke tests.
- Location: `scripts/`, `tests/smoke/`, `playwright.config.js`, `package.json`
- Contains: Node checks for locations, sitemap, component drift, booking architecture, accessibility baseline, internal links, and Playwright smoke tests.
- Depends on: Node CommonJS, `@playwright/test`, filesystem reads of project files.
- Used by: `npm run verify` in `package.json`.
- Add a check under `scripts/` when a static-site rule must hold across many HTML files.
- Purpose: Configure headers and routing for static deployment.
- Location: `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `.nojekyll`
- Contains: Security/cache header rules, redirect rules, crawler instructions, XML sitemap entries, and static host compatibility marker.
- Depends on: Hosting platform support for Netlify/Cloudflare Pages style files.
- Used by: Production deployment and verification scripts such as `scripts/check-sitemap.js`.
## Data Flow
- `localStorage['tm_location']` is the canonical persisted selected location slug.
- `localStorage['timeMissionLocation']` is a legacy display-name key still read and healed by `js/locations.js` and written by `js/nav.js`.
- `window.TM.current` holds the in-memory selected location object.
- DOM state uses classes such as `.open`, `.active`, `.scrolled`, `.menu-open`, and `.location-open`.
- Location pages use `body[data-location]` to identify page-specific booking behavior.
## Key Abstractions
- Purpose: Provide a global runtime API for location data, selected location state, DOM updates, and helper queries.
- Examples: `js/locations.js`, `data/locations.json`
- Pattern: Single global namespace exposed from an IIFE with methods `load`, `get`, `getOpen`, `getByRegion`, `select`, `clear`, `restore`, `updateDOM`, and a `ready` promise.
- Use this API for any behavior that needs location data. Wait for `window.TM.ready` when markup must be hydrated from `data/locations.json`.
- Purpose: Represent all page, nav, booking, gift-card, map, and operational data for a venue.
- Examples: `data/locations.json`, `scripts/check-location-contracts.js`
- Pattern: JSON objects with required `id`, `slug`, `name`, `shortName`, `status`, `navLabel`, and optional checkout fields such as `bookingUrl`, `rollerCheckoutUrl`, and `giftCardUrl`.
- Keep `id` and `slug` identical because `scripts/check-location-contracts.js` enforces that invariant.
- Purpose: Keep similar pages consistent without a templating engine.
- Examples: root location pages such as `philadelphia.html`, `lincoln.html`, `manassas.html`; group event pages such as `groups/birthdays.html`, `groups/corporate.html`, `groups/field-trips.html`.
- Pattern: Copy-based static templates with repeated nav, footer, ticket panel, inline section styles, JSON-LD, and shared script includes.
- When adding a similar page, start from the closest existing page and preserve shared markers, script order, schema patterns, and data attributes.
- Purpose: Shared booking panel markup used across runtime pages.
- Examples: `components/ticket-panel.html`, copied markup in `index.html`, `groups/corporate.html`, `locations/index.html`
- Pattern: Source partial plus shell sync plus component drift check.
- Keep IDs stable: `#ticketOverlay`, `#ticketPanel`, `#ticketClose`, `#ticketLocation`, and `#ticketBookBtn` are consumed by `js/ticket-panel.js` and `js/a11y.js`.
- Purpose: Add progressive interactivity without replacing static HTML.
- Examples: `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `js/a11y.js`
- Pattern: Browser IIFEs that query existing DOM, guard missing elements, and attach listeners only when the expected markup exists.
- New scripts should follow the same missing-element tolerant pattern because not every page contains every widget.
- Purpose: Convert static-site conventions into executable checks.
- Examples: `scripts/check-location-contracts.js`, `scripts/check-components.js`, `scripts/check-booking-architecture.js`, `scripts/check-internal-links.js`, `scripts/check-sitemap.js`, `scripts/check-accessibility-baseline.js`
- Pattern: Node CommonJS scripts that read files from disk, collect errors, print actionable messages, and exit non-zero on failure.
- Add checks when a rule spans many files or prevents drift between copied markup and shared scripts.
## Entry Points
- Location: `index.html`
- Triggers: Browser request for `/` or `/index.html`.
- Responsibilities: Main brand/mission landing page, hero video, core navigation, booking panel entry, location selection, testimonials, FAQs, and conversion CTAs.
- Location: `about.html`, `missions.html`, `groups.html`, `gift-cards.html`, `faq.html`, `contact.html`, `licensing.html`, legal pages such as `privacy.html` and `terms.html`
- Triggers: Static page navigation and sitemap entries.
- Responsibilities: Top-level marketing, informational, legal, and lead-capture flows.
- Location: `philadelphia.html`, `mount-prospect.html`, `west-nyack.html`, `lincoln.html`, `manassas.html`, `antwerp.html`, `houston.html`, `orland-park.html`, `brussels.html`, `dallas.html`
- Triggers: Direct static URLs, location picker links, and booking handoff URLs like `{slug}.html?book=1`.
- Responsibilities: Location-specific SEO metadata, schema markup, selected-location context through `body[data-location]`, local details, map/contact links, booking CTAs, and coming-soon signup CTAs.
- Location: `locations/index.html`
- Triggers: Browser request for `/locations/`.
- Responsibilities: List open and coming-soon locations with links into root location pages and shared booking behavior.
- Location: `groups/birthdays.html`, `groups/corporate.html`, `groups/field-trips.html`, `groups/private-events.html`, `groups/bachelor-ette.html`, `groups/holidays.html`
- Triggers: Navigation from `groups.html`, sitemap entries, direct SEO landing URLs.
- Responsibilities: Event-type landing pages with shared event page layout conventions, FAQ content, quote/booking CTAs, nav/footer, and shared ticket panel behavior.
- Location: `js/locations.js`, `js/nav.js`, `js/roller-checkout.js`, `js/ticket-panel.js`, `js/a11y.js`
- Triggers: Script tags in runtime HTML pages.
- Responsibilities: Location data loading, selection persistence, nav interaction, booking routing, Roller overlay integration, and accessibility enhancements.
- Location: `build.sh`
- Triggers: Manual run after editing `components/ticket-panel.html`; optional targeted run with a page path.
- Responsibilities: Copy ticket panel partial markup into runtime pages with the panel marker.
- Location: `package.json`, `playwright.config.js`, `scripts/`, `tests/smoke/site.spec.js`
- Triggers: `npm run check`, `npm run test:smoke`, or `npm run verify`.
- Responsibilities: Validate cross-file contracts and smoke-test critical browser flows.
## Error Handling
- Validation scripts such as `scripts/check-location-contracts.js` collect all detected errors, print them, and call `process.exit(1)`.
- `js/locations.js` catches `fetch` failures for `data/locations.json`, logs a warning, resolves `window.TM.ready`, and keeps fallback behavior available for persisted locations.
- DOM enhancement scripts check for expected elements before attaching listeners, for example `js/ticket-panel.js` returns when `#ticketPanel` or `#ticketLocation` is absent.
- Browser storage access is wrapped in `try/catch` in `js/nav.js`, `js/ticket-panel.js`, and `js/locations.js` so private browsing or blocked storage does not break page rendering.
- Booking behavior falls back from Roller overlay to ticket-panel or direct-link navigation depending on available location data and URL schemes.
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
