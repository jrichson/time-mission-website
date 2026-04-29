# External Integrations

**Analysis Date:** 2026-04-29

## APIs & External Services

**Booking and Checkout:**
- Roller / ROLLER Digital - External ticketing, gift card checkout, and embedded checkout overlay.
  - SDK/Client: Browser script loaded dynamically from `https://cdn.rollerdigital.com/scripts/widget/checkout_iframe.js` by `js/roller-checkout.js`.
  - Auth: None in repository; checkout URLs are public links.
  - URL sources: `bookingUrl`, `rollerCheckoutUrl`, and `giftCardUrl` fields in `data/locations.json`.
  - Runtime flow: `js/locations.js` loads `data/locations.json`; `js/ticket-panel.js` derives booking links from `window.TM`; `js/roller-checkout.js` intercepts booking clicks and calls `window.RollerCheckout.show()` for locations with `rollerCheckoutUrl`.
  - Active checkout hosts: `https://tickets.timemission.com` and `https://ecom.roller.app`.
  - CSP support: `_headers` allows `script-src` for `https://cdn.rollerdigital.com`, `frame-src` for `https://cdn.rollerdigital.com`, `https://tickets.timemission.com`, and `https://ecom.roller.app`, and `connect-src` for `https://tickets.timemission.com` and `https://ecom.roller.app`.

**Location and Map Links:**
- Google Maps - Direction links for location cards and footers.
  - SDK/Client: No JavaScript SDK; plain external links such as `https://maps.google.com/?q=...`.
  - Auth: None.
  - URL sources: `mapUrl` fields in `data/locations.json`, fallback data in `js/locations.js`, and legacy data in `js/nav.js`.
  - CSP support: `_headers` permits `frame-src` for `https://www.google.com` and `https://maps.google.com`, though current usage is link-based.

**Fonts:**
- Google Fonts - Hosted font CSS and font files for Bebas Neue, DM Sans, and Orbitron.
  - SDK/Client: HTML `<link>` tags across pages such as `index.html`, `contact.html`, `philadelphia.html`, and group pages.
  - Auth: None.
  - Hosts: `https://fonts.googleapis.com` and `https://fonts.gstatic.com`.
  - CSP support: `_headers` permits `style-src` for `https://fonts.googleapis.com` and `font-src` for `https://fonts.gstatic.com`.
- Local fonts - Monument Extended font files are loaded from `assets/fonts/` by major pages such as `index.html`, `philadelphia.html`, `lincoln.html`, and `dallas.html`.
  - SDK/Client: Static font preloads and CSS `@font-face` usage in site styles.
  - Auth: Not applicable.

**Forms and Lead Capture:**
- Netlify Forms - Primary contact form submission handling for `contact.html`.
  - SDK/Client: Native HTML form in `contact.html` with `data-netlify="true"`, `netlify-honeypot="bot-field"`, `method="POST"`, and `action="/contact-thank-you.html"`.
  - Auth: None in repository; handled by hosting platform.
  - Callback/redirect: Local thank-you page at `contact-thank-you.html`.
  - Required hosting behavior: The static host must support Netlify form parsing or an equivalent backend for the `contact` form.
- FormSubmit - Group event inquiry submission in `groups.html`.
  - SDK/Client: Native HTML form posting to `https://formsubmit.co/jeffersonkrichardson@gmail.com`.
  - Auth: None in repository.
  - Callback/redirect: Hidden `_next` value points to `https://timemission.com/groups.html?thanks=1`.
  - Anti-spam fields: Hidden `_captcha=false` and `_honey` honeypot in `groups.html`.
  - CSP note: `_headers` currently sets `form-action 'self'`; external form posts require equivalent production CSP to allow `https://formsubmit.co` if `_headers` is enforced.
- Newsletter forms - Present as markup only across pages including `index.html`, `contact.html`, `faq.html`, `gift-cards.html`, `locations/index.html`, and group/location pages.
  - SDK/Client: Native forms with class `newsletter-form`.
  - Auth: Not detected.
  - Backend: Not detected; no `action`, JavaScript submit handler, or third-party newsletter endpoint was found for `newsletter-form`.

**Social and Public Profiles:**
- Instagram, TikTok, and Facebook - Social profile links and Organization schema `sameAs` references.
  - SDK/Client: Plain external links in page headers/footers and JSON-LD in pages such as `index.html`, `philadelphia.html`, `faq.html`, and `locations/index.html`.
  - Auth: None.
  - Hosts: `https://www.instagram.com/timemission/`, `https://www.tiktok.com/@timemissionhq`, and `https://www.facebook.com/TimeMissionHQ/`.
- GitHub Pages hosted mini-game - Promotional external link to `https://jrichson.github.io/time-mission-magma-mayhem/`.
  - SDK/Client: Plain external anchor in location pages such as `philadelphia.html`, `west-nyack.html`, `antwerp.html`, and `houston.html`.
  - Auth: None.

**Search and Rich Results:**
- Schema.org JSON-LD - Structured data for organization and location pages.
  - SDK/Client: Inline `<script type="application/ld+json">` blocks in pages such as `index.html`, `philadelphia.html`, `mount-prospect.html`, `lincoln.html`, `west-nyack.html`, `antwerp.html`, `faq.html`, and `locations/index.html`.
  - Auth: None.
  - Types detected: `Organization` and `EntertainmentBusiness`.
