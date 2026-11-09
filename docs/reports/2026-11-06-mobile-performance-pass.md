# Mobile performance and interaction pass — 2026-11-06

Local review: <http://localhost:4174>. No implementation was pushed or deployed.

## Changes

- Phones up to 768 px use the existing hero photograph instead of automatically downloading a background video. The existing desktop video source attachment remains available. Media policy is evaluated when the page initializes.
- The mobile experience carousel uses its existing step timer without an idle animation-frame loop. Desktop wrapping reuses measured card widths and refreshes those measurements on resize.
- Mobile wordmarks and the fixed booking button retain their brand gradients without continuous background-position animation. The booking button has a 120 ms press response, disabled for reduced motion. Homepage entrance animations on phones finish in 350 ms without a stagger delay.
- Mission Rewards is hidden in the shared header, including its mobile icon, keyboard access and accessibility-tree entry.

The GSAP performance guidance was applied to the existing JavaScript runtime: fewer layout reads and compositor-friendly interaction feedback. No new runtime dependency or media asset was needed.

## Before and after

Three Lighthouse 13.6 mobile runs before and three after, using the same local Pages URL, browser and default throttling. External scripts remained enabled in the measurements. The table shows medians.

| Metric | Before | After |
| --- | --- | --- |
| Performance score | 69 | 93 |
| Largest Contentful Paint | 7.04 s | 2.37 s |
| First Contentful Paint | 2.31 s | 2.37 s |
| Total Blocking Time | 133 ms | 136 ms |
| Cumulative Layout Shift | 0.0016 | 0.0016 |
| Transferred bytes | 5.76 MB | 1.96 MB |

Median LCP fell by about 66%, and transferred bytes by about 66%. Individual after-run LCP values ranged from 2.32 to 3.18 seconds; scores ranged from 79 to 93. FCP and TBT did not improve materially. Third-party scripts and fonts still dominate much of the remaining cost, and total transfer remains above the 1.5 MB investigation budget.

These are synthetic local measurements, not production field results or physical-device benchmarks.

A later single-run sanity check of the final combined build, including the new
US-wide leaderboard default, recorded LCP/FCP of **3.42 s**, performance score
**80**, TBT **135 ms** and transfer **1.96 MB**. It is separate from the three-run
medians above and demonstrates the remaining timing variability. The transfer
reduction held; a consistently sub-2.5-second LCP has not been established.

## Verification

- `npm run check`: 508 tests across 75 files passed; Astro reported zero errors and warnings.
- New runtime checks prove that phone step mode schedules no idle animation frames and desktop animation does not remeasure widths on every frame.
- Final US visual, mobile layout and performance browser run: 42 passed, six conditional skips. Existing booking, menu and group-commerce checks passed in the broader focused run. Its one new wordmark-animation failure exposed an inherited CSS override; that rule was corrected and the final run passed.
- EU focused run: 12 passed, two desktop skips for phone-only cases. Includes English/Dutch checkout entry points, homepage/Antwerp poster policy and reduced-motion feedback.
- Both regional builds passed navigation-output and CSP checks. US artifacts were restored for the review preview afterward.
- Follow-up leaderboard work passed the full source check with 514 tests and a final 22-case US leaderboard/mobile run; see the [leaderboard accuracy report](2026-11-06-leaderboard-accuracy-and-global-view.md).
- Manual desktop/mobile browser assertions confirmed Mission Rewards is hidden and absent from the accessible button list. Desktop still attaches video sources; phones attach none. No visual baselines needed further updates for this pass.

Detailed reports and screenshots: `/tmp/tm-mobile-performance-pass/`. Key files are `before-summary.log`, `after-summary.log`, `source-check-final.log`, `us-final-browser.log`, `eu-browser.log`, and `home-{desktop,mobile}-after.png`. Temporary evidence may be removed by machine cleanup.

Skipped physical phones, production release, live CMS changes and payment submissions. Existing tracking and font-provider configuration were not changed during this pass.
