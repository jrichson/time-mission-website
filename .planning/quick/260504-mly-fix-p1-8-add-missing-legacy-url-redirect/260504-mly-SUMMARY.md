---
phase: quick-260504-mly
plan: 01
subsystem: redirects
tags:
  - audit
  - p1-8
  - cloudflare-pages
  - seo
  - legacy-urls
dependency-graph:
  requires:
    - _redirects (existing Cloudflare Pages redirect file)
    - docs/redirect-map.md (existing redirect documentation)
    - data/locations.json#west-nyack (Palisades link-equity rationale)
  provides:
    - 12 WordPress-era 301 redirects (/wp-login.php, /wp-admin[/*], /cart[/*], /checkout[/*], /shop[/*], /feed, /atom.xml, /wp-sitemap.xml)
    - 1 Palisades 301 redirect (/palisades -> /west-nyack)
    - documentation section "WordPress-Era Legacy Paths (P1-8)" explaining 410-vs-301 Cloudflare Pages constraint
  affects:
    - none (purely additive; no existing rule mutated, no source-code symbol modified)
tech-stack:
  added: []
  patterns:
    - additive-config-edit
    - host-redirect-fallback (no Pages Function required)
key-files:
  created: []
  modified:
    - _redirects
    - docs/redirect-map.md
decisions:
  - id: D-260504-mly-1
    summary: "Use 301 to / for WordPress-era legacy paths (Cloudflare Pages _redirects does not support 410 Gone). Trade-off accepted because SEO outcome is comparable for low-volume bot/legacy URLs and a Pages Function is out of scope."
  - id: D-260504-mly-2
    summary: "/palisades redirects to /west-nyack (not /) because data/locations.json#west-nyack records brand name 'Time Mission Palisades' and venue 'Palisades Center'. Mirrors the existing /providence -> /lincoln link-equity precedent."
metrics:
  duration: ~6 min
  completed: 2026-05-04
---

# Quick Task 260504-mly: Add Missing Legacy URL Redirects (P1-8) Summary

**One-liner:** Closed audit gap P1-8 by appending 12 WordPress-era 301 redirects plus one /palisades -> /west-nyack 301 to `_redirects`, with a documentation section in `docs/redirect-map.md` explaining the 410-vs-301 Cloudflare Pages status-code constraint.

## What Changed

### `_redirects` (+18 lines)

Appended a new block after the existing `/locations/ /locations 301` line. No prior rule was modified.

| # | Source | Target | Status | Purpose |
|---|--------|--------|--------|---------|
| 1 | `/wp-login.php` | `/` | 301 | WordPress login probe (frequent bot traffic) |
| 2 | `/wp-admin` | `/` | 301 | WordPress admin parent path |
| 3 | `/wp-admin/*` | `/` | 301 | WordPress admin descendants (splat) |
| 4 | `/cart` | `/` | 301 | WooCommerce cart parent path |
| 5 | `/cart/*` | `/` | 301 | WooCommerce cart descendants |
| 6 | `/checkout` | `/` | 301 | WooCommerce checkout parent path |
| 7 | `/checkout/*` | `/` | 301 | WooCommerce checkout descendants |
| 8 | `/shop` | `/` | 301 | WooCommerce shop archive parent |
| 9 | `/shop/*` | `/` | 301 | WooCommerce shop descendants |
| 10 | `/feed` | `/` | 301 | WordPress RSS feed |
| 11 | `/atom.xml` | `/` | 301 | WordPress Atom feed |
| 12 | `/wp-sitemap.xml` | `/` | 301 | WordPress-generated sitemap (canonical is `/sitemap.xml`) |
| 13 | `/palisades` | `/west-nyack` | 301 | Legacy slug — West Nyack venue is at Palisades Center |

Two header comments were also added:

```
# WordPress-era legacy paths (P1-8 audit finding)
# 410 Gone is unsupported by Cloudflare Pages _redirects; using 301 to / per docs/redirect-map.md
```

```
# Palisades legacy slug — West Nyack is at Palisades Center (data/locations.json#west-nyack)
# 301 to /west-nyack preserves link equity vs sending to /
```

Splat patterns use single `*` (Cloudflare Pages / Netlify form). Both bare path (`/wp-admin`) and splat (`/wp-admin/*`) variants are required because `_redirects` splats only match descendants, not the parent itself. Same applies to `/cart`, `/checkout`, `/shop`.

### `docs/redirect-map.md` (+38 lines)

Appended a new "WordPress-Era Legacy Paths (P1-8)" section after the existing "Source Traffic to Preserve" block. Contents:

- A nine-row mapping table for the new redirects
- A "Why 301 and not 410 Gone" subsection explaining the Cloudflare Pages status-code constraint (200, 301, 302, 303, 307, 308 — no 410)
- An optional escape hatch noting that a Cloudflare Pages Function under `functions/` could emit `new Response(null, { status: 410 })` if 410 ever becomes a hard requirement
- A "Verification on Cloudflare Pages preview" subsection with a `curl -sI` snippet operators can run against any preview host

## Key Decisions

### D-260504-mly-1 — 301-to-/ instead of 410 Gone

The original P1-8 audit recommended 410 Gone so search engines deindex faster. **Cloudflare Pages `_redirects` does not support 410** — the engine accepts only 200 (rewrite), 301, 302, 303, 307, and 308. Emitting 410 would require either a Cloudflare Worker or a Pages Function intercepting these paths, both outside the scope of a static-redirect change.

The SEO outcome of 301-to-`/` is comparable for these low-volume bot and legacy paths: search engines drop them after a few crawl cycles either way, and any residual human traffic lands on the homepage instead of an error page. The escape hatch (Pages Function emitting 410) is documented in `docs/redirect-map.md` for future reference.

### D-260504-mly-2 — /palisades -> /west-nyack (not /)

`data/locations.json` line 148 records the West Nyack location's brand name as **"Time Mission Palisades"** and its `venueName` as **"Palisades Center"**. The existing `/providence /lincoln 301` rule (`_redirects` line 55) sets the precedent for legacy-slug → canonical-slug 301 to preserve link equity. Sending `/palisades` to `/` would discard that equity and confuse bots/users who searched the brand name "Time Mission Palisades". Therefore the rule maps to `/west-nyack` (the canonical extensionless slug for that venue).

## Verification

All commands run from the worktree at commit `7240619`:

```
npm run check:routes -- --redirects   # PASS — Route contract check passed.
npm run check                          # PASS — all 18 sub-checks green
npm run verify                         # PASS — all 8 dist checks green + 20/20 Playwright smoke tests
```

`npm run check` ran: compile:routes, vitest (4 tests), check:locations (10 locations), check:sitemap (30 URLs), check:components (32 pages), check:booking, check:a11y (33 pages), check:links (33 pages), check:routes, check:site-data, check:location-routes, check:fallback, check:component-usage (16 pages), check:site-contract, check:analytics, check:consent, check:seo-catalog (32 routes), check:seo-robots (32 routes).

`npm run verify` (verify-site-output.mjs) added: ticket-panel-parity (14 dist pages), ticket-panel-source-parity, seo-output (15 routes), schema-output (14 routes), sitemap-output (30 URLs), robots-ai-bots (11 bots), llms-txt (24 URLs), nap-parity (2 locations), and Playwright (20 tests passed in 16.1s).

### Self-checks (executed during task)

- `grep -E "wp-login|wp-admin|^/cart |^/cart/\*|^/checkout |^/checkout/\*|^/shop |^/shop/\*|^/feed |^/atom\.xml|^/wp-sitemap|^/palisades" _redirects | wc -l` → **13** (expected 13)
- All 13 exact-match `grep -E` rules present
- `grep -vE "^\s*#" _redirects | grep -E " 410($| )"` → exit 1 (no 410 status code on data lines; only in descriptive comment)
- `docs/redirect-map.md` contains "WordPress-Era Legacy Paths (P1-8)" and "410 is not available"

### Cloudflare Pages preview verification (post-deploy, human-led)

Operators should run the snippet from `docs/redirect-map.md` § Verification on Cloudflare Pages preview against the next preview URL:

```bash
for path in /wp-login.php /wp-admin /wp-admin/users.php /cart /checkout /shop /feed /atom.xml /wp-sitemap.xml /palisades; do
  echo -n "$path -> "
  curl -sI "https://<preview-host>$path" | head -2 | grep -iE 'location|http/'
done
```

Expected: every path returns `HTTP/.* 301` with `Location: https://<preview-host>/` (or `/west-nyack` for `/palisades`).

## Deviations from Plan

None — plan executed exactly as written. The pre-approved checkpoint decisions (Palisades → West Nyack mapping, 301 instead of 410) were applied without pause per orchestrator pre-approval.

### Note on plan vs file state

The plan referenced an older 97-line `docs/redirect-map.md` shape (with WordPress-style Vercel JSON examples and "Old → New" framing). At the actual task base commit (`848de2d`) the file is the modernized 89-line Astro-era version. The new section was appended after the existing "Source Traffic to Preserve" block as the plan intended; the placement is unchanged but the surrounding text is the modernized version. This is a state mismatch in the plan input, not a deviation in execution.

### Note on worktree base

The task started from base commit `aa9b04f` (older `rebuild` branch tip) but the worktree-branch-check protocol mandated reset to `848de2d`. A `git reset --soft 848de2d6c54f8146987fc99917efed9852240c88` was executed; the worktree filesystem (sparse) was then populated from `HEAD` via `git checkout HEAD -- .` so `npm run check` and `npm run verify` could run. No source-code commits were lost — the prior `aa9b04f` content remains reachable via reflog if needed.

## Authentication Gates

None.

## Threat Flags

None — purely additive redirect rules. No new network endpoint, auth path, file-access pattern, or schema change at a trust boundary. The new rules route legacy paths to existing canonical destinations on the same host.

## Known Stubs

None.

## Deferred Items

- **Optional `scripts/check-legacy-redirects.js`** — would assert these legacy paths are *required* (not optional) from the route-contract perspective. Currently `scripts/check-route-contract.js::validateRedirects` (lines 223-250) only verifies that registry-backed rows are present, so the new rules pass without registry edits. Adding a strict legacy-redirect check is intentionally out of scope per the task brief; should be a future Phase 10 plan if drift protection becomes a hard requirement.
- **GitNexus re-index** — a PostToolUse hook flagged the index as stale at `848de2d`. Re-indexing is informational only for this task: no symbols (functions/classes/methods) were touched, so the symbol/relationship counts are unchanged. Operators can run `npx gitnexus analyze` at their discretion.
- **Cloudflare Pages preview verification** — the curl loop in `docs/redirect-map.md` should be run against the next deploy preview. Not blocking commit; blocking cutover.

## Self-Check: PASSED

**Files claimed to be modified — all verified present on disk and in commit `7240619`:**

- `_redirects` — verified (13 new redirect lines + 5 comment/blank lines appended; no prior rule mutated)
- `docs/redirect-map.md` — verified ("WordPress-Era Legacy Paths (P1-8)" section appended)

**Commit verified in `git log`:**

- `7240619` — `fix(quick-260504-mly-01): add WordPress-era + Palisades 301 redirects (P1-8)`

**Verification commands all exited 0:**

- `npm run check:routes -- --redirects` — PASS
- `npm run check` — PASS (18 sub-checks)
- `npm run verify` — PASS (full pipeline including Playwright smoke)
