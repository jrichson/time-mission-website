# Payload CMS (Railway)

PostgreSQL-backed Payload 3 admin for **Page SEO Overrides**, **Announcement Banners**, **Location Details**, and **Landing Pages** consumed by the Astro site at build time.

## Local

1. Copy `.env.example` to `.env` and set `DATABASE_URL` (Postgres), `PAYLOAD_SECRET` (32+ chars), `PAYLOAD_SERVER_URL` (for local dev this can be `http://localhost:3000`), and `CMS_OWNER_EMAIL` (the email address allowed to manage CMS users).
2. From this directory:
   ```bash
   npm install
   npm run dev
   ```
3. Open [http://localhost:3000/admin](http://localhost:3000/admin) and create the first admin user. Use the same email as `CMS_OWNER_EMAIL` if you want that account to add or manage users.

## Content model

- **Page SEO Overrides**: `path` matches a route-registry page such as `/`, `/about`, or `/groups/birthdays`. The production migration preloads one row per registered route. Published records override that code-owned page's SEO metadata at Astro build time; they do not edit page body copy or layout.
- **Announcement Banners**: text-only top banner messages with scheduling, priority, and optional region/location targeting. If no CMS banner is active or the optional CMS endpoint is unavailable during rollout, the public site keeps the existing hardcoded ticker fallback.
- **Location Details**: address, hours, and external destination URLs for existing code-owned locations only. Published records update public address/hour displays, generate the directions link from that address, and can override booking, gift card, waiver, external location-page, and group form URLs after deploy; they do not create new locations, change public pages, or change booking provider settings. If the optional CMS endpoint is unavailable, the public build keeps `data/locations.json` as the fallback.
- **Landing Pages**: `slug` becomes `https://timemission.com/c/{slug}` after a successful Pages build. Start new pages from `/landings/new`, which captures the campaign brief and creates a draft. Refine the saved record in Payload, use **Preview** to review the Railway-hosted page, then enable **Published** for the page to appear in the public API (unauthenticated reads only return published docs).
- **User Invites**: owner-only records that create or update a CMS user, then either email a 24-hour password setup link or create a copyable 24-hour invite link. Use this instead of manually creating users with temporary passwords.

CMS public states use shared language:

- **Draft**: saved work that is not approved for the public build.
- **Published in CMS**: approved CMS content visible to the build API.
- **Live after deploy**: content included in the next approved static-site deploy.

## Landing launch workflow

1. Marketing starts with a real source: ad, organic post, email, local SEO request, partner campaign, or event-sales need.
2. Open `/landings/new` from the CMS home and choose the landing shape.
3. Fill the campaign brief: source channel, source name, source promise, visitor intent, and success metric.
4. Fill first-draft page copy: headline, subheadline, three proof points, CTA, launch state, image, and any location/event context.
5. Submit the wizard. It creates a **draft** `Landing Page` record and redirects to `/preview/landings/{id}`.
6. Review the preview warnings, then use **Edit landing page** for detailed Payload edits if needed.
7. Check **Published** only after approval.
8. Run the public Astro/Cloudflare deploy path. The page is live at `/c/{slug}` after the static site rebuild fetches published CMS landings.

## Railway

Set these in Railway:

- `PAYLOAD_SERVER_URL` — public CMS origin only, no path, e.g. `https://your-app.up.railway.app`. Production requires HTTPS.
- `CMS_OWNER_EMAIL` — exact email address for the account allowed to create invites, update, delete, unlock, and assign roles for CMS users. If this is unset, the first CMS account is treated as the bootstrap owner so the initial user can invite and manage approved users.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — SMTP settings for invite delivery. Without `SMTP_HOST`, new invite records are marked `failed` so you do not mistake a console-only email log for a real sent invite.
- `SMTP_FROM_ADDRESS`, `SMTP_FROM_NAME` — optional sender identity for CMS invite emails. Defaults to `noreply@timemission.com` / `Time Mission CMS` when SMTP is configured.
- `SMTP_SECURE` — optional boolean. Defaults to `true` when `SMTP_PORT=465`, otherwise `false`.
- `SMTP_SKIP_VERIFY` — optional boolean. Defaults to `false`; set `true` only if the provider rejects startup verification but sends mail successfully.
- `PAYLOAD_ALLOWED_ORIGINS` — optional comma-separated browser origins allowed to call the CMS API with cookies. `PAYLOAD_SERVER_URL` is always included.
- `PAYLOAD_PUBLIC_SITE_ORIGIN` — optional public Astro/Cloudflare origin used by CMS previews to load `/assets/...` images. Set this to your current Pages preview/custom domain while `timemission.com` is not live.
- `PAYLOAD_ENABLE_GRAPHQL` — optional. Defaults to `false`; the public site uses REST.
- `CMS_DEPLOY_PROVIDER` — set to `github_actions` for the current Wrangler Direct Upload path.
- `GITHUB_ACTIONS_DEPLOY_TOKEN` — GitHub fine-grained token used by the CMS `/deploy` page to dispatch `.github/workflows/cms-wrangler-deploy.yml`. Grant only the target repo and Actions write access.
- `GITHUB_ACTIONS_DEPLOY_REPO` — defaults to `jrichson/time-mission-website`.
- `GITHUB_ACTIONS_DEPLOY_WORKFLOW_ID` — defaults to `cms-wrangler-deploy.yml`.
- `GITHUB_ACTIONS_DEPLOY_REF` — defaults to `rebuild`. Change this after the production deployment branch changes.
- `CLOUDFLARE_PAGES_DEPLOY_HOOK_URL` — optional older path for Cloudflare Pages Git deploy hooks. Leave unset for Wrangler-only direct uploads.

Production schema changes are handled by committed Payload migrations. `npm start` runs `payload migrate` before `next start`, so a fresh Railway Postgres database gets the required tables automatically. `PAYLOAD_DB_PUSH` is only useful in local/dev mode; Payload's Postgres adapter does not push schema in `NODE_ENV=production`.

## Inviting CMS users

1. Log in as the account matching `CMS_OWNER_EMAIL`. If `CMS_OWNER_EMAIL` is not set yet, log in as the first CMS account.
2. Go to **Settings -> User Invites**.
3. Create a new invite with the recipient email, role, and delivery method.
4. Choose **Send email** to email the 24-hour setup link, or **Create invite link** to generate a copyable link in the invite record.
5. Payload creates the user if needed, then marks the invite as `sent`, `link_created`, or `failed`.

If an email invite is marked `failed`, check SMTP env vars and create a new invite for the same email to resend. If you need to invite someone before SMTP is ready, use **Create invite link**.

## Deploy gate

Saving **Published in CMS** content marks that the public site needs a deploy, but collection saves do not trigger the public-site deploy directly. Users with owner-granted CMS Deploy Permission can open `/deploy` and trigger the configured remote deploy runner.

For the current Wrangler Direct Upload path, the CMS deploy gate dispatches the GitHub Actions workflow at `.github/workflows/cms-wrangler-deploy.yml`. The workflow runs `npm run build:astro`, fetches published CMS content from Railway, then runs `npx wrangler pages deploy dist --project-name time-mission-website`. Marketing should expect **minutes** of delay (CMS deploy gate → GitHub Actions build → Wrangler upload), not instant publishes.

## Astro / Cloudflare Pages build

Configure the Pages project (or GitHub Action) with:

- `PAYLOAD_CMS_ORIGIN` — full URL with scheme (e.g. `https://your-app.up.railway.app`, or `http://localhost:3000` locally). Include `http://` or `https://`. No trailing slash.
- `PAYLOAD_CMS_BUILD_STRICT` — optional. Set `1` or `true` in CI so a missing / invalid CMS origin or a failed landings fetch **fails the Astro build** instead of silently building without CMS pages.
- `PAYLOAD_CMS_ALLOWED_HOSTS` — optional comma-separated hostnames (lowercase). If set, `PAYLOAD_CMS_ORIGIN`'s hostname must match an entry exactly or be its subdomain (`timemission.com` covers `www.timemission.com`; `railway.app` covers hosts like `x.up.railway.app`).

The static build calls:

- `GET {PAYLOAD_CMS_ORIGIN}/api/site-pages?limit=250&depth=0` for **published** Page SEO Overrides.
- `GET {PAYLOAD_CMS_ORIGIN}/api/landings?limit=250&depth=0` for **published** landing documents.
- `GET {PAYLOAD_CMS_ORIGIN}/api/announcement-banners?limit=250&depth=0` for optional **published** Announcement Banners. This fetch is non-fatal during rollout so the public build can fall back to the code-owned ticker if the collection is unavailable.
- `GET {PAYLOAD_CMS_ORIGIN}/api/location-details?limit=250&depth=0` for optional **published** Location Details. This fetch is non-fatal so the public build can fall back to the code-owned location data if the collection is unavailable.

No API key is required for public published reads.

## GitHub Actions Wrangler deploy

The CMS `/deploy` page can trigger `.github/workflows/cms-wrangler-deploy.yml` when Railway has the `GITHUB_ACTIONS_DEPLOY_*` env vars above. GitHub Actions also needs these repository secrets:

- `CLOUDFLARE_API_TOKEN` — token with Cloudflare Pages edit/deploy access for the `time-mission-website` project.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID.

The workflow hardcodes `PAYLOAD_CMS_ORIGIN=https://time-mission-website-production.up.railway.app` and `PAYLOAD_CMS_ALLOWED_HOSTS=railway.app`, so CMS content is pulled during the public build before Wrangler uploads `dist/`.

## Monorepo

This repo also contains the Astro site at its root (`npm run build:astro`). The Payload app stays in `cms/` with its **own `package.json`**. From `cms/`, run `npm install` and `npm run dev`/`npm run build`—do **not** expect root `npm install` to install CMS dependencies unless you deliberately wire npm workspaces (hoisting can break Next.js resolution).

Docker / Railway should set the service **root directory** to `cms`.
