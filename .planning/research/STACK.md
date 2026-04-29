# Technology Stack: Astro Static Migration

**Project:** Time Mission Website Astro Migration  
**Research dimension:** Stack  
**Researched:** 2026-04-29  
**Overall confidence:** HIGH for Astro/static/verification choices; MEDIUM for analytics package choices because final GTM/CMP behavior depends on production container policy and ROLLER access.

## Recommendation

Migrate to an Astro 6 static site using Astro components, TypeScript, Astro content collections/file loaders, first-party Zod-style data schemas via `astro/zod`, `@astrojs/sitemap`, existing CSS/assets, existing vanilla browser scripts during the first cutover, and Playwright plus custom Node verification as the launch gate. Do not introduce React, SSR, a CMS, Tailwind, MDX, or a booking-platform replacement in the foundation milestone.

The posture should be parity-first and contract-first: Astro generates the same user-facing pages and design surface, while the migration creates reusable components, route helpers, validated data modules, analytics event contracts, SEO/schema helpers, and clean static output. The existing site is already fast because it has no framework runtime; Astro should remove duplication and add validation without adding client-side application architecture.

## Recommended Stack

### Core Framework

| Technology | Version / posture | Purpose | Why | Confidence |
|------------|-------------------|---------|-----|------------|
| Astro | `^6.1.10` current npm version checked 2026-04-29 | Static site generator and component system | Best fit for content-focused static marketing/location pages. It outputs static files by default, supports file-based routes, dynamic static routes via `getStaticPaths()`, componentized HTML, and minimal client JS. | HIGH |
| Astro static output | `output: "static"` | Deployment target | The site has no app auth, inventory, database, or request-time personalization. Static output preserves current hosting simplicity and rollback posture. | HIGH |
| Astro config `site` | `https://timemission.com` | Canonicals, sitemap URLs, absolute metadata | Astro docs strongly recommend `site` for canonical URLs and sitemap generation. | HIGH |
| Astro config `trailingSlash: "never"` | Required | Clean canonical URL policy | Matches the project decision: `/missions`, `/groups/birthdays`, `/philadelphia`; prevents accidental slash canonical drift. | HIGH |
| Astro components | `.astro` only for first release | Layouts, nav, footer, ticket panel, SEO head, schema, repeated sections | Gives template reuse without shipping a UI framework runtime. | HIGH |
| TypeScript | `^6.0.3` current npm version checked | Data modules, schema helpers, route helpers, analytics contract types | Astro supports TS natively; type checking catches migration mistakes before build/deploy. | HIGH |
| `@astrojs/check` | `^0.9.9` current npm version checked | CI type diagnostics for `.astro` and `.ts` | Astro build does not perform full type checking; `astro check` is the documented CI gate. | HIGH |

### Data and Contracts

| Technology | Version / posture | Purpose | Why | Confidence |
|------------|-------------------|---------|-----|------------|
| Astro content collections | Built-in | Validated build-time data for locations, groups, missions, FAQs, SEO metadata, navigation, tracking labels | Astro’s current docs recommend collections with loaders and schemas for type-safe, validated local data. The existing `data/locations.json` should evolve into validated build-time data consumed by both pages and generated browser payloads. | HIGH |
| `astro/loaders` `file()` | Built-in | Load current JSON-style data | The current source of truth is a single JSON file. `file()` supports JSON arrays/objects and custom parsing, so it fits incremental migration better than a CMS. | HIGH |
| `astro/zod` | Built-in Astro export | Schema validation | Keeps schema dependency aligned with Astro’s content system; avoid adding standalone `zod` unless non-Astro Node scripts need direct runtime validation. | HIGH |
| Generated public JSON | First-party build artifact | Browser `window.TM` compatibility | Preserve current location hydration behavior while migrating source data to typed modules. Generate or copy a stable JSON payload for client scripts. | HIGH |
| Route helper module | First-party TS | Canonical URLs, legacy `.html` redirect map, internal links | Centralizes clean URL generation and prevents stale `.html` construction in booking/navigation flows. | HIGH |

### Styling and Assets

| Technology | Version / posture | Purpose | Why | Confidence |
|------------|-------------------|---------|-----|------------|
| Existing CSS | Preserve and progressively organize | Design parity | Current CSS and inline styles are the design contract. Move global CSS into Astro imports and page CSS into components/layouts only after parity is proven. | HIGH |
| Astro asset handling | Built-in | Images/fonts/static files | Keep public assets that must retain exact URLs in `public/`; move only selected high-value local images into `src/assets` when optimization is intentional and visually verified. | HIGH |
| `sharp` | `^0.34.5` current npm version checked, optional | Image optimization backend | Use only when adopting Astro image optimization for selected images. Do not bulk-transform assets during parity migration. | MEDIUM |

### SEO, GEO, and Schema

