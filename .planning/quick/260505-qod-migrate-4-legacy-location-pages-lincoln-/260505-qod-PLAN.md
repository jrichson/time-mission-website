---
phase: 260505-qod
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/partials/lincoln-inline.raw.css.txt
  - src/partials/lincoln-main.frag.txt
  - src/partials/lincoln-after.frag.txt
  - src/pages/lincoln.astro
  - src/partials/mount-prospect-inline.raw.css.txt
  - src/partials/mount-prospect-main.frag.txt
  - src/partials/mount-prospect-after.frag.txt
  - src/pages/mount-prospect.astro
  - src/partials/manassas-inline.raw.css.txt
  - src/partials/manassas-main.frag.txt
  - src/partials/manassas-after.frag.txt
  - src/pages/manassas.astro
  - src/partials/west-nyack-inline.raw.css.txt
  - src/partials/west-nyack-main.frag.txt
  - src/partials/west-nyack-after.frag.txt
  - src/pages/west-nyack.astro
autonomous: true
requirements:
  - QUICK-260505-qod
must_haves:
  truths:
    - "Astro build produces dist/lincoln.html, dist/mount-prospect.html, dist/manassas.html, dist/west-nyack.html from .astro wrappers (not from legacy *.html copy)."
    - "npm run check passes (route contract, location contract, components, schema, etc.) with the new wrappers in place."
    - "Each new wrapper renders the location's hero, body sections, and footer-adjacent scripts that the legacy *.html shipped, with body[data-location] set to the slug."
    - "Each new wrapper emits exactly one JSON-LD graph from buildLocationGraph (Organization + BreadcrumbList + LocalBusiness for open venues; FAQPage if location has faqs)."
    - "Legacy lincoln.html / mount-prospect.html / manassas.html / west-nyack.html remain untouched at repo root (matching the antwerp/houston/philadelphia precedent)."
  artifacts:
    - path: "src/partials/lincoln-inline.raw.css.txt"
      provides: "Lincoln page-local CSS, extracted from BOTH inline <style> blocks in lincoln.html (lines 33–2841 and 2846–2863)."
    - path: "src/partials/lincoln-main.frag.txt"
      provides: "Lincoln body markup from `<!-- Hero Section -->` (line 3056) through end-of-`</footer>` (just before line 4294 `<script defer src=\"js/nav.js\"...>`)."
    - path: "src/partials/lincoln-after.frag.txt"
      provides: "Lincoln after-site-scripts: the inline <script>...</script> block following the footer (game-popup helpers etc.) — must match houston/philadelphia precedent (NOT the duplicated nav.js / locations.js / roller-checkout.js / ticket-panel.js / a11y.js tags, which SiteScripts already emits, and NOT the per-location TM.select bootstrap, which body[data-location] + locations.js handles)."
    - path: "src/pages/lincoln.astro"
      provides: "Astro wrapper using SiteLayout, definePage({canonicalPath:'/lincoln'}), allLocations.find(l=>l.slug==='lincoln'), buildLocationGraph('lincoln','/lincoln',crumbs), applyTmMediaBase(mainRaw)."
    - path: "src/partials/mount-prospect-inline.raw.css.txt"
      provides: "Mount Prospect page-local CSS, both <style> blocks concatenated."
    - path: "src/partials/mount-prospect-main.frag.txt"
      provides: "Mount Prospect body markup from hero through footer."
    - path: "src/partials/mount-prospect-after.frag.txt"
      provides: "Mount Prospect after-site-scripts inline block."
    - path: "src/pages/mount-prospect.astro"
      provides: "Astro wrapper for /mount-prospect."
    - path: "src/partials/manassas-inline.raw.css.txt"
      provides: "Manassas page-local CSS, both <style> blocks concatenated."
    - path: "src/partials/manassas-main.frag.txt"
      provides: "Manassas body markup from hero through footer."
    - path: "src/partials/manassas-after.frag.txt"
      provides: "Manassas after-site-scripts inline block."
    - path: "src/pages/manassas.astro"
      provides: "Astro wrapper for /manassas."
    - path: "src/partials/west-nyack-inline.raw.css.txt"
      provides: "West Nyack page-local CSS, both <style> blocks concatenated."
    - path: "src/partials/west-nyack-main.frag.txt"
      provides: "West Nyack body markup from hero through footer."
    - path: "src/partials/west-nyack-after.frag.txt"
      provides: "West Nyack after-site-scripts inline block."
    - path: "src/pages/west-nyack.astro"
      provides: "Astro wrapper for /west-nyack."
  key_links:
    - from: "src/pages/<slug>.astro"
      to: "src/data/locations.ts -> allLocations"
      via: "allLocations.find(l => l.slug === '<slug>')"
      pattern: "allLocations\\.find\\(.*slug ===.*"
    - from: "src/pages/<slug>.astro"
      to: "src/lib/schema/graph.ts -> buildLocationGraph"
      via: "buildLocationGraph + serializeGraph in <Fragment slot='json-ld'>"
      pattern: "buildLocationGraph\\('<slug>'"
    - from: "src/pages/<slug>.astro"
      to: "src/lib/tm-media.ts -> applyTmMediaBase"
      via: "applyTmMediaBase(<slug>MainRaw) before <div set:html>"
      pattern: "applyTmMediaBase\\("
    - from: "src/pages/<slug>.astro"
      to: "src/data/routes.json"
      via: "definePage({canonicalPath:'/<slug>'}) — slug already registered in routes.json (lines 178–217)"
      pattern: "canonicalPath:\\s*['\"]/<slug>['\"]"
