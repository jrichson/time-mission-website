# Payload CMS (Railway)

PostgreSQL-backed Payload 3 admin for **landing pages** consumed by the Astro site at build time.

## Local

1. Copy `.env.example` to `.env` and set `DATABASE_URL` (Postgres) and `PAYLOAD_SECRET` (32+ chars).
2. From this directory:
   ```bash
   npm install
   npm run dev
   ```
3. Open [http://localhost:3000/admin](http://localhost:3000/admin) and create the first admin user.

## Content model

- **Landings**: `slug` becomes `https://timemission.com/c/{slug}` after a successful Pages build. Enable **Published** for the page to appear in the public API (unauthenticated reads only return published docs).

## Webhook

Set `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` in Railway (same value you use for “Deploy hook” in Cloudflare Pages). Saving a **published** landing (or unpublishing / deleting one that was published) triggers a POST to redeploy the static site.

Marketing should expect **minutes** of delay (Payload save → hook → CI build → upload), not instant publishes.

## Astro / Cloudflare Pages build

Configure the Pages project (or GitHub Action) with:

- `PAYLOAD_CMS_ORIGIN` — full URL with scheme (e.g. `https://your-app.up.railway.app`, or `http://localhost:3000` locally). Include `http://` or `https://`. No trailing slash.
- `PAYLOAD_CMS_BUILD_STRICT` — optional. Set `1` or `true` in CI so a missing / invalid CMS origin or a failed landings fetch **fails the Astro build** instead of silently building without CMS pages.
- `PAYLOAD_CMS_ALLOWED_HOSTS` — optional comma-separated hostnames (lowercase). If set, `PAYLOAD_CMS_ORIGIN`'s hostname must match an entry exactly or be its subdomain (`timemission.com` covers `www.timemission.com`; `railway.app` covers hosts like `x.up.railway.app`).

The static build calls `GET {PAYLOAD_CMS_ORIGIN}/api/landings?limit=250&depth=0` to list **published** landing documents (no API key required for read).

## Monorepo

This repo also contains the Astro site at its root (`npm run build:astro`). The Payload app stays in `cms/` with its **own `package.json`**. From `cms/`, run `npm install` and `npm run dev`/`npm run build`—do **not** expect root `npm install` to install CMS dependencies unless you deliberately wire npm workspaces (hoisting can break Next.js resolution).

Docker / Railway should set the service **root directory** to `cms`.