| Technology | Version / posture | Purpose | Why | Confidence |
|------------|-------------------|---------|-----|------------|
| First-party `SeoHead.astro` | Required | Titles, descriptions, canonicals, OG/Twitter, robots, sitemap link | Centralizes metadata while preserving page-specific content. Supports GEO/AI extractability through consistent entity metadata and clear HTML. | HIGH |
| First-party schema helpers | Required | JSON-LD generation | Location pages need LocalBusiness/EntertainmentBusiness eligibility, open-vs-coming-soon rules, NAP consistency, FAQ eligibility, and organization graph consistency. Generate from validated data rather than hand-maintaining JSON-LD in pages. | HIGH |
| `@astrojs/sitemap` | `^3.7.2` current npm version checked | XML sitemap generation | Official integration crawls statically generated routes, including `getStaticPaths()` output, and requires `site`. Keep custom checks around no-trailing-slash canonical policy. | HIGH |
| Dynamic `robots.txt.ts` or static `public/robots.txt` | Either is acceptable | Crawl policy and sitemap discovery | Prefer generated `robots.txt.ts` if it can reuse `site` and sitemap URL; keep static file if parity/hosting simplicity matters more in first phase. | MEDIUM |

### Analytics and Consent

| Technology | Version / posture | Purpose | Why | Confidence |
|------------|-------------------|---------|-----|------------|
| First-party GTM component | Required | GTM container snippet, dataLayer initialization, consent defaults | Use first-party code so default consent state is pushed before any measurement event and so event payload shape is controlled. Avoid letting a wrapper obscure script order during launch. | HIGH |
| `window.dataLayer` event contract | Required | Browser analytics events | Track outbound booking intent, location selection, group CTA, contact intent, and form outcomes with stable `event_id`, no PII, and server-side forwarding compatibility. | HIGH |
| Google Consent Mode v2 fields | Required | Privacy-aware measurement | Google docs require consent defaults before measurement and include `ad_storage`, `ad_user_data`, `ad_personalization`, and `analytics_storage`. GTM consent templates should use Tag Manager consent APIs, not delayed `gtag` updates. | HIGH |
| CMP/banner integration | Provider-flexible | User consent capture | Keep consent interface abstract until provider choice. The Astro stack should expose hooks and storage contract, not lock into a CMP too early. | MEDIUM |
| `astro-gtm` | Do not use for first release | Possible GTM wrapper | Current ecosystem indicates it exists and supports Astro/GTM use cases, but this project needs strict consent/event ordering and a small custom component is safer and more transparent. Revisit only if it demonstrably matches the event contract. | MEDIUM |
| Server-side analytics endpoint | Not in Astro static app | Future server event forwarding | Prepare payloads for forwarding/dedupe, but do not add an Astro SSR endpoint. Use GTM server-side, Cloudflare Worker, or another backend later if required. | HIGH |

### Verification and Quality Gates

| Technology | Version / posture | Purpose | Why | Confidence |
|------------|-------------------|---------|-----|------------|
| Playwright | `@playwright/test ^1.59.1` current installed/latest | Browser smoke tests and migration parity checks | Already in the project; keep and expand for clean URLs, redirects, analytics dataLayer events, booking CTA behavior, and key location pages. | HIGH |
| Custom Node scripts | Continue, migrate to `scripts/` over generated `dist/` where needed | Static contract checks | Existing checks are a strength. Update them to validate Astro source data and built output: route map, sitemap, internal links, schema, redirects, analytics events, and local SEO. | HIGH |
| `npm run verify` | Required launch gate | Combined checks | Keep one command as the cutover gate. Recommended sequence: `astro check`, `astro build`, static contract checks against source and `dist`, Playwright against `astro preview`. | HIGH |
| Visual parity tooling | Add selectively | Screenshots/diff review | Use Playwright screenshots for homepage, representative location pages, groups, FAQ/contact, mobile nav, and ticket/booking states. Pixel-perfect automation may be too brittle; combine snapshots with manual review. | MEDIUM |

### Hosting and Deployment

| Technology | Version / posture | Purpose | Why | Confidence |
|------------|-------------------|---------|-----|------------|
| Cloudflare Pages static deploy | Build command `npm run build`, output `dist` | Production static hosting | Matches current `_headers`/`_redirects` posture and project constraints. Cloudflare docs support Astro Pages deployments with `dist` output. | HIGH |
| No Astro adapter | First release | Static-only build | Adapters are for SSR/on-demand/runtime integrations. The foundation milestone should not add Cloudflare adapter unless a later server feature requires it. | HIGH |
| `_headers` and `_redirects` in `public/` or generated into `dist` | Required | Security headers and legacy URL redirects | Preserve current static-host behavior. Generate or copy redirect rules so `.html` paths redirect directly to clean canonical paths without loops. | HIGH |
| Old static site rollback | Required | Cutover safety | Keep previous static artifact/deploy path until Astro parity and verification pass in production-like preview. | HIGH |

## Recommended `package.json` Posture

