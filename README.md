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
- Contact and newsletter forms are handled by Cloudflare Pages Functions in `functions/api/`. Production uploads must use `npm run deploy:pages:us` or `npm run deploy:pages:eu`; pre-approval EU testing uses `npm run deploy:pages:eu:preview`. The deployment wrapper verifies and stages `dist/`, `functions/`, migrations, and the root Wrangler configuration together before Direct Upload.
- Required Pages Function secrets: `FORM_EMAIL_API_KEY`, `FORM_FROM_EMAIL`, `CONTACT_TO_EMAIL`, `NEWSLETTER_TO_EMAIL`, `TURNSTILE_SECRET_KEY`. `FORM_FROM_EMAIL` can use the verified Resend sender, for example `Time Mission <info@converge-notifications.com>`. Contact submissions can route by the selected contact-form location with optional `CONTACT_TO_EMAIL_<LOCATION>` secrets, where `<LOCATION>` is the uppercase selector value with hyphens converted to underscores, such as `CONTACT_TO_EMAIL_MOUNT_PROSPECT`, `CONTACT_TO_EMAIL_ORLAND_PARK`, `CONTACT_TO_EMAIL_BOSTON`, `CONTACT_TO_EMAIL_WEST_NYACK`, `CONTACT_TO_EMAIL_PHILADELPHIA`, `CONTACT_TO_EMAIL_LINCOLN`, `CONTACT_TO_EMAIL_NASHVILLE`, `CONTACT_TO_EMAIL_DALLAS`, `CONTACT_TO_EMAIL_HOUSTON`, `CONTACT_TO_EMAIL_MANASSAS`, `CONTACT_TO_EMAIL_ANTWERP`, `CONTACT_TO_EMAIL_BRUSSELS`, or `CONTACT_TO_EMAIL_GENERAL`; unset locations fall back to `CONTACT_TO_EMAIL`. Group Events, Birthday Parties, and Corporate Events submissions for Manassas, Mount Prospect, and Orland Park override the location recipient with `Groups@TM-Ops.com`. Required public build var: `PUBLIC_TURNSTILE_SITE_KEY`. Required form archive binding: Cloudflare D1 database bound as `FORM_SUBMISSIONS_DB` with migrations in `migrations/`. Recommended abuse-control binding: Cloudflare KV namespace bound as `FORM_RATE_LIMIT_KV`; optional limit overrides are `FORM_RATE_LIMIT_IP_10M`, `FORM_RATE_LIMIT_IP_HOUR`, and `FORM_RATE_LIMIT_EMAIL_HOUR`.

The `.com` and `.eu` deployments share this codebase and are selected with
`npm run build:us` or `npm run build:eu`. See
[`docs/eu-cloudflare-deployment.md`](docs/eu-cloudflare-deployment.md) for the separate
EU Pages project, EU D1, language, consent, DNS, deployment, and rollback runbook.

## Remaining Modernization Risks

- The existing GitHub Actions workflow is a manual CMS deploy path. Add a separate CI quality gate that runs `npm ci`, installs Chromium, and executes `npm run verify`.
- Image and video optimization still need a dedicated Core Web Vitals pass.
- Most CSS is still page-local; extract shared styles only behind visual regression or expanded Playwright coverage.
- Internal API integration should preserve the existing adapter seams: generate or fetch Location Catalog data into the current `LocationRecord` shape, keep `js/locations.js` as the sole browser location writer, and keep booking decisions in `js/booking-journey.js`.