---

<objective>
Migrate four legacy location pages (lincoln.html, mount-prospect.html, manassas.html, west-nyack.html) to Astro wrappers following the established antwerp/houston/philadelphia three-fragment pattern: extract page-local CSS to `src/partials/<slug>-inline.raw.css.txt`, body markup to `src/partials/<slug>-main.frag.txt`, after-footer inline scripts to `src/partials/<slug>-after.frag.txt`, then create `src/pages/<slug>.astro` that composes them through `SiteLayout`.

Purpose: Bring the remaining four open US location pages onto the Astro build pipeline so they share `SiteLayout`, `SiteScripts`, JSON-LD graph generation, and the route registry — closing the migration parity gap left by Phase 9/10 (currently only antwerp, houston, philadelphia are wrappered; lincoln/mount-prospect/manassas/west-nyack still ship from copied legacy HTML through `sync-static-to-public.mjs`).

Output: 4 new `src/pages/*.astro` wrappers + 12 new `src/partials/*` fragment files. Legacy `*.html` files at repo root remain untouched (precedent: antwerp.html / houston.html / philadelphia.html still exist alongside their .astro wrappers — `_redirects` + Astro's outputFile mapping handle the canonical URL).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@src/pages/antwerp.astro
@src/pages/houston.astro
@src/pages/philadelphia.astro
@src/lib/define-page.ts
@src/lib/tm-media.ts
@src/lib/schema/graph.ts
@src/data/locations.ts
@src/data/routes.json
@src/partials/antwerp-main.frag.txt
@src/partials/antwerp-after.frag.txt
@src/partials/antwerp-inline.raw.css.txt
@src/partials/houston-after.frag.txt

<interfaces>
<!-- Key contracts the executor uses. No codebase exploration needed. -->

From src/lib/define-page.ts:
```ts
export interface SitePageMeta { canonicalPath: string; }
export function definePage<const T extends SitePageMeta>(page: T): T;
// Throws if canonicalPath does not start with '/'.
```

From src/lib/tm-media.ts:
```ts
export function applyTmMediaBase(fragment: string): string;
// Replaces all '{{TM_MEDIA_BASE}}' tokens with PUBLIC_TM_MEDIA_BASE (or '' if unset).
```

From src/lib/schema/graph.ts:
```ts
export function buildLocationGraph(slug: string, canonicalPath: string, crumbs: Crumb[]): Graph;
export function serializeGraph(graph: Graph): string;
// buildLocationGraph throws if slug is unknown in allLocations.
// LocalBusiness node included only when localBusinessSchemaEligible is true.
// FAQPage node added when status === 'open' AND faqs.length > 0.
```

From src/data/locations.ts:
```ts
export const allLocations: LocationRecord[];
// LocationRecord includes: id, slug, name, shortName, region ('us' | 'europe'),
// status ('open' | 'coming-soon'), locale, hreflang, etc.
// All four target slugs (lincoln, mount-prospect, manassas, west-nyack) are present
// with region='us' and locale=null.
```

From src/data/routes.json (already includes all four slugs at lines 178–217):
```json
{ "id": "mount-prospect", "canonicalPath": "/mount-prospect", "outputFile": "mount-prospect.html", "legacySources": ["/mount-prospect.html"], "sitemap": true, "status": 301 },
{ "id": "west-nyack", ... }, { "id": "lincoln", ... }, { "id": "manassas", ... }
```

From src/layouts/SiteLayout.astro (props):
```ts
interface Props {
  canonicalPath: string;
  bodyDataLocation?: string;
  lang?: string;          // defaults to 'en'
  // ...plus title, description, ogImage, twitterImage, robots, bodyClass, landingHead
}
// Slots: head-extra, page-style, json-ld, pre-nav, nav, footer, after-site-scripts, default
// Renders: <html lang={lang}><head>... <body data-location={bodyDataLocation}>
//   header > MobileMenu+SiteNav+LocationOverlay
//   main#main > <slot/>
//   footer > SiteFooter
//   TicketPanel + SiteScripts + after-site-scripts slot
```

Reference wrapper shape (philadelphia.astro is the closest analog — US, no region-special lang):
```astro
---
import SiteLayout from '../layouts/SiteLayout.astro';
import { definePage } from '../lib/define-page';
import { allLocations } from '../data/locations';
import phillyCss from '../partials/philadelphia-inline.raw.css.txt?raw';
import phillyMainRaw from '../partials/philadelphia-main.frag.txt?raw';
import phillyAfter from '../partials/philadelphia-after.frag.txt?raw';
import { applyTmMediaBase } from '../lib/tm-media';
import { buildLocationGraph, serializeGraph } from '../lib/schema/graph';

const philly = allLocations.find((l) => l.slug === 'philadelphia');
if (!philly) throw new Error('philadelphia missing from src/data/locations');

const ld = serializeGraph(
    buildLocationGraph('philadelphia', '/philadelphia', [
        { label: 'Home', href: '/' },
        { label: 'Locations', href: '/locations' },
        { label: philly.shortName, href: '/philadelphia' },
    ]),
);
const page = definePage({ canonicalPath: '/philadelphia' });
const phillyMain = applyTmMediaBase(phillyMainRaw);
---

<SiteLayout canonicalPath={page.canonicalPath} bodyDataLocation={philly.slug}>
    <Fragment slot="head-extra">
        <link rel="preload" as="image" href="/assets/video/hero-poster.jpg" />
        <link rel="stylesheet" href="/css/footer.css?v=3" />
        <link rel="stylesheet" href="/css/newsletter.css?v=2" />
        <link rel="stylesheet" href="/css/ticket-panel.css" />
    </Fragment>
    <Fragment slot="page-style"><style is:global set:html={phillyCss}></style></Fragment>
    <Fragment slot="json-ld"><script type="application/ld+json" is:inline set:html={ld}></script></Fragment>
    <div set:html={phillyMain} />
    <Fragment slot="after-site-scripts" set:html={phillyAfter} />
</SiteLayout>
```
</interfaces>

<legacy_boundaries>
<!-- Verified line ranges in each legacy *.html (all four are structurally identical to philadelphia/antwerp). -->

| Slug           | <style>#1   | <style>#2   | <body>      | hero start  | footer start | last </script> before nav.js |
|----------------|-------------|-------------|-------------|-------------|--------------|------------------------------|
| lincoln        | 33–2841     | 2846–2863   | 2865        | 3056        | 3571         | 4293 (line before 4294 `<script defer src="js/nav.js?v=4">`) |
| mount-prospect | 33–2841     | 2846–2863   | 2865        | 3056        | 3562         | 4283 |
| manassas       | 33–2841     | 2846–2863   | 2865        | 3056        | 3562         | 4284 |
| west-nyack     | 33–2841     | 2846–2863   | 2865        | 3056        | 3562         | 4284 |

The 2nd <style> block (lines 2846–2863) is the "Touch-only devices" `@media (hover: none)` footer-hover override. It is NOT present in antwerp/houston/philadelphia. Concatenate both blocks (in source order, separated by a blank line) into `<slug>-inline.raw.css.txt`.

The fragment files must be the INNER content of each block (drop the surrounding `<style>...</style>` and `<script>...</script>` tags). Compare to existing src/partials/antwerp-*.frag.txt for exact shape — main starts with `    <!-- Hero Section -->` (4-space indent), after starts with `    <script>` and ends with `    </script>`.
</legacy_boundaries>

<scripts_to_drop>
<!-- The legacy file ends with these tags AFTER the inline `<script>...</script>` block. They MUST NOT be copied into the after.frag — SiteScripts already emits them globally and the per-location TM.select is redundant once body[data-location] is set. -->

```html
<script defer src="js/nav.js?v=4"></script>
<script src="js/locations.js?v=9"></script>
<script src="js/roller-checkout.js?v=1"></script>
<script src="js/ticket-panel.js?v=4"></script>
<script>(function(){ var id='<slug>'; var name='<Name>'; ... TM.select(id) ...})();</script>
<script src="js/a11y.js"></script>
```

The after.frag should contain ONLY the single inline `<script>...</script>` block that sits between `</footer>` and the first `<script defer src="js/nav.js...">` tag.
</scripts_to_drop>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extract fragments + create wrappers for all four locations</name>
  <files>
    src/partials/lincoln-inline.raw.css.txt,
    src/partials/lincoln-main.frag.txt,
    src/partials/lincoln-after.frag.txt,
    src/pages/lincoln.astro,
    src/partials/mount-prospect-inline.raw.css.txt,
    src/partials/mount-prospect-main.frag.txt,
    src/partials/mount-prospect-after.frag.txt,
    src/pages/mount-prospect.astro,
    src/partials/manassas-inline.raw.css.txt,
    src/partials/manassas-main.frag.txt,
    src/partials/manassas-after.frag.txt,
    src/pages/manassas.astro,
    src/partials/west-nyack-inline.raw.css.txt,
    src/partials/west-nyack-main.frag.txt,
    src/partials/west-nyack-after.frag.txt,
    src/pages/west-nyack.astro
  </files>
  <action>
    For each slug in [lincoln, mount-prospect, manassas, west-nyack] (treat as a 4-pass loop, identical work per slug):

    1. **Read `<slug>.html` fully** (the legacy file at repo root). Verify the boundaries against the table in `<legacy_boundaries>` above before extracting — line numbers are stable but re-confirm by grepping `^<style>$|^</style>$|<body data-location|<!-- Hero Section -->|<!-- Footer -->|<script defer src="js/nav` to be safe.

    2. **Create `src/partials/<slug>-inline.raw.css.txt`**:
       - Take the content INSIDE the first `<style>` block (everything between line 34 and 2840 inclusive — exclude the `<style>` and `</style>` tags themselves).
       - Append a blank line.
       - Append the content INSIDE the second `<style>` block (lines 2847–2862, the "Touch-only devices" `@media (hover: none)` rule).
       - Do NOT include `<style>` / `</style>` tags. The wrapper writes those via `<style is:global set:html={...}>`.

    3. **Create `src/partials/<slug>-main.frag.txt`**:
       - Take the markup from `    <!-- Hero Section -->` (the indented hero comment that follows `<body data-location="<slug>">` and the game-popup div) through the closing `</footer>` tag.
       - Important: the partial covers ONLY hero → footer (matching antwerp-main.frag.txt which is 486 lines). Do NOT include the leading game-popup overlay div (it's part of the after-script DOM scaffold rendered alongside the inline script — but check antwerp-main.frag.txt for whether the game-popup div is the OPENING of main.frag or sits in after.frag; antwerp-main.frag.txt LINE 1 starts with `    <!-- Hero Section -->` so the game-popup IS in main.frag — verify and follow that precedent for all four slugs).
       - Concrete rule: copy verbatim from line 2867 (the `    <div class="game-popup-overlay" id="gamePopup">` line, just after `<body data-location="<slug>">`) through and including the `</footer>` close. This matches antwerp-main.frag.txt's shape (it begins with `<!-- Hero Section -->` immediately because antwerp's game-popup IS in main.frag too — re-read `src/partials/antwerp-main.frag.txt` line 1 to confirm; if antwerp main starts at hero, start at hero too and put game-popup in after.frag — match the precedent exactly).
       - Replace any inline media URL prefix that points at a hosted MP4 with `{{TM_MEDIA_BASE}}` to be consistent with antwerp's frag (search for `assets/video/hero-bg-` in the legacy file; if those `<source src=...>` lines reference relative paths like `assets/video/hero-bg-mobile.mp4` rather than `{{TM_MEDIA_BASE}}/assets/...`, prepend `{{TM_MEDIA_BASE}}/` to the path so `applyTmMediaBase()` can substitute at build time — match antwerp-main.frag.txt lines 5–6 verbatim).
       - Preserve the legacy 4-space indentation.

    4. **Create `src/partials/<slug>-after.frag.txt`**:
       - Take the SINGLE inline `<script>...</script>` block that sits between `</footer>` and the first `<script defer src="js/nav.js?v=4"></script>` tag (typically the rotating-tagline + reveal-on-scroll + game-popup helpers).
       - Include the surrounding `    <script>` and `    </script>` tags themselves (matching antwerp-after.frag.txt line 1 = `    <script>`).
       - Do NOT include any of the trailing tags listed in `<scripts_to_drop>` — `nav.js`, `locations.js`, `roller-checkout.js`, `ticket-panel.js`, the per-location bootstrap IIFE, or `a11y.js`. SiteScripts emits the canonical set globally and the IIFE is redundant once `bodyDataLocation` is set.

    5. **Create `src/pages/<slug>.astro`**:
       - Copy `src/pages/philadelphia.astro` verbatim and substitute the slug. Concrete substitutions for `<slug>='lincoln'`:
         - All identifiers `philly` → `lincoln` (or short alias like `lincoln`/`lincolnCss`/`lincolnMainRaw`/`lincolnAfter`/`lincolnMain`).
         - All literal `'philadelphia'` → `'lincoln'`.
         - All literal `/philadelphia` → `/lincoln`.
         - All partial import paths `../partials/philadelphia-*` → `../partials/lincoln-*`.
         - The `if (!philly)` error message → `'lincoln missing from src/data/locations'`.
         - The breadcrumb `{ label: philly.shortName, href: '/philadelphia' }` → `{ label: lincoln.shortName, href: '/lincoln' }`.
       - Do NOT pass a `lang=` prop. All four slugs are US (region='us', locale=null in locations.json) so the SiteLayout default `lang='en'` is correct. Antwerp passes `lang="nl-BE"` only because it is European; do not copy that line.
       - `bodyDataLocation={<slug>.slug}` is required (matches the legacy `<body data-location="<slug>">`).
       - Repeat for mount-prospect / manassas / west-nyack with the obvious substitutions.

    6. **Do NOT modify** lincoln.html / mount-prospect.html / manassas.html / west-nyack.html at the repo root. Precedent: antwerp.html / houston.html / philadelphia.html all still exist alongside their `.astro` wrappers (verified — see `<legacy_boundaries>` line counts and `src/pages/{antwerp,houston,philadelphia}.astro`). The `_redirects` file already maps the legacy `.html` paths to canonical paths and the route registry is already aware (routes.json lines 178–217). Touching the legacy `.html` files would explode the diff and risk reverting unrelated work in the dirty worktree (per CLAUDE.md project notes).

    7. **Do NOT modify** `src/data/routes.json`, `_redirects`, `sitemap.xml`, `data/locations.json`, `scripts/check-route-contract.js`, or `scripts/sync-static-to-public.mjs`. All four slugs are already registered. The wrapper takes over the `outputFile` rendering; nothing else changes.

    8. **Self-check before declaring done** (per CLAUDE.md GitNexus rules): run `gitnexus_impact({target: "buildLocationGraph", direction: "upstream"})` once before the first wrapper write, and `gitnexus_detect_changes({scope: "staged"})` after staging — confirm scope is limited to the 16 listed `files_modified` paths (4 new pages + 12 new partials).
  </action>
  <verify>
    <automated>
      cd /Users/arisimon/Desktop/coding-files/time-mission-website &amp;&amp;
      ls src/partials/lincoln-*.txt src/partials/mount-prospect-*.txt src/partials/manassas-*.txt src/partials/west-nyack-*.txt src/pages/lincoln.astro src/pages/mount-prospect.astro src/pages/manassas.astro src/pages/west-nyack.astro &amp;&amp;
      grep -c "buildLocationGraph('lincoln'" src/pages/lincoln.astro &amp;&amp;
      grep -c "buildLocationGraph('mount-prospect'" src/pages/mount-prospect.astro &amp;&amp;
      grep -c "buildLocationGraph('manassas'" src/pages/manassas.astro &amp;&amp;
      grep -c "buildLocationGraph('west-nyack'" src/pages/west-nyack.astro &amp;&amp;
      grep -L "js/nav.js\|js/locations.js\|js/roller-checkout.js\|js/ticket-panel.js\|js/a11y.js" src/partials/lincoln-after.frag.txt src/partials/mount-prospect-after.frag.txt src/partials/manassas-after.frag.txt src/partials/west-nyack-after.frag.txt &amp;&amp;
      npm run check &amp;&amp;
      npm run build:astro &amp;&amp;
      npm run check:routes -- --dist
    </automated>
  </verify>
  <done>
    - 16 files exist at the paths listed in `files_modified`.
    - Each `<slug>.astro` contains exactly one `buildLocationGraph('<slug>',` call and one `definePage({ canonicalPath: '/<slug>' })` call.
    - No `<slug>-after.frag.txt` references the duplicated `nav.js`, `locations.js`, `roller-checkout.js`, `ticket-panel.js`, or `a11y.js` script tags (verified by `grep -L` returning all four files).
    - `npm run check` exits 0 (route contract, location contract, components, links, etc.).
    - `npm run build:astro` produces `dist/lincoln.html`, `dist/mount-prospect.html`, `dist/manassas.html`, `dist/west-nyack.html`.
    - `npm run check:routes -- --dist` exits 0 (confirms dist outputs match the route registry).
    - Legacy `lincoln.html` / `mount-prospect.html` / `manassas.html` / `west-nyack.html` at repo root are byte-identical to their pre-task state (`git diff --stat` shows zero changes for those four paths).
  </done>
</task>

</tasks>

<verification>
Run from repo root, in order:

```bash
# 1. File presence + shape
ls src/partials/{lincoln,mount-prospect,manassas,west-nyack}-{inline.raw.css,main.frag,after.frag}.txt
ls src/pages/{lincoln,mount-prospect,manassas,west-nyack}.astro

# 2. Wrapper integrity (each must call buildLocationGraph with its own slug)
for s in lincoln mount-prospect manassas west-nyack; do
    grep -q "buildLocationGraph('$s'" "src/pages/$s.astro" || echo "FAIL: $s wrapper missing graph call"
done

# 3. After-fragments must NOT include duplicated SiteScripts content
for s in lincoln mount-prospect manassas west-nyack; do
    if grep -E "js/nav\.js|js/locations\.js|js/roller-checkout\.js|js/ticket-panel\.js|js/a11y\.js" "src/partials/$s-after.frag.txt"; then
        echo "FAIL: $s after.frag contains duplicated SiteScripts content"
    fi
done

# 4. Legacy *.html unchanged
git diff --stat lincoln.html mount-prospect.html manassas.html west-nyack.html
# expect: empty output

# 5. Source-level checks (route contract, locations, components, schema, etc.)
npm run check

# 6. Astro build + dist-level route contract
npm run build:astro
npm run check:routes -- --dist

# 7. Targeted single-script sanity (these directly cover the migration surface)
npm run check:routes
npm run check:hreflang-cluster
npm run check:schema-output

# 8. Full cutover gate (already-passing baseline must stay green)
npm run verify:phase10
```

All commands must exit 0. Especially watch for:
- `check:hreflang-cluster` — passes because new wrappers don't add region-mismatched `lang` attributes (US locations stay on default `lang='en'`).
- `check:schema-output` — passes because `buildLocationGraph` produces the same node set (Organization + Breadcrumb + LocalBusiness + optional FAQPage) that legacy inline JSON-LD shipped.
- `check:routes` — passes because `routes.json` already has all four slugs and the `outputFile` field maps correctly.
</verification>

<success_criteria>
- 16 files exist (4 wrappers + 12 partials) at the paths in `files_modified`.
- `npm run check` exits 0.
- `npm run build:astro && npm run check:routes -- --dist` exits 0.
- `npm run verify:phase10` exits 0 (cutover gate stays green).
- Legacy `lincoln.html`, `mount-prospect.html`, `manassas.html`, `west-nyack.html` at repo root are byte-identical to pre-task state.
- `git status --short` shows only the 16 new files staged plus this PLAN.md plus the eventual SUMMARY.md (no unrelated worktree sweep — the dirty-worktree caveat from CLAUDE.md is honored).
- A single commit (or one commit per slug — both reviewable) lands the migration; commit message scoped (`feat(astro-migration):` or `chore(astro-migration):`).
</success_criteria>

<output>
After completion, create `.planning/quick/260505-qod-migrate-4-legacy-location-pages-lincoln-/260505-qod-SUMMARY.md` documenting:
- Which slugs were migrated and any per-slug deviations from the philadelphia precedent (e.g., differences in legacy line ranges if the boundary table proved off by a line).
- Confirmation that the 2nd `<style>` block (touch-only @media (hover: none)) was concatenated into each `<slug>-inline.raw.css.txt`.
- Verification command output (npm run check, npm run build:astro, npm run check:routes -- --dist, npm run verify:phase10) — paste the final "passed" / exit-0 lines.
- Any GitNexus impact warnings encountered and how they were resolved.
</output>
