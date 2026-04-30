# Analytics event contract (browser + future `/api/events`)

Normalized events use a small shared schema so GTM `dataLayer` pushes and a future server-side `POST /api/events` endpoint can share dedupe and validation rules.

## Envelope (required)

| Field | Type | Notes |
|-------|------|--------|
| `event_id` | string | UUID v4 when available; stable for the single user action. |
| `event_name` | string | Uppercase name from `src/data/site/analytics-labels.json` `eventNames` values. |
| `timestamp` | string | ISO-8601 UTC. |
| `page_path` | string | Pathname only (no query/hash), site-relative path for stable reporting dimensions. |

## Optional context

| Field | Type | Notes |
|-------|------|--------|
| `parameters` | object | Keys must map to `parameters` in `analytics-labels.json` (GTM-friendly aliases). |
| `consent_snapshot` | object | Subset of Consent Mode states the client knew at enqueue time (non-PII). |
| `consent_profile` | string | Route-derived profile (`eu_strict`, `us_open`, `global_strict`) for policy/debug context. |
| `utm_*` / click IDs | string | Campaign attribution context (for example `utm_source`, `utm_campaign`, `gclid`, `fbclid`, `msclkid`) captured from landing URL and persisted in local storage. |

## Forbidden (PII and free text)

Do **not** send:

- Visitor **email**, **name**, **phone**, **address**, raw **message** / **comment** body, or other direct identifiers.
- Full free-text **subject** lines from contact forms.

Use **counts**, **option ids** (e.g. `subject: "groups"`), **slugs**, and **paths** only.

## Alignment

Runtime labels and GTM event names are defined in `src/data/site/analytics-labels.json`. `js/analytics.js` embeds the same object as `TM_ANALYTICS_LABELS_EMBED`; `npm run check:analytics` fails on drift or banned substrings.

Separately, the head bootstrap pushes a one-time `dataLayer` config event (`tm_tagging_config`) with non-PII routing metadata for web+server GTM orchestration (`tagging_mode`, server URL/path, web container ID, `consent_profile`). This is operator config context, not a conversion event.

Campaign attribution persistence uses a bounded first-party cache (30-day TTL) and replaces attribution atomically on new paid landings to avoid mixed campaign keys.
