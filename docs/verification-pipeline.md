# Verification pipeline

Launch and CI should use **`npm run verify`** as the single cutover gate (**VER-01**): it runs a full **source** check pass, **builds** Astro static output, validates **`dist/`** contracts, then runs Playwright smoke tests against the app **after** the build step completes.

For fast iteration without a build, use **`npm run verify:sources`** ( **`npm run check` only**). Use this for quick feedback on data contracts and scripts; it does **not** prove built output or dist-only validators (**VER-02** gaps remain until you run full `verify`).

## Canonical chain: `npm run verify`

Order is fixed in `package.json` and must not be reordered casually: dist validators assume `dist/` already exists.

| Step | Script | Purpose | Requirements |
|------|--------|---------|----------------|
| 1 | `check` | Location contracts, sitemap, components, booking, a11y, links, routes (source), site data, location routes, fallback sync, component usage, analytics, SEO catalog, SEO robots | VER-02 (source gates) |
| 2 | `build:astro` | Sync static assets into `public/` and run `astro build` | VER-01 |
| 3 | `check:routes -- --dist` | Route registry vs built output | VER-01, VER-02 |
| 4 | `check:astro-dist` | Astro dist manifest / hosting expectations | VER-01, VER-02 |
| 5 | `check:ticket-panel-parity` | Ticket panel markup parity vs component source | VER-02 |
| 6 | `check:ticket-panel-source-parity` | Ticket panel source sync | VER-02 |
| 7 | `check:seo-output` | Built HTML SEO metadata vs catalog | VER-02 |
| 8 | `check:schema-output` | JSON-LD in `dist/` | VER-02 |
| 9 | `check:sitemap-output` | Generated sitemap vs routes | VER-02 |
| 10 | `check:robots-ai` | `robots.txt` AI crawler rules | VER-02 |
| 11 | `check:llms-txt` | `llms.txt` output | VER-02 |
| 12 | `check:nap-parity` | NAP / schema vs location data | VER-02 |
| 13 | `test:smoke` | Playwright smoke flows | VER-02 (behavior) |

## Aliases

- **`verify:phase7`** — Frozen Phase 7 script chain (build + dist SEO/schema/NAP + smoke). **`verify`** currently delegates here so the Phase 7 gate stays explicit in one place.
- **`verify:phase8`** — Same as **`verify`** (milestone bookkeeping; see Phase 8 plans).
- **`verify:sources`** — `check` only; not sufficient for launch.

## Single build owner

`npm run verify` runs **`build:astro` once** per invocation. Downstream steps (dist checks, Playwright) consume that **`dist/`**; avoid duplicating `build:astro` in the same pipeline without a documented reason.
