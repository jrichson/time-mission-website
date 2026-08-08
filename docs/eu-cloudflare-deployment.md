# Time Mission EU Cloudflare Deployment

## Architecture

Both sites use this repository and the same application code. `TM_SITE_PROFILE` selects
the regional build; a permanent divergent EU code branch is not required.

| Concern | US | EU |
| --- | --- | --- |
| Build command | `npm run build:us` | `npm run build:eu` |
| Canonical origin | `https://www.timemission.com` | `https://www.timemission.eu` |
| Pages project | `time-mission-website` | `time-mission-website-eu` |
| Internal locations | US | Antwerp, Brussels, Eindhoven |
| External locations | Link to `.eu` | Link to `.com` |
| Consent default | Existing US behavior | Analytics and ads denied until opt-in |
| Form archive | Existing D1 | Separate D1 created with `jurisdiction=eu` |

The EU artifact removes US venue pages and generated US form routes. Direct requests for
those paths redirect to the matching `.com` URL. The build fails if regional pages,
forms, sitemap URLs, canonicals, hreflang links, or the artifact identity are inconsistent.

Cloudflare Pages serves static assets through its global edge by default. A separate Pages
project and an EU-jurisdiction D1 database isolate configuration and submitted data, but
they do not by themselves guarantee that all request processing occurs only in Europe.
That stronger requirement needs Cloudflare Regional Services/Data Localization on an
eligible plan and must be confirmed in the Cloudflare account before making a compliance
claim.

## Language Behavior

- English is the unprefixed default: `/antwerp`.
- Dutch, French, and Spanish use `/nl/antwerp`, `/fr/antwerp`, and `/es/antwerp`.
- The browser language and a saved preference produce a language suggestion; there is no
  forced redirect.
- On English venue pages, the fallback suggestion is Dutch for Antwerp/Eindhoven and
  French for Brussels when the browser has no supported non-English preference.
- Locale pages have server-rendered `lang`, canonical, reciprocal `hreflang`, and
  `x-default` metadata.

Production EU builds require a digest-bound human approval for every rendered locale.
After reviewing all public route copy, metadata, forms, and legal text in a fresh review
build, the language owner records that exact artifact with:

```bash
npm run build:eu
node scripts/record-i18n-artifact-approval.mjs eu nl "Reviewer name"
```

Repeat the approval command for `en`, `fr`, and `es` after each locale is reviewed. The
command writes the rendered-copy digest, reviewer, and review date to
`src/data/site/i18n-approval.json`; do not hand-edit a status to `approved`. Any later copy
change invalidates the digest. Shared UI and page-body copy are included in the rendered
artifact review. Leave the current `review_required` statuses in place until native-language
and legal review is complete. The production workflow intentionally blocks before deploy.

## One-Time Cloudflare Setup

1. Create the Pages project:

   ```bash
   npx wrangler pages project create time-mission-website-eu
   ```

2. Create the form database in the EU jurisdiction and record the returned UUID:

   ```bash
   npx wrangler d1 create time-mission-forms-eu --jurisdiction=eu
   export EU_D1_DATABASE_ID="<returned UUID>"
   npm run migrate:d1:eu
   ```

3. Create a separate Turnstile widget that permits `timemission.eu` and
   `www.timemission.eu`. Record its site key in `EU_TURNSTILE_SITE_KEY` and its secret as
   the EU Pages project secret `TURNSTILE_SECRET_KEY`.

4. Configure these GitHub Actions values:

| Kind | Name |
| --- | --- |
| Secret | `CLOUDFLARE_ACCOUNT_ID` |
| Secret | `CLOUDFLARE_API_TOKEN` |
| Secret | `EU_D1_DATABASE_ID` |
| Variable | `EU_TURNSTILE_SITE_KEY` |
| Variable | `EU_GTM_CONTAINER_ID` |
| Variable | `EU_SGTM_CONTAINER_URL` (optional) |
| Variable | `EU_SGTM_COLLECT_PATH` (optional) |
| Variable | `PUBLIC_TM_MEDIA_BASE` |

5. Configure these values on the `time-mission-website-eu` Pages project. Keep API keys
   and private values in Cloudflare's encrypted secret store, not in Wrangler variables:

| Required secret/variable | Purpose |
| --- | --- |
| `FORM_EMAIL_API_KEY` | EU form email delivery |
| `FORM_FROM_EMAIL` | Verified sender |
| `CONTACT_TO_EMAIL` | EU contact recipient |
| `NEWSLETTER_TO_EMAIL` | EU newsletter recipient |
| `TURNSTILE_SECRET_KEY` | EU Turnstile verification |
| `KLAVIYO_API_KEY` | Optional EU newsletter integration |
| `KLAVIYO_LIST_ID_*` | Optional EU list routing |
| `CONTACT_TO_EMAIL_ANTWERP` | Optional Antwerp routing |
| `CONTACT_TO_EMAIL_BRUSSELS` | Optional Brussels routing |
| `CONTACT_TO_EMAIL_EINDHOVEN` | Optional Eindhoven routing |

