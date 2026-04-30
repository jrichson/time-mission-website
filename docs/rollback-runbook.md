# Rollback runbook (pre–Astro cutover)

## Rollback git ref

Checkout and deploy from annotated tag **`pre-astro-migration-baseline`** (rollback point before Astro migration Phase 1). See `.planning/baseline/README.md` for the pinned commit SHA.

```bash
git fetch --tags
git checkout pre-astro-migration-baseline
```

## Failure triggers (VER-06)

Roll back or halt migration when any of the following are observed. Use [cloudflare-preview-validation.md](cloudflare-preview-validation.md) and [verification-pipeline.md](verification-pipeline.md) to rehearse detection before cutover.

- **Broken checkout/booking** — Revenue-critical booking or ROLLER paths fail for users on open locations.
- **Redirect loops** — Legacy or canonical redirects recurse or prevent reaching real pages (`curl -sI -L --max-redirs 10` never spins).
- **Missing canonical pages** — Core clean URLs (`/`, `/faq`, `/contact`, primary locations) 404 or show wrong content vs route registry / `npm run verify`.
- **Missing critical assets** — 404s on CSS/JS/fonts/data, or broken host files (`_headers`, `_redirects`).
- **Severe visual regression** — Layout/brand breakage beyond documented parity tolerance; **Playwright screenshot drift** on representative templates after intentional design change review (see `tests/smoke/visual.spec.js`).
- **Contact form failure** — Lead capture broken or submissions not reaching the configured endpoint.
- **Major analytics failure** — GTM (`dataLayer`, tags) or conversion measurement effectively blind or misrouted during transition; see `docs/gtm-operator-runbook.md` for DebugView expectations.

## Operator steps (outline)

1. Identify the failure against the triggers above and freeze further production deploys if risk is high.
2. `git checkout pre-astro-migration-baseline` (or deploy artifact built from that ref).
3. Deploy the **static site root** (legacy HTML/CSS/JS) using your existing pipeline — same layout as pre-migration repo root output.
4. Smoke-check homepage, one location page, booking CTA, contact form, and redirects on preview before promoting.

## Cloudflare Pages (outline)

1. **Preview rehearsal:** Follow the full checklist in [cloudflare-preview-validation.md](cloudflare-preview-validation.md) on a branch/PR preview (headers, redirects, canonical URLs, sitemap/robots/llms, 404, schema spot-check, assets, GTM notes, sampled ROLLER URLs).
2. **Rollback deploy:** Attach production or preview deploy to the artifact built from the rollback git ref (tag tarball or branch checkout), matching **legacy static root** layout for `pre-astro-migration-baseline`.
3. **Hostname/DNS:** Verify hostname and project bindings before promoting (no accidental cutover to the wrong Pages project).
4. **Cache:** Optionally purge CDN cache after rollback if stale assets are observed.
5. **Host files:** Confirm `_headers` and `_redirects` are served from the deployed site root (CSP/HSTS and routing contract).

## Phase 8 rehearsal

Before production cutover, rehearse rollback and redeploy steps against **Cloudflare preview** (or staging): attach checkout deploy to tag tarball or branch, confirm `_headers` / `_redirects` behavior, and validate redirects without loops using [cloudflare-preview-validation.md](cloudflare-preview-validation.md).
