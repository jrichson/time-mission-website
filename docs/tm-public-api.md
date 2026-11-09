# Time Mission — public browser API (`window`)

This document is the **supported extension surface** for locations, booking, and analytics on timemission.com. New features should call through these objects rather than reaching into script internals.

## `window.TMFacade` (preferred)

Single entry for editors and integrations:

| Property              | Description |
|-----------------------|-------------|
| `TM`                  | Location data API (`load`, `get`, `select`, `listTicketOptions`, etc.) — see below. |
| `TMBooking`           | Booking gateway: `resolveIntent`, `getDestination`, `navigate`, `attach`, `isDirectBookingUrl`. |
| `TMAnalytics`         | `track(eventKey, params)` — normalized, non-PII GTM queue (see `analytics-labels.json`). |
| `BookingController`   | Lower-level attachment helper (legacy name); prefer `TMBooking` for navigation decisions. |

Getters resolve at access time so `TMFacade` can point at modules loaded earlier or later in the browser script chain.

## `window.TM` (locations)

Defined in `js/locations.js`. Notable methods:

- `TM.ready` — Promise when `data/locations.json` has been fetched.
- `TM.load()` — loads location roster (called by pages).
- `TM.get(id)`, `TM.getOpen()`, `TM.getByRegion(region)`
- `TM.normalizeSlug(value)` — same slug key rules as `id` / URL-derived location state.
- `TM.isIndexPath()` — `true` when the current URL is the marketing homepage (no forced location restore).
- `TM.select(id, opts?)` — selects a local, non-external location for the current page session. Optional `opts.cta_id` is merged into the `location_select` analytics payload (single event per selection).
- `TM.clear()`, `TM.restore()`
- `TM.listTicketOptions()` — ticket panel `<option>` data; **must match** `src/lib/ticket-options.ts` (`ticketPanelSelectOptions`).
- `window.LocationContext.getLocationView(id)` — stable location view data for overlay/footer/ticket surfaces.

## `window.TMBooking`

Defined in `js/booking-controller.js`. Use for programmatic booking navigation and panel coordination.

- `TMBooking.resolveIntent(opts)` — returns the booking decision for a location/kind/group combination, including `href`, `presentation`, and provider flags.
- `TMBooking.getDestination(opts)` — returns only the destination URL from the same decision logic.
- `TMBooking.navigate(intent)` — tracks and performs the selected presentation: Briq widget, Roller iframe, group iframe, EU outbound link, external provider link, or normal internal link.

## `window.TMI18n`

Defined in `js/language-switcher.js`. Static copy still uses `data-i18n` attributes.

- `TMI18n.t(key, lang?)` — raw translation lookup.
- `TMI18n.text(key, fallback, replacements?)` — string fallback plus `{token}` formatting for dynamic browser copy.
- `TMI18n.array(key, fallback)` — array fallback for rotating browser copy.

## `window.TMAnalytics`

Defined in `js/analytics.js`. Keys must exist in `src/data/site/analytics-labels.json` (including `site_contract_stale` for roster drift diagnostics).

## `window.__TM_SITE_CONTRACT__`

Small JSON-safe embed from `getPublicSiteContract()` (build time). Includes `locationsFingerprint`, location ids, EU external-location ids, booking presentation facts, and runtime event/storage keys for comparing the shipped roster hash to the fetched `locations.json` after `TM.load()` (non-PII analytics signal on mismatch).

## `GET /api/leaderboard`

Same-origin top-100 scores for the homepage and leaderboard page. Required `location` is one of
`lincoln`, `west-nyack`, `manassas`, `philadelphia`, `mount-prospect`, `houston`,
`orland-park`, `edison`, or `dallas`, or `global` for the combined US top 100. EU
venues are currently unsupported: fresh provider calls for Brussels, Antwerp and
Eindhoven returned `Platform database error 1045`. Optional `page`
defaults to `0` and accepts decimal integers from `0` through `99`, without leading
zeroes. Unknown or duplicate parameters and methods other than GET are rejected.

Example: `/api/leaderboard?location=philadelphia&page=0` returns:

```json
{"location":"philadelphia","page":0,"pageSize":10,"totalRecords":0,"entries":[]}
```

Each populated entry contains `team` (text), `score` (integer), `location`
(canonical venue slug) and `rank` (integer). Ranks are calculated from the reported
scores across the selected top-100 dataset: ties share a rank, with competition
ranking such as `1, 1, 3`. They do not restart on each page. Render team names as
text. Pages contain at most ten entries, and `totalRecords` is at most 100.

The global dataset combines the reported top 100 from each of the nine configured
US venues, sorts by total score and retains the top 100 overall. This finds the
top 100 among the scores returned by those connected venues without an unbounded
history scan. All nine venue reads must succeed; partial results are never
published as a complete US ranking. The provider returns no native global rank,
stable team ID, snapshot timestamp or verified human definition of numeric period
`0`. The UI therefore makes no weekly, monthly, all-time, unique-player or
worldwide-completeness claim.

The generic leaderboard page defaults to `global`. Explicit `?location=<slug>`
overrides that default, and venue-scoped URLs use the existing URL context helper
to choose their venue. A saved selection alone does not change a generic page's
initial global view. Clearing the shared venue context returns to `global`.

Errors return `{"error":"code"}` with one of these stable codes:

| Status | Code | Meaning |
| --- | --- | --- |
| 400 / 405 | `invalid_request` | Invalid query or method; 405 includes `Allow: GET`. |
| 400 | `unsupported_location` | The location has no verified provider mapping. |
| 503 | `configuration_unavailable` | The private Pages secret is absent. |
| 502 | `upstream_unavailable` | Provider transport, deadline, body or schema validation failed. |

Set `TM_LEADERBOARD_AUTHENTICATION` as a Cloudflare Pages secret for each enabled
environment, or in an ignored `.dev.vars` for local Pages testing. It is used only
by the Function against the fixed Time Mission upstream. The Function supplies
the required Time Mission Origin and rejects redirects. A single five-second
deadline covers every required fetch and body read, including all nine requests
for a global view. Each venue's ten provider pages are batched into one request,
bounded to 64 KiB with strict UTF-8/JSON/schema validation. Missing pages,
inconsistent totals or incomplete page lengths fail closed. The provider's JSON
may have a `text/html` content type.

Only normalized successful top-100 datasets are cached for 60 seconds, separately
by selected venue/global scope and reused for pagination. Cache failures fall
back to the provider. Errors use `no-store`.
Every response supplies JSON content type and `X-Content-Type-Options: nosniff`;
provider cookies, private URLs and raw errors are never forwarded.

Handler fixtures cover the boundary without a real credential. They do not prove
production secret configuration or current provider availability.

## Contract checks

- Booking rules: `scripts/policies/booking-policies.cjs` via `scripts/check-booking-architecture.js`.
- Full gate: `npm run verify`.
