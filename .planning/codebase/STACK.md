# Technology Stack

**Analysis Date:** 2026-04-29

## Languages

**Primary:**
- HTML5 - Static site pages at the project root such as `index.html`, `contact.html`, `groups.html`, location pages such as `philadelphia.html`, and nested pages under `groups/` and `locations/`.
- CSS3 - Shared styling in `css/variables.css`, `css/base.css`, `css/nav.css`, `css/footer.css`, `css/newsletter.css`, and `css/faq.css`, with substantial page-local `<style>` blocks in large HTML pages.
- JavaScript - Browser behavior in `js/locations.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `js/nav.js`, and `js/a11y.js`; Node-based verification scripts in `scripts/`; Playwright smoke tests in `tests/smoke/site.spec.js`.

**Secondary:**
- Bash - Component synchronization workflow in `build.sh`.
- Python 3 - Local static file server for Playwright via `python3 -m http.server 4173` in `playwright.config.js`; multiline HTML replacement helper inside `build.sh`.
- JSON - Location data in `data/locations.json`, npm metadata in `package.json` and `package-lock.json`, and snapshot data in `docs/locations-snapshot-2026-04-22.json`.
- XML - Static sitemap in `sitemap.xml`.

## Runtime

**Environment:**
- Browser runtime - The production site is static HTML/CSS/JS with no client-side framework bundle. Runtime state uses DOM APIs, `fetch`, `localStorage`, `CustomEvent`, and global browser objects exposed as `window.TM` and `window.TMTicketPanel`.
- Node.js >=18 - Required by `@playwright/test` and `playwright` according to `package-lock.json`; verification scripts use CommonJS and built-in Node modules from `node:fs` and `node:path`.
- Python 3 - Required for local smoke-test serving through `playwright.config.js` and for the replacement snippet executed by `build.sh`.
- Bash - Required to run `build.sh` on Unix-like shells.
- ffmpeg - Required only for ad video generation in `ads/capture.mjs`; documented by that script as `brew install ffmpeg`.

**Package Manager:**
- npm - Root package scripts are defined in `package.json`.
- Lockfile: present at `package-lock.json` with lockfile version 3.
- Nested npm package: `ads/package.json` is a separate module for ad capture tooling and has its own dependency declaration.

## Frameworks

**Core:**
- Not detected - The public website is hand-authored static HTML/CSS/JS. There is no React, Vue, Next.js, Astro, Vite, webpack, or server framework configured in `package.json`.

**Testing:**
- `@playwright/test` 1.59.1 - Browser smoke tests configured by `playwright.config.js` and implemented in `tests/smoke/site.spec.js`.
- `playwright` 1.59.1 - Transitive test browser automation dependency in `package-lock.json`.

**Build/Dev:**
- npm scripts - Verification entry points live in `package.json`: `check`, `test:smoke`, `test`, and `verify`.
- Node validation scripts - Static checks in `scripts/check-location-contracts.js`, `scripts/check-sitemap.js`, `scripts/check-components.js`, `scripts/check-booking-architecture.js`, `scripts/check-accessibility-baseline.js`, and `scripts/check-internal-links.js`.
- `build.sh` - Syncs `components/ticket-panel.html` into every runtime HTML page that contains the ticket panel marker.
- Python HTTP server - `playwright.config.js` starts `python3 -m http.server 4173` as the local web server for smoke tests.
- Playwright Chromium - `playwright.config.js` runs the `chromium` project using `devices['Desktop Chrome']`.
- Ad capture tooling - `ads/capture.mjs` uses Playwright Chromium and ffmpeg to capture `ads/missions-1080.html` into an MP4.

## Key Dependencies

**Critical:**
- `@playwright/test` `^1.59.1` - Provides test runner, assertions, device presets, and web server integration for `tests/smoke/site.spec.js`.
- `playwright` 1.59.1 - Installed through `@playwright/test`; also directly used by the nested ad package in `ads/package.json` at `^1.48.0`.
- `playwright-core` 1.59.1 - Transitive browser automation core in `package-lock.json`.

**Infrastructure:**
- `fsevents` 2.3.2 - Optional macOS dependency pulled by Playwright.
- No production npm dependencies - Root `package.json` contains only `devDependencies`.
- Browser-hosted Roller widget - The site injects `https://cdn.rollerdigital.com/scripts/widget/checkout_iframe.js` in `js/roller-checkout.js`, but it is not managed by npm.
- Google Fonts - Pages load Bebas Neue, DM Sans, and Orbitron from `https://fonts.googleapis.com` and `https://fonts.gstatic.com`; local Monument Extended font files are preloaded by major pages from `assets/fonts/`.

## Configuration

**Environment:**
- No `.env` files detected at the project root.
- No runtime environment variable system is used by the public site.
- Root verification and tests are configured through `package.json` and `playwright.config.js`.
- `ads/capture.mjs` accepts optional environment overrides: `FPS`, `DURATION`, `OUT`, `URL`, and `CRF`.
- `js/locations.js` expects `data/locations.json` to be served from the site root or from a path derived from `meta[name="tm-base"]`; it appends a cache-busting `v=8` query string.

**Build:**
- `build.sh` reads `components/ticket-panel.html`, discovers HTML pages with `find`, skips `assets/`, `ads/`, `components/`, `node_modules/`, and `404.html`, and replaces the ticket panel region using Python regex substitution.
- `_headers` defines production security headers, including CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- `_redirects` defines Netlify/Cloudflare Pages-style redirects for legacy URLs, renamed policy pages, location slug migration, and coming-soon city pages.
- `docs/redirect-map.md` documents equivalent Netlify and Vercel redirect formats.
- `sitemap.xml` is checked by `scripts/check-sitemap.js` against HTML files in the root and `groups/`, plus `locations/`.

## Platform Requirements

**Development:**
- Install root dev dependencies with `npm install`.
- Run all static checks with `npm run check`.
- Run smoke tests with `npm run test:smoke`; this starts `python3 -m http.server 4173` automatically.
- Run full verification with `npm run verify`.
- Run component sync with `./build.sh` after editing `components/ticket-panel.html`.
- For ad capture, run `npm install` inside `ads/`, serve the site at `http://localhost:8080`, ensure `ffmpeg` is on `PATH`, then run `node capture.mjs`.

**Production:**
- Static hosting target - The presence of `_headers` and `_redirects` points to Netlify-style or Cloudflare Pages-style static deployment. `docs/redirect-map.md` also provides a Vercel redirect translation.
- Public canonical domain - Pages and sitemap use `https://timemission.com`.
- No application server, database server, SSR process, or build artifact directory is required for the main site.
- Hosting must serve HTML, CSS, JS, JSON, XML, images, video, and fonts directly from the repository root.
- Hosting should honor `_headers` and `_redirects` or equivalent platform configuration so CSP, security headers, and SEO redirects are active.

---

*Stack analysis: 2026-04-29*
