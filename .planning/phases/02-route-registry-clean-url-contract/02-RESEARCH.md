# Phase 2: Route Registry & Clean URL Contract - Research

**Researched:** 2026-04-29 [VERIFIED: system date]  
**Domain:** Astro static routing, static-host redirects, route contract validation [VERIFIED: `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`]  
**Confidence:** HIGH for project-local constraints and Cloudflare/Astro documented behavior; MEDIUM for Netlify parity caveats because deployment target is Cloudflare-style but Netlify docs remain relevant to `_redirects` syntax [VERIFIED: repository files] [CITED: https://developers.cloudflare.com/pages/configuration/serving-pages/] [CITED: https://docs.netlify.com/manage/routing/redirects/overview/]

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** **Claude / planner discretion** for the exact registry format and file layout, with these constraints: there must be a **machine-readable** representation of (a) canonical clean paths and (b) legacy sources (at minimum every legacy `.html` path that must map to a canonical). It must be possible to **generate or validate** `_redirects` (and future sitemap/schema consumers) from this representation without hand-copying every row ad hoc.
- **D-02:** Validation (ROUTE-04) must fail if **built output**, **registry**, or **`_redirects`** disagree on a public URL mapping—planner defines the comparison surface (e.g. `dist/` HTML, link checker, redirect table).
- **D-03:** Astro remains configured with `build.format: 'file'` and `trailingSlash: 'never'` (Phase 1); Phase 2 **does not** change that shape—only enforces the contract end-to-end.
- **D-04:** **Claude / planner discretion** for whether shortcuts live as **aliases inside the same registry object** vs a **merged second list** concatenated into deploy `_redirects`—constraints: shortcuts must be **included in drift detection** (no untracked orphan rules that bypass checks), and **targets must eventually be clean canonical paths**, not `.html` files once those pages migrate.
- **D-05:** Until all pages emit clean URLs from Astro, intermediary targets may still point at `.html` **only if** tracked and scheduled for removal in a later phase; prefer moving shortcut targets to clean paths in Phase 2 when the destination exists.
- **D-06:** Phase 2 includes a **full-repository sweep** of internal `href`/`src` references that should be first-party navigation (within scope defined by planners: typically `href` to same-site HTML paths) so **source-authored links use clean canonical paths**, not `.html` URLs—aligned with ROUTE-03.
- **D-07:** **Sitemap** (`sitemap.xml`): Phase 1 copied it unchanged; Phase 2 must either **update it to list only clean canonical URLs** or introduce **generated sitemap from registry/build**—planner chooses minimal path that satisfies ROUTE-03 (no `.html` in sitemap entries for migrated routes).
- **D-08:** **Claude / planner discretion** on implementation specifics; **documentation requirement**: Phase 2 deliverables include a short **redirect behavior note** covering (1) whether query strings are preserved when legacy URLs redirect to clean paths on the static host, (2) that URL **fragments (`#...`)** are not sent to the server and what that means for rules like `groups.html#birthday`, and (3) **HTTP status** policy (e.g. keep **302** for intentionally temporary routes vs **301** for permanent moves) when targets move from `.html` to clean paths.
- **D-09:** Do not introduce **redirect chains** that harm SEO or analytics: legacy → clean should be **one hop** where the platform allows (per ROUTE-02).

### Claude's Discretion
- Exact schema for the route registry file(s), choice of `generate` vs `validate-only` for `_redirects`, and how to integrate with existing `scripts/check-internal-links.js` and future checks.
- Whether to add a small **allowlist** for edge-case redirects that cannot be expressed in the registry yet—if used, it must be explicit and reviewed.
- Cloudflare-specific subtleties after reading current `docs/redirect-map.md` and host docs.

### Deferred Ideas (OUT OF SCOPE)
- **Phase 3+:** Location and business data modules may add derived path helpers; Phase 2 should not duplicate location business logic—only URL/routing contract.
- **Phase 4+:** Component-level nav/footer may refactor again; internal link sweep in Phase 2 should use patterns that components can keep (`import` from route helpers later).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ROUTE-01 | Clean extensionless URLs with no trailing slash are canonical for migrated pages. [VERIFIED: `.planning/REQUIREMENTS.md`] | Keep Astro `build.format: 'file'` and `trailingSlash: 'never'`; validate registry canonical paths and built `dist/*.html` outputs map to extensionless paths. [CITED: Astro docs via Context7 `/withastro/docs`] |
| ROUTE-02 | Every legacy `.html` URL redirects directly to its clean canonical URL without loops. [VERIFIED: `.planning/REQUIREMENTS.md`] | Generate or validate one `_redirects` row per legacy `.html` source and assert target equals the clean registry path. [CITED: https://developers.cloudflare.com/pages/configuration/redirects/] |
| ROUTE-03 | Canonicals, internal links, navigation links, sitemap URLs, schema URLs, and analytics page paths use the same clean contract. [VERIFIED: `.planning/REQUIREMENTS.md`] | Add a full-repo source sweep and update sitemap/canonical/schema URL checks against the registry. [VERIFIED: `scripts/check-internal-links.js`, `scripts/check-sitemap.js`] |
| ROUTE-04 | Route validation fails when any route surface drifts from the registry. [VERIFIED: `.planning/REQUIREMENTS.md`] | Add `scripts/check-route-contract.js` and wire it into `npm run check`, with built-output coverage after `npm run build:astro`. [VERIFIED: `package.json`] |
</phase_requirements>

## Summary

Phase 2 should make a route registry the authored source of truth for public canonical paths, legacy `.html` sources, and marketing shortcut aliases. [VERIFIED: `02-CONTEXT.md`] The most conservative implementation is a machine-readable JSON registry under `src/data/routes.json`, a small Node validation script under `scripts/check-route-contract.js`, and a redirect generation or validation step that keeps `_redirects`, `sitemap.xml`, source links, canonical tags, and JSON-LD URLs in lockstep. [VERIFIED: repository conventions in `CLAUDE.md`, `scripts/check-*.js`] [ASSUMED]

Cloudflare Pages is the primary host model for this project, and its documented serving behavior directly supports the selected Astro file output shape: matching `.html` assets are served at extensionless URLs, and `.html` requests are redirected to extensionless counterparts. [CITED: https://developers.cloudflare.com/pages/configuration/serving-pages/] Astro docs confirm that `build.format: 'file'` generates page HTML files and that `trailingSlash` controls URL formatting semantics. [CITED: Astro docs via Context7 `/withastro/docs`] Netlify is only a compatibility reference here; its Pretty URLs and trailing-slash normalization differ enough that the redirect behavior note must distinguish Cloudflare from Netlify. [CITED: https://docs.netlify.com/manage/routing/redirects/redirect-options/]

**Primary recommendation:** Use `src/data/routes.json` as the route registry, validate `_redirects` rather than generating it in the first pass, then optionally add generation once drift checks are green. [ASSUMED]

## Project Constraints (from CLAUDE.md)

- Use GitNexus to understand code and assess blast radius before edits to functions, classes, or methods; run `gitnexus_impact` before modifying symbols and warn on HIGH/CRITICAL risk. [VERIFIED: `CLAUDE.md`]
- Run `gitnexus_detect_changes()` before committing code changes. [VERIFIED: `CLAUDE.md`]
- Keep the migration parity-first; do not introduce a redesign. [VERIFIED: `CLAUDE.md`]
- Preserve static output suitable for Cloudflare Pages-style hosting. [VERIFIED: `CLAUDE.md`]
- Canonical URLs are extensionless with no trailing slash, and `.html` URLs must redirect without loops. [VERIFIED: `CLAUDE.md`]
- Keep SEO metadata, sitemap entries, canonicals, internal links, structured data, and crawler policy coherent during migration. [VERIFIED: `CLAUDE.md`]
- `npm run verify` or its Astro equivalent remains the cutover gate. [VERIFIED: `CLAUDE.md`]
- The worktree is dirty; planned edits must stay scoped and must not revert unrelated changes. [VERIFIED: `CLAUDE.md`]
- New structural checks should be small Node scripts named `scripts/check-*.js`, collect all failures into `errors`, print each failure, and exit non-zero. [VERIFIED: `CLAUDE.md`]
- JavaScript validation scripts use CommonJS, 2-space indentation, semicolons, and Node built-ins. [VERIFIED: `CLAUDE.md`]

## Standard Stack

### Core

| Library / Tool | Version | Purpose | Why Standard |
|---|---:|---|---|
| Astro | 6.1.10 | Static build and file-based route output. [VERIFIED: `npm view astro version`, local `npx astro --version`] | Existing Phase 1 dependency and config already use Astro static output. [VERIFIED: `package.json`, `astro.config.mjs`] |
| Node.js | v22.13.1 local | Runs validation scripts and build helpers. [VERIFIED: local shell `node --version`] | Existing repository checks are Node CommonJS scripts. [VERIFIED: `scripts/check-internal-links.js`, `scripts/check-sitemap.js`] |
| npm | 11.7.0 local | Runs package scripts and verifies registry versions. [VERIFIED: local shell `npm --version`] | Existing quality gates are npm scripts. [VERIFIED: `package.json`] |
| Cloudflare Pages `_redirects` | N/A | Static-host redirect table. [CITED: https://developers.cloudflare.com/pages/configuration/redirects/] | Project host model is Cloudflare Pages-style static hosting. [VERIFIED: `CLAUDE.md`, `_redirects`] |

### Supporting

| Library / Tool | Version | Purpose | When to Use |
|---|---:|---|---|
| @astrojs/check | 0.9.9 current registry; `^0.9.2` in repo | Astro/type diagnostics if needed. [VERIFIED: `npm view @astrojs/check version`, `package.json`] | Keep available but do not make Phase 2 depend on TypeScript-only route logic. [VERIFIED: project uses CommonJS checks] [ASSUMED] |
| @playwright/test | 1.59.1 | Browser smoke tests for clean route and legacy redirect behavior later in the phase. [VERIFIED: `npm view @playwright/test version`, `package.json`] | Add representative redirect/clean URL smoke coverage if Phase 2 includes browser verification. [VERIFIED: `playwright.config.js`] [ASSUMED] |
| Python 3 | 3.10 path available | Current smoke-test static server. [VERIFIED: local `command -v python3`, `playwright.config.js`] | Existing tests serve the repo root; route redirect behavior may require Astro preview or Cloudflare preview because Python does not apply `_redirects`. [VERIFIED: `playwright.config.js`] [ASSUMED] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| `src/data/routes.json` | `src/lib/routes.js` exporting constants | JavaScript helpers reduce duplication for consumers but are harder to consume from simple CommonJS checks without ESM interop. [VERIFIED: `package.json` has `"type": "commonjs"`] [ASSUMED] |
| Validate `_redirects` | Generate `_redirects` from registry | Generation removes manual drift but has higher blast radius because `_redirects` already contains marketing shortcut rules and status-code policy. [VERIFIED: `_redirects`] [ASSUMED] |
| Single check script | Extend `check-internal-links.js` and `check-sitemap.js` separately | A single route-contract check better detects cross-surface disagreement; separate checks can still remain as narrow guards. [VERIFIED: existing checks are separate scripts] [ASSUMED] |

**Installation:** No new package is required for Phase 2 if the route registry uses JSON and existing Node built-ins. [VERIFIED: current checks use `node:fs` and `node:path`] If the planner chooses HTML parsing instead of regex, add a parser only after justifying the dependency. [ASSUMED]

```bash
# No new install required for the recommended route contract check.
```

## Architecture Patterns

### Recommended Project Structure

```text
src/
├── data/
│   └── routes.json              # Authored route registry: canonical paths, legacy sources, aliases
scripts/
├── check-route-contract.js      # Cross-surface registry/_redirects/sitemap/source/dist validator
├── check-internal-links.js      # Keep or narrow to existence checks after clean-link checks move
└── check-sitemap.js             # Keep or update to consume registry canonical paths
docs/
└── redirect-behavior.md         # Host behavior note required by D-08
```

This structure follows existing repository conventions for data files, CommonJS validation scripts, and docs. [VERIFIED: `CLAUDE.md`, `scripts/check-*.js`, `docs/redirect-map.md`]

### Pattern 1: Registry Object Per Public Page

**What:** Use one record per canonical page, with clean canonical path, legacy HTML sources, output file expectation, and sitemap/schema eligibility. [ASSUMED]

**When to use:** Use for every migrated public page and every legacy `.html` source that must be redirected. [VERIFIED: ROUTE-01, ROUTE-02]

**Recommended shape:**

```json
{
  "routes": [
    {
      "id": "missions",
      "canonicalPath": "/missions",
      "legacySources": ["/missions.html", "/experiences.html"],
      "outputFile": "missions.html",
      "sitemap": true,
      "status": 301
    },
    {
      "id": "groups-birthdays",
      "canonicalPath": "/groups/birthdays",
      "legacySources": ["/groups/birthdays.html"],
      "outputFile": "groups/birthdays.html",
      "sitemap": true,
      "status": 301
    }
  ],
  "aliases": [
    {
      "source": "/adult-birthday-parties",
      "target": "/groups#birthday",
      "status": 301,
      "reason": "legacy event landing page"
    }
  ]
}
```

The registry must forbid canonical paths ending in `.html` or `/`, except root `/`. [VERIFIED: ROUTE-01] It should keep aliases in the same file so shortcut redirects cannot bypass drift detection. [VERIFIED: D-04]

### Pattern 2: Validate `_redirects` First, Generate Later

**What:** Parse `_redirects`, normalize whitespace/comments, and compare rules against registry expectations. [ASSUMED]

**When to use:** Use during Phase 2 because `_redirects` already contains curated marketing shortcuts, status codes, and current `.html` targets. [VERIFIED: `_redirects`] Validation has lower risk than immediately replacing the file with generated output. [ASSUMED]

**Validation boundaries:**
- Every `legacySources[]` entry must have exactly one `_redirects` row to its `canonicalPath`. [VERIFIED: ROUTE-02]
- Every `aliases[]` entry must have exactly one `_redirects` row with matching target and status. [VERIFIED: D-04]
- No `_redirects` target should end in `.html` unless explicitly marked temporary in the registry. [VERIFIED: D-05]
- No source should equal target after normalization, and no target should be another redirect source unless explicitly allowed and documented. [VERIFIED: D-09]
- Fragment targets are allowed only on destination values; fragment sources are ineffective because fragments are not sent to Cloudflare. [CITED: https://developers.cloudflare.com/pages/configuration/redirects/]

### Pattern 3: Separate Source Checks From Built-Output Checks

**What:** Run source checks against registry, `_redirects`, `sitemap.xml`, source HTML/Astro files, and docs; run built-output checks against `dist/` after `npm run build:astro`. [VERIFIED: Pitfall 7 in `.planning/research/PITFALLS.md`] [ASSUMED]

**When to use:** Use this split because `npm run check` currently scans source files, while Phase 1 added `npm run build:astro` and `check:astro-dist` for generated output. [VERIFIED: `package.json`, `scripts/check-astro-dist-manifest.js`]

**Recommended commands:**

```bash
npm run check
npm run build:astro
npm run check:astro-dist
node scripts/check-route-contract.js --dist
```

### Anti-Patterns to Avoid

- **Hand-copying route rows into sitemap, redirects, schema, and docs:** This preserves the current drift risk that ROUTE-04 is meant to eliminate. [VERIFIED: ROUTE-04, `sitemap.xml`, `_redirects`]
- **Changing Astro output shape in Phase 2:** The context explicitly locks `build.format: 'file'` and `trailingSlash: 'never'`. [VERIFIED: D-03, `astro.config.mjs`]
- **Using one wildcard `/\:slug.html` redirect for all pages:** Cloudflare supports placeholders, but a broad rule can hide missing registry entries and does not express per-route status, shortcut, or exception policy. [CITED: https://developers.cloudflare.com/pages/configuration/redirects/] [ASSUMED]
- **Testing redirects with `python3 -m http.server`:** The current Playwright server does not process `_redirects`, so it cannot prove host redirect behavior. [VERIFIED: `playwright.config.js`] [ASSUMED]
- **Putting fragments in redirect sources:** URL fragments are evaluated by the browser and are not sent to Cloudflare. [CITED: https://developers.cloudflare.com/pages/configuration/redirects/]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Static file routing | Custom runtime router or JavaScript redirect layer | Astro static output plus host `_redirects` | The site is static and Cloudflare Pages already serves matching `.html` files at extensionless URLs. [CITED: https://developers.cloudflare.com/pages/configuration/serving-pages/] |
| Redirect parsing | Ad hoc split logic scattered across scripts | One local parser in `check-route-contract.js` reused by route checks | Existing validation scripts are small and centralized. [VERIFIED: `scripts/check-*.js`] |
| URL normalization | Repeated string replacements in multiple files | Shared normalization helpers inside the route-contract check | Canonical rules need consistent treatment of query, hash, `.html`, and trailing slash. [VERIFIED: ROUTE-04] |
| HTML link rewriting | Runtime client-side link cleanup | Source-authored clean URLs and validation failures | ROUTE-03 requires links and public references to already use the clean contract. [VERIFIED: ROUTE-03] |

**Key insight:** The hard problem is not mapping `/foo.html` to `/foo`; it is proving that every public URL surface agrees and will keep agreeing as the Astro migration expands. [VERIFIED: ROUTE-03, ROUTE-04] [ASSUMED]

## Runtime State Inventory

This is a migration phase because it changes public URL contracts, redirect behavior, sitemap entries, and authored links. [VERIFIED: `02-CONTEXT.md`]

| Category | Items Found | Action Required |
|---|---|---|
| Stored data | No database or persisted application datastore is used by the static site. [VERIFIED: `CLAUDE.md`] Browser `localStorage` stores location keys, not route keys. [VERIFIED: `CLAUDE.md`] | No data migration for route names. Preserve `?book=1` behavior for later booking phase awareness. [VERIFIED: BOOK-04] |
| Live service config | Cloudflare Pages deployment settings may include custom domain, Pages redirects behavior, preview behavior, and cache rules outside git. [CITED: https://developers.cloudflare.com/pages/configuration/serving-pages/] [ASSUMED] | Document Cloudflare preview checks; do not assume local Python tests prove production redirects. [ASSUMED] |
| OS-registered state | None found for URL routing; no launchd/systemd/pm2 state is described in project docs. [VERIFIED: `CLAUDE.md`, `PROJECT.md`] | None. |
| Secrets/env vars | No route-related secrets or env vars detected in project docs; root site has no runtime env system. [VERIFIED: `CLAUDE.md`] | None. |
| Build artifacts | `public/` and `dist/` contain copied `_redirects`, `sitemap.xml`, `404.html`, and assets from Phase 1 sync/build. [VERIFIED: `scripts/sync-static-to-public.mjs`, `scripts/check-astro-dist-manifest.js`, current glob results] | Regenerate `public/` and `dist/` via `npm run build:astro`; do not manually patch built files. [VERIFIED: `package.json`] |

## Common Pitfalls

### Pitfall 1: Cloudflare Auto-Redirects Can Mask Missing Explicit Rules

**What goes wrong:** `/contact.html` appears to redirect to `/contact` because Cloudflare Pages does it automatically, but `_redirects` lacks a tracked legacy mapping, so ROUTE-04 cannot detect drift. [CITED: https://developers.cloudflare.com/pages/configuration/serving-pages/] [ASSUMED]

**Why it happens:** Cloudflare Pages redirects HTML pages to extensionless counterparts by default, while the project requires a route registry and `_redirects` to agree. [CITED: https://developers.cloudflare.com/pages/configuration/serving-pages/] [VERIFIED: D-02]

**How to avoid:** Validate every legacy `.html` route in the registry against `_redirects` even if the host would auto-normalize it. [VERIFIED: ROUTE-02, ROUTE-04]

**Warning signs:** `_redirects` only contains marketing shortcuts, while public page `.html` redirects are assumed to work by host default. [VERIFIED: current `_redirects`]

### Pitfall 2: Netlify And Cloudflare Differ On Defaults

**What goes wrong:** A redirect note claims behavior that is true on Netlify but false or different on Cloudflare. [CITED: https://docs.netlify.com/manage/routing/redirects/redirect-options/] [CITED: https://developers.cloudflare.com/pages/configuration/redirects/]

**Why it happens:** Netlify defaults `_redirects` status to 301, auto-passes query strings for 200/301/302, and normalizes trailing slash matching; Cloudflare defaults redirect status to 302, does not support query-parameter matching in `_redirects`, and documents fragments as destination-only/source-ignored. [CITED: https://docs.netlify.com/manage/routing/redirects/redirect-options/] [CITED: https://developers.cloudflare.com/pages/configuration/redirects/]

**How to avoid:** Make Cloudflare the primary behavior in `docs/redirect-behavior.md`; mention Netlify only as alternate-host caveat. [ASSUMED]

**Warning signs:** `_redirects` rows omit status codes or rely on source query parameter matching. [VERIFIED: current `_redirects` uses explicit statuses]

### Pitfall 3: Sitemap And Canonicals Stay On `.html`

**What goes wrong:** The route is clean, but sitemap, canonical tags, `og:url`, or JSON-LD `url` still point to `.html`. [VERIFIED: current `sitemap.xml`, rg results on root HTML]

**Why it happens:** Current `scripts/check-sitemap.js` expects `.html` URLs from root and group HTML files. [VERIFIED: `scripts/check-sitemap.js`]

**How to avoid:** Change sitemap expectations to registry canonical paths and extend route validation to canonical, `og:url`, and JSON-LD URL fields. [ASSUMED]

**Warning signs:** `sitemap.xml` contains `<loc>https://timemission.com/about.html</loc>` and pages contain `<link rel="canonical" href="...html">`. [VERIFIED: `sitemap.xml`, rg results]

### Pitfall 4: Internal Link Sweep Accidentally Touches Assets

**What goes wrong:** A broad `.html` replacement rewrites asset/demo files or generated `public/` and `dist/` copies. [VERIFIED: glob results include `public/`, `dist/`, `assets/extracted/*.html`, `ads/missions-1080.html`]

**Why it happens:** The repository contains deploy artifacts and HTML-like assets outside public pages. [VERIFIED: glob results]

**How to avoid:** Define sweep scope explicitly: source public pages at root, `groups/*.html`, `locations/index.html`, and Astro source pages; exclude `dist/`, `public/`, `assets/`, `ads/`, `components/`, and generated output. [VERIFIED: `scripts/check-internal-links.js` exclusions] [ASSUMED]

**Warning signs:** Changes appear under `dist/`, `public/`, `assets/extracted/`, or `ads/`. [VERIFIED: glob results]

### Pitfall 5: Redirect Chains From Old Shortcuts

**What goes wrong:** `/adult-birthday-parties` redirects to `/groups.html#birthday`, then Cloudflare redirects `/groups.html` to `/groups`, creating an extra hop and confusing fragment handling. [VERIFIED: current `_redirects`] [CITED: https://developers.cloudflare.com/pages/configuration/serving-pages/]

**Why it happens:** Existing shortcut targets still point at `.html` pages. [VERIFIED: `_redirects`, `docs/redirect-map.md`]

**How to avoid:** Move shortcut targets to clean canonical targets like `/groups#birthday` where the destination exists, and document that fragments on the destination are allowed but fragments in the request source are not matchable. [CITED: https://developers.cloudflare.com/pages/configuration/redirects/] [ASSUMED]

**Warning signs:** `_redirects` target column contains `.html` for migrated pages after Phase 2. [VERIFIED: D-05]

## Code Examples

### Registry-Driven Redirect Assertion

```js
// Source: local script pattern from scripts/check-internal-links.js and scripts/check-sitemap.js
const errors = [];

for (const route of routes) {
  for (const legacySource of route.legacySources) {
    const rule = redirectRules.get(legacySource);
    if (!rule) {
      errors.push(`Missing redirect for ${legacySource}`);
      continue;
    }
    if (rule.target !== route.canonicalPath) {
      errors.push(`${legacySource} redirects to ${rule.target}, expected ${route.canonicalPath}`);
    }
  }
}
```

This follows the repository's validation convention of accumulating all failures before exiting. [VERIFIED: `scripts/check-internal-links.js`, `CLAUDE.md`]

### Astro Output Contract

```js
// Source: Astro docs via Context7 /withastro/docs
export default defineConfig({
  site: 'https://timemission.com',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
});
```

Astro docs state that `build.format: 'file'` generates individual `.html` files instead of directory `index.html` files. [CITED: Astro docs via Context7 `/withastro/docs`] Cloudflare Pages then serves matching `.html` assets at extensionless paths and redirects `.html` requests to extensionless paths. [CITED: https://developers.cloudflare.com/pages/configuration/serving-pages/]

### Cloudflare `_redirects` Syntax

```text
# Source: Cloudflare Pages redirects documentation
/missions.html   /missions   301
/groups.html     /groups     301
```

Cloudflare Pages `_redirects` rows are `[source] [destination] [code?]`; status defaults to 302 if omitted, so Phase 2 should write explicit statuses. [CITED: https://developers.cloudflare.com/pages/configuration/redirects/]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Directory output (`/about/index.html`) for static Astro pages | File output (`/about.html`) for Cloudflare extensionless no-slash pages | Locked in Phase 1 context on 2026-04-29 [VERIFIED: `01-CONTEXT.md`, `astro.config.mjs`] | Aligns Cloudflare extensionless serving with no-trailing-slash canonicals. [CITED: https://developers.cloudflare.com/pages/configuration/serving-pages/] |
| Hand-maintained `sitemap.xml` with `.html` locs | Registry-validated or registry-generated sitemap with clean locs | Phase 2 requirement [VERIFIED: ROUTE-03, D-07] | Prevents sitemap/canonical drift. [ASSUMED] |
| Redirects only for selected marketing shortcuts | Redirect contract for every legacy `.html` route and alias | Phase 2 requirement [VERIFIED: ROUTE-02, ROUTE-04] | Makes route migration auditable. [ASSUMED] |

**Deprecated/outdated for this phase:**
- Treating `.html` URLs as canonical is incompatible with ROUTE-01. [VERIFIED: ROUTE-01]
- Relying on source HTML page inventory alone is insufficient once Astro output and clean routes become the public contract. [VERIFIED: Pitfall 7 in `.planning/research/PITFALLS.md`]
- Treating fragments like `groups.html#birthday` as matchable redirect sources is incorrect on Cloudflare because fragments are not sent to the network. [CITED: https://developers.cloudflare.com/pages/configuration/redirects/]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | `src/data/routes.json` is the best initial registry location and format. | Summary, Architecture Patterns | Planner may choose a JS module instead; task breakdown changes but route requirements remain. |
| A2 | Validate `_redirects` before generating it. | Standard Stack, Architecture Patterns | If generation is preferred, implementation needs a generator and stronger golden-file tests. |
| A3 | A single route-contract script should own cross-surface drift detection. | Architecture Patterns | If checks stay split, planner must ensure all surfaces still share one parser/registry. |
| A4 | Cloudflare is the primary redirect behavior target. | Common Pitfalls | If production host is Netlify/Vercel, redirect semantics and preview verification steps change. |

## Open Questions (RESOLVED)

1. **Should `_redirects` be generated or validated-only in Phase 2?**
   - RESOLVED: Phase 2 uses validation-only for `_redirects`. `src/data/routes.json` is the machine-readable source of truth, while `_redirects` remains hand-authored but must exactly match registry legacy sources and aliases through `scripts/check-route-contract.js`. This honors D-01 and D-04 while reducing blast radius around existing curated redirect rows.

2. **Should clean redirects be explicitly listed even though Cloudflare auto-normalizes `.html`?**
   - RESOLVED: Legacy `.html` sources are explicitly listed and validated because ROUTE-02 and ROUTE-04 require auditable direct mappings. Clean canonical paths must not redirect to themselves; for example, the legacy waiver HTML source maps to the clean waiver path, and the clean waiver path itself has no redirect row.

3. **How far should Phase 2 rewrite source HTML content?**
   - RESOLVED: Phase 2 rewrites current public source pages and shared route-generating runtime/test files, excluding generated output and asset/demo HTML. To keep execution safe, the sweep is split by scope: core top-level pages, legal/utility pages, location HTML, location data, group pages, and runtime/test route helpers.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---:|---|---|
| Node.js | Validation scripts | Yes [VERIFIED: local shell] | v22.13.1 | None needed |
| npm | Scripts and version checks | Yes [VERIFIED: local shell] | 11.7.0 | None needed |
| npx/Astro CLI | `npm run build:astro` and route output checks | Yes [VERIFIED: local shell] | Astro 6.1.10 | Use npm scripts directly |
| Python 3 | Current Playwright web server | Yes [VERIFIED: local shell] | 3.10 path detected | Astro preview for redirect-aware checks |
| Cloudflare Pages runtime | Production redirect behavior | Not locally available [ASSUMED] | N/A | Validate syntax locally and run Cloudflare preview checks later |

**Missing dependencies with no fallback:** None for local route registry validation. [VERIFIED: local shell, `package.json`]

**Missing dependencies with fallback:** Cloudflare production behavior is not locally executable; fallback is syntax/static validation plus later Cloudflare preview verification. [ASSUMED]

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | Node script checks plus Playwright 1.59.1 smoke tests. [VERIFIED: `package.json`, `playwright.config.js`] |
| Config file | `playwright.config.js` for smoke tests; package scripts in `package.json`. [VERIFIED] |
| Quick run command | `npm run check` after wiring `check:routes`. [VERIFIED: current script pattern] [ASSUMED] |
| Full suite command | `npm run verify:phase1 && node scripts/check-route-contract.js --dist` or a new `verify:phase2` wrapper. [VERIFIED: `package.json`] [ASSUMED] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| ROUTE-01 | Clean canonical paths are extensionless and no-trailing-slash; built files exist for them. [VERIFIED: requirement] | Static/built-output | `node scripts/check-route-contract.js --dist` | No - Wave 0 |
| ROUTE-02 | Legacy `.html` sources redirect directly to clean canonical targets. [VERIFIED: requirement] | Static redirect-table + optional preview smoke | `node scripts/check-route-contract.js --redirects` | No - Wave 0 |
| ROUTE-03 | Canonicals, internal links, sitemap, schema URLs, and analytics page path literals use clean paths. [VERIFIED: requirement] | Static source scan | `node scripts/check-route-contract.js --sources` | No - Wave 0 |
| ROUTE-04 | Drift across registry, `_redirects`, sitemap, links, canonicals, and built output fails checks. [VERIFIED: requirement] | Static contract | `npm run check:routes` | No - Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run check:routes` once added. [ASSUMED]
- **Per wave merge:** `npm run check && npm run build:astro && npm run check:astro-dist && npm run check:routes -- --dist`. [ASSUMED]
- **Phase gate:** Full route contract plus existing `npm run verify` and Phase 1 build/dist checks should be green. [VERIFIED: Phase 1 gate in `package.json`] [ASSUMED]

### Wave 0 Gaps

- [ ] `src/data/routes.json` - route registry covering public pages, legacy `.html` sources, aliases, status policy, sitemap participation, and temporary `.html` target allowances. [ASSUMED]
- [ ] `scripts/check-route-contract.js` - source and built-output route contract validator. [ASSUMED]
- [ ] `package.json` script `check:routes` wired into `check` or `verify:phase2`. [ASSUMED]
- [ ] `docs/redirect-behavior.md` or updated `docs/redirect-map.md` - D-08 redirect behavior note. [ASSUMED]
- [ ] Optional Playwright clean/legacy route smoke test once a redirect-capable preview environment is selected. [ASSUMED]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | No [VERIFIED: static public site has no auth in `CLAUDE.md`] | N/A |
| V3 Session Management | No [VERIFIED: static public site has no sessions in `CLAUDE.md`] | N/A |
| V4 Access Control | No [VERIFIED: static public site has no protected routes in `CLAUDE.md`] | N/A |
| V5 Input Validation | Yes [VERIFIED: route registry and redirect data are inputs to validation scripts] | Strict route schema checks in Node; reject malformed paths, `.html` canonicals, trailing-slash canonicals, duplicate sources, and redirect loops. [ASSUMED] |
| V6 Cryptography | No [VERIFIED: no crypto in route phase scope] | N/A |

### Known Threat Patterns for Static Route Contracts

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Open redirect through alias target | Spoofing | Only allow internal targets or explicitly reviewed external targets in registry. [ASSUMED] |
| Redirect loop or chain | Denial of Service / Tampering | Detect source-target equality and source-to-target chains in `_redirects`. [VERIFIED: ROUTE-02, D-09] |
| Stale canonical/schema URL | Tampering | Validate `canonical`, `og:url`, sitemap locs, and JSON-LD URLs against registry. [VERIFIED: ROUTE-03] |

## Likely Files To Modify

- `src/data/routes.json` - new registry. [ASSUMED]
- `scripts/check-route-contract.js` - new cross-surface validator. [ASSUMED]
- `scripts/check-sitemap.js` - update to consume registry canonical paths or defer to route check. [VERIFIED: current script expects `.html` paths]
- `scripts/check-internal-links.js` - update or keep as existence-only while route check enforces clean first-party links. [VERIFIED: current script strips query/hash and only checks existence]
- `package.json` - add `check:routes` and possibly `verify:phase2`. [VERIFIED: current scripts]
- `_redirects` - retarget `.html` and shortcut destinations to clean canonical paths and add missing legacy `.html` rows. [VERIFIED: current `_redirects`]
- `sitemap.xml` - update locs to clean canonical URLs or generate/validate from registry. [VERIFIED: current `sitemap.xml`]
- Source public pages: root `*.html`, `groups/*.html`, `locations/index.html`, and `src/pages/index.astro` for first-party links/canonicals/schema URL cleanup where in scope. [VERIFIED: glob and rg results]
- `docs/redirect-map.md` or new `docs/redirect-behavior.md` - update redirect behavior, fragments, query strings, and status policy. [VERIFIED: D-08]

## GitNexus Impact Notes

- `gitnexus_query` for route/redirect/sitemap/internal-link concepts identified `scripts/check-internal-links.js`, `docs/redirect-map.md`, `package.json`, `js/locations.js`, `js/ticket-panel.js`, and `js/roller-checkout.js` as related areas. [VERIFIED: GitNexus MCP query]
- `gitnexus_impact` on `stripQueryAndHash` returned LOW risk with one direct file-level caller in `scripts/check-internal-links.js`. [VERIFIED: GitNexus MCP impact]
- `gitnexus_impact` on `walk` returned LOW risk with one direct file-level caller in `scripts/check-internal-links.js`. [VERIFIED: GitNexus MCP impact]
- `gitnexus_impact` on `check-sitemap.js` and `check-internal-links.js` as files returned LOW risk and no process impact. [VERIFIED: GitNexus MCP impact]
- GitNexus did not find `check-astro-dist-manifest.js` or `sync-static-to-public.mjs`, likely because the index predates Phase 1 file additions or does not include those files. [VERIFIED: GitNexus MCP impact errors] The planner should run `npx gitnexus analyze` if GitNexus warns stale during implementation. [VERIFIED: `CLAUDE.md`]

## Sources

### Primary (HIGH confidence)

- `.planning/phases/02-route-registry-clean-url-contract/02-CONTEXT.md` - phase decisions and boundaries. [VERIFIED]
- `.planning/REQUIREMENTS.md` - ROUTE-01 through ROUTE-04. [VERIFIED]
- `.planning/ROADMAP.md` - Phase 2 goal and success criteria. [VERIFIED]
- `CLAUDE.md` - project constraints, GitNexus rules, code style, validation patterns. [VERIFIED]
- `astro.config.mjs` - current `site`, `output`, `trailingSlash`, and `build.format`. [VERIFIED]
- `package.json` - scripts and dependency versions. [VERIFIED]
- `scripts/check-internal-links.js`, `scripts/check-sitemap.js`, `scripts/check-astro-dist-manifest.js`, `scripts/sync-static-to-public.mjs` - validation/build patterns. [VERIFIED]
- Cloudflare Pages serving docs - extensionless HTML serving and `.html` redirects. [CITED: https://developers.cloudflare.com/pages/configuration/serving-pages/]
- Cloudflare Pages redirects docs - `_redirects` syntax, fragments, query parameter limitations, ordering, limits, status support. [CITED: https://developers.cloudflare.com/pages/configuration/redirects/]
- Astro docs via Context7 `/withastro/docs` - `build.format`, static routing, `site`, `trailingSlash`, redirect config. [CITED]

### Secondary (MEDIUM confidence)

- Netlify redirect overview and options docs - `_redirects` syntax, default 301 status, query pass-through, trailing slash normalization. [CITED: https://docs.netlify.com/manage/routing/redirects/overview/] [CITED: https://docs.netlify.com/manage/routing/redirects/redirect-options/]
- WebSearch results for Astro/Cloudflare clean URL caveats - used only to reinforce official Cloudflare and Astro documentation. [VERIFIED: WebSearch cross-check]

### Tertiary (LOW confidence)

- None used as authoritative guidance. [VERIFIED: source review]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - versions verified with npm registry and local commands; no new packages recommended. [VERIFIED: shell output]
- Architecture: MEDIUM-HIGH - route registry shape is a recommendation based on project constraints, but exact file layout remains planner discretion. [VERIFIED: D-01] [ASSUMED]
- Pitfalls: HIGH for Cloudflare/Astro documented behaviors and project drift risks; MEDIUM for alternate Netlify behavior relevance. [CITED: Cloudflare docs] [CITED: Netlify docs]

**Research date:** 2026-04-29 [VERIFIED: system date]  
**Valid until:** 2026-05-29 for Astro/Cloudflare routing basics; re-check within 7 days before production cutover because host behavior and Astro v6.x issues can change. [ASSUMED]
