# Website v2 local review — 2026-11-06

Follow-up: the user subsequently approved a US-wide default and continuous ranks.
See the [leaderboard accuracy report](2026-11-06-leaderboard-accuracy-and-global-view.md)
and [mobile performance report](2026-11-06-mobile-performance-pass.md) for the latest
behavior. The original integration results below predate that scope update.

The complete pinned `website-v2` design through `bbe2928` is integrated in the isolated worktree `/Users/arisimon/orca/workspaces/time-mission-website/v2-integration`, branch `codex/website-v2-scoreboard`. The original `scoreboard` checkout and its unrelated changes are preserved.

- Review homepage: <http://localhost:4174>
- Review scores: <http://localhost:4174/leaderboard?location=philadelphia>
- Scope and decisions: [integration plan](../plans/2026-11-06-1424-feat-website-v2-integration-plan.md).

This is a local review build. No implementation was pushed or deployed, no live CMS migration was run, and no production DNS or credential configuration was changed.

## Delivered behavior

The design includes navigation, location selection, typography, homepage, footer, missions, locations, about, groups, press and FAQ surfaces. Existing booking destinations, return handling, regional routes, locale persistence, consent and analytics contracts remain covered by the source and browser checks below.

Both score surfaces now use the same server-side Pages Function. Visitors select an identified venue; the full board paginates and searches the loaded page. It shows actual team names and scores in provider order, with positions explicitly scoped to each returned page. Sample teams, invented mission counts, cross-venue rankings and unsupported weekly/monthly/all-time labels were removed.

The endpoint keeps authentication server-side, accepts only supported venue IDs and bounded page numbers, rejects redirects, enforces a five-second deadline and 64 KiB streamed response limit, validates UTF-8/JSON/schema, and caches only successful responses for 60 seconds. Empty, unsupported, unconfigured and temporarily unavailable results have distinct messages. Late results cannot overwrite a newer venue selection. Keyboard pagination and retries retain an explicit focus destination.

The location picker requests geolocation only from its explicit nearby action and does not persist raw coordinates. Open/closed information uses the configured venue timezone and special hours; unverifiable daily claims are suppressed while configured weekly hours remain available. Mobile menu focus, tap targets, booking labels/icons, language suggestions, press analytics and mobile score selection were repaired in the integrated shell. The optional social feed also has bounded transport and validated image/link URLs.

## Verified evidence

| Check | Result |
| --- | --- |
| Source contracts and unit tests | `npm run check`: 506 tests across 74 files; Astro check: zero errors and warnings. |
| US build | 1,055 HTML pages; 1,598,112 internal link/venue combinations; CSP hashes verified. |
| US final artifact/browser checks | All static artifact gates passed, including 143-page image accessibility. Complete browser selection covered 340 cases: 255 passed, 84 conditional skips and one stale hidden-hero selector. After that selector was corrected, all 32 commerce cases passed on desktop/mobile; all 256 active US cases are covered by successful runs. |
| EU build and complete artifact/browser pipeline | Passed: 543 HTML pages, 176,334 internal link/venue combinations, 90 browser cases passed and two breakpoint-specific cases skipped; 73-page image accessibility check; SEO, schema, hreflang, routing, analytics, consent, CSP and regional isolation checks passed. |
| Provider suites | US: 44 passed, six HTTPS/release-only cases skipped. EU: four passed, 46 US-registry/conditional cases skipped. Live Briq/Stripe initialization, educator forms, inquiry rendering and read-only production endpoint checks passed; no payment or production form submission was made. |
| Final shared EU changes | Rebuilt EU output passed analytics checks and all six focused desktop/mobile cases for visible homepage venue selection, localized accessible scores and press-title analytics. |
| Actual leaderboard integration | All nine configured cities matched provider location-detail responses and returned HTTP 200 through the local Pages Function. Eight venues returned ten rows; Dallas returned a verified empty result. |
| Visual review | Nine page families at desktop/mobile sizes: 36 full-page captures; 18 overflow checks passed. Fourteen viewport baselines reviewed and updated for the pinned design. |
| Independent code review | Two confirmed findings repaired with regression checks: pagination/retry focus loss and booking-label translation removing SVG children. |
| Dependency audit | Root `npm audit`: zero reported vulnerabilities after compatible lockfile updates and the `ws` override. CMS dependency graph was outside this update. |
| Credential/artifact scan | Private provider key absent from tracked/unignored source and generated pages; local binding ignored; sample scoreboard artifact absent. |

