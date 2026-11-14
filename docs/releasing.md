# Releasing to production

Use one command for every production release:

```bash
npm run release
```

It releases the commit you have checked out, and only if that commit is clean and pushed.
Run it from the branch you want live after `git push`.

## What it does

1. **Checks the commit.** Refuses tracked, uncommitted changes and any HEAD that differs from `origin/<branch>`. Production must always be reproducible from git.
2. **Builds from fresh checkouts** of that commit in temporary directories, one per site, with `npm ci`. Local edits, untracked files, and old `dist/` output cannot reach production. Your `.env` files are copied in.
3. **Deploys the CMS first** (Railway `time-mission-website`), then waits until it is running. The CMS runs its Payload migrations on start. The static build reads CMS pages, banners, blog posts, and SEO, so it has to come second. The CMS is skipped automatically when `cms/` has not changed since the live release.
4. **Builds and verifies the US and EU sites side by side** through `scripts/deploy-pages-profile.mjs --build --no-deploy`: source checks, strict CMS read, artifact checks, and smoke tests. Each site gets its own checkout and its own free ports, and the test servers never attach to a server that is already running, so a local preview cannot be tested by mistake. Output lines are prefixed `[us]` or `[eu]`. If either site fails, neither is deployed.
   **Then deploys both sites** from the verified builds as Direct Uploads tagged with the commit SHA.
5. **Verifies the live sites** with `npm run verify:live`. This confirms each region serves the released commit, the response-header CSP is still `frame-ancestors` only, and GTM is loaded with Meta, Google, and TikTok hosts allowed. It also runs the live provider and tracking browser suite.

Options:

| Option | Use |
| --- | --- |
| `--dry-run` | Show the plan (commit, CMS decision, sites) without deploying. |
| `--cms=skip` / `--cms=force` | Override the automatic CMS decision. |
| `--only=us` / `--only=eu` | Release one region. |
| `--verify-only` | Build and verify every site exactly as a release would, then stop. Nothing is deployed, including the CMS. |
| `--serial` | Build and verify the sites one after the other instead of side by side. Use it if the parallel run makes timing-sensitive smoke tests fail. |
| `--skip-live-checks` | Skip step 5; run `npm run verify:live` yourself afterwards. |

You need to be logged in to `wrangler` and `railway`. EU values that are public (GTM, Turnstile site key) have defaults in `config/deployment-targets.mjs`. The EU D1 database ID is looked up with `wrangler d1 list` unless `EU_D1_DATABASE_ID` is set.

## Guard rails

- `npm run deploy:pages:us` / `:eu` refuse production deploys unless they run inside a release (`TM_RELEASE_COMMIT` is set by the release and by the GitHub workflow). In an emergency, add `--allow-unreleased`. Then commit what you shipped and run a normal release as soon as possible.
- Deploy builds always read the production CMS with `PAYLOAD_CMS_BUILD_STRICT=true`. Before this, local deploys without `PAYLOAD_CMS_ORIGIN` silently shipped without CMS tickers and blog posts.
- A Pages build fails if the CMS content has no matching translation or route, which also catches deploying Pages before a CMS migration has run.
- Every production artifact records its commit in `/data/site-profile.json`. `npm run verify:live -- --commit <sha>` checks it.
- EU builds no longer rewrite the committed root `_headers`. Only US builds refresh it.

## Rollback

Roll a region back from the Cloudflare Pages dashboard (Deployments → previous production deployment → Rollback). Each deployment shows the commit it was built from. Roll the CMS back from Railway (Deployments → Redeploy a previous deployment). Payload migrations do not roll back automatically. Most content migrations here are forward-only by design.

## Known gap

The GitHub `CMS Wrangler Deploy` workflow (and the CMS `/deploy` button that dispatches it) currently fails. Its visual smoke tests have only macOS baselines, and the runner is Linux. Use `npm run release` until Linux baselines exist.
