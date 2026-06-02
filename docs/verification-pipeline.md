# Verification Pipeline

Launch and CI should use **`npm run verify`** as the single production gate. It runs a full source check pass, builds Astro static output, validates `dist/` contracts, then runs Playwright smoke tests against the built app.

For fast iteration without a build, use **`npm run verify:sources`**. It is equivalent to **`npm run check`** and is useful for quick feedback, but it does not prove generated output or browser behavior.

## Canonical Chain

Order is fixed in `scripts/lib/cloudflare-artifact-contract.cjs` and exposed through `scripts/lib/verify-pipeline.cjs`. Keep the order stable because generated-output validators assume `dist/` already exists.

| Step | Command | Purpose |
| --- | --- | --- |
| 1 | `npm run check` | Source checks, unit tests, route artifacts, architecture policies, analytics/consent, SEO catalogs |
| 2 | `npm run build:astro` | Sync static assets, run `astro build`, prune excluded artifacts, minify assets, bundle CSS, inject CSP hashes |
| 3 | `npm run check:csp-hashes` | CSP inline hash parity after build |
| 4 | `npm run check:best-practices -- --dist` | Built security headers, CSP placeholder leakage, source maps, and mixed-content HTML attributes |
| 5 | `npm run check:routes -- --dist` | Route registry vs built output |
| 6 | `npm run check:links -- --dist` | Built internal link and asset targets |
| 7 | `npm run check:astro-dist` | Astro dist manifest and hosting expectations |
| 8 | `npm run check:analytics-output` | Built GTM placement |
| 9 | `npm run check:css-bundles` | Built stylesheet bundling |
| 10 | `npm run check:payload-dist` | Payload landing dist artifacts when CMS origin is configured |
| 11 | `npm run check:ticket-panel-parity` | Ticket panel markup parity vs built output |
| 12 | `npm run check:seo-output` | Built HTML SEO metadata vs catalog |
| 13 | `npm run check:schema-output` | JSON-LD in `dist/` |
| 14 | `npm run check:img-alt-axe` | Built image alt accessibility sweep |
| 15 | `npm run check:hreflang-cluster` | Hreflang cluster integrity |
| 16 | `npm run check:tap-targets` | CSS tap-target sizing |
| 17 | `npm run check:sitemap-output` | Generated sitemap vs routes |
| 18 | `npm run check:robots-ai` | `robots.txt` AI crawler rules |
| 19 | `npm run check:llms-txt` | `llms.txt` output |
| 20 | `npm run check:geo-answer-blocks` | Visible GEO answer blocks plus primary media schema |
| 21 | `npm run check:rsl` | RSL license file, `robots.txt` License directive, and built `_headers` license discovery |
| 22 | `npm run check:nap-parity` | NAP / schema vs location data |
| 23 | `npm run test:smoke` | Playwright smoke flows and visual baselines |

`npm run check` includes Vitest coverage for the Cloudflare Pages Functions form handler and source-markup assertions that prevent Netlify form attributes from returning. Runtime delivery still requires preview testing with real Pages Function secrets and inbox confirmation.

## Available Scripts

- **`verify`**: full production gate.
- **`verify:sources`**: source checks only; not sufficient for launch.
- **`test:smoke`**: Playwright browser coverage.

## Single Build Owner

`npm run verify` runs **`build:astro` once** per invocation. Downstream steps consume that `dist/`; avoid duplicating `build:astro` in the same pipeline without a documented reason.

## Visual Regression

Playwright `tests/smoke/visual.spec.js` compares representative pages to committed PNG baselines under `tests/smoke/visual.spec.js-snapshots/`. Tests use the same `astro preview` server as `site.spec.js`.

After an intentional template or design change, refresh baselines in the same PR:

```bash
npm run build:astro
npx playwright test tests/smoke/visual.spec.js --update-snapshots
```

Snapshot file names include the platform. Linux CI needs matching Linux snapshot files generated on that runner or inside the pinned Playwright environment.
