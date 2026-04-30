# Phase 7: SEO, Schema & Local Search Baseline - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 7 delivers **coherent SEO, structured data, sitemap, local signals, and GEO/AI-readiness** generated from the **same route and validated data contracts** as live pages (SEO-01–SEO-06): preserved/deterministic metadata, **canonical-only** sitemap URLs, valid **Organization** + **BreadcrumbList** + **FAQPage** + **eligible location** JSON-LD, accurate **open vs coming-soon** local rules, **NAP/map/hours** alignment with visible content and data, and a **baseline GEO review** (including **llms.txt** and **AI-crawler policy** in `robots.txt`) without turning optional content marketing into mandatory scope creep.

</domain>

<decisions>
## Implementation Decisions

### Meta & head parity (SEO-01)
- **D-01:** **Catalog-only:** titles, descriptions, Open Graph, and Twitter card fields **primarily live in validated `src/data/site` SEO catalogs** (or planner-chosen sibling modules under validated data). Astro pages consume via shared helpers/props — **no durable long literals** duplicated in `.astro` files.
- **D-02:** **Robots / indexing** signals come from a **central rules table** keyed by **route patterns / page kind** (e.g. marketing, legal, thank-you), and the table must **validate against the route registry** so `noindex`/`nofollow` cannot drift from canonical routes.
- **D-03:** **Per-route explicit social images:** every migrated route **must declare explicit `og:image` and corresponding Twitter image fields** (parity expectation with today’s page-level variety, not only a global default).

### Sitemap (SEO-02)
- **D-04:** **Build-time generation** from the **route registry** (Astro **endpoint** or equivalent build-step), emitting `sitemap.xml` at the **deploy/public root**. No hand-maintained URL list that can drift from registry.
- **D-05:** **Sitemap XML fields — planner discretion** following **current Google guidance:** `<loc>` required; add `<lastmod>` when a **reliable** date exists (build, catalog, or deterministic file change); treat `changefreq` / `priority` as **low value** unless needed for parity with the legacy file or explicit marketing ask.

### JSON-LD types (SEO-03, SEO-04)
- **D-06:** **No WebSite JSON-LD requirement for v1** — **Organization** coverage (with `url` / branding) is sufficient unless a later planner note documents a concrete consumer need.
- **D-07:** **Open vs coming-soon location schema** — **planner discretion** within **SEO-03/04** and **DATA-02** validator rules (must not misrepresent hours, status, or booking eligibility).
- **D-08:** **FAQPage** — **Recommended default** (user deferred to recommender): emit **FAQPage** on the global **`/faq`** route; additionally emit on **location pages** only when **stable Q&A pairs exist in validated data** (no scraping loose copy).

### Local SEO & NAP (SEO-05)
- **D-09:** **NAP enforcement — recommended default** (user deferred): **primary** guarantee = generated **metadata + JSON-LD** must match the **canonical location data module** and shared render props; **secondary** (if low cost) = **representative built-output** or focused script checks on **critical location routes** wired into **`verify:phase7`**.
- **D-10:** **Coming-soon hours:** **omit** `openingHoursSpecification` from schema **unless** real, validated hours exist — **no fake “open” hours** for coming-soon venues.

### GEO / AI readiness (SEO-06)
- **D-11:** Ship **`/llms.txt`** at site root with **curated, privacy-safe** pointers to high-signal pages (and keep it maintainable alongside the route registry).
- **D-12:** **`robots.txt`** should **explicitly allow major AI crawlers** where acceptable for a public marketing site (e.g. GPTBot, Google-Extended, Perplexity — **exact `User-agent` tokens** are **planner-verified** against current vendor names at implementation time).
- **D-13:** **Answer-first content** work in Phase 7 = **short internal review document** listing gaps and opportunities — **no mandatory** thin-page rewrites as part of Phase 7 unless already covered elsewhere.

### Claude's Discretion
- Exact SEO catalog schema, helper API on `SiteHead`, sitemap endpoint shape, FAQPage eligibility per location, depth of secondary NAP checks, and precise `robots.txt`/`llms.txt` prose — bounded by decisions above.

