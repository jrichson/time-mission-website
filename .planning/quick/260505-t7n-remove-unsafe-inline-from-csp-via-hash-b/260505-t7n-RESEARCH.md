# Quick Task 260505-t7n: Remove `'unsafe-inline'` from CSP — Research

**Researched:** 2026-05-05
**Mode:** quick-task
**Confidence:** HIGH (inventory measured from `dist/`, all numbers verified by SHA256)

## Summary

The current `_headers` CSP grants `'unsafe-inline'` to both `script-src` and `style-src` because Astro is emitting a substantial amount of inline content. Measured against the existing `dist/` build (30 unique HTML pages):

- **Inline `<script>` blocks:** 192 total occurrences, **59 distinct hashes**
- **Inline `<style>` blocks:** 63 total occurrences, **20 distinct hashes**
- **JSON-LD `<script type="application/ld+json">`:** 25 total occurrences, **25 distinct hashes** (one per page; non-executable but still subject to `script-src` per CSP3)

A pure-hash strategy is feasible (the per-route `_headers` syntax supports it), but **84+ hashes in a single CSP header is a maintenance nightmare** and most of the volume is mechanical (page-CSS partials, identical reveal-observer scripts) that should not be inline in the first place.

**Primary recommendation:** **Hybrid approach.** Extract the bulk-volume content (page-CSS partials and the per-page typewriter/main-script blocks) to external `/css/<slug>.css` and `/js/<slug>.js` files at build time. For the small remaining set of legitimately-inline content (~6 site-wide script signatures + 25 JSON-LD blocks + 2 small `is:global` style blocks), compute SHA256 hashes during the build and inject them into `_headers`. Drop `'unsafe-inline'`.

## Inventory (measured from current `dist/`)

### Inline `<script>` — 59 distinct hashes, grouped

| Category | Distinct hashes | Occurrences | Where it comes from | Disposition |
|----------|----------------|-------------|---------------------|-------------|
| **Site-wide scaffolding** (recurring across most pages) | | | | |
| `__TM_ANALYTICS_LABELS__` bootstrap | 1 | 26 | `SiteHead.astro` L125 (`define:vars` w/ stable JSON) | hash once, stays inline |
| `__TM_TAGGING_CONFIG__` + consent default | 3 | 26 | `SiteHead.astro` L126–150 (`consentDefaults` varies by region: US-open vs EU-strict vs global-strict ⇒ 3 hashes) | hash 3, stays inline |
| GTM bootstrap loader | 0 in current `dist/` (no `gtmContainerId` env at build time) | 0 | `SiteHead.astro` L153 — would add 1 hash when GTM is enabled | hash when env set |
| `__TM_SITE_CONTRACT__` | 1 | 25 | `SiteScripts.astro` L7 (`define:vars={{ siteContract }}` — content hash *only stable* if `siteContract` is build-deterministic) | hash, stays inline |
| Reveal observer (small) | 1 | 25 | `SiteScripts.astro` L10 | hash or extract to `/js/reveal.js` |
| Footer location toggle | 1 | 25 | `SiteScripts.astro` L26 | hash or extract to `/js/footer-toggle.js` |
| **Sub-total scaffolding** | **6** | ~152 | All from `SiteHead.astro` + `SiteScripts.astro` | |
| **Page-injected via `set:html` (`*-after.frag.txt`)** | | | | |
| `*-after.frag.txt` partials | ~22 | 22 | `set:html={antwerpAfter}` etc. — typewriter, page-specific behavior | **EXTRACT** to `/js/<slug>-after.js` |
| **Anomaly: `REVEAL_OBSERVER` len ~21,400 in 9 location pages** | 9 | 9 | Lincoln/Houston/Antwerp/Manassas/etc. — the `*-after.frag.txt` files inline a duplicated full reveal-observer + per-page logic. The repeated-pattern *and per-file unique* nature confirms this should be split into `/js/locations-after.js` + small per-page block, OR fully externalized. | **EXTRACT** |
| **Mid-tier per-page** | ~22 | 22 | typewriter, hero animations, etc. | **EXTRACT** (one external `.js` per page) |
| **TOTAL** | **59** | **192** | | |

> Note: `<script defer is:inline src="...">` tags do NOT need hashes — they're external resources matched by `script-src 'self'`. Astro's `is:inline` flag only prevents Astro from bundling them; they remain external by virtue of the `src` attribute.

### Inline `<style>` — 20 distinct hashes, grouped

