---
phase: quick-260504-mly
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - _redirects
  - docs/redirect-map.md
autonomous: false
requirements:
  - P1-8
must_haves:
  truths:
    - "GET /wp-login.php returns 301 to / (not 404)"
    - "GET /wp-admin and /wp-admin/* return 301 to / (not 404)"
    - "GET /cart, /cart/*, /checkout, /checkout/*, /shop, /shop/* return 301 to / (not 404)"
    - "GET /feed, /atom.xml, /wp-sitemap.xml return 301 to / (not 404)"
    - "GET /palisades returns 301 to /west-nyack (preserves link equity since West Nyack venue is at Palisades Center)"
    - "npm run check still passes (route contract is unchanged; legacy paths are not in canonical sitemap)"
    - "npm run verify still passes"
    - "docs/redirect-map.md documents the 410-vs-301 Cloudflare Pages constraint"
  artifacts:
    - path: "_redirects"
      provides: "WordPress-era + Palisades legacy redirects appended after Marketing shortcuts block"
      contains: "/wp-login.php / 301"
    - path: "docs/redirect-map.md"
      provides: "Section explaining WordPress-era 301 redirects and why 410 is not used"
      contains: "WordPress-era legacy paths"
  key_links:
    - from: "_redirects"
      to: "Cloudflare Pages redirect engine"
      via: "static file at publish root"
      pattern: "^/wp-login\\.php\\s+/\\s+301$"
    - from: "_redirects"
      to: "/west-nyack"
      via: "/palisades 301"
      pattern: "^/palisades\\s+/west-nyack\\s+301$"
    - from: "docs/redirect-map.md"
      to: "_redirects"
      via: "documentation reference for 410 vs 301 trade-off"
      pattern: "Cloudflare Pages.*410"
---

<objective>
Fix audit finding **P1-8**: WordPress-era and Palisades legacy URLs currently 404 on the new Astro site. Append redirect rules to `_redirects` so they return 301 to canonical destinations, allowing search engines to drop them cleanly.

Purpose: Close audit gap before cutover; prevent residual 404 traffic from harming SEO and analytics signal during the migration window.

Output: Updated `_redirects` (12 new rules) + new section in `docs/redirect-map.md` documenting the 410-vs-301 Cloudflare Pages constraint and the Palisades → West Nyack mapping rationale.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md
@_redirects
@docs/redirect-map.md
@scripts/check-route-contract.js
@.planning/phases/10-audit-gap-closure-cutover-readiness/10-CONTEXT.md
@data/locations.json

<rationale>
## Why 301, not 410, on this stack

The audit recommendation says "410 Gone for WordPress-era paths". On Cloudflare Pages this is not natively supported.

**Cloudflare Pages `_redirects` only honors these status codes:** 200 (rewrite), 301, 302, 303, 307, 308. There is no `410` in the Pages redirect engine. Emitting 410 would require a Cloudflare Worker or custom function — out of scope for a quick fix and unjustified for low-volume legacy paths.

**Trade-off chosen:** Use **301 to `/`** for WordPress-era paths. SEO outcome is similar (search engines drop the URL after a few crawl cycles either way; 301 just routes any residual humans to the homepage instead of an error). 410 is faster to deindex but the 301 is a single-rule, zero-risk change.

**Palisades exception:** `/palisades` is the only path with a meaningful canonical destination. `data/locations.json` line 148 confirms West Nyack's brand name is "Time Mission Palisades" and venue address is "Palisades Center" (line 150). The existing `/providence /lincoln 301` rule sets precedent for legacy slug → canonical. Therefore `/palisades` redirects to `/west-nyack` (preserves link equity) rather than `/`.

## Why no validator change is needed

`scripts/check-route-contract.js::validateRedirects` (lines 223-250) only checks that **expected** rows from `src/data/routes.json` are **present** in `_redirects`. It does NOT fail on **extra** rows. Adding the WordPress-era legacy redirects is purely additive and `npm run check:routes` will continue to pass without any registry edit.

If a Phase 10 follow-up wants to assert these legacy paths are *required* (not optional), that would be a new `check-legacy-redirects.js` — explicitly out of scope per task brief.
</rationale>

<gitnexus_note>
Per CLAUDE.md GSD enforcement: this is a config-file edit (`_redirects` is plain text consumed by the host), not a symbol edit. No functions, classes, or methods are touched. `gitnexus_impact` is not applicable.

After edits, run `gitnexus_detect_changes()` to confirm scope is limited to `_redirects` + `docs/redirect-map.md` (zero symbol changes expected).
</gitnexus_note>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Append WordPress-era + Palisades legacy redirects to _redirects and document the 410-vs-301 trade-off</name>
  <files>_redirects, docs/redirect-map.md</files>
  <action>
Two file edits, both additive (no existing rule mutated):

**Edit 1 — `_redirects`:** Append the following block to the end of the file (after the existing `/locations/ /locations 301` line on line 57). Preserve the trailing newline.

