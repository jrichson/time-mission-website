# Time Mission Website

Static marketing site for Time Mission. The production path is intentionally lightweight: HTML/CSS/vanilla JS served from a static host, with automated checks around the fragile parts of the site.

## Quick Start

```bash
npm install
npm run verify
```

For local browsing:

```bash
python3 -m http.server 4173
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
- `js/ticket-panel.js` and `js/roller-checkout.js` consume location data through `window.TM`; do not reintroduce separate URL maps.
- `components/ticket-panel.html` is synced into pages by `./build.sh`.
- `_headers` contains Cloudflare Pages security headers and is generated from `_headers.tmpl` during `npm run build:astro`.
- `_redirects` is written for Netlify/Cloudflare Pages style routing.
- Contact and newsletter forms are handled by Cloudflare Pages Functions in `functions/api/`. Wrangler Direct Upload must be run from the repo root so the sibling `functions/` directory is uploaded with `dist/`.
- Required Pages Function secrets: `FORM_EMAIL_API_KEY`, `FORM_FROM_EMAIL`, `CONTACT_TO_EMAIL`, `NEWSLETTER_TO_EMAIL`, `TURNSTILE_SECRET_KEY`. Required public build var: `PUBLIC_TURNSTILE_SITE_KEY`.

## Remaining Modernization Risks

- A GitHub Actions workflow was not added because the local environment blocked workflow-file edits; CI should run `npm ci`, install Chromium, then `npm run verify`.
- Image and video optimization still need a dedicated Core Web Vitals pass.
- Most CSS is still page-local; extract shared styles only behind visual regression or expanded Playwright coverage.
- A future CMS/static-generation phase should build on `data/locations.json` rather than replacing it ad hoc.