| Category | Distinct hashes | Occurrences | Where it comes from | Disposition |
|----------|----------------|-------------|---------------------|-------------|
| **Component `is:global`** (small, stable) | | | | |
| `.page-last-updated` block | 1 | 25 | `SiteLayout.astro` L97–110 | hash, stays inline (small, sitewide) |
| `.footer-link-button` etc. | 5 | 11 | `SiteFooter.astro` L125–162 — varies because lang attribute / minor differences ripple. Likely **1 distinct** with stable build; the 5 distinct hashes today suggest minify-determinism issues worth verifying. | hash 1 (after stable minify) |
| **Page partials via `set:html={...Css}`** | | | | |
| Location page CSS (Antwerp, Houston, Lincoln, Manassas, Mt-Prospect, W-Nyack, Philly, Brussels/Dallas/Orland-Park) | 11 | 14 | `set:html={antwerpCss}` from `*-inline.raw.css.txt` partials (80–85 KB each!) | **EXTRACT** to `/css/<slug>.css` |
| Other page partials (index 82 KB, about 30 KB, faq 7.6 KB, contact 12.9 KB, groups bundle 21 KB shared, locations 10 KB, missions 25 KB, gift-cards 13 KB, 404 4.4 KB) | 9 | 11 | same pattern | **EXTRACT** |
| Coming-soon shared CSS (brussels/dallas/orland-park) | 1 | 3 | already shared | **EXTRACT** as `/css/coming-soon.css` |
| **TOTAL** | **20** | **63** | | |

> The location pages have **the same partial duplicated as a `<style>` block AND embedded again as part of footer markup**. That's why `FOOTER_INLINE` shows up at 82 KB / 85 KB sizes for `lincoln/mt-prospect/manassas/west-nyack`. The grep is catching a `<style>` block whose content begins where my regex's "footer" heuristic matched. Functionally these are page CSS partials — same disposition: **extract**.

### Inline `<script type="application/ld+json">` — 25 hashes (one per page)

