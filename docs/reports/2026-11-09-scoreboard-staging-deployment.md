# Scoreboard staging deployment — 2026-11-09

The reviewed US website preview is deployed to [staging](https://staging.time-mission-website.pages.dev). The [leaderboard](https://staging.time-mission-website.pages.dev/leaderboard) includes the real US top-100 feed, continued ranks, pagination scrolling, mobile optimizations and scoreboard delight treatment.

## Deployment

- Cloudflare Pages project: `time-mission-website`.
- Environment: `preview`; branch: `staging`, distinct from production branch `rebuild`.
- Deployment: `88156716-4a6d-456a-9b95-12006e707971`.
- Immutable URL: <https://88156716.time-mission-website.pages.dev>.
- Verified artifact digest: `ccd2690c8cbf4902ec6394973184f5229d0a026e5c15e8e4fa973cb816abc190`.
- Source: the reviewed local checkout based on `35749cf3698e092e4184bfb052c898034e99a215`, with Cloudflare metadata explicitly marking local changes as dirty. No Git commit or push was performed.
- The existing artifact helper staged verified copies of `dist/`, `functions/`, migrations and Wrangler configuration. No database migration was executed.
- `TM_LEADERBOARD_AUTHENTICATION` was added as an encrypted **preview-only** secret. The deployment files were scanned for its literal value before upload; none contained it.

## Production isolation

Cloudflare confirmed both production deployment IDs, production environment configurations and custom-domain associations were unchanged before and after the upload:

| Site | Unchanged production deployment |
| --- | --- |
| US | `dc5adfec-9071-40b3-90dc-48170d838525` |
| EU | `12449cc4-4373-4312-b12c-c3ad7c7dd7fa` |

The leaderboard credential is absent from the US production environment. No production deployment, CMS content mutation or domain reassignment was performed.

## Validation

- Source checks: 514 tests passed; Astro reported no errors or warnings.
- Fresh preview build used the published CMS in strict read mode. Its Dallas booking update required four missing US Spanish translations, which were added without changing booking rules.
- Artifact checks passed for routes, links, SEO, schema, CSP, accessibility, localization and other required output contracts.
- The complete smoke run passed 267 cases with 88 expected skips. Its one remaining outdated assertion expected the old mobile video state; correcting it to expect the deliberate phone poster fallback produced two passing focused desktop/mobile checks. All 268 applicable smoke cases were therefore covered successfully against the same unchanged artifact.
- Two Dallas unavailable-state tests now provide their missing-booking/group-destination fixtures explicitly, independent of current CMS settings. Six focused desktop/mobile booking checks passed.
- Provider suite: 44 passed, six skipped. The artifact digest was checked unchanged before writing its preview verification stamp.
- On the deployed staging hostname, desktop/global, 393 px mobile/Orland Park and 320 px Spanish/Houston each matched all displayed names, scores and ranks against live API pages 0 and 1. Pagination scrolling, tie-aware first-place labels, hidden captions, no horizontal overflow and no uncaught page errors were verified.
- Staging responses include `X-Robots-Tag: noindex`, and their verification file matches the deployed artifact digest. The homepage top-five preview and current Dallas booking destination were also checked on staging.

No live form submissions, reservations or purchases were made. Booking links retain their existing provider destinations. Physical devices were not tested, and the EU artifact was not deployed.
