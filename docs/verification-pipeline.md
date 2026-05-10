# Verification pipeline

Launch and CI should use **`npm run verify`** as the single cutover gate (**VER-01**): it runs a full **source** check pass, **builds** Astro static output, validates **`dist/`** contracts, then runs Playwright smoke tests against the app **after** the build step completes.

For fast iteration without a build, use **`npm run verify:sources`** ( **`npm run check` only**). Use this for quick feedback on data contracts and scripts; it does **not** prove built output or dist-only validators (**VER-02** gaps remain until you run full `verify`).

## Canonical chain: `npm run verify`

Order is fixed in `scripts/lib/verify-pipeline.cjs` and must not be reordered casually: dist validators assume `dist/` already exists.

| Step | Command | Purpose | Requirements |
|------|---------|---------|----------------|
| 1 | `npm run check` | Source checks, unit tests, route artifacts, architecture policies, analytics/consent, SEO catalogs | VER-02 (source gates) |
| 2 | `npm run build:astro` | Sync static assets into `public/`, run `astro build`, minify assets, inject CSP hashes | VER-01 |
| 3 | `npm run check:csp-hashes` | CSP inline hash parity after build | VER-01, VER-02 |
| 4 | `npm run check:routes -- --dist` | Route registry vs built output | VER-01, VER-02 |
| 5 | `npm run check:links -- --dist` | Built internal link/asset targets | VER-02 |
| 6 | `npm run check:astro-dist` | Astro dist manifest / hosting expectations | VER-01, VER-02 |
| 7 | `npm run check:payload-dist` | Payload landing dist artifacts when CMS origin is configured | VER-02 |
| 8 | `npm run check:ticket-panel-parity` | Ticket panel markup parity vs component source | VER-02 |
| 9 | `npm run check:ticket-panel-source-parity` | Ticket panel source sync | VER-02 |
| 10 | `npm run check:seo-output` | Built HTML SEO metadata vs catalog | VER-02 |
| 11 | `npm run check:schema-output` | JSON-LD in `dist/` | VER-02 |
| 12 | `npm run check:img-alt-axe` | Built image alt accessibility sweep | VER-02 |
| 13 | `npm run check:hreflang-cluster` | Hreflang cluster integrity | VER-02 |
| 14 | `npm run check:tap-targets` | CSS tap target sizing | VER-02 |
| 15 | `npm run check:sitemap-output` | Generated sitemap vs routes | VER-02 |
| 16 | `npm run check:robots-ai` | `robots.txt` AI crawler rules | VER-02 |
| 17 | `npm run check:llms-txt` | `llms.txt` output | VER-02 |
| 18 | `npm run check:geo-answer-blocks` | Visible 134-167 word GEO answer blocks plus primary media schema | VER-02 |
| 19 | `npm run check:rsl` | RSL license file, `robots.txt` License directive, and built `_headers` license discovery | VER-02 |
| 20 | `npm run check:nap-parity` | NAP / schema vs location data | VER-02 |
| 21 | `npm run test:smoke` | Playwright: smoke flows (`site.spec.js`) + visual baselines (`visual.spec.js`, **VER-04**) | VER-02, VER-04 |

`npm run check` includes Vitest coverage for the Cloudflare Pages Functions form handler and source-markup assertions that prevent Netlify form attributes from returning. Runtime delivery still requires preview testing with real Pages Function secrets and inbox confirmation.

## Aliases

- **`verify:phase7`** — Compatibility alias to **`verify`** (historical Phase 7 gate name retained for operator familiarity).
- **`verify:phase8`** — Same as **`verify`** (milestone bookkeeping; see Phase 8 plans).
- **`verify:sources`** — `check` only; not sufficient for launch.

## Single build owner

`npm run verify` runs **`build:astro` once** per invocation. Downstream steps (dist checks, Playwright) consume that **`dist/`**; avoid duplicating `build:astro` in the same pipeline without a documented reason.

## Visual regression (VER-04)

Playwright **`tests/smoke/visual.spec.js`** compares the viewport to committed PNG baselines under `tests/smoke/visual.spec.js-snapshots/`. Tests use the same **`astro preview`** server as `site.spec.js` (built `dist/` on `127.0.0.1:4173`).

After an **intentional** template or design change, refresh baselines in the same PR:

```bash
npm run build:astro
npx playwright test tests/smoke/visual.spec.js --update-snapshots
```

**CI / OS:** Snapshot file names include the platform (for example `*-chromium-darwin.png`). Linux CI needs matching `*-chromium-linux.png` files—generate once on that runner (or use a pinned Playwright Docker image) and commit.

## `verify:phase8`

**`npm run verify:phase8`** is an alias for **`npm run verify`** (Phase 8 milestone bookkeeping).
