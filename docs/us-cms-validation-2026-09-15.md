# US CMS validation — September 15, 2026

## Scope and source of truth

Read the current `https://www.timemission.com` website before testing CMS publishing. The comparison uses live public HTML, the live sitemap, and `/data/locations.json`, rather than assuming the local checkout is the deployed site. Public CMS records were captured from the production Railway REST API at the same time.

Evidence is saved under `output/us-cms-validation-2026-09-15/`. Public copy and schedules were preserved. Authenticated tests re-saved the Nashville article and changed/restored one internal announcement title; update timestamps and editor serialization changed.

## Content reconciliation

| Area | Result |
| --- | --- |
| Public US URLs | 106 fetched successfully, including sitemap URLs and CMS-managed US page paths |
| CMS-managed page SEO | 51 US records match live titles, descriptions, robots directives, Open Graph images, and Twitter images |
| Location details | All 11 US locations match addresses, weekly/special hours, CMS-managed external links, group-form destinations, and hidden missions |
| Articles | All three CMS article titles and body text segments are present on their live article pages; article SEO and social image values match |
| External coverage | MassLive title and source URL match the public In the News page |
| Announcements | The selected active announcements for nine US locations match public messages and links |
| CMS landing records | No published records returned; authenticated drafts remain uninspected |

No drift requiring a production overwrite was found in these CMS-managed fields. This is not a claim that every website component is editable in the CMS. General page body copy, layout, location contact details, FAQs, and some booking configuration are code-owned. Expanding that scope requires additional content models and public-site integration.

## Validation completed

- Production CMS deployment `fc232190-b5c4-4f26-be40-95d656dc4c48`: Railway reports SUCCESS.
- Anonymous draft query returns zero documents.
- Blog creation, private preview, deployment, and access-management pages redirect signed-out visitors to login, preserving the destination.
- `npm run check`: passed; 62 test files, 324 tests; Astro reports zero errors/warnings/hints; source contract checks passed.
- `npm run typecheck --prefix cms`: passed.
- Strict US build against the live CMS: passed.
- `check-payload-dist`: passed for all four published blog records; zero published landings.
- Full desktop/mobile smoke run: 206 passed, 2 failed, 50 skipped. Both failures were an outdated Houston ticker assertion. After correcting that test to exercise the canonical fallback after the current scheduled announcement expires, the four targeted desktop/mobile ticker checks passed. The full suite was not rerun after this test-only correction; skipped cases remain unverified.

## Publishing defect and local fix

`triggerGithubActionsDeploy` sent an undeclared `source` input to GitHub Actions. Neither the current regional workflow nor the remote `rebuild` workflow declares it. Removed that input and extended the deploy-gate test to check dispatched input names against the real workflow definition. The test also checks the regional workflow defaults to US.

GitNexus impact: LOW, one direct caller (`triggerCmsDeploy`), confined to the CMS deploy path. Focused deploy-gate tests pass. Scoped fixes and tests committed and remote-verified as `ac1a4abd62c7bd31defae400d5d28be09898bea0` on `codex/timemission-us-deployment`. No merge into `rebuild` was performed.

## Remaining checks

- Authenticated article save and preview, location no-change save, and ticker edit/save/restore are verified. Media upload and create/delete flows remain untested.
- Runtime deploy ref is verified as `codex/timemission-us-deployment`. The live CMS button reaches the expected GitHub workflow but receives HTTP 401: the configured deployment token requires replacement.
- The most recent CMS workflow run, `34499083610` (September 10), failed 18 browser assertions, including mobile header, ticker, and visual snapshots. The current run reduced this to the two stale ticker assertions described above; skipped coverage is not a pass.
- SMTP variable names are absent from the current Railway configuration. Email delivery is not configured; use the existing copyable setup-link workflow. No invite or reset email was sent during this audit.
- Authenticated drafts, future announcements, and unpublished landings are not proven by the public API comparisons.
- Cloudflare preview warns that the CSP header line is 2,764 characters, exceeding its 2,000-character limit, and ignores it. A live HEAD request to `/blog` returned HTTP 200 without a Content-Security-Policy header; the captured HTML has no CSP meta tag. This separate production security-header issue remains unresolved. Preview also warns about duplicate Antwerp and Brussels redirect rules.