### Folded Todos
- None (`todo match-phase 7` returned no matches).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & v1 requirements
- `.planning/ROADMAP.md` — Phase 7 goal, success criteria, SEO-01–SEO-06.
- `.planning/REQUIREMENTS.md` — SEO-01 through SEO-06 full bullets and traceability table.
- `.planning/PROJECT.md` — Canonical domain, parity-first migration, local SEO + schema as launch requirements, GEO/AI extractability.

### Prior phase contexts (constraints)
- `.planning/phases/02-route-registry-clean-url-contract/02-CONTEXT.md` — Single URL contract; sitemap and schema URLs must agree with registry; no `.html` in sitemap for migrated routes.
- `.planning/phases/06-analytics-consent-forms-contract/06-CONTEXT.md` — `SiteHead.astro` load order, GTM/CSP coordination; SEO changes must not regress consent/analytics bootstrap.
- `.planning/phases/03-validated-data-foundation/03-RESEARCH.md` (and phase plans) — Location and site data validators, international-ready fields.
- `.planning/phases/04-shared-components-template-parity/04-CONTEXT.md` — `SiteLayout`, head slots, JSON-LD slot pattern.

### Live implementation anchors
- `src/components/SiteHead.astro` — Canonical, OG/Twitter wiring.
- `src/layouts/SiteLayout.astro` — `json-ld` slot.
- Representative pages under `src/pages/*.astro` — Current duplicated Organization JSON-LD pattern (to be replaced/centralized per this phase).
- `sitemap.xml` (root) — Legacy static sitemap to supersede or replace via generation.
- `robots.txt` — Crawler policy baseline to extend for AI bots + `llms.txt` discovery if needed.
- `scripts/check-sitemap.js` — Prior static check; Phase 7 likely extends or supersedes for generated output.
- `.planning/research/PITFALLS.md` — SEO, redirects, hosting pitfalls.

### External / vendor
- Google Search Central — sitemap, `robots.txt`, and structured data guidelines (implementation-time verification).
- Current schema.org definitions for Organization, LocalBusiness, Place, FAQPage, BreadcrumbList, WebSite (if ever revisited).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- **`SiteHead.astro`** — Single place to standardize meta, canonical, OG/Twitter once data is catalog-driven.
- **`SiteLayout` JSON-LD slot** — Inject multiple graph nodes without duplicating Organization literals per page.
- **Route registry + Phase 2 validators** — Authoritative list of canonical paths for sitemap generation.
- **`src/data/site/*` and location modules** — Natural home for SEO catalogs and location schema inputs.

### Established patterns
- Per-page **`canonicalPath`** already passed into `SiteHead`.
- Static site used **rich per-page meta** and inline **Organization** JSON-LD; Phase 7 elevates this to **validated, DRY generation** while meeting D-03 image parity.

### Integration points
- Phase 8 verification will consume **built `dist/`** for schema/sitemap/local checks — Phase 7 should emit artifacts and scripts that Phase 8 can gate.

</code_context>

<specifics>
## Specific Ideas

- User selected **all five** discuss areas (meta, sitemap, schema, local NAP, GEO/AI) and chose: **catalog-only meta**, **central robots rules**, **explicit per-page social images**, **Astro/build sitemap**, **no WebSite schema v1**, **planner-led location types**, **ship `llms.txt`**, **allow major AI bots**, **GEO = review doc not full rewrite**, **omit coming-soon opening hours in schema**.

</specifics>

<deferred>
## Deferred Ideas

- **Mandatory content expansion** for thin location pages — noted in `docs/LAUNCH-TIMELINE.md`-class issues; explicitly out of Phase 7 per D-13 unless replanned.
- **WebSite + SearchAction** — deferred unless a real site search URL exists later.

### Reviewed Todos (not folded)
- None.

</deferred>

---

*Phase: 07-seo-schema-local-search-baseline*
*Context gathered: 2026-04-29*