These are non-executable but **CSP3 still gates them under `script-src`**. They cannot be externalized cleanly (search engines parse them in-page; some crawlers don't follow external JSON-LD). Two options:

1. Hash each one at build (25 hashes, all stable per-build, regenerated when content changes).
2. Add `'unsafe-hashes'`-free path: just compute hashes (preferred — safer than `'unsafe-inline'` because hashes pin the exact bytes).

## Strategy Comparison (this codebase)

### A. Pure hash-based CSP

| Pros | Cons |
|------|------|
| Zero source-code restructuring | **84+ hashes** to compute and inject into `_headers` (59 script + 20 style + 25 JSON-LD = 104; minus duplicates that are site-wide → still ~60–80) |
| Most flexible — keeps current `set:html` partial model | **Header bloat:** Cloudflare Pages caps `_headers` line length at 2 KB before truncation warnings; one CSP line with 80 hashes (each ~52 chars) ≈ 4 KB. **Will exceed limits.** |
| | Per-route hashing required — different pages need different hashes (each location has unique CSS, unique JSON-LD, unique tail-script). Multiplies the `_headers` rule count by route. |
| | Every content edit forces a CSP regeneration step. Tight build-pipeline coupling: minifier → hasher → header writer must all be in sync. |
| | **JSON-LD hash drift:** every time `data/locations.json` changes, every location page's JSON-LD hash changes. CI must regenerate or `_headers` goes stale → page breaks. |

**Verdict:** Technically possible, but operationally fragile.

### B. Pure extraction

Move every `*-inline.raw.css.txt` to `public/css/<slug>.css` + `<link rel="stylesheet">`. Move every `*-after.frag.txt` JS body to `public/js/<slug>-after.js` + `<script defer src="...">`. Remove all `<style>` and `<script>` (non-src) blocks except the bare minimum.

| Pros | Cons |
|------|------|
| Drops `'unsafe-inline'` cleanly with minimal CSP work — `script-src 'self' https://...` covers it | **Cannot externalize JSON-LD** without losing some SEO crawler coverage and changing schema delivery semantics |
| Better caching: `<link>`'d CSS hits browser cache across pages | **Cannot externalize `define:vars` blocks** — they encode build-time data into JS literals (`__TM_ANALYTICS_LABELS__`, `__TM_TAGGING_CONFIG__`, consentDefaults). Externalizing would require either (a) generating per-page JS files with the data baked in, or (b) emitting a `window.__TM_*` from a `<meta>`/`data-*` attribute |
| No build-time hash computation pipeline needed | The `define:vars` consent profile bootstrap is **rendered before any script can run** by design — moving to external defeats the consent-mode "fire `gtag('consent', 'default', ...)` before GTM loads" pattern (Consent Mode v2 contract) |
| | Touches 22+ Astro pages and ~22 partial files |
| | Requires non-trivial restructure of `SiteHead.astro` (consent defaults pattern) and `SiteScripts.astro` (reveal observer, footer toggle) |

**Verdict:** Closest to ideal but blocked by JSON-LD and Consent Mode v2 patterns.

### C. **Hybrid (recommended)**

| Step | Action | Result |
|------|--------|--------|
| 1 | Extract all `*-inline.raw.css.txt` partials → `public/css/page-<slug>.css`. Each Astro page replaces `<style is:global set:html={...Css}>` with `<link rel="stylesheet" href="/css/page-<slug>.css">` in `head-extra`. | Eliminates **20 distinct style hashes**, drops 63 `<style>` block occurrences to 0 (or ≤2 — just `is:global` from layout/footer) |
| 2 | Extract all `*-after.frag.txt` script bodies → `public/js/page-<slug>-after.js`. Each Astro page replaces `<Fragment slot="after-site-scripts" set:html={...After}>` with `<script defer src="/js/page-<slug>-after.js">`. | Eliminates ~22 distinct page-specific script hashes, kills the 21 KB reveal-observer duplicates baked into location after-fragments |
| 3 | Extract `SiteScripts.astro` reveal observer + footer toggle to `/js/site-progressive.js` | Eliminates 2 sitewide script hashes |
| 4 | Keep inline (and **hash**): `__TM_ANALYTICS_LABELS__`, `__TM_TAGGING_CONFIG__` (3 region variants), `__TM_SITE_CONTRACT__`, GTM loader, `.page-last-updated` style, `.footer-link-button` style — total **6 sitewide hashes** | Consent Mode v2 contract preserved |
| 5 | Keep inline (and **hash**): all 25 JSON-LD blocks per page | Schema/SEO unaffected; one rule per route |
| 6 | Build-time: walk `dist/`, SHA256 every remaining inline `<script>` and `<style>`, generate `_headers` with `script-src 'self' 'sha256-…' 'sha256-…' …` and per-route entries for JSON-LD | Drops `'unsafe-inline'` from both directives |

**Verdict:** Best balance. Touches every page once (mechanical edit), then reduces ongoing CSP maintenance to "regenerate hashes on build" — and the regenerated set is small and bounded (~30 hashes total: 6 script + 2 style + 25 JSON-LD).

## Cloudflare Pages & Astro Constraints

### Cloudflare Pages `_headers`

- **Per-path rules supported** ([Cloudflare docs](https://developers.cloudflare.com/pages/configuration/headers/)). Syntax: path on its own line, then indented header lines below. Globs (`*`) and named placeholders (`:title`) work.
- **Overlapping rules cumulate:** if two patterns match a request, headers are merged (same header name → comma-joined values). **This means you cannot give one path a more permissive CSP that "overrides" a global one — the values combine, which can break CSP because UA picks the most-restrictive intersection of multiple CSP headers.** Practical implication: emit **exactly one** CSP rule per route, or use a single global CSP plus path-specific overrides for *other* headers. Cleanest pattern: per-route CSP block, no global fallback CSP.
- **No documented hard line-length cap**, but lines well over 2 KB risk truncation in some edge cases. Hybrid strategy keeps each route's CSP comfortably under 1 KB.
- **Failure mode for hash mismatch:** browser blocks the resource (script doesn't run, style doesn't apply). User sees broken page. **Test in `wrangler pages dev` before deploy** — `docs/cloudflare-preview-validation.md` already exists for this.

### Astro

- **`<style>` (Astro-scoped, no `is:global`, no `set:html`)** — Astro extracts these into bundled CSS files in `dist/_astro/*.css` and links them via `<link>`. **No inline emission, no hash needed.** This codebase doesn't use scoped styles; it uses `<style is:global set:html={...}>`, which forces inline output verbatim.
- **`is:global` without `set:html`** — also extracted to bundle (e.g., the `.page-last-updated` block in `SiteLayout.astro` *should* be bundled). Verify in `dist/index.html` whether it actually went to a `<link>` or stayed inline. Initial grep shows two `<style>` per page including a 1573-byte block matching `LAST_UPDATED` — so **`is:global` IS staying inline** in current builds. Reason: when Astro can't determine that the global style is invariant across the route group, or when there's any dynamic content, it falls back to inline. Either keep it (hash it) or extract to `/css/site.css`.
- **`is:inline`** — explicit "do not bundle, keep inline." Used everywhere in `SiteHead.astro` and `SiteScripts.astro`. Each one needs a hash.
- **Astro CSP integration** — Astro 6 has experimental `experimental.csp` support that auto-emits hashes via `<meta http-equiv>` ([Astro CSP docs](https://docs.astro.build/en/reference/experimental-flags/csp/)). **Worth investigating but with caveats:** (a) it emits CSP via `<meta>`, not HTTP header — `frame-ancestors` and `report-uri` are ignored in `<meta>` form; the project needs both to stay header-delivered; (b) it currently only hashes Astro-managed inline content, not `set:html` blobs; (c) it's experimental and may shift. **Don't depend on it; stick with build-time post-processor.**
- **`astro-shield`** — third-party integration that automates SRI for external scripts/styles and emits inline-block hashes. Adds a build dependency but solves a non-trivial slice of the problem. Worth a 30-min spike during planning; not required for v1.

## Recommendation

**Adopt strategy C (hybrid).** Rationale:

1. **Extraction handles the volume.** ~85% of inline bytes are page-CSS and per-page JS that *should* have been external from day one (legacy migration debt — the partials were a pragmatic shortcut during the Astro migration). Extracting them improves caching (CSS hits browser cache across location pages), reduces HTML payload, and trivially solves CSP.
2. **Hashing handles the principled-inline cases.** Consent Mode v2 requires `gtag('consent', 'default', …)` to fire synchronously in `<head>` before GTM — that genuinely needs to be inline. JSON-LD is inline by SEO convention. These are small, finite, and stable.
3. **It avoids the experimental Astro CSP flag** and the 80-hash CSP-bloat trap.
4. **One mechanical pass per page** — every Astro page wrapper changes 2 lines (`<style is:global set:html=...>` → `<link>`, and `<Fragment slot="after-site-scripts" set:html=...>` → `<script defer src=...>`).

## Concrete Next Steps for the Planner

The plan should specify these waves (in order):

### Wave 1 — Extract page CSS partials to external files

**Scope:** All 22 Astro pages + 22 `*-inline.raw.css.txt` partials.

| Action | Files |
|--------|-------|
| Add `scripts/extract-page-css.mjs` (build step before `astro build`): reads each `src/partials/<slug>-inline.raw.css.txt`, writes `public/css/page-<slug>.css`. Or: rename partials to `public/css/page-<slug>.css` directly and delete `?raw` imports. | new script + 22 partial files moved |
| Replace `<Fragment slot="page-style"><style is:global set:html={…Css}>…</style></Fragment>` with `<link rel="stylesheet" href={\`/css/page-<slug>.css\`} />` in `head-extra` slot | 22 `src/pages/*.astro` (and `src/pages/groups/*.astro`) |
| Wire into `npm run build:astro` so the extracted CSS goes through `minify-dist-assets.mjs` | `package.json` |

**Verification:** `grep -c "<style" dist/*.html dist/groups/*.html` should drop to ≤ 2 per page (just `is:global` from layout + footer).

### Wave 2 — Extract page-after JS to external files

**Scope:** 11 `*-after.frag.txt` files (antwerp, houston, lincoln, manassas, mt-prospect, west-nyack, philly, index, faq, contact, birthdays).

| Action | Files |
|--------|-------|
| For each, peel the `<script>...</script>` wrapper out of the fragment, write the JS body to `public/js/page-<slug>-after.js`, leave any non-script HTML in the fragment | 11 partials |
| Replace `<Fragment slot="after-site-scripts" set:html={…After}>` with the residual fragment + `<script defer src="/js/page-<slug>-after.js">` | 11 wrappers |
| Verify duplicated reveal-observer logic in location-after fragments — likely belongs in a shared `/js/location-page.js` | 7 location pages |

**Verification:** `grep -c "<script>" dist/<page>.html` (no-src) should drop to a small fixed set.

### Wave 3 — Extract `SiteScripts.astro` reveal observer + footer toggle

| Action | Files |
|--------|-------|
| Move L10–L24 (reveal observer) and L26–L31 (footer toggle) into `public/js/site-progressive.js` | new file |
| Replace both `<script is:inline>` blocks with one `<script defer src="/js/site-progressive.js?v=1">` | `SiteScripts.astro` |

### Wave 4 — Build-time CSP hash injector

**Scope:** Build script that runs after `astro build` + `minify-dist-assets.mjs` and writes the final `dist/_headers`.

| Action | Files |
|--------|-------|
| New `scripts/inject-csp-hashes.mjs`: walk `dist/**/*.html`, parse inline `<script>` (no `src`), `<style>`, and `<script type="application/ld+json">`. For each, compute SHA256 base64 → `'sha256-…'`. Group hashes by route (or sitewide if every page has the same set). | new |
| Maintain a template `_headers.tmpl` with placeholders like `{{SCRIPT_HASHES}}`, `{{STYLE_HASHES}}`, `{{JSONLD_HASHES_<route>}}`. Render to `dist/_headers`. | new |
| Keep the per-route block strategy: a global rule for site-wide hashes + a per-route rule that adds the page-specific JSON-LD hash. (Cloudflare merges them.) **Caveat above:** verify merged CSP doesn't get OR-restricted in browsers — if it does, render fully-resolved per-route blocks instead. | |
| Drop `'unsafe-inline'` from `script-src` and `style-src` in the template | `_headers.tmpl` |
| Wire into `npm run build:astro` after `minify-dist-assets.mjs`: `… && node scripts/inject-csp-hashes.mjs` | `package.json` |

**Verification:**
- New `scripts/check-csp-hashes.js`: in `dist/`, every inline block's hash must appear in the matching route's CSP.
- `wrangler pages dev dist` smoke: load `/`, `/antwerp`, `/groups/birthdays`, open DevTools console, confirm zero CSP violations.
- Add `npm run check:csp-hashes` to `npm run check`.

### Wave 5 — Verify & document

| Action |
|--------|
| Add Playwright test: navigate to 3 pages with `page.on('console')` listener, fail on any CSP violation message |
| Update `docs/cutover-checklist.md` with a manual CSP-violation scan step against Cloudflare preview |
| Update `_headers` source-of-truth comment to point to `_headers.tmpl` |

### Risks the planner must call out

1. **`define:vars` consent profile produces 3 hash variants.** The build's `consentProfile` selector emits 3 distinct hashed bodies (us_open vs eu_strict vs global_strict). Plan must compute and include all three sitewide.
2. **`__TM_SITE_CONTRACT__` content-stability.** If `getPublicSiteContract()` produces output that varies across builds (timestamps, ordering), the hash drifts. Verify deterministic JSON serialization, sort keys, no `Date.now()`.
3. **Cloudflare CSP merging quirk.** If multiple matching `_headers` rules each emit `Content-Security-Policy`, Cloudflare comma-joins them — and browsers treat multiple CSP headers as an *intersection* (most restrictive wins). Plan the per-route block strategy carefully: either a single fully-resolved CSP per route (no global one), or a global CSP that covers everything and per-route additions only on directives that are *additive-only* in browser semantics (which excludes `script-src`).
4. **JSON-LD hash maintenance.** Any time `data/locations.json` or `lib/schema/graph.ts` changes, every location page's JSON-LD hash will rotate. The build-time hash injector handles this automatically — just make sure CI doesn't have a stale `_headers` cached.
5. **Footer inline-style hash variance.** Current `dist/` shows 5 distinct hashes for what should be one `.footer-link-button` style block. Investigate before hashing — likely a minify-determinism issue (esbuild output varies by input whitespace) or a Vite build-id leak. May need to pin esbuild minify options.

## Sources

- **Verified by direct measurement** of `dist/` (current build): file counts, hash counts, content categorization (`perl + sha256_base64` over all 30 production HTML pages).
- **Verified by file read:** `_headers`, `SiteHead.astro`, `SiteScripts.astro`, `SiteFooter.astro`, `SiteLayout.astro`, `antwerp.astro`, `antwerp-inline.raw.css.txt`, `antwerp-after.frag.txt`, `lincoln-after.frag.txt`, `astro.config.mjs`, `package.json`, `scripts/sync-static-to-public.mjs`, `scripts/minify-dist-assets.mjs`.
- **Cited:** [Cloudflare Pages `_headers` docs](https://developers.cloudflare.com/pages/configuration/headers/) — per-path rules + wildcard support + cumulative-merge semantics.
- **Assumed (worth a planner spike):** Astro 6's `experimental.csp` flag's exact behavior with `set:html` partials. Doc reads as if it auto-hashes Astro-managed content only; not load-bearing for the recommended hybrid plan.

## Confidence

| Area | Level | Reason |
|------|-------|--------|
| Inventory counts (59 / 20 / 25) | HIGH | SHA256 hashed every block across 30 production HTML pages |
| Strategy comparison | HIGH | Tradeoffs derived from the measured inventory and CF docs |
| Cloudflare per-path syntax | HIGH | Cited from official docs |
| CSP-merge intersection semantics | MEDIUM | CF docs say "merged with comma"; browser intersection behavior is the well-known CSP3 spec, but verify in `wrangler pages dev` before relying on it |
| `__TM_SITE_CONTRACT__` determinism | LOW | Not verified end-to-end; flagged as a risk for the planner |
