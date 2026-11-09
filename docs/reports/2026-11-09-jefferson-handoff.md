# Website v2 / scoreboard handoff

Branch: `jefferson/website-v2-scoreboard`.

This branch contains the source used for [staging](https://staging.time-mission-website.pages.dev), including the real [leaderboard](https://staging.time-mission-website.pages.dev/leaderboard), mobile performance work and scoreboard styling. The [staging deployment report](2026-11-09-scoreboard-staging-deployment.md) records its artifact digest and checks. The original `website-v2` branch is preserved.

## Pending design work

The user wants Jefferson to revisit the top-bar **full-screen location picker**. The intended replacement design reference is still needed. Its current component and picker styles match the pinned `website-v2` design at `bbe2928`; no speculative picker redesign was made.

Edit these files:

- `src/components/LocationOverlay.astro`: picker markup and location groups.
- `css/location-overlay-v2.css`: current picker styling; layered over `css/location-overlay.css`.
- `js/nav.js`: opening, closing, search, venue preview and explicit nearby-location action.
- `src/data/site/site-css-assets.json`: shared CSS versions when changing picker styles.
- `src/components/Leaderboard.astro`, `css/leaderboard.css` and `js/leaderboard.js`: scoreboard markup, styles and API rendering.

Keep geolocation behind the explicit “Use my location” action, venue/booking links tied to the existing location catalog, and API authentication on the server. The capped US top-100 feed and tie-aware ranks are established in `functions/_shared/leaderboard.mjs`.

## Local checks and deployment

Follow `RTK.md` and the existing verification scripts. The recorded validation includes 514 source tests, all applicable desktop/mobile smoke cases and 44 provider checks, plus live staging comparisons against the leaderboard API. For picker edits, the focused browser files are `tests/smoke/shell-contracts.spec.js`, `tests/smoke/site-location.spec.js` and `tests/smoke/navigation-context.spec.js`.

Local API access uses `TM_LEADERBOARD_AUTHENTICATION` in ignored `.dev.vars`. Its encrypted Cloudflare **preview** secret is already configured; its value is not in this branch. Builds also need the public media origin described in `.env.example`.

The current authorization is **staging only**. Its Pages branch is `staging`; the US production branch is `rebuild`. Git pushes to this handoff branch do not update the current staging deployment automatically. Coordinate a verified preview upload when the edits are ready. Production and CMS migrations have not been deployed as part of this handoff.
