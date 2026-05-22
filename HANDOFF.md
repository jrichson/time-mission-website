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