## Operational boundaries

The working directory contained substantial pre-existing changes. The deployment input, its test, and the stale Houston ticker test were edited for this task. The existing Boston link change in the same browser-test file was preserved. Public snapshots and this report were added for auditability. No public US or EU deployment has completed during this audit. Two CMS service releases succeeded; the CMS public-site dispatch attempt was rejected by GitHub with HTTP 401.

Automatic approval review rejected exporting the entire Railway environment because it could persist secrets unnecessarily. No credential export was performed; subsequent checks used non-secret configuration, public APIs, and existing GitHub CLI access.

## Authenticated validation and scoped release continuation

- Signed-in admin access to the editor and deployment page verified. Deployment permission shows Ready.
- Location bulk save with no edits returned `status=no-changes` without rewriting records.
- Saving the existing company-wide Nashville article reproduced PostgreSQL enum error `22P02`: an empty location was persisted as an empty string. Fixed by persisting null; three actual save-action regression tests pass.
- Announcement saving now skips unchanged rows and preserves precise existing schedule timestamps when the displayed date is unchanged. Four regression tests pass.
- All 13 focused CMS save/deployment tests and CMS TypeScript validation pass.
- Isolated release source checks and strict US build pass. Full isolated browser run: **198 passed, 50 skipped, zero failed**. This supersedes the earlier working-checkout run above.
- Verified current public Cloudflare source was `10ca8ef`, matching the US branch before these fixes. GitHub `rebuild` diverges from this branch, so a blind merge is not part of this release.
- Corrected Railway dispatch setting to `GITHUB_ACTIONS_DEPLOY_REF=codex/timemission-us-deployment`; activation is pending the new CMS release. Workflow default target is US.
- Railway release `58238ca3-8eb1-4ca8-b9a3-0182331dcbe5` submitted. The isolated CMS snapshot includes existing deployed migration files verified by hashes, plus scoped fixes, preserving running migration history. Build and post-release UI checks are in progress.
- Scoped commit contains eight files. Unrelated working changes, including the Boston link change in the shared smoke-test file, remain uncommitted.

## Final verified release state

- Remote branch SHA: `07ca24c71026c69be10d900acbc89ec8373873b5`. Includes scoped commit `ac1a4ab` and follow-up `07ca24c`; both pushed and remote-verified. No merge to `rebuild`.
- Follow-up live test exposed a Payload hook returning a boolean instead of the saved document, producing `/preview/blog/undefined`. Fixed `markCmsDeployNeeded` to return the document. Save-action regression now exercises that real hook. **14 focused tests pass**, CMS type checking passes.
- Final CMS Railway deployment: `8af8aa9c-a20b-42a4-8230-cfb7ef72f674`, **SUCCESS**. Browser save now opens `/preview/blog/4` and renders the Nashville article.
- Ticker unchanged save returned `count=0`. A Mount Prospect internal-title edit saved exactly one row and was restored. API comparison shows only that row's update timestamp and nested target row ID changed; all public fields, target values, and exact schedule timestamps remain identical.
- Article API comparison shows only update timestamp and benign Lexical link serialization changes (empty format/indent removed, empty caption added). Article text, links, title, dates, images, and SEO remain unchanged.
- Runtime non-secret settings verified: provider `github_actions`, repo `jrichson/time-mission-website`, workflow `cms-wrangler-deploy.yml`, ref `codex/timemission-us-deployment`, public origin `https://www.timemission.com`.
- Actual CMS deploy-button attempt returned `/deploy?status=failed`. Railway log: `GitHub Actions workflow_dispatch: jrichson/time-mission-website/cms-wrangler-deploy.yml@codex/timemission-us-deployment 401`. GitHub run listing confirms no new run. **End-to-end public deployment remains blocked by an invalid deployment credential, not CMS role permission.**
- User asked to replace `GITHUB_ACTIONS_DEPLOY_TOKEN` securely in Railway with valid repository Actions write access. No token was printed, exported, or substituted with a broader local credential.
