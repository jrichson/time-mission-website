# Time Mission Website Architecture

Current architecture for `time-mission-website`.

## Overview

The site is an Astro-rendered static marketing site. Source pages live under `src/pages`, shared chrome lives in `src/layouts` and `src/components`, and public runtime behavior is plain JavaScript under `js/`. Cloudflare Pages serves the generated `dist/` output.

Repo-root `.html` page files are not part of the source of truth. `npm run build:astro` syncs static host assets into `public/`, runs Astro, minifies/bundles output assets, and injects CSP hashes.

## Main Areas

### Astro Page Surface

Primary files:

- `src/pages/**/*.astro`
- `src/layouts/SiteLayout.astro`
- `src/components/*.astro`
- `src/partials/*-main.frag.txt`

Astro owns generated HTML for marketing pages, group pages, location pages, legal pages, `404.html`, and dynamic landing modules under `src/pages/c/[slug].astro`.

Several pages still import large raw content fragments from `src/partials`. Those fragments are current source content, not deploy-output snapshots. Move them into components only when the change is backed by visual/browser coverage.

### Location Data

Primary files:

- `data/locations.json`
- `src/data/routes.json`
- `src/data/site/astro-rendered-output-files.json`

`data/locations.json` is the source of truth for location status, addresses, phone numbers, hours, booking links, gift card links, footer content, ticker messaging, and location-specific schema data.

`src/data/routes.json` and compiled route artifacts define canonical paths and redirect coverage. `astro-rendered-output-files.json` must include every registered HTML route output so legacy root HTML sources do not return to the build.

### Runtime Behavior

Primary files:

- `js/locations.js`
- `js/booking-journey.js`
- `js/booking-controller.js`
- `js/booking-provider-briq.js`
- `js/ticket-panel.js`
- `js/nav.js`
- `js/a11y.js`
- `src/lib/public-runtime-contract.ts`

`js/locations.js` owns the public `window.TM` location API and is the only writer for canonical location storage keys. It updates nav labels, footer contact content, hours, testimonials, and active location UI.

Booking behavior is split deliberately:

- `booking-journey.js` normalizes booking intent.
- `booking-controller.js` resolves destinations, mounts the ticket panel, opens Roller where configured, and delegates Briq bookings.
- `booking-provider-briq.js` owns Briq widget loading/fallback.
- `ticket-panel.js` wires the panel UI and public CTA behavior.

Keep booking changes behind the existing architecture checks and Playwright smoke tests. Booking should continue to work from generic CTAs, location CTAs, group pages, and direct location pages.

### Static Host Assets

Primary files:

- `scripts/sync-static-to-public.mjs`
- `scripts/lib/cloudflare-artifact-contract.cjs`
- `_headers.tmpl`
- `_redirects`
- `assets/`
- `css/`
- `js/`
- `data/`

`scripts/sync-static-to-public.mjs` copies host-level assets and public runtime files before Astro builds. It does not copy `.html` page sources. Demo extracts, mockup references, Finder duplicates, and archive folders are excluded by the artifact policy.

### Verification

Primary files:

- `scripts/verify-site-output.mjs`
- `scripts/lib/cloudflare-artifact-contract.cjs`
- `tests/smoke/*.spec.js`
- `playwright.config.js`

`npm run verify` is the production gate. It runs source checks, builds Astro, validates generated output, and runs Playwright smoke tests against the built app.

Use `npm run verify:sources` for fast source-only iteration. It does not replace the full launch gate because it skips generated-output and browser behavior checks.
