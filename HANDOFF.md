# Time Mission Website Developer Handoff

## Overview

This repository contains the public Time Mission website. The active site is an Astro build with shared layout components, data-backed location pages, source-controlled route contracts, and verification scripts for routing, booking, analytics, SEO, accessibility, and performance.

## Primary Source Areas

| Area | Source |
| --- | --- |
| Public pages | `src/pages/**/*.astro` |
| Shared layout and chrome | `src/layouts/SiteLayout.astro`, `src/components/` |
| Static content fragments | `src/partials/*-main.frag.txt`, page-specific source partials |
| Location roster and booking facts | `data/locations.json` |
| Route registry | `src/data/routes.json` |
| Browser runtime modules | `js/` |
| Shared typed contracts | `src/lib/` |
| Cloudflare Pages functions | `functions/` |

## Architecture Notes

- `src/lib/public-url-surface.ts` owns canonical URL, sitemap, redirect, dynamic landing, and output-file behavior.
- `src/lib/site-contract.ts` exposes a small public browser contract for location, booking, analytics, and runtime facts.
- `src/lib/location-page-shell.ts` and `src/lib/location-page-registry.ts` derive location page metadata, CSS, language overrides, page init data, and JSON-LD from the location catalog.
- `js/booking-journey.js` and `js/booking-controller.js` own client-side booking decisions and presentation.
- `js/locations.js` is the only writer for persisted location state.
- `js/page-widgets.js` is the browser adapter for page-init driven widgets.

## Internal API Integration Map

Use these seams when connecting a future internal API. The goal is to make the API an adapter behind existing contracts, not a second source of truth.

| Requirement | Current seam | Integration rule |
| --- | --- | --- |
| Location roster, status, hours, addresses, booking URLs, gift cards, temporary closures | `data/locations.json`, `src/data/locations.ts`, `scripts/generate-public-locations.mjs`, `js/locations.js` | Produce the same `LocationRecord` and public `data/locations.json` shape, then let `window.TM` hydrate the browser. Do not add parallel location URL maps in page scripts. |
| Booking decisions and provider presentation | `js/booking-journey.js`, `js/booking-controller.js`, `js/booking-provider-briq.js`, `js/booking-frame.js` | Feed provider facts through the Location Catalog. Keep provider routing in the Booking Journey modules so generic CTAs, location CTAs, group pages, and direct location pages stay aligned. |
| CMS-owned landing pages and reusable site surfaces | `src/lib/payload/read-adapter.ts`, `src/lib/payload/*-contract.ts`, `src/pages/c/[slug].astro` | If the internal API replaces Payload reads, make it satisfy the existing contract modules first. Those contracts are the test surface for renderability, sitemap eligibility, and safe published content. |
| Forms and PII-bound submissions | `functions/_shared/form-handler.mjs`, `functions/api/contact.js`, `functions/api/newsletter.js`, `migrations/0001_form_submissions.sql` | Keep PII on the server side. If submissions move to the internal API, preserve Turnstile verification, origin checks, rate limiting, archival semantics, and Resend/Klaviyo failure behavior deliberately. |
| Analytics events and future server-side event collection | `js/analytics.js`, `src/data/site/analytics-labels.json`, `docs/analytics-event-contract.md` | Reuse the documented non-PII event envelope. Do not send email, names, phones, raw form messages, or free-text contact subjects into `dataLayer` or a future event endpoint. |
| Public routes, sitemap, redirects, and generated output | `src/data/routes.json`, `src/lib/public-url-surface.ts`, `scripts/compile-route-artifacts.mjs` | Add or remove public paths through the route registry so sitemap, redirects, Cloudflare output files, and smoke tests stay in sync. |

## Build And Verification

Use these commands from the repository root:

```bash
npm run check
npm run build:astro
npm run verify
```

`npm run check` runs unit tests plus source-level architecture and content gates. `npm run build:astro` builds the Cloudflare Pages output into `dist/`. `npm run verify` runs the full source, build, output, accessibility, SEO, schema, link, route, and Playwright smoke pipeline.

## Deployment

Cloudflare Pages deployment is wired through:

```bash
npm run deploy:pages
```

Required production configuration lives outside the repo in Cloudflare Pages environment variables and bindings. See `docs/cutover-checklist.md`, `docs/cloudflare-preview-validation.md`, and `docs/gtm-operator-runbook.md` for deployment and validation steps.

## Data Ownership

- Edit location names, statuses, booking URLs, group form URLs, direct contact details, and venue metadata in `data/locations.json`.
- Edit canonical route behavior in `src/data/routes.json`.
- Edit analytics event names and parameter labels in `src/data/site/analytics-labels.json`.
- Do not edit generated files under `dist/` or machine-generated route artifacts by hand.