```
# WordPress-era legacy paths (P1-8 audit finding)
# 410 Gone is unsupported by Cloudflare Pages _redirects; using 301 to / per docs/redirect-map.md
/wp-login.php / 301
/wp-admin / 301
/wp-admin/* / 301
/cart / 301
/cart/* / 301
/checkout / 301
/checkout/* / 301
/shop / 301
/shop/* / 301
/feed / 301
/atom.xml / 301
/wp-sitemap.xml / 301

# Palisades legacy slug — West Nyack is at Palisades Center (data/locations.json#west-nyack)
# 301 to /west-nyack preserves link equity vs sending to /
/palisades /west-nyack 301
```

Total: 12 new redirect rules + 5 comment lines + 1 blank separator.

**Edit 2 — `docs/redirect-map.md`:** Append a new section at the end of the file (after "Source Traffic to Preserve"):

```markdown
## WordPress-Era Legacy Paths (P1-8)

The following paths existed on the legacy WordPress site (or are well-known WordPress probe URLs from bot traffic) and previously returned 404 on the new Astro site. As of the P1-8 fix they redirect with HTTP 301:

| Source | Target | Status | Reason |
|--------|--------|--------|--------|
| `/wp-login.php` | `/` | 301 | WP login probe; deindex via 301 |
| `/wp-admin`, `/wp-admin/*` | `/` | 301 | WP admin paths |
| `/cart`, `/cart/*` | `/` | 301 | WooCommerce cart paths |
| `/checkout`, `/checkout/*` | `/` | 301 | WooCommerce checkout paths |
| `/shop`, `/shop/*` | `/` | 301 | WooCommerce shop archives |
| `/feed` | `/` | 301 | WP RSS feed |
| `/atom.xml` | `/` | 301 | WP Atom feed |
| `/wp-sitemap.xml` | `/` | 301 | WP-generated sitemap; canonical sitemap is `/sitemap.xml` |
| `/palisades` | `/west-nyack` | 301 | Legacy slug; West Nyack venue is located at Palisades Center (see `data/locations.json#west-nyack`, brand name "Time Mission Palisades") |

### Why 301 and not 410 Gone

The original audit (P1-8) recommended 410 Gone for WordPress-era paths so search engines deindex faster. **Cloudflare Pages `_redirects` only supports status codes 200 (rewrite), 301, 302, 303, 307, and 308 — 410 is not available.** Emitting 410 would require a Cloudflare Worker or Pages Function, which is out of scope for a static-redirect change.

The SEO outcome of 301-to-`/` is comparable for these low-volume bot/legacy paths: search engines drop the URL after a few crawl cycles either way, and any residual human traffic lands on the homepage instead of a 404.

If 410 becomes a hard requirement (for example to suppress scoring delays in Search Console), a Cloudflare Pages Function under `functions/` could intercept these paths and return `new Response(null, { status: 410 })`. That is intentionally not done here.

### Verification on Cloudflare Pages preview

After deploying to a Pages preview, spot-check:

```bash
for path in /wp-login.php /wp-admin /wp-admin/users.php /cart /checkout /shop /feed /atom.xml /wp-sitemap.xml /palisades; do
  echo -n "$path -> "
  curl -sI "https://<preview-host>$path" | head -2 | grep -iE 'location|http/'
done
```

Expected: every path returns `HTTP/.* 301` with a `Location:` header pointing to `/` (or `/west-nyack` for `/palisades`).
```

**Constraints to respect during the edit:**

1. Do **not** modify any existing redirect line in `_redirects`. Only append.
2. Do **not** introduce a duplicate `/palisades` rule — the file currently has none; verify with `grep -n palisades _redirects` before editing.
3. Preserve existing trailing newline conventions in both files.
4. Do **not** introduce a `410` status code anywhere in `_redirects` — Cloudflare Pages will treat it as malformed.
5. Splat patterns must use `*` exactly (no `**` syntax — Cloudflare Pages and Netlify both use single `*`).
6. The bare path `/wp-admin` AND the splat `/wp-admin/*` are both required because `_redirects` splats only match descendants, not the parent itself. Same applies to `/cart`, `/checkout`, `/shop`.

**Self-check after writing both files:**
- `grep -c "301" _redirects` should increase by exactly **13** (12 new 301 rules + the existing count was preserved). Note: if grep counts the pattern in comments or table rows, recount only data lines.
- `grep -c "^/" _redirects` increases by exactly **13** new redirect-rule lines.
- `grep "wp-login\|wp-admin\|cart\|checkout\|shop\|/feed\|atom.xml\|wp-sitemap\|palisades" _redirects | wc -l` returns **13**.
- `grep "^410\| 410$\| 410 " _redirects` returns **0** (no 410 status anywhere).
- `docs/redirect-map.md` contains the string "WordPress-Era Legacy Paths (P1-8)".
  </action>
  <verify>
    <automated>npm run check:routes -- --redirects && grep -E "^/wp-login\.php / 301$" _redirects && grep -E "^/wp-admin / 301$" _redirects && grep -E "^/wp-admin/\* / 301$" _redirects && grep -E "^/cart / 301$" _redirects && grep -E "^/cart/\* / 301$" _redirects && grep -E "^/checkout / 301$" _redirects && grep -E "^/checkout/\* / 301$" _redirects && grep -E "^/shop / 301$" _redirects && grep -E "^/shop/\* / 301$" _redirects && grep -E "^/feed / 301$" _redirects && grep -E "^/atom\.xml / 301$" _redirects && grep -E "^/wp-sitemap\.xml / 301$" _redirects && grep -E "^/palisades /west-nyack 301$" _redirects && ! grep -E " 410($| )" _redirects && grep -F "WordPress-Era Legacy Paths (P1-8)" docs/redirect-map.md && grep -F "410 is not available" docs/redirect-map.md && npm run check && npm run verify</automated>
  </verify>
  <done>
- `_redirects` contains all 12 WordPress-era 301 rules plus the `/palisades /west-nyack 301` rule
- A header comment block in `_redirects` explains the 410-vs-301 Cloudflare constraint and references `docs/redirect-map.md`
- `docs/redirect-map.md` contains the new "WordPress-Era Legacy Paths (P1-8)" section with the rule table, the 410-vs-301 rationale, and Cloudflare preview verification snippet
- No `410` status appears anywhere in `_redirects`
- `npm run check:routes -- --redirects` exits 0 (existing registry-backed rules still match; new rules are additive)
- `npm run check` exits 0 (location contracts, sitemap, components, booking architecture, accessibility baseline, internal links all pass)
- `npm run verify` exits 0 (full pipeline)
- No source files (`.js`, `.ts`, `.astro`, `.html`) were modified — only `_redirects` (text config) and `docs/redirect-map.md` (documentation)
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Human reviews redirect block + docs section before commit</name>
  <what-built>
Twelve new WordPress-era 301 redirects + one Palisades→West Nyack 301 redirect appended to `_redirects`, with a corresponding documentation section in `docs/redirect-map.md` explaining the 410-vs-301 Cloudflare Pages constraint and the Palisades mapping rationale.

This closes audit finding P1-8 within the constraints of static-only redirect rules on Cloudflare Pages.
  </what-built>
  <how-to-verify>
1. Review the diff: `git diff _redirects docs/redirect-map.md`
2. Confirm the new `_redirects` rules are appended at the end (no existing rule mutated):
   - 12 WordPress-era paths target `/` with 301
   - `/palisades` targets `/west-nyack` with 301 (NOT `/`)
   - Header comment explains why 410 is not used
3. Confirm `docs/redirect-map.md` has a new "WordPress-Era Legacy Paths (P1-8)" section with:
   - The rule table
   - The 410-vs-301 rationale referencing the Cloudflare Pages status code constraint
   - The Cloudflare Pages preview verification curl snippet
4. Confirm `npm run verify` shows green in the Task 1 automated output.
5. Decide if Palisades should redirect to `/` instead of `/west-nyack`. Default recommendation: keep `/west-nyack` (preserves link equity, West Nyack venue brand-name is literally "Time Mission Palisades" per `data/locations.json`). If you prefer `/`, say so and the implementer will swap before commit.
6. Once production deploys, run the Cloudflare Pages preview verification block from `docs/redirect-map.md`'s new section against a real preview URL. (Not blocking commit — blocking cutover.)
  </how-to-verify>
  <resume-signal>Type "approved" to commit, or describe changes needed (for example "swap /palisades target to /").</resume-signal>
</task>

</tasks>

<verification>
- `_redirects` parses cleanly (no malformed rows from `parseRedirects` in `scripts/check-route-contract.js`).
- `npm run check:routes -- --redirects` passes (registry-backed rules unchanged; new legacy rules are additive and not asserted by the contract).
- `npm run check:routes -- --sitemap` passes (legacy paths are NOT in `sitemap.xml` and were never expected to be).
- `npm run check` passes end-to-end.
- `npm run verify` passes end-to-end.
- After commit, `gitnexus_detect_changes()` shows zero symbol changes (text-config-only edit).
</verification>

<success_criteria>
- All 12 WordPress-era + 1 Palisades 301 redirect rules present in `_redirects`
- `docs/redirect-map.md` documents the 410-vs-301 Cloudflare Pages trade-off with the rule table and verification snippet
- No 410 status code appears in `_redirects`
- `npm run verify` passes
- No source code symbols modified (config + docs only)
- Audit finding P1-8 marked complete with specific note in commit message: "410 not used because Cloudflare Pages `_redirects` does not support 410; using 301 per docs/redirect-map.md"
</success_criteria>

<output>
After completion, create `.planning/quick/260504-mly-fix-p1-8-add-missing-legacy-url-redirect/260504-mly-SUMMARY.md` documenting:
- The 13 new redirect rules added (12 WP-era + 1 Palisades)
- The 410-vs-301 Cloudflare Pages constraint and decision
- The Palisades → West Nyack rationale (link equity preservation)
- Verification commands run and their results
- Deferred work: optional `scripts/check-legacy-redirects.js` to assert legacy paths *must* be present (currently they are optional from the registry's perspective)
</output>
