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

`npm run verify` runs:

- Location data contract checks for `data/locations.json`.
- Sitemap coverage checks for runtime pages.
- Ticket panel component drift checks.
- Booking architecture checks to keep booking URLs centralized in location data.
- Accessibility baseline checks for shared skip-link/dialog enhancements.
- Internal link checks for local pages and assets.
- Playwright smoke tests for booking, location selection, FAQ controls, and contact form setup.

Run targeted checks with:

```bash
npm run check
npm run test:smoke
```

## Production Notes

- `data/locations.json` is the source of truth for location state, booking URLs, gift card URLs, and Roller checkout URLs.
- `js/ticket-panel.js` and `js/roller-checkout.js` consume location data through `window.TM`; do not reintroduce separate URL maps.
- `components/ticket-panel.html` is synced into pages by `./build.sh`.
- `_headers` contains static-host security headers and must be reviewed against the final hosting provider.
- `_redirects` is written for Netlify/Cloudflare Pages style routing.

## Remaining Modernization Risks

- Contact form handling assumes a static-form provider that supports Netlify-style attributes, or equivalent routing for `contact-thank-you.html`.
- A GitHub Actions workflow was not added because the local environment blocked workflow-file edits; CI should run `npm ci`, install Chromium, then `npm run verify`.
- Image and video optimization still need a dedicated Core Web Vitals pass.
- Most CSS is still page-local; extract shared styles only behind visual regression or expanded Playwright coverage.
- A future CMS/static-generation phase should build on `data/locations.json` rather than replacing it ad hoc.
