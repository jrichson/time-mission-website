# Leaderboard accuracy and US-wide default — 2026-11-06

The later [2026-11-09 staging deployment report](2026-11-09-scoreboard-staging-deployment.md) records the preview-only upload and production-isolation checks.

Local review: <http://localhost:4174/leaderboard>. Venue example: <http://localhost:4174/philadelphia/leaderboard>. Nothing was pushed or deployed.

## Source findings

The provider's [October 26 example-link thread](https://mail.google.com/mail/u/?authuser=ari%40converge.digital#all/1a17a152e966e149) documents `select_location_leaderboard`, `select_location_list` and `select_location_detail`. The user confirmed the 100-result cap and explicitly chose the nine responding US venues for the local global view.

Fresh `select_location_list` output contains 12 venues. The nine configured US venues respond successfully; Dallas currently has an empty result. Brussels `1003`, Antwerp `1007` and Eindhoven `1014` each return the non-JSON body `Platform database error 1045`, including when called with the European site Origin. This is a provider-side failure; no credential or provider configuration was changed.

The batch request format supports ten `select_location_leaderboard` calls in one request, covering pages 0–9. Every responding US venue was checked through that format. Results were descending by score, with valid ties and consistent totals. Lincoln had 61 records in the recorded audit, seven other US venues had 100 each, and Dallas had none: 761 candidates total. Counts can change as new results arrive.

## Resulting behavior

- A generic homepage or leaderboard defaults to **Global · US venues**. An explicit venue query wins, and venue-scoped URLs use the existing navigation context helper to select their venue. A saved venue alone does not replace the generic page's global default.
- The global view combines all connected US venue candidates, sorts by total score and returns the top 100. A venue view ranks that venue's capped list. Each row identifies its venue.
- Ranks continue across pages. Equal scores share a competition rank, such as `1, 1, 3`; a list of 100 scores can therefore end at rank 99 when the last two scores tie.
- On phones, each venue appears beneath its team name so long city names remain readable. The compact rank heading has a localized accessible label, and the page header leaves more room for the scores.
- The global result requires all nine configured US venue reads to succeed. It fails with a controlled unavailable state if any required read fails, instead of silently publishing a partial US ranking.
- Complete normalized top-100 datasets are cached for 60 seconds per selected scope, so pagination reuses the same result without re-fetching all venues. One five-second deadline covers all required upstream work; every venue response retains its 64 KiB streamed limit, fatal UTF-8 decoding and schema checks.
- Missing batch pages, inconsistent totals, incomplete page lengths and malformed rows fail closed. Authentication and provider error bodies remain server-side.

The API contract is documented in [tm-public-api.md](../tm-public-api.md). The original integration plan includes a follow-up scope note superseding its earlier venue-only restrictions.

## Accuracy evidence and limits

All ten local Pages API pages were compared with an independent fresh read of the nine provider lists. **All 100 rows matched exactly**, including team text, total score, venue and computed rank. The recorded comparison had 761 provider candidates and ranks 1–99 across the resulting 100 rows.

That verifies the integration against the provider feed. The provider's underlying game records were not independently audited. Its payload has no stable team ID, snapshot timestamp, native global rank or human definition of period `0`. The UI makes no named weekly/monthly/all-time promise, no unique-player claim, and no worldwide-completeness claim. It also does not infer that different room configurations provide normalized competitive conditions. The ranking uses the reported total scores as requested.

Remaining provider questions: repair the three European database errors; define period `0` and score comparability; supply snapshot/freshness and stable identity fields if stronger guarantees are needed. No message was sent to the provider.

## Checks

- 66 API checks passed, including ranking across page boundaries, cross-venue ties, top-100 cutoff, cache reuse, malformed responses, credential containment and a shared global deadline.
- `npm run check`: 514 tests across 75 files passed; Astro reported zero errors and warnings.
- US focused browser run: 46 passed, two phone-only cases skipped on desktop. Includes global defaults, venue-scoped and localized defaults, cross-page ranks, keyboard focus, failure/retry/timeout handling, late-response races, mobile performance, navigation and visual comparisons.
- EU focused browser run: 14 passed, two phone-only desktop skips. Includes the US-wide default, explicit unavailable European venue context, an explicit global override on a venue URL, English/Dutch checkout entry points and the mobile media/feedback checks. EU SEO output checks passed for all 35 public routes.
- The final venue-under-team presentation and compact mobile spacing were checked subsequently on the restored US artifact, including Spanish. The EU functional run predates that final presentation-only polish.
- Final restored-US leaderboard/mobile-performance run: 22 passed, two phone-only desktop skips. Live desktop, phone and Spanish venue-page assertions matched displayed ranks/scores to the local API and found no horizontal overflow. The first phone result ends above the fixed booking control.
- Final credential scan: the provider key was absent from 2,897 source/artifact files; `.dev.vars` remains ignored and the demonstration score artifact is absent.
- Live comparison: `/tmp/tm-mobile-performance-pass/global-live-comparison.json`.
- Provider audits: `provider-location-list.json`, `provider-top100-audit.json`, `provider-eu-access-audit.json` in the same temporary folder. No credentials or raw team lists were written into those evidence files.

The separate [mobile performance report](2026-11-06-mobile-performance-pass.md) records the hero, animation, touch-feedback and hidden Mission Rewards changes.

## Copy and pagination polish

The redundant venue/page caption above the table is visually hidden while retaining the table's accessible name. The visible page indicator remains below the results. US coverage and the top-100/tie rules remain explicit in the venue selector and scope text.

Previous/next controls bring the new results into view below the fixed navigation. The existing reduced-motion CSS controls scrolling, and focus stays within results during loading, retries and successful pagination without an extra scroll from the hidden caption.

The US build and all source checks passed (514 tests; no Astro errors or warnings). All 24 leaderboard browser checks passed on desktop and emulated mobile, including normal/reduced motion, continued ranks, hidden-caption accessibility and keyboard focus. Fresh provider-backed local checks on desktop/global and mobile/Orland Park confirmed page 2's ten displayed ranks against the API, starting at rank 11 in both recorded responses, with no horizontal overflow. The refreshed preview remains local at port 4174. Physical-device and EU-artifact checks were not repeated for this polish; nothing was pushed or deployed.

## Scoreboard delight pass

The shared homepage/full-page scoreboard now uses chamfered top-three rank badges, a first-place crown and localized “Score to beat” label, stronger top-score typography, a warmer surface, focused search feedback and brief button press feedback. These treatments follow actual ranks, including ties; filtering or changing pages does not promote a row into a false first place. The intro is now “Bring your crew. Set the score to beat.” Loading, empty and first-place copy is supplied in all four catalog languages.

Fresh results receive a 240 ms transform/opacity reveal with 20 ms row spacing (at most 420 ms for ten rows). Reduced motion, off-screen boards and search/language rerenders skip the reveal. No animation library, asset download, sound or continuous animation was added. The standalone minified/gzipped leaderboard CSS and JavaScript measure 4,258 bytes combined.

The US build, CSP/navigation output checks and source checks passed. The final browser run passed 30 checks with two desktop skips for phone-only tests, covering tie-aware leader treatment, bounded reveals, reduced motion, pagination, focus, API error states, accessibility and existing mobile media/booking behavior. Real-feed visual checks covered desktop, 393 px mobile, 320 px Spanish and the homepage preview; no horizontal overflow was found, and the off-screen homepage board scheduled no row animations. Physical devices and the EU artifact were not tested in this pass. Nothing was pushed or deployed.