```json
{
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "check:types": "astro check",
    "build": "astro build",
    "preview": "astro preview",
    "check": "npm run check:types && node scripts/check-location-contracts.js && node scripts/check-routes.js && node scripts/check-sitemap.js && node scripts/check-schema.js && node scripts/check-analytics-contract.js && node scripts/check-internal-links.js",
    "test:smoke": "playwright test",
    "verify": "npm run build && npm run check && npm run test:smoke"
  },
  "dependencies": {
    "astro": "^6.1.10",
    "@astrojs/sitemap": "^3.7.2"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.9",
    "@playwright/test": "^1.59.1",
    "typescript": "^6.0.3"
  }
}
```

If `sharp` is needed for Astro image optimization, add it only when the migration intentionally moves images into Astro’s optimized asset pipeline.

## What Not To Use

| Avoid | Why | Use Instead | Confidence |
|-------|-----|-------------|------------|
| React/Vue/Svelte integration | No interactive app surface needs islands; adds dependency and hydration risk for no first-release value. | `.astro` components plus existing vanilla scripts. | HIGH |
| Next.js/Remix/Nuxt | Server/app frameworks solve problems this site does not have and complicate static rollback. | Astro static output. | HIGH |
| SSR or Cloudflare adapter | No request-time rendering requirement; would add runtime and deployment complexity. | Static `dist` output on Cloudflare Pages. | HIGH |
| Tailwind migration | Visual parity is the requirement; rewriting CSS creates redesign risk and noisy diffs. | Preserve existing CSS, then refactor tokens/components after launch. | HIGH |
| CMS in foundation milestone | Current content is local, small, and contract-sensitive. CMS migration would add workflow and schema risk before parity. | Validated local data modules/content collections. | HIGH |
| MDX/Starlight/blog tooling | The current site is marketing/location pages, not docs or editorial publishing. | `.astro` pages/components and local data. | HIGH |
| Third-party GTM wrapper as default | Consent Mode ordering, dataLayer bootstrap, and event payload contracts are critical. Wrappers can hide timing/details. | First-party `GtmHead.astro` and analytics helper module. | MEDIUM |
| Roller iframe as default booking path | Project decision is tracked external checkout links as default; iframe remains optional fallback only if intentionally retained. | Direct external checkout links with outbound intent tracking. | HIGH |
| Client-side SPA routing | Clean URLs and SEO must be static and crawlable; SPA routing adds failure modes. | Astro file/static routes and redirects. | HIGH |

## Migration Posture

1. Start with infrastructure, not redesign: create Astro config, layout shell, public asset copy, global CSS loading, and route helper.
2. Convert shared components first: SEO head, nav, footer, location picker, ticket panel shell, analytics bootstrap, schema script component.
3. Move source data into validated modules/collections before generating dynamic pages: locations first, then groups, FAQs, missions, navigation, SEO metadata, schema inputs, tracking labels.
4. Generate clean routes and direct `.html` redirects from the same route map; do not hand-maintain route strings in scripts.
5. Keep browser behavior intentionally boring: preserve `window.TM` compatibility during cutover, then refactor after verification proves parity.
6. Treat analytics and schema as build contracts: event names, payload fields, consent defaults, canonical URLs, JSON-LD eligibility, sitemap inclusion, and no-PII rules should fail verification when violated.
7. Run Playwright against built `dist` via `astro preview`, not only against source/dev server, before cutover.

## Suggested Initial Install

```bash
npm install astro @astrojs/sitemap
npm install -D @astrojs/check typescript
```

Optional later:

```bash
npm install sharp
```

## Sources

- Astro configuration reference, `site`, `trailingSlash`, `output`, `publicDir`, redirects: https://docs.astro.build/en/reference/configuration-reference/ — HIGH
- Astro content collections, loaders, schemas, `file()` loader: https://docs.astro.build/en/guides/content-collections/ — HIGH
- Astro routing and `getStaticPaths()` for static dynamic routes: https://docs.astro.build/en/guides/routing/ — HIGH
- Astro sitemap integration: https://docs.astro.build/en/guides/integrations-guide/sitemap/ — HIGH
- Astro images and public vs transformed assets: https://docs.astro.build/en/guides/images/ — HIGH
- Astro CLI, `astro build`, `astro preview`, `astro check`: https://docs.astro.build/en/reference/cli-reference/ — HIGH
- Astro TypeScript guide and type-checking guidance: https://docs.astro.build/en/guides/typescript/ — HIGH
- Cloudflare Pages Astro deploy guide, build command/output directory: https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/ — HIGH
- Google Consent Mode website setup: https://developers.google.com/tag-platform/security/guides/consent — HIGH
- Google Tag Manager consent template/API guidance: https://developers.google.com/tag-platform/tag-manager/templates/consent-apis — HIGH
- npm package version checks run 2026-04-29 for `astro`, `@astrojs/sitemap`, `@astrojs/check`, `typescript`, `sharp`, and `@playwright/test` — HIGH for observed versions

## Open Stack Questions

- Which consent banner/CMP will be used, and whether it should be first-party or GTM template-driven.
- Whether Cloudflare Pages is definitely the production deploy target or just the strongest current assumption from `_headers`/`_redirects`.
- Whether image optimization is allowed during parity migration or should be deferred to a post-launch performance phase.
- Whether ROLLER GTM/GA4 access is available before launch for purchase-event validation.