The complete EU run preceded the last two shared markup/CSS corrections; the rebuilt EU artifact and six focused checks above cover their final form. The US orchestrator log retains its initial selector failure: the entire affected test file and the provider stage were completed separately, without changing application code after that run.

Provider validation on November 6 used these mappings: Lincoln `1001`, West Nyack `1002`, Manassas `1004`, Philadelphia `1005`, Mount Prospect `1006`, Houston `1008`, Orland Park `1009`, Edison `1011`, Dallas `1012`. An empty Dallas response omits `entries`; only a verified zero-total response may use that omission. Other malformed responses fail closed.

## Measured performance

Three Lighthouse 13.6 mobile runs per route, before and after the integration changes, against local HTTP builds. Values below are medians; these are synthetic measurements, not field results or a production performance guarantee.

| Route | LCP before → after | TBT before → after | Transferred bytes before → after |
| --- | --- | --- | --- |
| Homepage | 10.24 → 10.37 s | 180 → 130 ms | 6.13 → 6.18 MB |
| Venue | 7.99 → 7.96 s | 283 → 260 ms | 6.21 → 6.28 MB |
| Leaderboard | 3.25 → 2.63 s | 183 → 207 ms | 1.82 → 1.76 MB |

Leaderboard CLS improved from `0.189` to `0.015`. First-party compressed JS/CSS remained approximately 53/30 KB for home, 51/29 KB for the venue, and 46/24 KB for the board. Hero video and third parties dominate the larger pages; the homepage still exceeds the performance skill's investigation thresholds. The licensed Adobe font project uses `font-display: auto`; no immediate font-swap claim is made. The inherited mobile chat bubble partly overlaps the Houston booking bar's edge, with the booking control still usable.

## Reproduce the local review

From the integration worktree, install the lockfile dependencies and run `npm run check`. Keep the provider key only in ignored `.dev.vars` as `TM_LEADERBOARD_AUTHENTICATION`; it is not a public build variable. The checked-in `.env.example` and [public API documentation](../tm-public-api.md) describe the contract without credentials.

```sh
PUBLIC_TM_MEDIA_BASE=https://pub-703466e77255453f8a7b58b18dfd4a88.r2.dev npm run build:us
npx wrangler pages dev dist --port 4173 --binding TM_SITE_PROFILE=us --binding PUBLIC_SITE_ORIGIN=https://www.timemission.com
TM_SITE_PROFILE=us PUBLIC_SITE_ORIGIN=https://www.timemission.com npm run verify:artifact:review
```

Restart the test server when changing profiles: Pages redirect configuration is loaded at startup. The user-facing port 4174 serves a separate frozen US artifact so EU verification does not replace the review site. This session's manually installed native Playwright Chromium is selected with `PLAYWRIGHT_BROWSERS_PATH=/tmp/tm-v2-playwright-browsers`; a fresh machine can use the normal Playwright browser installation.

## Limits and release follow-up

The guarded CMS description migration is present but unexecuted. Live CMS artifact comparison was skipped because `PAYLOAD_CMS_ORIGIN` was not configured. Production leaderboard secret configuration, payment completion, production form delivery and the gated provider journeys remain release checks. No production write was needed for this local review.

Detailed session evidence is in `/tmp/compound-engineering-501/ce-plan-research/tm-v2-nov6`; source check log: `/tmp/tm-v2-check-handoff.log`; US full run: `/tmp/tm-v2-us-complete-verification.log`; commerce repair verification: `/tmp/tm-v2-groups-commerce-final.log`; US providers: `/tmp/tm-v2-us-providers-final.log`; EU complete run: `/tmp/tm-v2-eu-verification.log`; final EU shared checks: `/tmp/tm-v2-eu-shared-final-browser.log`. These temporary files are local evidence and may not survive machine cleanup.
