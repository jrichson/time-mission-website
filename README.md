# Time Mission Website

Static marketing site for Time Mission. Astro renders the HTML, then Cloudflare Pages serves the static output with vanilla JS runtime behavior and automated checks around booking, location state, SEO, schema, and accessibility.

## Quick Start

```bash
npm install
npm run verify
```

For local browsing:

```bash
npm run build:astro
npm run preview:test
```

Then open `http://127.0.0.1:4173`.

## Verification

**Launch gate:** `npm run verify` builds Astro (`npm run build:astro`), runs the full static check suite (`npm run check`), validates **built** output (routes, dist manifest, SEO/schema/sitemap/robots/llms/NAP parity, ticket-panel parity), then runs Playwright smoke tests. See [docs/verification-pipeline.md](docs/verification-pipeline.md) for the ordered steps and **VER-01 / VER-02** mapping.

Quick **source-only** iteration (no build, no dist validators):

```bash
npm run verify:sources
```

Run smoke tests alone (expects you to have built and to match your Playwright `webServer` config):

```bash
npm run test:smoke
```

## Production Notes

- `data/locations.json` is the source of truth for location state, booking URLs, gift card URLs, and Roller checkout URLs.
- Page HTML is generated from `src/pages`, `src/layouts/SiteLayout.astro`, and shared components. Do not add repo-root `.html` page sources back to the build path.
- `js/booking-journey.js`, `js/booking-controller.js`, `js/booking-provider-briq.js`, and `js/ticket-panel.js` consume location data through `window.TM`; do not reintroduce separate URL maps.
- Future internal API work should start from [HANDOFF.md](HANDOFF.md), [docs/tm-public-api.md](docs/tm-public-api.md), and [docs/analytics-event-contract.md](docs/analytics-event-contract.md). Replace data adapters at the documented seams rather than bypassing the Location Catalog, Booking Journey, or `window.TM` browser contract.
- `_headers` contains Cloudflare Pages security headers and is generated from `_headers.tmpl` during `npm run build:astro`.
- `_redirects` is written for Netlify/Cloudflare Pages style routing.
- Contact and newsletter forms are handled by Cloudflare Pages Functions in `functions/api/`. Wrangler Direct Upload must be run from the repo root so the sibling `functions/` directory is uploaded with `dist/`.
- Required Pages Function secrets: `FORM_EMAIL_API_KEY`, `FORM_FROM_EMAIL`, `CONTACT_TO_EMAIL`, `NEWSLETTER_TO_EMAIL`, `TURNSTILE_SECRET_KEY`. Required public build var: `PUBLIC_TURNSTILE_SITE_KEY`. Required form archive binding: Cloudflare D1 database bound as `FORM_SUBMISSIONS_DB` with migrations in `migrations/`. Recommended abuse-control binding: Cloudflare KV namespace bound as `FORM_RATE_LIMIT_KV`; optional limit overrides are `FORM_RATE_LIMIT_IP_10M`, `FORM_RATE_LIMIT_IP_HOUR`, and `FORM_RATE_LIMIT_EMAIL_HOUR`.

## Remaining Modernization Risks

- The existing GitHub Actions workflow is a manual CMS deploy path. Add a separate CI quality gate that runs `npm ci`, installs Chromium, and executes `npm run verify`.
- Image and video optimization still need a dedicated Core Web Vitals pass.
- Most CSS is still page-local; extract shared styles only behind visual regression or expanded Playwright coverage.
- Internal API integration should preserve the existing adapter seams: generate or fetch Location Catalog data into the current `LocationRecord` shape, keep `js/locations.js` as the sole browser location writer, and keep booking decisions in `js/booking-journey.js`.