- Open Graph / Twitter Cards - Social preview metadata on public pages.
  - SDK/Client: Static `<meta>` tags in pages such as `contact.html`, `philadelphia.html`, `groups.html`, and location pages.
  - Auth: None.

**Rendering and Test Automation:**
- Playwright - Development and CI browser automation.
  - SDK/Client: `@playwright/test` in root `package.json`; `playwright` dependency in `ads/package.json`; tests in `tests/smoke/site.spec.js`; ad renderer in `ads/capture.mjs`.
  - Auth: None.
  - External network: Browser download/install through npm/Playwright as part of developer setup.
- ffmpeg - Local ad video encoding used by `ads/capture.mjs`.
  - SDK/Client: CLI invoked through `node:child_process`.
  - Auth: None.

## Data Storage

**Databases:**
- Not detected.
  - Connection: Not applicable.
  - Client: Not applicable.
  - All site data is static repository content, primarily `data/locations.json` and HTML files.

**File Storage:**
- Repository filesystem only - Images, videos, fonts, CSS, JS, JSON, and HTML are served as static files from paths such as `assets/`, `css/`, `js/`, `data/`, and project-root pages.
- Browser local storage - `js/locations.js`, `js/ticket-panel.js`, and inline location-page scripts use `localStorage` keys `tm_location` and `timeMissionLocation` for location persistence.
- Temporary local file storage - `ads/capture.mjs` writes PNG frames to `ads/.frames` and removes them after ffmpeg encodes the output MP4.

**Caching:**
- No server-side cache detected.
- Browser/CDN cache busting uses query strings in asset references such as `js/locations.js?v=9`, `js/ticket-panel.js?v=4`, and the `v=8` query appended to `data/locations.json` by `js/locations.js`.
- Static host/CDN caching behavior is controlled outside the repository except for headers in `_headers`.

## Authentication & Identity

**Auth Provider:**
- Not detected.
  - Implementation: The public website has no login, session management, OAuth, JWT, user database, or auth middleware.
  - User state: Location selection only, persisted in browser `localStorage` by `js/locations.js` and `js/nav.js`.

## Monitoring & Observability

**Error Tracking:**
- None detected.

**Logs:**
- Browser console only - `js/locations.js` emits `console.warn` when `data/locations.json` fails to load.
- Node script console output - Verification scripts in `scripts/` print pass/fail output and exit non-zero on contract failures.
- Playwright traces - `playwright.config.js` sets `trace: 'retain-on-failure'` for failed smoke tests.
- No Sentry, Datadog, LogRocket, Google Analytics, Google Tag Manager, Meta Pixel, TikTok Pixel, or Google Ads tags were detected in the codebase. `cookies.html` describes possible advertising cookies, but implementation tags were not found.

## CI/CD & Deployment

**Hosting:**
- Static hosting expected.
- Netlify / Cloudflare Pages style files are present: `_headers` and `_redirects`.
- `docs/redirect-map.md` documents Netlify `_redirects` and an equivalent Vercel `vercel.json` redirect format.
- Canonical production domain is `https://timemission.com` based on canonical URLs, Open Graph URLs, form redirects, and `sitemap.xml`.

**CI Pipeline:**
- Not detected in repository files.
- No GitHub Actions, CircleCI, GitLab CI, or Vercel project config was detected during this mapping.
- Available verification command for CI: `npm run verify` from `package.json`, which runs all static checks and Playwright smoke tests.

## Environment Configuration

**Required env vars:**
- None for the main static website.
- Optional for ad capture in `ads/capture.mjs`:
  - `FPS` - Capture frame rate.
  - `DURATION` - Capture duration in seconds.
  - `OUT` - Output MP4 filename.
  - `URL` - Page URL to capture, defaulting to `http://localhost:8080/ads/missions-1080.html?capture=1`.
  - `CRF` - ffmpeg quality setting.

**Secrets location:**
- No `.env` files detected.
- No secret management system detected.
- Public form endpoint in `groups.html` includes a destination email in the form action; there are no API tokens or private credentials in the integration code inspected.

## Webhooks & Callbacks

**Incoming:**
- None detected.
- There is no backend route layer, serverless function directory, webhook endpoint, API route, or custom request handler in the repository.

**Outgoing:**
- Browser form POST from `contact.html` to local `/contact-thank-you.html` for Netlify Forms processing.
- Browser form POST from `groups.html` to `https://formsubmit.co/jeffersonkrichardson@gmail.com`, with redirect to `https://timemission.com/groups.html?thanks=1`.
- Browser navigation or new-tab opens to Roller checkout URLs from `data/locations.json` via `js/ticket-panel.js`.
- Embedded Roller checkout overlay via `js/roller-checkout.js` for locations with `rollerCheckoutUrl`.
- Browser `fetch` from `js/locations.js` to local `data/locations.json?v=8`.
- External anchor navigation to Google Maps, social profiles, and the GitHub Pages mini-game.

---

*Integration audit: 2026-04-29*
