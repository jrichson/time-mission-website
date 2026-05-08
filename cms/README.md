# Payload CMS (Railway)

PostgreSQL-backed Payload 3 admin for **landing pages** consumed by the Astro site at build time.

## Local

1. Copy `.env.example` to `.env` and set `DATABASE_URL` (Postgres), `PAYLOAD_SECRET` (32+ chars), `PAYLOAD_SERVER_URL` (for local dev this can be `http://localhost:3000`), and `CMS_OWNER_EMAIL` (the email address allowed to manage CMS users).
2. From this directory:
   ```bash
   npm install
   npm run dev
   ```
3. Open [http://localhost:3000/admin](http://localhost:3000/admin) and create the first admin user. Use the same email as `CMS_OWNER_EMAIL` if you want that account to add or manage users.

## Content model

- **Existing Pages**: `path` matches a static Astro page such as `/`, `/about`, or `/groups/birthdays`. Published records override that page's SEO metadata at Astro build time.
- **Landing Pages**: `slug` becomes `https://timemission.com/c/{slug}` after a successful Pages build. Enable **Published** for the page to appear in the public API (unauthenticated reads only return published docs).

## Railway

Set these in Railway:

- `PAYLOAD_SERVER_URL` — public CMS origin only, no path, e.g. `https://your-app.up.railway.app`. Production requires HTTPS.
- `CMS_OWNER_EMAIL` — exact email address for the account allowed to create, update, delete, unlock, and assign roles for CMS users. If this is unset, user management fails closed while existing admins/editors can still use the admin panel for allowed content operations.
- `PAYLOAD_ALLOWED_ORIGINS` — optional comma-separated browser origins allowed to call the CMS API with cookies. `PAYLOAD_SERVER_URL` is always included.
- `PAYLOAD_ENABLE_GRAPHQL` — optional. Defaults to `false`; the public site uses REST.
- `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` — same value you use for “Deploy hook” in Cloudflare Pages.

Production schema changes are handled by committed Payload migrations. `npm start` runs `payload migrate` before `next start`, so a fresh Railway Postgres database gets the required tables automatically. `PAYLOAD_DB_PUSH` is only useful in local/dev mode; Payload's Postgres adapter does not push schema in `NODE_ENV=production`.

## Webhook

Saving a **published** landing (or unpublishing / deleting one that was published) triggers a POST to redeploy the static site.

Marketing should expect **minutes** of delay (Payload save → hook → CI build → upload), not instant publishes.

## Astro / Cloudflare Pages build

Configure the Pages project (or GitHub Action) with:

- `PAYLOAD_CMS_ORIGIN` — full URL with scheme (e.g. `https://your-app.up.railway.app`, or `http://localhost:3000` locally). Include `http://` or `https://`. No trailing slash.
- `PAYLOAD_CMS_BUILD_STRICT` — optional. Set `1` or `true` in CI so a missing / invalid CMS origin or a failed landings fetch **fails the Astro build** instead of silently building without CMS pages.
- `PAYLOAD_CMS_ALLOWED_HOSTS` — optional comma-separated hostnames (lowercase). If set, `PAYLOAD_CMS_ORIGIN`'s hostname must match an entry exactly or be its subdomain (`timemission.com` covers `www.timemission.com`; `railway.app` covers hosts like `x.up.railway.app`).

The static build calls:

- `GET {PAYLOAD_CMS_ORIGIN}/api/site-pages?limit=250&depth=0` for **published** existing-page SEO overrides.
- `GET {PAYLOAD_CMS_ORIGIN}/api/landings?limit=250&depth=0` for **published** landing documents.

No API key is required for public published reads.

## Monorepo

This repo also contains the Astro site at its root (`npm run build:astro`). The Payload app stays in `cms/` with its **own `package.json`**. From `cms/`, run `npm install` and `npm run dev`/`npm run build`—do **not** expect root `npm install` to install CMS dependencies unless you deliberately wire npm workspaces (hoisting can break Next.js resolution).

Docker / Railway should set the service **root directory** to `cms`.