The rendered EU Wrangler configuration binds `FORM_SUBMISSIONS_DB`, restricts accepted
form origins to the EU domains, and requires the D1 archive. Configure R2/media CORS to
allow `https://www.timemission.eu` if `PUBLIC_TM_MEDIA_BASE` is cross-origin.

6. If EU-only HTTPS processing is a requirement, confirm the account has Cloudflare Data
   Localization Suite entitlements. After the custom domain is active, assign
   `www.timemission.eu` to the managed `eu` region with Regional Services and enable the
   EU Customer Metadata Boundary for Cloudflare logs and analytics. If the externally
   managed DNS/custom-domain arrangement cannot be configured as a Regional Hostname,
   resolve the supported topology with the Cloudflare account team before launch.

## Build And Deploy

For a non-production artifact review:

```bash
npm run build:eu
TM_SITE_PROFILE=eu PUBLIC_SITE_ORIGIN=https://www.timemission.eu npm run verify:artifact:review
```

For a Cloudflare Pages preview before translation approval:

```bash
export EU_D1_DATABASE_ID="<EU D1 UUID>"
export EU_TURNSTILE_SITE_KEY="<EU Turnstile site key>"
export EU_GTM_CONTAINER_ID="<EU GTM container ID>"
npm run deploy:pages:eu:preview
```

This runs the source and artifact gates, writes a preview-only digest stamp, and deploys
to the `eu-preview` Pages branch. It cannot be reused for a production deployment.
Cloudflare serves the preview at a hash URL and the stable
`eu-preview.time-mission-website-eu.pages.dev` alias with `X-Robots-Tag: noindex`.
Email delivery variables may remain unset for visual and navigation testing; submitted
forms will fail after their D1 archive step until those runtime values are configured.

For production, after human translation approval:

```bash
export EU_D1_DATABASE_ID="<EU D1 UUID>"
export EU_TURNSTILE_SITE_KEY="<EU Turnstile site key>"
export EU_GTM_CONTAINER_ID="<EU GTM container ID>"
npm run deploy:pages:eu
```

The deploy command runs the source checks, creates a production-profile build, verifies
the complete output, writes a digest stamp, and then copies `dist/`, `functions/`,
`migrations/`, and a rendered root `wrangler.toml` into a temporary immutable Cloudflare
Artifact. Wrangler runs only from that staged workspace. Do not replace this with a raw
`wrangler pages deploy` command or a custom `--config` path; either would bypass the
verified artifact boundary or Pages Functions discovery.

The preferred production path is the `CMS Wrangler Deploy` GitHub Actions workflow with
`target=eu` or `target=both`. Each target builds independently, verifies its artifact
digest, and deploys the same staged bytes to its own Pages project.

For pre-approval testing, dispatch the same workflow with `target=eu-preview`. This path
does not assert translation approval and never updates the production Pages branch.

## Domain Cutover

1. In Cloudflare Pages, add `www.timemission.eu` to `time-mission-website-eu` before the
   DNS owner creates the CNAME.
2. The EU DNS owner creates:

   ```text
   Type: CNAME
   Name: www
   Target: time-mission-website-eu.pages.dev
   ```

3. Configure the apex `timemission.eu` as a permanent redirect to
   `https://www.timemission.eu`, preserving path and query string.
4. Do not change `.com` DNS. The two custom domains remain attached to separate Pages
   projects.

## Launch Verification

Verify both the Pages preview URL and the custom domain:

```bash
curl -I https://www.timemission.eu/
curl -I https://www.timemission.eu/nl/antwerp
curl -I https://www.timemission.eu/houston
curl https://www.timemission.eu/data/site-profile.json
curl https://www.timemission.eu/sitemap.xml
curl https://www.timemission.eu/robots.txt
curl -s https://www.timemission.eu/cdn-cgi/trace | grep '^colo='
```

Expected results:

- `/nl/antwerp` is `200`, has `lang="nl-BE"`, an EU canonical, and reciprocal alternates.
- `/houston` is `301` to `https://www.timemission.com/houston`.
- The profile marker reports `eu`, `https://www.timemission.eu`, and
  `time-mission-website-eu`.
- The sitemap contains only `.eu` URLs and no US venue routes.
- No GTM network request occurs before EU analytics/ad consent.
- EU contact and newsletter submissions write to the EU D1 database and reach only the
  configured EU recipients.
- When Regional Services is required, repeated `colo` checks from multiple client regions
  resolve only to Cloudflare data centers inside the configured EU region.

## Rollback

Cloudflare Pages keeps prior deployments. Roll back the EU project independently; do not
roll back the US project unless the shared change also affected it. If the custom-domain
cutover itself is faulty, remove or revert only the EU `www` CNAME/apex redirect after
recording the previous DNS values.
