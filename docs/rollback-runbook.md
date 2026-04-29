# Rollback runbook (pre–Astro cutover)

## Rollback git ref

Checkout and deploy from annotated tag **`pre-astro-migration-baseline`** (rollback point before Astro migration Phase 1). See `.planning/baseline/README.md` for the pinned commit SHA.

```bash
git fetch --tags
git checkout pre-astro-migration-baseline
```

## Failure triggers

Roll back or halt migration when any of the following are observed (keywords per Phase 1 planning):

- **Broken checkout/booking** — Revenue-critical booking or Roller paths fail for users.
- **Redirect loops** — Legacy or canonical redirects recurse or prevent reaching real pages.
- **Missing critical pages/assets** — 404s on core routes, missing CSS/JS/fonts/data, or broken host files (`_headers`, `_redirects`).
- **Severe visual regression** — Layout/brand breakage beyond documented parity tolerance.
- **Contact form failure** — Lead capture broken or submissions not reaching the configured endpoint.
- **Major analytics failure** — GTM/analytics effectively blind or misrouting conversion measurement during transition.

## Operator steps (outline)

1. Identify the failure against the triggers above and freeze further production deploys if risk is high.
2. `git checkout pre-astro-migration-baseline` (or deploy artifact built from that ref).
3. Deploy the **static site root** (legacy HTML/CSS/JS) using your existing pipeline — same layout as pre-migration repo root output.
4. Smoke-check homepage, one location page, booking CTA, contact form, and redirects on preview before promoting.

Detailed Cloudflare Pages dashboard steps: **TODO** — finalize during Phase 8 rehearsal.

## Phase 8 rehearsal

Before production cutover, rehearse rollback and redeploy steps against **Cloudflare preview** (or staging): attach checkout deploy to tag tarball or branch, confirm `_headers` / `_redirects` behavior, and validate redirects without loops. Cross-link Phase 8 verification when available.
