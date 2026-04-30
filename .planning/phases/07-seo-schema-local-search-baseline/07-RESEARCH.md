# Phase 7: SEO, Schema & Local Search Baseline — Research

**Researched:** 2026-04-29
**Domain:** Static-site SEO/GEO/local-business schema in Astro 6 (Cloudflare-style hosting)
**Confidence:** HIGH for Astro patterns, sitemap integration, and JSON-LD; MEDIUM for AI-crawler `User-agent` token list (planner must re-verify at implementation time per D-12); HIGH for project constraints derived from CONTEXT.md and existing code.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Meta & head parity (SEO-01)
- **D-01:** Catalog-only — titles, descriptions, Open Graph, Twitter card fields primarily live in validated `src/data/site` SEO catalogs (or planner-chosen sibling modules under validated data). Astro pages consume via shared helpers/props — no durable long literals duplicated in `.astro` files.
- **D-02:** Robots / indexing signals come from a central rules table keyed by route patterns / page kind (e.g. marketing, legal, thank-you), and the table must validate against the route registry so `noindex`/`nofollow` cannot drift from canonical routes.
- **D-03:** Per-route explicit social images — every migrated route must declare explicit `og:image` and corresponding Twitter image fields (parity expectation with today's page-level variety, not only a global default).

#### Sitemap (SEO-02)
- **D-04:** Build-time generation from the route registry (Astro endpoint or equivalent build-step), emitting `sitemap.xml` at the deploy/public root. No hand-maintained URL list that can drift from registry.
- **D-05:** Sitemap XML fields — planner discretion following current Google guidance: `<loc>` required; add `<lastmod>` when a reliable date exists (build, catalog, or deterministic file change); treat `changefreq` / `priority` as low value unless needed for parity with the legacy file or explicit marketing ask.

#### JSON-LD types (SEO-03, SEO-04)
- **D-06:** No WebSite JSON-LD requirement for v1 — Organization coverage (with `url` / branding) is sufficient unless a later planner note documents a concrete consumer need.
- **D-07:** Open vs coming-soon location schema — planner discretion within SEO-03/04 and DATA-02 validator rules (must not misrepresent hours, status, or booking eligibility).
- **D-08:** FAQPage — Recommended default: emit FAQPage on the global `/faq` route; additionally emit on location pages only when stable Q&A pairs exist in validated data (no scraping loose copy).

#### Local SEO & NAP (SEO-05)
- **D-09:** NAP enforcement — primary guarantee = generated metadata + JSON-LD must match the canonical location data module and shared render props; secondary (if low cost) = representative built-output or focused script checks on critical location routes wired into `verify:phase7`.
- **D-10:** Coming-soon hours — omit `openingHoursSpecification` from schema unless real, validated hours exist. No fake "open" hours for coming-soon venues.

#### GEO / AI readiness (SEO-06)
- **D-11:** Ship `/llms.txt` at site root with curated, privacy-safe pointers to high-signal pages.
- **D-12:** `robots.txt` should explicitly allow major AI crawlers where acceptable (e.g. GPTBot, Google-Extended, Perplexity) — exact `User-agent` tokens are planner-verified against current vendor names at implementation time.
- **D-13:** Answer-first content work in Phase 7 = short internal review document listing gaps and opportunities — no mandatory thin-page rewrites.

### Claude's Discretion
- Exact SEO catalog schema, helper API on `SiteHead`, sitemap endpoint shape, FAQPage eligibility per location, depth of secondary NAP checks, and precise `robots.txt` / `llms.txt` prose — bounded by decisions above.

### Deferred Ideas (OUT OF SCOPE)
- Mandatory content expansion for thin location pages (D-13).
- WebSite + SearchAction JSON-LD until a real on-site search URL exists.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **SEO-01** | Existing titles, descriptions, OG/Twitter, headings, copy, robots behavior, search-critical content preserved unless intentionally improved | "SEO catalog shape", "Central robots rules table", "SiteHead extension" sections; legacy meta inventory pattern in `## Migration Path` |
| **SEO-02** | Sitemap generation uses Astro route/data source of truth and includes only canonical clean URLs | "Sitemap generation: 3 viable mechanisms", recommendation in "Standard Stack" plus existing `scripts/check-sitemap.js` extension path |
| **SEO-03** | Schema generation supports Organization / WebSite / BreadcrumbList / FAQPage / eligible LocalBusiness/location JSON-LD from validated data | "JSON-LD graph composition via SiteLayout slot", "Schema type selection" sections |
| **SEO-04** | Open vs coming-soon location pages use different local SEO and schema rules | "Open vs coming-soon schema rules" + alignment with DATA-02 `localBusinessSchemaEligible` flag in `data/locations.json` |
| **SEO-05** | Location pages validate NAP consistency, map links, hours, clean canonical URLs, location FAQ/schema coverage where content exists | "NAP enforcement strategy", `verify:phase7` script design in "Validation Architecture" |
| **SEO-06** | GEO/AI-search readiness reviewed: answer-first opportunities, AI crawler policy, optional `llms.txt` | "GEO/AI baseline" section, `robots.txt` AI-bot table, `llms.txt` format spec, GEO review doc template |
</phase_requirements>

## Project Constraints (from CLAUDE.md / AGENTS.md)

CLAUDE.md and AGENTS.md scope GitNexus tooling. Two directives are operationally relevant for Phase 7:

- **Pre-edit impact analysis:** Before editing `SiteHead.astro`, `SiteLayout.astro`, `scripts/check-sitemap.js`, `scripts/check-route-contract.js`, run `gitnexus_impact({target, direction: "upstream"})`. These files are central — D-1 callers include every migrated `src/pages/*.astro`, `verify:phase*` scripts, and `_redirects` consumers.
- **Pre-commit detect_changes:** Run `gitnexus_detect_changes()` before every commit to confirm the change set is scoped to SEO/sitemap/schema/`robots.txt`/`llms.txt` and not bleeding into Phase 8 territory or unrelated runtime files.
- **Use `gitnexus_query`** for "schema", "sitemap", "robots" exploration before grepping.

## Summary

Phase 7 turns the existing scattered, hand-authored SEO/schema layer into **one validated, registry-driven contract** that emits in build output. The Astro skeleton is already favorable: `SiteHead.astro` centralizes meta, `SiteLayout.astro` exposes a `json-ld` slot consumed by every page, `src/data/routes.json` is the single URL contract, `src/data/locations.ts` exposes typed validated location records (with `localBusinessSchemaEligible: boolean`), and `src/data/site/*` already contains FAQs, navigation, footer, groups, and seo-defaults. Today, every migrated `src/pages/*.astro` duplicates an inline Organization JSON-LD literal, no `og:image` enters from data, and `sitemap.xml` is a hand-maintained file checked (but not generated) by `scripts/check-sitemap.js`.

Three contracts must land in this phase: **(1) a meta + robots catalog** consumed by `SiteHead` (extends `seo-defaults.json` with per-route entries and a route-pattern keyed indexing rules table); **(2) a build-time sitemap** generated from `routes.json` (recommended: keep Astro-native by adopting `@astrojs/sitemap@3.7.2` with a `filter` whitelist or a custom `src/pages/sitemap.xml.ts` endpoint that re-uses the registry); and **(3) JSON-LD generation helpers** in `src/lib/schema/` that read from `routes.json`, `locations.ts`, `faqs.json`, and the new SEO catalog to emit a single `@graph` per page (Organization always; LocalBusiness/EntertainmentBusiness only when `status === "open"` and `localBusinessSchemaEligible === true`; BreadcrumbList for nested routes; FAQPage on `/faq` always plus per-location only when validated `faqs[]` exists). Coming-soon pages MUST omit `openingHoursSpecification`. All validators wire into `verify:phase7` and check both source data shape and rendered `dist/*.html` output.

**Primary recommendation:** Adopt `@astrojs/sitemap@3.7.2` with a `filter` callback that whitelists registry routes (and a `serialize` transform if `lastmod` is added), build a `src/lib/seo/` and `src/lib/schema/` helper module pair driven by extended `seo-defaults.json` + new `seo-routes.json` + new `seo-robots.json`, refactor `SiteHead.astro` and `SiteLayout.astro` to consume them via a single `getSeoForRoute(canonicalPath)` API, and add a new `scripts/check-seo-catalog.js` and extend `scripts/check-sitemap.js` to validate against the generated `dist/sitemap.xml` (Phase 7 owns the source contract; Phase 8 owns the broader built-output gate).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard | Provenance |
|---------|---------|---------|--------------|-----|
| `@astrojs/sitemap` | 3.7.2 | Build-time sitemap generation from Astro routes | Official Astro integration; auto-discovers static pages incl. `getStaticPaths` outputs; supports `filter`, `customPages`, `serialize`, `entryLimit` | [VERIFIED: npm view @astrojs/sitemap@3.7.2 — published 2026-03-26; bundles `sitemap@^9.0.0`; built against `astro@6.1.0` — fully compatible with project's `astro@^6.1.10`] |
| `astro` | 6.1.10 (already installed) | Static SSG with `output: 'static'` and `trailingSlash: 'never'` already configured | Project foundation; `src/pages/*.astro` and endpoint routes (`*.xml.ts`, `*.txt.ts`) emit at build | [VERIFIED: `package.json` devDependencies + `astro.config.mjs`] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `schema-dts` | 1.1.5 (latest stable; npm dist-tag returned 2.0.0 — verify before pin) | TypeScript types for schema.org JSON-LD | Optional dev-only type-check helper for `src/lib/schema/`; not a runtime dep. Use when planner wants compile-time validation of JSON-LD shape against schema.org | [CITED: https://github.com/google/schema-dts; npm view returned `2.0.0` in latest dist-tag check on 2026-04-29] |
| Native Node + `fs` + Node JSON | built-in | All validation scripts (catalog drift, NAP parity, schema presence in `dist/`) | Existing `scripts/check-*.js` pattern — no new runtime dependency required for validators |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@astrojs/sitemap` | Custom `src/pages/sitemap.xml.ts` endpoint reading `routes.json` directly | Pro: zero deps, full control over field ordering and exact match to current `sitemap.xml` shape, lets Phase 7 reuse the same registry path the existing `scripts/check-sitemap.js` already trusts. Con: must re-implement entry escaping, `entryLimit` chunking (not needed at 25–35 routes), and lose `serialize`/`filter` ergonomics. **Recommended only if planner wants a single registry-driven artifact with no integration surface.** |
| `schema-dts` | Hand-typed `interface` per schema type | Avoids extra dev dep; viable since only Organization, EntertainmentBusiness, BreadcrumbList, FAQPage are needed — small, finite list |
| `zod` (already pulled transitively by `@astrojs/sitemap`) for catalog validation | Plain JS shape checks in `scripts/check-*.js` | Existing `scripts/check-*.js` pattern is plain Node + arrays-of-errors; consistency with Phase 2/3 favors keeping validators framework-free unless a future phase introduces zod broadly |

**Installation (if adopting `@astrojs/sitemap`):**
```bash
npm install --save-dev @astrojs/sitemap@3.7.2
```

**Version verification:** `npm view @astrojs/sitemap version` → `3.7.2` (modified 2026-03-26). Package is published with `provenance` and ships ESM only. No declared `peerDependencies`; `devDependencies.astro: 6.1.0` confirms 6.x compatibility — matches `astro@^6.1.10` already in `package.json`.

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/
├── data/
│   └── site/
│       ├── seo-defaults.json          # existing — extend with social image defaults
│       ├── seo-routes.json            # NEW — per-canonicalPath title/description/og/twitter/canonical override
│       ├── seo-robots.json            # NEW — central rules table: route patterns → indexing
│       └── seo-organization.json      # NEW — Organization JSON-LD source (name, url, logo, sameAs)
├── lib/
│   ├── seo/
│   │   ├── catalog.ts                 # NEW — getSeoForRoute(canonicalPath) → resolved meta + robots
│   │   └── route-patterns.ts          # NEW — pattern matching for D-02 robots rules
│   └── schema/
│       ├── organization.ts            # NEW — Organization node from seo-organization.json
│       ├── localBusiness.ts           # NEW — open-only EntertainmentBusiness from locations.ts
│       ├── breadcrumb.ts              # NEW — BreadcrumbList from canonicalPath
│       ├── faqPage.ts                 # NEW — FAQPage from src/data/site/faqs.json or location faqs[]
│       └── graph.ts                   # NEW — composes @graph for a page
├── pages/
│   ├── sitemap.xml.ts                 # NEW (option A: custom endpoint) — emits from routes.json
│   ├── llms.txt.ts                    # NEW — emits curated llms.txt from routes.json + catalog
│   └── *.astro                        # CHANGED — pull seo + json-ld from helpers, drop inline literals
└── components/
    └── SiteHead.astro                 # CHANGED — accept canonicalPath; resolve via catalog; emit robots
public/
├── robots.txt                         # CHANGED — add AI-bot allow rules + Sitemap line
└── (sitemap.xml emitted by build, not hand-maintained)
scripts/
├── check-seo-catalog.js               # NEW — seo-routes.json keys ⊆ routes.json canonicalPaths; required fields
├── check-seo-robots.js                # NEW — seo-robots.json patterns ⊆ registry, no orphans, no contradictions
├── check-schema-output.js             # NEW — parses dist/*.html, validates JSON-LD shape per page kind
├── check-nap-parity.js                # NEW — for each open location, dist/{slug}.html visible NAP === locations.ts NAP
├── check-llms-txt.js                  # NEW — llms.txt URL allowlist ⊆ routes.json sitemap=true canonicals
└── check-sitemap.js                   # CHANGED — switch source from sitemap.xml → dist/sitemap.xml when --dist
```

### Pattern 1: Centralized SEO catalog consumed by `SiteHead`

**What:** `src/data/site/seo-routes.json` keys by `canonicalPath`. Each entry holds the durable per-route SEO payload. `src/lib/seo/catalog.ts` exports `getSeoForRoute(path)` returning a fully-resolved object (defaults from `seo-defaults.json` merged with route override). Pages stop passing freeform strings.

**When to use:** Every migrated `src/pages/*.astro` must adopt this so D-01 (catalog-only) and D-03 (per-route og:image) hold.

**Example:**
```jsonc
// src/data/site/seo-routes.json — shape sketch
{
  "/": {
    "title": "Time Mission – 25+ Interactive Mission Rooms",
    "description": "Step into the mission. Teams of 2–5 compete through 25+ immersive missions...",
    "ogImage": "/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg",
    "twitterImage": "/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg"
  },
  "/groups/corporate": {
    "title": "Corporate Events & Team Building | Time Mission",
    "description": "Two ways to book...",
    "ogImage": "/assets/photos/groups/corporate-events.jpg",
    "twitterImage": "/assets/photos/groups/corporate-events.jpg"
  }
}
```

```ts
// src/lib/seo/catalog.ts — sketch
import defaults from '../../data/site/seo-defaults.json';
import routes from '../../data/site/seo-routes.json';
import robots from '../../data/site/seo-robots.json';
import { resolveRobotsForRoute } from './route-patterns';

export interface ResolvedSeo {
    title: string;
    description: string;
    canonicalPath: string;
    ogImage: string;
    twitterImage: string;
    robots: string; // e.g. "index,follow" | "noindex,follow"
}

export function getSeoForRoute(canonicalPath: string): ResolvedSeo {
    const entry = routes[canonicalPath];
    if (!entry) throw new Error(`SEO catalog missing entry for ${canonicalPath}`);
    return {
        title: entry.title,
        description: entry.description,
        canonicalPath,
        ogImage: entry.ogImage,
        twitterImage: entry.twitterImage ?? entry.ogImage,
        robots: resolveRobotsForRoute(canonicalPath, robots),
    };
}
```

```astro
---
// src/pages/index.astro — after refactor
import SiteLayout from '../layouts/SiteLayout.astro';
import { getSeoForRoute } from '../lib/seo/catalog';
import { buildHomeGraph } from '../lib/schema/graph';

const seo = getSeoForRoute('/');
const ld = JSON.stringify(buildHomeGraph());
---
<SiteLayout {...seo}>
    <Fragment slot="json-ld">
        <script type="application/ld+json" set:html={ld}></script>
    </Fragment>
    ...
</SiteLayout>
```

### Pattern 2: Build-time sitemap via `@astrojs/sitemap` with registry filter

**What:** Add `@astrojs/sitemap` to `astro.config.mjs`. Use `filter` to whitelist only canonical registry URLs (excludes any stray pages or contact-thank-you which has `sitemap: false`). Emits `dist/sitemap.xml`.

**When to use:** Recommended unless planner prefers zero-dep. Combines well with the existing `site` config (already `https://timemission.com`) and `trailingSlash: 'never'`.

**Example:**
```js
// astro.config.mjs — sketch
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import routes from './src/data/routes.json' with { type: 'json' };

const sitemapUrls = new Set(
    routes.routes
        .filter((r) => r.sitemap === true)
        .map((r) => `${routes.baseUrl}${r.canonicalPath === '/' ? '/' : r.canonicalPath}`),
);

export default defineConfig({
    site: 'https://timemission.com',
    output: 'static',
    trailingSlash: 'never',
    build: { format: 'file' },
    integrations: [
        sitemap({
            filter: (page) => sitemapUrls.has(page),
            // serialize: omit changefreq/priority by default; add lastmod conditionally if planner adopts D-05
        }),
    ],
});
```

### Pattern 2b (alternative): Custom endpoint `src/pages/sitemap.xml.ts`

**What:** A static endpoint that returns a `Response` with the sitemap XML built directly from `src/data/routes.json`. No integration dep.

**Example:**
```ts
// src/pages/sitemap.xml.ts — sketch
import type { APIRoute } from 'astro';
import routes from '../data/routes.json' with { type: 'json' };

export const GET: APIRoute = () => {
    const urls = routes.routes
        .filter((r) => r.sitemap === true)
        .map((r) => {
            const path = r.canonicalPath === '/' ? '/' : r.canonicalPath;
            return `  <url><loc>${routes.baseUrl}${path}</loc></url>`;
        })
        .join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
    return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
```

**Tradeoff:** Endpoint is the simplest single-source mechanism (matches `routes.json` 1:1) but loses Astro's automatic page discovery if a future page is added without a registry entry — which is **desirable** here because `routes.json` is the contract. **Recommend Pattern 2b for parity with the existing static `sitemap.xml` shape and to avoid coupling to a third-party integration's emission rules.**

### Pattern 3: JSON-LD `@graph` composition in `SiteLayout` slot

**What:** Each page calls `buildPageGraph({ canonicalPath, kind, locationSlug? })` and pipes the resulting JSON string through `<script type="application/ld+json" set:html={...}>` in the existing `json-ld` slot. The `@graph` always contains Organization (canonical refers via `@id`); page-kind drivers add LocalBusiness/EntertainmentBusiness, BreadcrumbList, FAQPage.

**When to use:** Replaces the duplicated `'{"@context":"https://schema.org","@type":"Organization",...}'` literal in every `src/pages/*.astro` (currently 4+ pages: `index`, `philadelphia`, `houston`, `faq`, plus all post-Phase-4 pages).

**Example:**
```ts
// src/lib/schema/graph.ts — sketch
import { allLocations } from '../../data/locations';
import faqsDoc from '../../data/site/faqs.json';
import { organizationNode } from './organization';
import { breadcrumbNode } from './breadcrumb';
import { localBusinessNode } from './localBusiness';
import { faqPageNode } from './faqPage';

export function buildHomeGraph() {
    return { '@context': 'https://schema.org', '@graph': [organizationNode()] };
}

export function buildLocationGraph(slug: string, canonicalPath: string) {
    const loc = allLocations.find((l) => l.slug === slug);
    if (!loc) throw new Error(`location ${slug} missing`);
    const graph = [organizationNode(), breadcrumbNode(canonicalPath, [
        { label: 'Home', href: '/' },
        { label: 'Locations', href: '/locations' },
        { label: loc.shortName, href: canonicalPath },
    ])];
    if (loc.status === 'open' && loc.localBusinessSchemaEligible) {
        graph.push(localBusinessNode(loc, canonicalPath));
    }
    if (loc.status === 'open' && Array.isArray(loc.faqs) && loc.faqs.length > 0) {
        graph.push(faqPageNode(loc.faqs));
    }
    return { '@context': 'https://schema.org', '@graph': graph };
}

export function buildFaqGraph() {
    const items = faqsDoc.sections.flatMap((s) => s.items);
    return { '@context': 'https://schema.org', '@graph': [organizationNode(), faqPageNode(items)] };
}
```

```ts
// src/lib/schema/localBusiness.ts — sketch (open-only, omits hours when none exist)
import type { LocationRecord } from '../../data/locations';

export function localBusinessNode(loc: LocationRecord, canonicalPath: string) {
    const node: Record<string, unknown> = {
        '@type': 'EntertainmentBusiness',
        '@id': `https://timemission.com${canonicalPath}#business`,
        name: loc.name,
        url: `https://timemission.com${canonicalPath}`,
        telephone: loc.phoneE164 ?? loc.contact.phone,
        email: loc.contact.email || undefined,
        address: {
            '@type': 'PostalAddress',
            streetAddress: [loc.address.line1, loc.address.line2].filter(Boolean).join(', '),
            addressLocality: loc.address.city,
            addressRegion: loc.address.state || undefined,
            postalCode: loc.address.zip,
            addressCountry: loc.countryCode ?? loc.address.country,
        },
    };
    // D-10: only emit openingHoursSpecification when real hours exist
    const hourEntries = Object.entries(loc.hours);
    if (hourEntries.length > 0) {
        node.openingHoursSpecification = hourEntries.map(([day, h]) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: dayOfWeekMap[day],
            opens: h.open,
            closes: h.close,
        }));
    }
    return node;
}
```

### Pattern 4: Central robots indexing rules (D-02)

**What:** `src/data/site/seo-robots.json` is a list of `{ pattern, robots }` rules. `src/lib/seo/route-patterns.ts` resolves a canonicalPath against the table (first-match wins, default = `index,follow`). A new `scripts/check-seo-robots.js` fails if a pattern matches no registered route, or if a route is unreachable by any pattern (indicating drift).

**Example:**
```jsonc
// src/data/site/seo-robots.json — sketch
{
  "rules": [
    { "match": "exact", "path": "/contact-thank-you", "robots": "noindex,follow" },
    { "match": "exact", "path": "/waiver",            "robots": "noindex,follow" },
    { "match": "prefix", "path": "/groups/",          "robots": "index,follow" },
    { "match": "default",                              "robots": "index,follow" }
  ]
}
```

### Anti-Patterns to Avoid

- **Inline JSON-LD literals in `src/pages/*.astro`.** This is the current state (e.g. `philadelphia.astro`, `houston.astro`, `index.astro`, `faq.astro` each declare their own `const ld = '{...}'`). Phase 7 must replace every one — leaving any inline duplicate creates Pitfall 6 drift.
- **Emitting `openingHoursSpecification` on coming-soon pages.** Violates D-10 and Google's structured-data guidance. `localBusinessSchemaEligible` flag in `locations.ts` exists; Phase 7 helper must check both `status === "open"` AND eligibility.
- **Hand-maintaining `sitemap.xml`.** D-04 requires generation. Don't write a script that "syncs" the static file from registry — make the file an emitted build artifact and stop checking it into the repo (or keep as fallback only with a comment).
- **`changefreq` / `priority` everywhere.** Google explicitly ignores both. Existing `sitemap.xml` includes `<changefreq>monthly</changefreq><priority>0.8</priority>` for parity with the legacy file; Phase 7 may drop them per D-05 unless Bing/parity needs are documented.
- **Fake `WebSite` / `SearchAction` JSON-LD.** Per D-06 and SearchAction spec, only declare it when an actual on-site search URL exists. Time Mission has none.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sitemap chunking, escaping, `urlset` namespace | Custom XML writer with edge-case bugs | `@astrojs/sitemap@3.7.2` (option A) **or** template literal endpoint emitting only registry routes (option B — simple enough at <50 routes) | Sitemap spec is small, but escaping `&`, `<`, `>` in URLs and chunking at 50k entries is solved already. At 32 routes, a template literal is safe; at 5,000+, use the integration |
| JSON-LD shape validation | Hand-written interfaces against the schema.org spec | `schema-dts` (dev-only) **or** Schema Markup Validator post-build | Schema.org has 800+ types; even a focused subset (Organization, EntertainmentBusiness, BreadcrumbList, FAQPage) has nested address/hours shapes that benefit from typed source-of-truth |
| Day-of-week mapping for `openingHoursSpecification` | Inline magic strings | One small constant `dayOfWeekMap` in `src/lib/schema/localBusiness.ts` | Existing legacy HTML uses `Monday`, `Tuesday`...; current `data/locations.json` uses `mon`, `tue`...; mismatch is a real risk |
| AI-bot UA token list | Hardcoded list assumed correct | Planner verifies live from each vendor's docs at implementation time per D-12 (see "GEO/AI Baseline" below) | Vendor token names change; e.g. Anthropic split `anthropic-ai` into `ClaudeBot` + `Claude-User` + `Claude-SearchBot` over 2024–2026 |
| `llms.txt` syntax | Freeform Markdown guess | Follow `llmstxt.org` spec (H1 site name, blockquote summary, H2 sections, `- [Title](URL): description` links) | Spec is small but strict; some validators check shape |

**Key insight:** Time Mission's SEO surface is small (≈32 routes). The temptation to hand-roll everything is real but each hand-roll creates a divergence point with `routes.json`. The discipline is **single-source generation** for sitemap, JSON-LD, robots, and `llms.txt` — driven by `routes.json` + `locations.ts` + new SEO catalogs.

## Common Pitfalls

### Pitfall 1: Sitemap whitelist forgets `routes.json` is the source of truth
**What goes wrong:** `@astrojs/sitemap` auto-includes any `src/pages/*.astro` page (or `getStaticPaths` output). If Phase 7 adds a page like `src/pages/sitemap.xml.ts` or a draft page, it can leak into the sitemap.
**Why it happens:** Default integration behavior is "include everything". The discuss-decision (D-04) says "from the route registry" — so the integration must `filter` to the registry-declared canonical URLs only.
**How to avoid:** Pass `filter: (page) => registryCanonicalSet.has(page)` to `sitemap()`, OR use the custom endpoint pattern that explicitly iterates `routes.routes`.
**Warning signs:** `dist/sitemap.xml` contains `/sitemap.xml`, `/contact-thank-you`, or any path not in `routes.json` with `sitemap: true`.

### Pitfall 2: `set:html` of JSON-LD escapes the wrong characters
**What goes wrong:** Title/description in catalog contains `'` or `&` that Astro's HTML escaping mangles when injected into a `<script type="application/ld+json">` block.
**Why it happens:** `set:html` injects literal HTML. JSON.stringify produces JSON-escaped strings (`\"`, `\\`), but if any value contains `</script>` or `<!--`, browser HTML parser will close the script tag prematurely.
**How to avoid:** Use `JSON.stringify(graph).replace(/</g, '\\u003c')` before `set:html`. (Also: never put HTML in catalog string fields.)
**Warning signs:** Schema validators fail with "Unexpected token <" or pages render visible JSON.

### Pitfall 3: NAP visible vs schema mismatch
**What goes wrong:** Phase 4 page partials still hold hardcoded address/phone copy that drifts from `data/locations.json` after a future edit. The schema is correct (helpers read from `locations.ts`); the visible NAP in the page partial is wrong.
**Why it happens:** Existing `src/pages/philadelphia.astro` injects raw HTML partials (`philadelphia-main.frag.txt`) that contain literal addresses copied from the legacy static page. The phase-7 NAP guarantee per D-09 is **schema/meta vs data module**, not visible-text vs schema. Secondary check is optional and depends on planner.
**How to avoid:** Plan a `scripts/check-nap-parity.js` that, at minimum, asserts schema NAP === data module NAP. As a stretch, parse the rendered page partial for `<address>` markers or known data-attributes and compare.
**Warning signs:** Phone or street number changes in `data/locations.json` but a visual diff shows the page didn't update.

### Pitfall 4: Breadcrumb schema doesn't match visible breadcrumb
**What goes wrong:** `Breadcrumbs.astro` renders one trail in the UI but JSON-LD emits another (different labels, different depth).
**Why it happens:** Two parallel sources — Phase 4 `Breadcrumbs.astro` accepts a `Crumb[]` prop set per page; the JSON-LD helper would also need to know the trail.
**How to avoid:** Pass the same `Crumb[]` array to both `<Breadcrumbs items={crumbs} />` and `breadcrumbNode(crumbs)`. Or: derive both from a single per-route `breadcrumbs` field in `seo-routes.json` (preferred).
**Warning signs:** Visible breadcrumb shows "Home > Locations > Philadelphia" but JSON-LD says `[Home, Philadelphia]`.

### Pitfall 5: `og:image` paths are root-relative, not absolute URLs
**What goes wrong:** Open Graph crawlers (Facebook, LinkedIn) require absolute URLs for `og:image`. Existing `SiteHead.astro` already prefixes with `baseUrl` for the default — but the catalog must store paths in a normalized form so the helper can produce absolute URLs reliably.
**How to avoid:** In catalog, store paths as root-relative (`/assets/...`); helper builds absolute URL once via `new URL(path, baseUrl)`.
**Warning signs:** Facebook Sharing Debugger reports "missing or invalid og:image".

### Pitfall 6: Coming-soon location accidentally emits LocalBusiness
**What goes wrong:** `houston.astro`, `dallas.html`, `orland-park.html`, `brussels.html` render JSON-LD that incorrectly claims an open business with no real address/hours. Currently the legacy Houston HTML file does NOT emit a LocalBusiness node (verified by checking `philadelphia.html` only). But the new helper must enforce this.
**How to avoid:** `localBusinessNode` MUST be guarded by `if (loc.status === 'open' && loc.localBusinessSchemaEligible)`. The `localBusinessSchemaEligible` flag exists in `data/locations.json` (set to `false` for coming-soon, `true` for opens).
**Warning signs:** Schema Markup Validator on `/houston` shows EntertainmentBusiness with empty address.

### Pitfall 7: `lastmod` lies and Google stops trusting it
**What goes wrong:** Adding `lastmod: new Date().toISOString()` at build time means every page reports modified-today, which Google will eventually distrust.
**Why it happens:** Easy to grab build time; hard to compute "last meaningful content change".
**How to avoid:** If planner adopts `lastmod`, compute from `git log -1 --format=%cI -- {file}` for the underlying page source (`src/pages/{x}.astro` AND `src/data/site/seo-routes.json` AND `data/locations.json` for location pages — take max). Or omit `lastmod` per D-05 default.
**Warning signs:** Google Search Console "Discovered – currently not indexed" for many pages, or sitemap last-modified dates ignored.

## Runtime State Inventory

This phase is **not a rename or refactor of stored state** — it adds new data files, helpers, and emitted artifacts. The relevant inventory is what currently exists in the runtime that Phase 7 supersedes:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no DB or external store. Existing `sitemap.xml`, `robots.txt`, `data/locations.json` are all in-repo files | None at runtime |
| Live service config | None — `_headers` already permits `https://www.googletagmanager.com` and friends; no Cloudflare API config holds SEO state | None |
| OS-registered state | None | None |
| Secrets/env vars | `PUBLIC_GTM_CONTAINER_ID` referenced in `SiteHead.astro` — Phase 7 does not change | None — only new env reads (none planned) |
| Build artifacts / installed packages | Existing legacy HTML at root (`philadelphia.html`, etc.) carries hand-authored JSON-LD scripts. After cutover those legacy files no longer ship via `_redirects`, but they remain in the repo as Phase 1 rollback assets per FND-04. Phase 7 must NOT remove them | Leave legacy HTML JSON-LD intact (it ships only if rollback is exercised); ensure the Astro-emitted `dist/{slug}.html` overwrites or supersedes |

**Critical migration note:** `scripts/sync-static-to-public.mjs` currently copies the hand-authored `sitemap.xml` and `robots.txt` from repo root into `public/`. Phase 7 must:
1. Either remove `sitemap.xml` from `mandatoryFiles` in that script and let `@astrojs/sitemap` (or the endpoint) generate it directly into `dist/`, OR
2. Generate the sitemap into `public/sitemap.xml` as a build-prep step (less idiomatic).

For `robots.txt`: keep in `public/robots.txt` (or repo-root copied via sync) but extend with AI bot rules + `Sitemap:` line. `llms.txt` follows the same pattern — emit via endpoint or place in `public/llms.txt`.

## Code Examples

### Verified patterns from official sources

#### Astro static endpoint emitting XML — Pattern 2b
[CITED: https://docs.astro.build/en/guides/endpoints/ — "Static File Endpoints"]
```ts
// src/pages/sitemap.xml.ts
import type { APIRoute } from 'astro';
import routes from '../data/routes.json' with { type: 'json' };

export const GET: APIRoute = () => {
    const items = routes.routes
        .filter((r) => r.sitemap === true)
        .map((r) => {
            const path = r.canonicalPath === '/' ? '/' : r.canonicalPath;
            return `  <url><loc>${routes.baseUrl}${path}</loc></url>`;
        })
        .join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
    return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
```

#### Astro static endpoint emitting plain text — for `/llms.txt`
[CITED: same Astro Endpoints docs — supports any extension via filename]
```ts
// src/pages/llms.txt.ts
import type { APIRoute } from 'astro';
import routes from '../data/routes.json' with { type: 'json' };

export const GET: APIRoute = () => {
    const lines: string[] = [];
    lines.push('# Time Mission');
    lines.push('');
    lines.push('> 25+ interactive mission rooms. Teams of 2–5 compete through immersive missions across multiple US and EU locations.');
    lines.push('');
    lines.push('## Core Pages');
    lines.push(`- [Home](${routes.baseUrl}/): Brand experience and entry point`);
    lines.push(`- [Missions](${routes.baseUrl}/missions): The mission catalog`);
    lines.push(`- [Locations](${routes.baseUrl}/locations): All venues`);
    lines.push(`- [FAQ](${routes.baseUrl}/faq): Frequently asked questions`);
    lines.push('');
    lines.push('## Locations');
    for (const r of routes.routes) {
        if (!r.sitemap) continue;
        if (!/^\/(philadelphia|west-nyack|lincoln|manassas|mount-prospect|antwerp)$/.test(r.canonicalPath)) continue;
        lines.push(`- [${r.id}](${routes.baseUrl}${r.canonicalPath})`);
    }
    lines.push('');
    lines.push('## Group & Event Pages');
    for (const r of routes.routes) {
        if (!r.canonicalPath.startsWith('/groups/')) continue;
        lines.push(`- [${r.id}](${routes.baseUrl}${r.canonicalPath})`);
    }
    return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
```

#### JSON-LD via `set:html` and `JSON.stringify`
[CITED: https://docs.astro.build/en/reference/directives-reference/#sethtml — official guidance for JSON-LD]
```astro
<script type="application/ld+json" set:html={JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
        organizationNode(),
        // ... other nodes
    ],
}).replace(/</g, '\\u003c')}></script>
```

#### `@astrojs/sitemap` with filter + serialize (Pattern 2)
[CITED: https://docs.astro.build/en/guides/integrations-guide/sitemap/ — confirmed via Context7 query]
```js
import { defineConfig } from 'astro/config';
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';
import routes from './src/data/routes.json' with { type: 'json' };

const allowed = new Set(
    routes.routes
        .filter((r) => r.sitemap === true)
        .map((r) => `${routes.baseUrl}${r.canonicalPath === '/' ? '/' : r.canonicalPath}`),
);

export default defineConfig({
    site: 'https://timemission.com',
    output: 'static',
    trailingSlash: 'never',
    build: { format: 'file' },
    integrations: [
        sitemap({
            filter: (page) => allowed.has(page),
            serialize(item) {
                // D-05: drop changefreq/priority by default
                delete item.changefreq;
                delete item.priority;
                return item;
            },
        }),
    ],
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<changefreq>` and `<priority>` in sitemaps | Drop both; rely on `<lastmod>` only | Long-standing Google guidance restated 2023–2025 | D-05 already aligned; legacy `sitemap.xml` should drop them at migration |
| FAQPage rich result for any site | Restricted to government & health sites since Aug 2023 | August 2023 | FAQPage on `/faq` and locations is still valuable for AI-search citations and entity understanding (D-08), even without rich-result eligibility |
| `WebSite` JSON-LD as default | Only when site has actual on-site search URL | Sitelinks search box visibility heavily restricted by Google | D-06 correctly defers WebSite to v2 |
| `robots.txt` as a binary allow/disallow | Granular per-bot entries for AI training vs retrieval crawlers | OpenAI introduced GPTBot July 2023; Anthropic introduced ClaudeBot Aug 2023; Google-Extended Sept 2023 | D-12 explicit allow list — but planner must verify exact UA tokens at implementation per the AI-bot table below |
| Hand-maintained `sitemap.xml` checked into repo | Build-emitted from route source of truth | Astro 1.0+ era best practice | D-04 aligned |
| Scattered inline JSON-LD per page | Centralized helpers + `@graph` composition | JSON-LD 1.1 spec + Google's "single block" guidance | All migrated `src/pages/*.astro` currently violate this — Phase 7 fixes |

**Deprecated / should not be added:**
- `<priority>` and `<changefreq>` (Google ignores; Bing weakly hints) — D-05 says drop unless parity needs them.
- `WebSite` + `SearchAction` JSON-LD without on-site search.
- `meta name="keywords"` (Google ignores; not in current migration).

## GEO / AI Baseline

### AI-bot allow rules for `robots.txt` (D-12)

Planner MUST verify each token against vendor docs at implementation time. As of 2026-04-29 the consensus list (tertiary confidence per WebSearch synthesis; planner re-verify before commit):

| Vendor | Crawler purpose | Token (verify before use) | Recommended action for marketing site |
|--------|-----------------|---------------------------|----------------------------------------|
| OpenAI | Training | `GPTBot` | Allow |
| OpenAI | ChatGPT search index | `OAI-SearchBot` | Allow |
| OpenAI | On-demand fetch (user asked ChatGPT to visit) | `ChatGPT-User` | Allow |
| Anthropic | Training | `ClaudeBot` | Allow |
| Anthropic | On-demand fetch | `Claude-User` | Allow |
| Anthropic | Search index | `Claude-SearchBot` | Allow |
| Anthropic | (legacy general purpose) | `anthropic-ai` | Allow (graceful) |
| Perplexity | Search + on-demand | `PerplexityBot` | Allow |
| Google | Gemini / Vertex AI training opt-out token | `Google-Extended` | Allow (do NOT disallow — disallowing opts out of Gemini citations) |
| Apple | Apple Intelligence / Siri | `Applebot-Extended` | Allow |
| Common Crawl | Open dataset (used by many AI labs) | `CCBot` | Allow |
| ByteDance | Training | `Bytespider` | Planner discretion (aggressive crawler) |

**Verification protocol:** Before commit, planner runs `WebSearch` for each vendor's "robots.txt user-agent" official documentation (for OpenAI: `https://platform.openai.com/docs/bots`; Anthropic: `https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data`; Google: `https://developers.google.com/search/docs/crawling-indexing/google-extended`; Perplexity: `https://docs.perplexity.ai/guides/bots`). The above table is **planner-verified** and should be re-checked at implementation per D-12.

### `robots.txt` shape (Phase 7 emits)

```text
# Time Mission — robots.txt
User-agent: *
Allow: /

Disallow: /_archive/
Disallow: /test-results/
Disallow: /.playwright-mcp/

# AI crawlers (allow major training + retrieval bots — D-12)
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

Sitemap: https://timemission.com/sitemap.xml
```

### `llms.txt` format (D-11)

[CITED: https://llmstxt.org/ specification]
- File location: site root, served at `/llms.txt`.
- MIME: `text/plain` or `text/markdown`, UTF-8.
- Status code: 200.
- Required structure: H1 site name → blockquote one-line description → H2 sections (Documentation, Core Pages, etc.) → `- [Title](URL): Description` link lists.
- Optional: `## Optional` section for lower-priority pages.

**Privacy-safe scope (D-11):** Only public canonical URLs from `routes.json` with `sitemap: true`. No customer URLs, no `?book=1` URLs, no admin or thank-you pages.

### GEO answer-first review document (D-13)

Phase 7 produces `docs/geo-answer-first-review.md` (or planner-named) — short internal doc listing:
- Per-page presence/absence of an "answer-first" lead paragraph (one-sentence summary, then expansion).
- Headings that read as questions vs vague brand titles.
- Pages with no FAQ schema where one would help (locations without `faqs[]`).
- Recommendation column ("rewrite", "add FAQ", "no action").
- Status column for follow-up tracking.

**No mandatory rewrites in Phase 7** per D-13. Doc is ops/marketing input for a future content phase.

## Migration Path

### Today's state (verified by reading code)
1. `src/components/SiteHead.astro` accepts `title`, `description`, `canonicalPath`, `ogImage?`, `twitterImage?` and renders meta + canonical + OG/Twitter. Default `og:image` = `Time-Mission_Magma_Mayhem-2.jpg`. **No robots meta is rendered today.**
2. `src/layouts/SiteLayout.astro` exposes `<slot name="json-ld" />` already.
3. Each migrated `src/pages/*.astro` (`index`, `philadelphia`, `houston`, `faq`, `about`, `groups/corporate`, `locations`, `contact`, `contact-thank-you`, `privacy`) inlines the same Organization JSON-LD literal. **None emit BreadcrumbList, LocalBusiness, or FAQPage today.** Legacy HTML files at root DO inline EntertainmentBusiness for open locations.
4. `sitemap.xml` is a hand-maintained file at repo root. `scripts/check-sitemap.js` verifies it matches `routes.json` (32 URLs) and rejects `.html` URLs and trailing slashes.
5. `robots.txt` at repo root is minimal — `User-agent: *`, three Disallows, one Sitemap line. **No AI-bot rules.**
6. `scripts/sync-static-to-public.mjs` copies repo root `sitemap.xml`, `robots.txt`, `_headers`, `_redirects`, `404.html` into `public/` so they appear in `dist/`.

### Migration steps (planner shapes into plans/waves)

**Wave A — Catalog scaffolding (no behavior change):**
- Add `src/data/site/seo-routes.json`, `seo-robots.json`, `seo-organization.json`.
- Add `src/lib/seo/catalog.ts`, `src/lib/seo/route-patterns.ts`.
- Add `scripts/check-seo-catalog.js`, `scripts/check-seo-robots.js` and wire into `npm run check`.
- **Verification:** `seo-routes.json` keys === all `canonicalPath` from `routes.json` (excluding optional `noindex` like `/contact-thank-you`).

**Wave B — Refactor `SiteHead` + migrate pages to catalog:**
- Extend `SiteHead.astro` props to accept `robots?` (default `index,follow`); render `<meta name="robots" content={robots}>`.
- Update each migrated `src/pages/*.astro` to call `getSeoForRoute(canonicalPath)` and spread.
- Remove `ogImage` / `title` / `description` literals from every `*.astro`.
- **Verification:** existing `npm run check:routes` still passes (canonicals unchanged); new `check:seo-catalog` passes; visual diff Wave 4 of Phase 4 templates remains green.

**Wave C — JSON-LD helpers + replace inline literals:**
- Add `src/lib/schema/{organization,localBusiness,breadcrumb,faqPage,graph}.ts`.
- Replace inline `const ld = '{...}'` in every `src/pages/*.astro` with `buildXxxGraph()` helper.
- For open locations (`philadelphia`, `houston` is coming-soon — no LocalBusiness node), Phase 7 must still resolve all 8 currently-open locations even though only `philadelphia.astro` and `houston.astro` exist as Astro pages today (others are public-copied legacy HTML). **Therefore Phase 7 also needs to inject the new schema into legacy public-copied HTML, OR scope schema improvements to Astro-rendered pages only and document the gap for the bulk-conversion phase.**
- **Recommend planner decision:** Scope JSON-LD upgrades to Astro-rendered pages this phase; legacy HTML keeps existing inline JSON-LD intact. Phase 8 verification will flag the gap.

**Wave D — Sitemap + robots + llms.txt:**
- Add `src/pages/sitemap.xml.ts` (recommended Pattern 2b) OR install `@astrojs/sitemap`.
- Update `astro.config.mjs` if Pattern 2.
- Update `scripts/sync-static-to-public.mjs` to remove `sitemap.xml` from `mandatoryFiles` (since it's now generated). Keep `robots.txt` and add `llms.txt` to `mandatoryFiles` if generated as static files, or add `src/pages/llms.txt.ts` endpoint.
- Replace `public/robots.txt` content with the AI-bot expanded version.
- Add `src/pages/llms.txt.ts` (recommended) or `public/llms.txt` static file.
- **Verification:** new `scripts/check-llms-txt.js` validates `/llms.txt` URLs ⊆ canonical sitemap URLs; `scripts/check-sitemap.js` extended (or new sibling) to read `dist/sitemap.xml` after build.

**Wave E — NAP parity + GEO review doc + `verify:phase7`:**
- Add `scripts/check-nap-parity.js` — for each Astro-rendered open location, compare emitted JSON-LD address/phone/email to `data/locations.json`.
- Add `docs/geo-answer-first-review.md`.
- Add `verify:phase7` script chaining `check`, new SEO/schema/NAP/llms checks, `build:astro`, and a built-output schema validation.
- **Verification:** `npm run verify:phase7` exits 0.

## Phase 7 vs Phase 8 boundary

| Concern | Phase 7 | Phase 8 |
|---------|---------|---------|
| SEO catalog source-data shape | ✅ owns | reads |
| `routes.json` registry | reads | reads |
| Sitemap generation mechanism | ✅ owns | reads `dist/sitemap.xml` for cutover validation |
| Robots/llms.txt content | ✅ owns | reads `dist/robots.txt`, `dist/llms.txt` |
| JSON-LD helpers | ✅ owns | reads `dist/*.html` for schema validation |
| Per-page schema validity in `dist/` | new `scripts/check-schema-output.js` (initial) | full `verify:phase8` cross-page audit + Lighthouse-style structured-data report |
| NAP parity (data ↔ schema) | ✅ owns `scripts/check-nap-parity.js` | re-runs as part of `verify:phase8` |
| Visible NAP regression vs schema | optional secondary check | required as part of cutover gate |
| Cloudflare preview validation | out of scope | required (`_headers`, `_redirects`, `dist/sitemap.xml`, `dist/robots.txt`) |

**Critical rule:** Phase 7 may extend or rename `scripts/check-sitemap.js` but must keep its current source-side validation working (route registry → repo-root `sitemap.xml`). New built-output validation goes into a sibling script (`scripts/check-sitemap-output.js`) so Phase 8 can compose both.

## Validation Architecture

> Required because `workflow.nyquist_validation` is `true` in `.planning/config.json`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node CommonJS scripts + `@playwright/test@1.59.1` (for any optional smoke). New scripts live under `scripts/check-*.js`. |
| Config file | `package.json` (npm scripts), `playwright.config.js` (existing). |
| Quick run command | `npm run check` (extended with new SEO/robots/llms catalog checks) |
| Full suite command | `npm run verify:phase7` (NEW — chains `check`, `build:astro`, NAP parity, schema-output, llms parity, route check `--dist`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **SEO-01** | Every migrated route resolves a catalog entry; titles, descriptions, OG/Twitter present and non-empty in `SiteHead`-rendered HTML | unit (catalog drift) + integration (parsed `dist/*.html`) | `node scripts/check-seo-catalog.js`; `node scripts/check-seo-output.js` | ❌ Wave 0 — both new |
| **SEO-01** | Robots meta on every page matches central rules; `noindex` routes (e.g. `/contact-thank-you`) emit `noindex,follow` | unit + integration | `node scripts/check-seo-robots.js`; `node scripts/check-seo-output.js` | ❌ Wave 0 |
| **SEO-02** | `dist/sitemap.xml` contains exactly the registry's `sitemap: true` canonical URLs, no `.html`, no trailing slash (except `/`) | integration | `node scripts/check-sitemap-output.js` (new) **or** extended `scripts/check-sitemap.js --dist` | ❌ Wave 0 — new mode or new script |
| **SEO-03** | Organization JSON-LD emitted on every page; BreadcrumbList on nested routes; FAQPage on `/faq`; LocalBusiness only when `status === "open"` AND `localBusinessSchemaEligible === true` | integration (HTML parse + JSON parse) | `node scripts/check-schema-output.js` | ❌ Wave 0 |
| **SEO-04** | `houston`, `dallas`, `orland-park`, `brussels` Astro pages emit Organization-only graph (no LocalBusiness, no openingHoursSpecification); `philadelphia`, `mount-prospect`, etc. emit EntertainmentBusiness with `openingHoursSpecification` | integration | same `check-schema-output.js` with per-slug status assertion | ❌ Wave 0 |
| **SEO-05** | For each open location, JSON-LD address/phone/email === `data/locations.json` source values; map URL exists; canonical clean URL | integration | `node scripts/check-nap-parity.js` | ❌ Wave 0 |
| **SEO-06** | `dist/robots.txt` contains AI-bot rules + Sitemap line; `dist/llms.txt` exists, returns 200, links only to canonical sitemap-eligible URLs; `docs/geo-answer-first-review.md` exists | unit | `node scripts/check-robots-ai-bots.js`; `node scripts/check-llms-txt.js`; `test -f docs/geo-answer-first-review.md` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run check` (existing + new SEO catalog/robots/llms shape checks). Adds ≈3–5 seconds.
- **Per wave merge:** `npm run build:astro && node scripts/check-schema-output.js && node scripts/check-nap-parity.js`. Built-output parsing on ≈32 routes runs in <10s.
- **Phase gate:** `npm run verify:phase7` green before `/gsd-verify-work`. Total budget ~120–180s on dev hardware, including Astro build.

### Wave 0 Gaps

- [ ] `scripts/check-seo-catalog.js` — covers SEO-01 source-data shape
- [ ] `scripts/check-seo-robots.js` — covers SEO-01 robots central rules table
- [ ] `scripts/check-seo-output.js` — covers SEO-01 rendered meta in `dist/*.html`
- [ ] `scripts/check-sitemap-output.js` (or `--dist` mode for existing) — covers SEO-02
- [ ] `scripts/check-schema-output.js` — covers SEO-03, SEO-04
- [ ] `scripts/check-nap-parity.js` — covers SEO-05
- [ ] `scripts/check-robots-ai-bots.js` — covers SEO-06 robots AI-bot rules
- [ ] `scripts/check-llms-txt.js` — covers SEO-06 llms.txt parity
- [ ] `npm run verify:phase7` — phase gate; pattern matches `verify:phase4`/`verify:phase6`
- [ ] `docs/geo-answer-first-review.md` — D-13 review doc

**HTML parsing approach:** Use a tiny regex-based pass over `dist/*.html` for `<title>`, `<meta>`, `<link rel="canonical">`, and `<script type="application/ld+json">…</script>`. For JSON-LD, extract the script body and `JSON.parse` to validate shape. Avoid pulling `cheerio` or `jsdom` — keeps Phase 7 dep-free and aligns with the existing regex-based `scripts/check-*.js` pattern. Phase 8 may upgrade to a parser if a richer cross-page audit needs it.

## Sources

### Primary (HIGH confidence)
- Context7 `/withastro/docs` — `@astrojs/sitemap` configuration, `serialize`, `filter`, `customPages`; static endpoint pattern with `GET` returning `Response`; `set:html` with `JSON.stringify` for JSON-LD.
- `npm view @astrojs/sitemap@3.7.2` — verified 2026-04-29: latest is `3.7.2`, modified 2026-03-26, dependencies `sitemap@^9.0.0`, built against `astro@6.1.0` (compatible with project `astro@^6.1.10`).
- Project source files: `astro.config.mjs`, `src/components/SiteHead.astro`, `src/layouts/SiteLayout.astro`, `src/data/routes.json`, `src/data/locations.ts`, `data/locations.json`, `scripts/check-sitemap.js`, `scripts/check-route-contract.js`, `scripts/sync-static-to-public.mjs`, `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `package.json`, `playwright.config.js`.
- `.planning/phases/07-seo-schema-local-search-baseline/07-CONTEXT.md` — locked decisions D-01 through D-13.
- `.planning/REQUIREMENTS.md` — SEO-01..SEO-06 acceptance language.
- `.planning/research/PITFALLS.md` — Pitfall 6 (SEO/schema rebuilt after routes), Pitfall 1 (URL contract), Pitfall 3 (location data drift).

### Secondary (MEDIUM confidence)
- `https://llmstxt.org/` (cited via WebSearch synthesis 2026-04-29) — `/llms.txt` spec format requirements.
- Google Search Central guidance on sitemap `<lastmod>` (signal still used) and `<changefreq>`/`<priority>` (Google ignores) — synthesized via WebSearch 2026-04-29 with multiple corroborating sources.
- schema.org type hierarchy LocalBusiness > EntertainmentBusiness > AmusementPark — confirmed via WebSearch 2026-04-29; Time Mission is best modeled as **EntertainmentBusiness** (matches existing legacy HTML choice in `philadelphia.html`).
- FAQPage rich-result eligibility restricted to government/health since Aug 2023 (still useful for entity understanding and AI citations) — WebSearch synthesis 2026-04-29.

### Tertiary (LOW confidence — planner MUST verify before commit)
- AI bot `User-agent` token list (table under "GEO/AI Baseline") — synthesized from WebSearch 2026-04-29; vendor docs change (e.g., Anthropic's tokens evolved 2024–2026). Per D-12, planner verifies each token against the vendor's official documentation at implementation time before adding to `robots.txt`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `schema-dts@2.0.0` is the published latest stable; some downstream Astro/TS configs may need `--moduleResolution: bundler`/`node16` | Standard Stack > Supporting | Type-check warnings during local dev; runtime unaffected (types-only). Planner can pin `1.1.5` if 2.0 introduces breaking type API changes. |
| A2 | `Bytespider` should be allowed | GEO/AI Baseline | If Bytespider over-crawls and impacts Cloudflare bandwidth/cost, planner can disallow without affecting major AI search visibility. Planner discretion. |
| A3 | All currently-Astro-rendered pages need refactor in Wave B; legacy public-copied HTML keeps existing inline JSON-LD | Migration Path > Wave C | If Phase 8 cutover validation flags missing schema on any non-Astro-rendered route, that route must either (a) get an Astro page in Phase 7 ahead of plan, or (b) get its legacy HTML JSON-LD updated by hand. Currently only `philadelphia.html` (legacy) emits EntertainmentBusiness; other open locations (`mount-prospect`, `west-nyack`, `lincoln`, `manassas`, `antwerp`) do not. **Recommend planner verifies coverage matrix.** |
| A4 | Time Mission is best modeled as `EntertainmentBusiness` (not `AmusementPark`) | Code Examples > localBusiness | `AmusementPark` is for paid-admission ride-based theme parks; Time Mission is closer to `EntertainmentBusiness` (already in legacy HTML). If marketing/SEO consultant prefers a different schema type later, the helper is the only place to change. |
| A5 | `lastmod` strategy will use git commit time of underlying page source files if adopted | Pitfalls > #7 | If planner prefers static build time, Google may eventually distrust the signal. Planner decides between (a) omit, (b) git-derived, (c) build time, per D-05. |

**If this table is empty:** N/A — five assumptions to surface to planner/discuss-phase before locking decisions.

## Open Questions

1. **JSON-LD coverage for non-Astro-rendered routes (legacy public-copied HTML).**
   - What we know: `src/pages/*.astro` covers `index`, `about`, `faq`, `contact`, `contact-thank-you`, `privacy`, `locations`, `groups/corporate`, `philadelphia`, `houston`. The other ~22 routes (legacy HTML synced via `scripts/sync-static-to-public.mjs`) keep their existing inline JSON-LD, which is **only present on `philadelphia.html`** for LocalBusiness. Other open locations (`mount-prospect`, `west-nyack`, `lincoln`, `manassas`, `antwerp`) inline only Organization, no LocalBusiness.
   - What's unclear: Does Phase 7 own bringing legacy HTML up to schema parity, or is that part of Phase 8 cutover or a separate bulk-conversion plan?
   - Recommendation: **Scope Phase 7 to the Astro-rendered routes** and produce a Phase 8 input artifact (`docs/schema-coverage-matrix.md`) that lists per-route schema completeness so cutover gating is explicit. Legacy HTML schema upgrades become Phase 8 cleanup.

2. **Sitemap mechanism choice (Pattern 2 vs Pattern 2b).**
   - What we know: Both work; Pattern 2b (custom endpoint) is dep-free and 1:1 with `routes.json`; Pattern 2 (`@astrojs/sitemap`) gives `serialize`/`filter` ergonomics.
   - What's unclear: Whether the team prefers the official integration for ecosystem consistency or the dep-free path.
   - Recommendation: **Pattern 2b** (custom endpoint) for v1 — it makes the source-of-truth coupling explicit and avoids any chance of the integration surfacing un-registered pages. Switch to Pattern 2 if a future need (i18n, large-scale `getStaticPaths`-derived routes) materializes.

3. **`lastmod` adoption (D-05).**
   - What we know: Google still uses `lastmod`; `changefreq`/`priority` are ignored.
   - What's unclear: Acceptable accuracy threshold and source (git commit time vs catalog `lastUpdated` field vs build time).
   - Recommendation: **Omit `lastmod` for v1** — clean baseline, matches the "low value unless needed for parity" framing in D-05. Add via `serialize`/endpoint extension in a follow-up if Search Console or marketing requests it.

4. **Where `seo-routes.json` lives for group pages and locations.**
   - What we know: Group pages share `src/data/site/groups.json`; location data lives in `src/data/locations.ts`.
   - What's unclear: Whether the SEO catalog should redundantly key location pages by `canonicalPath` or derive `title`/`description`/`og:image` from `LocationRecord` extension fields.
   - Recommendation: **Hybrid** — `seo-routes.json` keys top-level pages and group pages (small finite list); add optional `seoTitle`, `seoDescription`, `ogImage` fields to `LocationRecord` so location SEO stays co-located with location facts. The `getSeoForRoute` helper merges accordingly.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All scripts | ✓ | (assumed >=18 per existing scripts) | — |
| npm | Install/run | ✓ | (project standard) | — |
| `@astrojs/sitemap` | Pattern 2 sitemap (optional) | ✗ (not installed) | 3.7.2 (target) | Pattern 2b custom endpoint (no install required) |
| `astro` | All Astro builds | ✓ | ^6.1.10 | — |
| `@playwright/test` | Optional smoke for SEO/schema in `dist/` | ✓ | ^1.59.1 | grep/regex script-based parsing |
| Google Search Console / Schema Markup Validator | Manual launch verification (Phase 8) | manual / external | — | Manual review during cutover |
| `git` for `lastmod` derivation | Optional if Wave D adopts `lastmod` | ✓ | — | Omit `lastmod` |

**Missing dependencies with fallback:** `@astrojs/sitemap` — if planner picks Pattern 2b, no install needed.

**Missing dependencies with no fallback:** None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via npm; integration confirmed compatible with project Astro version.
- Architecture: HIGH — directly grounded in current `SiteHead.astro`/`SiteLayout.astro` shape; helpers slot in without DOM/CSS impact.
- Pitfalls: HIGH for project-specific pitfalls (drawn from `.planning/research/PITFALLS.md` Pitfall 6 + new code reads); MEDIUM for `set:html` JSON-LD escaping (well-known but easy to miss).
- AI-bot UA tokens: MEDIUM-LOW — synthesized from current SEO blog and vendor doc references; planner re-verifies at implementation per D-12.
- FAQPage rich-result eligibility status: MEDIUM — Google's eligibility-restriction policy (Aug 2023) is well documented in industry sources; planner should still treat as input rather than guarantee.
- llms.txt spec: HIGH — public spec at llmstxt.org has stable format requirements.
- Sitemap policy (lastmod kept, changefreq/priority ignored): HIGH — repeated multiple times in Google guidance and corroborated via WebSearch synthesis.

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 for AI-bot UA tokens (re-verify); 2026-06-29 for stack/pattern claims.

## RESEARCH COMPLETE
