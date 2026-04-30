# Phase 4: Shared Components & Template Parity — Research

**Researched:** 2026-04-29
**Domain:** Astro 6 static-output componentization of a brownfield hand-authored HTML/CSS/JS site, parity-first
**Confidence:** HIGH (Astro version verified; codebase contracts read directly; preserved DOM/script/CSS contracts deduced from live source)

## Summary

Phase 4 turns the existing flagship pages into a small, cohesive set of Astro components and layouts that reproduce the current visual and behavioral contract bit-for-bit. Astro is already wired up (`astro@6.1.10`, `output: 'static'`, `trailingSlash: 'never'`, `build.format: 'file'`) and Phase 3 has populated `src/data/locations.ts` and `src/data/site/*.json`. The work is therefore **composition, not invention**: lift nav, footer, ticket panel, head/meta, FAQ, and breadcrumb markup into `.astro` components, render them through one parity layout that emits the same `<head>` cascade and the same `<script>` tag order legacy pages already ship, and route representative pages through `src/pages/`.

The single biggest landmine is **Astro's default treatment of `<script>` and `<style>` tags**: by default Astro processes, hashes, and bundles them, which would change script URLs, change class names, and break every selector in `js/ticket-panel.js`, `js/nav.js`, `js/a11y.js`, and the existing CSS cascade. Every shared script and every parity stylesheet **must be emitted as `is:inline` (or as global `<link>` tags)** so the migrated DOM is byte-equivalent to legacy where it matters: marker comments, IDs, ARIA labels, and load order.

`build.sh` retirement (COMP-03) is sequencing, not a one-shot delete: a Phase 4 component (`TicketPanel.astro`) becomes the canonical source for any page rendered through Astro, while legacy `.html` files at the repo root continue to be synced by `build.sh` until they are replaced by an Astro page. The retirement gate is "no remaining HTML file at the repo root contains the ticket-panel marker" plus a new check that asserts the Astro-rendered ticket panel preserves the contract `check-components.js` enforces today.

**Primary recommendation:** Build one `SiteLayout.astro` plus six small components (`SiteHead`, `SiteNav`, `MobileMenu`, `LocationOverlay`, `SiteFooter`, `TicketPanel`) that consume Phase 3 data, use `is:inline` everywhere a legacy script/style tag is reproduced, and ship eight representative pages whose `outputFile` matches `src/data/routes.json`. Add `npm run verify:phase4` and an output-side `check-ticket-panel-parity.js` gate before retiring `build.sh`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-02 | Astro build preserves current visual design, copy, typography, imagery, animations, nav, footer, ticket panel, overlays, page-specific behavior unless explicitly fixed | Standard Stack (Astro 6 + `is:inline` for parity), Architecture Patterns (`SiteLayout` cascade), Common Pitfalls 1–3 (script bundling, style scoping, font/CSS cascade order) |
| COMP-01 | Shared nav, footer, location picker, ticket panel, SEO head, FAQ, breadcrumb, recurring page sections render through Astro components | Architecture Patterns (component decomposition), Code Examples (1–4) |
| COMP-02 | Componentized markup preserves CSS selectors, IDs, ARIA hooks, script hooks, DOM structure | Preserved DOM Contract table, Code Examples (1, 2), Common Pitfalls 1, 2, 4 |
| COMP-03 | `build.sh` ticket-panel sync retired only after Astro components render the panel everywhere | `build.sh` Retirement Sequencing section, Validation Architecture (component-parity gate) |
| COMP-04 | Representative templates exist before bulk conversion: homepage, marketing page, group page, open location page, coming-soon location page, locations index, FAQ/contact pattern, policy/utility pattern | Representative Template List (Phase 4 scope) |
</phase_requirements>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (layout granularity):** Use one or more Astro layouts that wrap shared chrome with a default slot for main content. Prefer a small set of cohesive components (Nav, Footer, TicketPanel, shared head/meta) rather than one component per repeating HTML row.
- **D-02 (ticket panel canonical source):** The canonical ticket panel markup for the Astro path lives in Astro components and is fed by validated Phase 3 data where applicable. `build.sh` ticket-panel sync retires only after every page that needs the panel is served from Astro AND drift-equivalent automated checks prove parity everywhere.
- **D-03 (no indefinite dual edits):** Until cutover, default path is single ownership in Astro as soon as representative templates prove the component; freeze `components/ticket-panel.html` changes except emergency fixes.
- **D-04 (preserve identifiers):** Preserve `#ticketPanel`, `#ticketOverlay`, `#ticketLocation`, `#ticketBookBtn`, related classes, ARIA attributes, and roles as currently shipped. Do not rename for "cleaner" Astro patterns if it breaks selectors.
- **D-05 (vanilla IIFE behavior layer):** Keep `js/locations.js`, `js/nav.js`, `js/ticket-panel.js`, `js/roller-checkout.js`, `js/a11y.js` as the behavior layer. Astro outputs HTML that hydrates the same way as today. Same relative/public paths and load order as a reference parity page unless a planner-verified consolidation is unavoidable.
- **D-06 (CSS cascade order):** Layout imports `css/variables.css` → `css/base.css` → feature CSS (`nav.css`, `footer.css`, etc.) in the same order as current flagship pages. No redesign tokens, no new frameworks.
- **D-07 (page-specific CSS):** Page-specific presentation may remain co-located (inline or imported CSS) migrated from existing `<style>` blocks. Astro `scoped` styles are acceptable when they reproduce the same computed rules without visible drift.
- **D-08 (data-driven chrome):** Shared chrome pulls labels, links, location-derived UI, and catalogs from validated `src/data` modules. No reintroducing literals that duplicate catalogs for durable facts.
- **D-09 (representative templates first):** Before bulk conversion, ship parity templates aligned with ROADMAP: homepage, one core marketing page, one group/event page, one open-location page, one coming-soon-location page, locations index, FAQ + contact pattern, policy/utility/legal pattern.
- **D-10 (golden references):** Each template acts as the golden reference for QA, smoke tests, and bulk migration. Patterns established here extend to remaining pages.
- **D-11 (verification expectations):** Phase 4 work integrates with existing `npm run check` mentality. Extend or add checks so chrome/ticket markup cannot drift unnoticed (mechanism left to planner).

### Claude's Discretion

- Exact file names under `src/components/` vs `src/layouts/`, number of layouts (one vs segmented), and migration ordering of representative pages versus secondary pages within Phase 4 scope.
- Tactical choice between scoped CSS migration vs retaining a single shared page stylesheet where parity is faster to guarantee.
- How to automate drift detection (AST, HTML snapshot, selective string checks) as long as COMP-02 and COMP-03 intent is satisfied.

### Deferred Ideas (OUT OF SCOPE)

- **Phase 5:** Full booking/external checkout behavior, iframe/overlay policy details, `?book=1` end state. Phase 4 only does minimal wiring needed for templates to render correctly.
- **Phase 6:** GTM/event contracts beyond preserving existing load order or placeholders.
- **Phase 7:** JSON-LD/metadata generation sophistication beyond parity ports of existing head/meta.
- **Bulk conversion** of all legacy `.html` files after representatives. Phase 4 caps at representative templates + shared components, not 100% page count migrated.

## Project Constraints (from CLAUDE.md / AGENTS.md)

GitNexus rules apply to any change that touches existing JavaScript symbols (`openTicketPanel`, `closeTicketPanel`, `syncBookingBtn`, `syncLocationOptions`, `getBookingUrl`, `getLocationPage`, `showLocationInfo`, `syncAllLocations`, etc.):

- **MUST run `gitnexus_impact({target: <symbol>, direction: "upstream"})`** before editing any function in `js/*.js`, and report blast radius.
- **MUST run `gitnexus_detect_changes()`** before each commit to confirm scope matches intent.
- **MUST NOT rename selectors with find-and-replace** — use `gitnexus_rename(symbol_name, new_name, dry_run: true)` first.
- **MUST warn user** on HIGH/CRITICAL risk before proceeding.

Phase 4's posture is **non-modifying for `js/*.js`**: components produce HTML; behavior scripts stay byte-equal. If a planner identifies a script change as unavoidable (e.g., to consume Phase 3 data instead of literals — Pitfall 3 in `.planning/research/PITFALLS.md`), GitNexus impact analysis is mandatory before scheduling that task.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `astro` | `6.1.10` | Static site generator, file-based routing, `.astro` components, layouts, slots | Already installed; latest stable (verified `npm view astro version`, published 2026-04-28); `output: 'static'` matches phase posture |
| `@astrojs/check` | `^0.9.9` | TypeScript checking for `.astro` files | Already installed; ensures `Astro.props` typing in components |
| `typescript` | `^5.9.3` | Strict-mode types for `src/data/*.ts` and component props | Already installed; tsconfig extends `astro/tsconfigs/strict` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@playwright/test` | `^1.59.1` | Existing smoke harness for `tests/smoke/site.spec.js` | Already installed; reused as parity gate for migrated pages |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain Astro components | `@astrojs/mdx` | MDX adds a dependency and a content abstraction. Phase 4 is parity, not authoring; reject for now. |
| Plain Astro components | React/Vue/Svelte islands | Out of scope per `REQUIREMENTS.md` "Out of Scope" table. Reject. |
| `is:inline` script tags | Astro-bundled scripts | Astro hashes script URLs and re-orders against existing IIFE assumptions. Rejected because it breaks `js/ticket-panel.js`, `js/nav.js`, `js/a11y.js`, and the script-load contract enforced by `check-accessibility-baseline.js`. |
| Global `<link rel="stylesheet">` to `/css/*.css` | Astro `import './style.css'` in component frontmatter | Astro processes imported CSS through Vite, may emit a single hashed bundle that drops `:root` token order or scopes selectors. For parity rejected; preserve current `<link>` cascade. Scoped `<style>` inside an `.astro` component is acceptable for new component-local rules **only** when the resulting computed rules match (D-07). |

**Installation:** No new packages required. Phase 4 ships entirely with the existing `package.json` `devDependencies`.

**Version verification (executed 2026-04-29):**
- `astro@6.1.10` — published 2026-04-28T12:32:02Z (verified via `npm view astro time --json`). [VERIFIED: npm registry]
- Project already pins this version in `package.json`. No upgrade required for this phase.

## Architecture Patterns

### Recommended Project Structure (Phase 4 scope)
```
src/
├── layouts/
│   └── SiteLayout.astro             # global shell: <html>, <head>, nav, footer, ticket panel, scripts
├── components/
│   ├── SiteHead.astro               # meta, preconnects, fonts, CSS cascade
│   ├── SiteNav.astro                # top nav + ticker + location overlay markup
│   ├── MobileMenu.astro             # mobile slide-down menu (#mobileMenu)
│   ├── LocationOverlay.astro        # #locationDropdown overlay markup (consumes locations.ts)
│   ├── SiteFooter.astro             # footer columns from src/data/site/footer.json
│   ├── TicketPanel.astro            # MUST emit byte-equivalent of components/ticket-panel.html
│   ├── SiteScripts.astro            # nav.js → locations.js → roller-checkout.js → ticket-panel.js → a11y.js (is:inline)
│   ├── Faq.astro                    # FAQ accordion (consumes faqs.json)
│   └── Breadcrumbs.astro            # JSON-LD-friendly breadcrumb (Phase 7 wires schema; Phase 4 ships markup only)
├── pages/
│   ├── index.astro                  # homepage parity (existing placeholder replaced)
│   ├── about.astro                  # core marketing parity
│   ├── faq.astro                    # FAQ pattern
│   ├── contact.astro                # contact pattern
│   ├── locations.astro              # locations index (legacy locations/index.html)
│   ├── philadelphia.astro           # representative open-location parity
│   ├── houston.astro                # representative coming-soon-location parity
│   ├── privacy.astro                # representative policy/utility parity
│   └── groups/
│       └── corporate.astro          # representative group/event parity
└── data/                             # (already exists — Phase 3)
    ├── locations.ts
    ├── routes.json
    └── site/*.json
```

> Layout count is planner discretion (D-01). A single `SiteLayout.astro` with named slots (`<slot name="head-extra" />`, `<slot name="json-ld" />`, default content) is sufficient for all eight representative templates and reduces drift surface.

### Pattern 1: Parity Layout with Preserved Cascade
**What:** A single layout that owns the `<html>`, `<head>`, nav, footer, ticket panel, and the legacy script tag block. Pages provide only their main content, page-specific `<style>` blocks via a named slot, and any per-page `<head>` extras.
**When to use:** Every representative template in this phase.

**Example:**
```astro
---
// src/layouts/SiteLayout.astro
import SiteHead from '../components/SiteHead.astro';
import SiteNav from '../components/SiteNav.astro';
import SiteFooter from '../components/SiteFooter.astro';
import TicketPanel from '../components/TicketPanel.astro';
import SiteScripts from '../components/SiteScripts.astro';

interface Props {
  title: string;
  description: string;
  canonicalPath: string;        // from src/data/routes.json
  ogImage?: string;
  bodyDataLocation?: string;    // slug for location pages, undefined elsewhere
  bodyClass?: string;
}

const { title, description, canonicalPath, ogImage, bodyDataLocation, bodyClass } = Astro.props;
---
<!DOCTYPE html>
<html lang="en">
  <head>
    <SiteHead {title} {description} {canonicalPath} {ogImage} />
    <slot name="head-extra" />
  </head>
  <body class={bodyClass} data-location={bodyDataLocation}>
    <SiteNav />
    <slot />
    <SiteFooter />
    <TicketPanel />
    <slot name="json-ld" />
    <SiteScripts />
  </body>
</html>
```

### Pattern 2: Inline Script Block for Behavior Parity
**What:** A dedicated `SiteScripts.astro` component that emits the legacy script tags exactly as flagship pages do. **All five tags MUST carry `is:inline`** so Astro does not bundle, hash, or reorder them.
**When to use:** Once per layout, near `</body>`.

**Example:**
```astro
---
// src/components/SiteScripts.astro
---
<script defer is:inline src="/js/nav.js?v=4"></script>
<script is:inline src="/js/locations.js?v=9"></script>
<script is:inline src="/js/roller-checkout.js?v=1"></script>
<script is:inline src="/js/ticket-panel.js?v=4"></script>
<script is:inline src="/js/a11y.js"></script>
```

> Cache-busting suffixes (`?v=N`) MUST match the legacy reference page. `index.html` and `philadelphia.html` both use `nav.js?v=4`, `locations.js?v=9`, `roller-checkout.js?v=1`, `ticket-panel.js?v=4`, `a11y.js` (no suffix). Plans bumping these belong in Phase 5 or later.

### Pattern 3: Ticket Panel as a Pure Markup Component
**What:** `TicketPanel.astro` mirrors `components/ticket-panel.html` line-for-line. Static `<option>` list stays as a placeholder; `js/ticket-panel.js` `syncLocationOptions()` rewrites it at runtime from `window.TM` (already does today).
**When to use:** Rendered exactly once by `SiteLayout.astro`.

**Example:**
```astro
---
// src/components/TicketPanel.astro
// MUST preserve the marker comment AND every id/aria-label below.
// check-components.js and check-accessibility-baseline.js will scan dist/ for these.
---
{/* Ticket Popup Panel */}
<!-- Ticket Popup Panel -->
<div class="ticket-overlay" id="ticketOverlay"></div>
<div class="ticket-panel" id="ticketPanel">
  <div class="ticket-panel-header">
    <h3>Book Your Adventure</h3>
    <button class="ticket-panel-close" id="ticketClose" aria-label="Close ticket panel">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>
  <div class="ticket-panel-content">
    <p>Select your location and we'll take you to our booking system to choose your date and time.</p>
    <div class="ticket-location-select">
      <label for="ticketLocation">Choose Location</label>
      <select id="ticketLocation">
        {/* Hydrated by js/ticket-panel.js syncLocationOptions() */}
        <option value="philadelphia">Philadelphia</option>
        {/* ...remaining placeholder options preserved verbatim... */}
      </select>
    </div>
    <a href="#" class="btn-ticket-book" id="ticketBookBtn" target="_blank">
      Continue to Booking
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </a>
    <div class="ticket-panel-info">
      {/* QUICK INFO copy preserved */}
    </div>
  </div>
</div>
```

> The `<!-- Ticket Popup Panel -->` HTML comment is **load-bearing**: `scripts/check-components.js` (lines 33–45) and `build.sh` (line 48) both scan for it. Astro preserves HTML comments in output by default; do not migrate to JSX-style `{/* */}` comments for the marker.

### Pattern 4: Data-Driven Chrome
**What:** `SiteNav`, `SiteFooter`, `LocationOverlay` import from `src/data/site/navigation.json`, `src/data/site/footer.json`, and `src/data/locations.ts`, then iterate to produce the same DOM that today's HTML hard-codes.
**When to use:** Anywhere a label, link, or location appears in chrome.

**Example:**
```astro
---
// src/components/SiteFooter.astro
import footer from '../data/site/footer.json';
---
<footer class="site-footer">
  {footer.columns.map((col) => (
    <div class="footer-column">
      <h4>{col.title}</h4>
      <ul>
        {col.links.map((link) => (
          <li><a href={link.href}>{link.label}</a></li>
        ))}
      </ul>
    </div>
  ))}
</footer>
```

> Existing legacy footer markup must be diffed against this rendered output before merging. If a class/wrapper is missing, restore it. `check-site-data.js` already enforces that every href is in the route registry and not `.html` — Phase 4 inherits that gate.

### Anti-Patterns to Avoid

- **Astro-bundled scripts for behavior layer.** Without `is:inline`, Astro hashes the URL (`/_astro/ticket-panel.abc123.js`), defeats `js/ticket-panel.js?v=4` cache-busting, and silently changes load order across the five-script chain. Always use `is:inline` for legacy `js/*.js` references.
- **Component-scoped `<style>` for global rules.** Astro's default `<style>` scope hashes selectors (`button[data-astro-cid-xyz]`), invisibly changing computed CSS for any selector defined elsewhere. Use `<style is:global>` or, preferred, keep global CSS as `<link>` to `/css/*.css`.
- **Renaming "for cleanliness."** D-04 forbids it. The Preserved DOM Contract table below is enforceable.
- **Splitting nav/footer into many tiny pieces.** D-01 calls for cohesive components, not one component per repeating row. A single `SiteNav.astro` is correct; `<NavLink />` is overkill.
- **Reading data via `fetch()` in Astro frontmatter.** Use static `import` from `src/data/*.ts|json` so the build is hermetic. `Astro.glob()` is deprecated (Astro 5+) — use `import.meta.glob` if globbing is needed.
- **Using Astro's `<Image />` component for parity images.** It transforms `<img>` into `<picture>` and rewrites `src`. Out of scope; preserve existing `<img>` tags.
- **Calling `set:html` on user-supplied or HTML-shaped JSON.** `check-site-data.js` blocks `<` / `>` in FAQ strings precisely because Phase 4 must keep components markup-owning. JSON stays plain text.

## Preserved DOM Contract (COMP-02)

Every selector below is read by an existing IIFE script or check. Components MUST emit them verbatim. Source-of-truth for each row is cited.

### Ticket Panel
| Selector / Attribute | Consumer | Source |
|----------------------|----------|--------|
| `<!-- Ticket Popup Panel -->` (HTML comment) | `scripts/check-components.js`, `build.sh` | `components/ticket-panel.html` line 1 |
| `id="ticketOverlay"` | `js/ticket-panel.js` `getElementById('ticketOverlay')` | `components/ticket-panel.html` line 2; `js/ticket-panel.js` line 12 |
| `id="ticketPanel"` | `js/ticket-panel.js`, `check-components.js` line 35, `check-accessibility-baseline.js` line 37 | line 3; ticket-panel.js line 11 |
| `id="ticketClose" aria-label="Close ticket panel"` (exact attribute order required by checks) | `check-components.js` line 39, `check-accessibility-baseline.js` line 37 | line 6 |
| `id="ticketLocation"` (`<select>`) | `js/ticket-panel.js` line 14, smoke `tests/smoke/site.spec.js` line 12 | line 18 |
| `id="ticketBookBtn"` (`<a class="btn-ticket-book" target="_blank">`) | `js/ticket-panel.js` line 15, smoke line 24/27 | line 29 |
| `class="ticket-panel-close"`, `class="ticket-panel-header"`, `class="ticket-panel-content"`, `class="ticket-location-select"`, `class="btn-ticket-book"`, `class="ticket-panel-info"`, `class="ticket-info-item"` | CSS in `css/ticket-panel.css` and inline page styles | components/ticket-panel.html |

### Nav, Mobile Menu, Ticker
| Selector / Attribute | Consumer | Source |
|----------------------|----------|--------|
| `id="nav"` | `js/nav.js` line 9 (scroll effect, `.scrolled`) | live HTML pages |
| `id="mobileMenu"` + `.mobile-menu-links a` | `js/nav.js` lines 8, 37 | live |
| `.nav-menu-btn` | `js/nav.js` line 7 | live |
| `.ticker-bar` (`menu-hidden` toggle) | `js/nav.js` line 25 | live |
| `.nav-logo`, `.location-dropdown-logo` | `js/nav.js` line 13 (location-aware home routing) | live |

### Location Overlay
| Selector / Attribute | Consumer | Source |
|----------------------|----------|--------|
| `id="locationBtn"`, `id="locationText"`, `id="locationDropdown"` | `js/nav.js` lines 73–75 | live |
| `.location-dropdown-close` with `aria-label="Close ..."` (must contain `Close`) | `check-accessibility-baseline.js` line 41, `js/nav.js` line 101 | live |
| `[data-city="<City Name>"]` on each location link | `js/nav.js` lines 117–139, smoke line 43 | live |
| `id="locationInfo"` + `.location-info-empty`, `.location-info-details`, `.location-info-name`, `.location-info-address`, `.location-info-phone`, `.location-info-hours`, `.location-info-book` | `js/nav.js` `showLocationInfo()` lines 251–283 | live |
| `id="locationMap"` | `js/nav.js` line 256 | live |

### Page-level
| Selector / Attribute | Consumer | Source |
|----------------------|----------|--------|
| `body[data-location="<slug>"]` on every location page | `js/ticket-panel.js` line 56 (`pageLocation`), enables `?book=1` auto-redirect | brussels/dallas/philadelphia/etc. |
| `.btn-tickets`, `.btn-book-now`, `.btn-primary[href*="roller"]`, `.btn-nav[href*="roller"]`, `.btn-primary[href*="tickets.timemission"]` | `js/ticket-panel.js` line 155 (booking-button binding) | shared chrome + page CTAs |
| `.faq-question[role="button"][aria-expanded]` | `js/a11y.js`, smoke lines 53–58 | faq.html |
| `form.contact-form[method="post"][action]` matching `/contact-thank-you|formspree|netlify` | smoke lines 64–66 | contact.html |
| `.hero-title` containing `STEP INTO THE`, `[aria-label="MISSION"]`, `.hero-cta .btn-tickets` | smoke lines 7–10 | index.html |

### Storage Keys (do not rename)
| Key | Writer | Reader |
|-----|--------|--------|
| `tm_location` (slug) | `js/nav.js` `syncAllLocations()` line 56, `js/locations.js` | `js/nav.js` line 16, `js/ticket-panel.js` line 109 |
| `timeMissionLocation` (display name) | `js/nav.js` line 55 | `js/nav.js` line 144, `js/ticket-panel.js` line 109 |

## CSS Cascade Order (FND-02)

Reference flagship `index.html` lines 21–32 and `philadelphia.html` (same order). The layout MUST emit links in this order before any page-specific style:

1. `<link rel="preconnect" href="https://fonts.googleapis.com">`
2. `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
3. `<link rel="preload" as="image" href="/assets/video/hero-poster.jpg">` (homepage only — slot via `<slot name="head-extra" />`)
4. `<link rel="preload" as="font" href="/assets/fonts/MonumentExtended-Regular.otf" type="font/otf" crossorigin>`
5. `<link rel="preload" as="font" href="/assets/fonts/MonumentExtended-Ultrabold.otf" type="font/otf" crossorigin>`
6. `<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:..." rel="stylesheet">`
7. `<link rel="stylesheet" href="/css/variables.css">`
8. `<link rel="stylesheet" href="/css/base.css">`
9. `<link rel="stylesheet" href="/css/nav.css?v=17">`
10. `<link rel="stylesheet" href="/css/newsletter.css">` (if newsletter section appears)
11. Page-local `<style>` block (via slot or scoped block per D-07)

> All `/css/*` and `/assets/*` paths must be **root-relative** and emit unchanged into `dist/`. The `sync-static-to-public.mjs` script copies static files from the repo root to `public/` before `astro build`, and Astro then copies `public/` to `dist/`. Phase 1 already wired this path; Phase 4 inherits it.

## `build.sh` Retirement Sequencing (COMP-03)

`build.sh` currently scans every `*.html` outside `assets/`, `ads/`, `components/`, `node_modules/`, and `404.html`, and uses Python regex substitution to rewrite the ticket panel block when it sees the `<!-- Ticket Popup Panel -->` marker. `scripts/check-components.js` enforces the contract.

### Sequence
1. **Implement parity components** (`TicketPanel.astro`, `SiteLayout.astro`, supporting components). Static legacy `*.html` at the repo root remain untouched and `build.sh` continues to maintain them.
2. **Migrate representative templates one-by-one**. For each migrated page, **delete the corresponding legacy `*.html`** (or move it under a `legacy/` directory excluded from `check-components.js`). This is the only way `check-components.js` scope shrinks.
3. **Add `scripts/check-ticket-panel-parity.js`** that runs after `astro build` and asserts every page in `dist/` containing `js/ticket-panel.js` also contains the marker, the five required IDs, and the close-button `aria-label`. This is the dist-side analog of the source-side `check-components.js`.
4. **Phase 4 retirement gate:** When the legacy file count reaches the set of "non-Phase-4 pages still awaiting bulk migration" (i.e., representative templates have all migrated and `build.sh` has nothing in scope it currently rewrites), do **not** delete `build.sh` or `components/ticket-panel.html` yet — leave them frozen for Phases 5–7 if any non-representative page still relies on them. The retirement is **conditional** and tracked as a planner output.
5. **Final retirement (likely Phase 7 or 8):** Once `dist/` only contains Astro-rendered ticket panels, delete `build.sh`, archive `components/ticket-panel.html`, and remove `check-components.js` source-scan or re-point it at `dist/`.

> COMP-03 explicitly says retirement happens "only after Astro components render the shared ticket panel everywhere it is needed." Phase 4 establishes the new component AND the dist-side check; full retirement is a downstream-phase outcome.

### Interim Drift Risk
While both worlds coexist:
- Astro `TicketPanel.astro` is single-source for migrated pages.
- Legacy `components/ticket-panel.html` + `build.sh` is single-source for non-migrated pages.
- A drift between the two is possible. **Mitigation:** D-03 — freeze `components/ticket-panel.html` except emergency fixes. Add a `scripts/check-ticket-panel-source-parity.js` that diffs the rendered Astro component HTML against `components/ticket-panel.html` modulo the dynamically populated `<option>` list, and fails CI if they diverge.

## Representative Template List (COMP-04)

Aligned with ROADMAP Phase 4 success criteria #5 and the `src/data/routes.json` registry. Each row maps the Phase 4 deliverable to the route registry entry that fixes its `outputFile`.

| Template archetype | Astro file | Route ID (`routes.json`) | `outputFile` | Legacy source | Notes |
|--------------------|-----------|--------------------------|--------------|---------------|-------|
| Homepage | `src/pages/index.astro` | `home` | `index.html` | `index.html` | Replace existing Astro placeholder. Hero video, ticker, FAQ snippet, CTA. |
| Core marketing | `src/pages/about.astro` | `about` | `about.html` | `about.html` | Smaller surface; good first parity proof. |
| Group / event | `src/pages/groups/corporate.astro` | `groups-corporate` | `groups/corporate.html` | `groups/corporate.html` | `check-astro-dist-manifest.js` already asserts this file in `dist/`. |
| Open location | `src/pages/philadelphia.astro` | `location-philadelphia` | `philadelphia.html` | `philadelphia.html` | Sets `body[data-location="philadelphia"]`. `check-astro-dist-manifest.js` asserts. |
| Coming-soon location | `src/pages/houston.astro` | `location-houston` | `houston.html` | `houston.html` | `body[data-location="houston"]`. CTA routes to location page, not booking. |
| Locations index | `src/pages/locations.astro` | `locations` | `locations.html` | `locations/index.html` | Uses `allLocations` from `src/data/locations.ts`. |
| FAQ + contact pattern | `src/pages/faq.astro` and `src/pages/contact.astro` | `faq`, `contact` | `faq.html`, `contact.html` | `faq.html`, `contact.html` | FAQ uses `Faq.astro` driven by `src/data/site/faqs.json`; contact form preserves smoke contract. |
| Policy / utility / legal | `src/pages/privacy.astro` | `privacy` | `privacy.html` | `privacy.html` | Minimal shell; serves as legal-page golden reference. |

> **Dynamic route alternative.** A single `src/pages/[slug].astro` with `getStaticPaths` over `allLocations` is the cleaner long-term shape. For Phase 4 representative scope, planner discretion (D-09): a single dynamic route fulfilling both `philadelphia` and `houston` rows is acceptable as long as `outputFile` matches `routes.json` and `check-astro-dist-manifest.js` passes for both. **However**, leaving non-representative locations on legacy `*.html` until they're migrated requires the dynamic route's `getStaticPaths` to filter to the representatives only, otherwise Astro will emit `*.html` for every location and overwrite the legacy file content. A safer Phase 4 path is **one explicit `*.astro` file per representative** and defer the dynamic route to Phase 5/7.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Templating engine to inline shared chrome | Custom Node script that concatenates partials | Astro layouts + slots | Astro already does this and is installed. |
| Per-component CSS isolation | Hand-written class-prefixing | Astro `<style>` (default scoped) | Built into the `.astro` file format. **But:** for parity selectors use `is:global` (D-04). |
| Default + named slots | Custom slot bookkeeping | Astro `<slot />` and `<slot name="..." />` | Built in. |
| JSON-typed imports | Hand-rolled JSON loaders | `resolveJsonModule` + static `import` | Already enabled in `tsconfig.json`. |
| HTML comment markers preservation | Token replacement scripts | Plain HTML comments in `.astro` files | Astro preserves `<!-- ... -->` in output by default; do **not** convert to `{/* */}` JSX comments because `check-components.js` scans for the literal HTML comment. |
| Glob-based page discovery | Manual page lists | `import.meta.glob` (Vite) | Built into Astro's underlying Vite. `Astro.glob()` is deprecated in Astro 5+. |
| Class-name hashing for new component-local styles | Custom postprocessor | Astro scoped `<style>` | Free; just don't use it on selectors consumed by IIFE scripts. |

**Key insight:** The phase's risk surface is _almost entirely_ in **what Astro does by default that legacy pages didn't do**: bundle scripts, hash CSS classes, transform `<img>` via `<Image />`, and reorder `<head>` content. Every component must defensively reach for `is:inline` / `is:global` / no-Image, not invent new abstractions.

## Common Pitfalls

### Pitfall 1: Astro Bundles `<script>` Tags by Default
**What goes wrong:** A migrated page links to `/_astro/nav.abc123.js` instead of `/js/nav.js?v=4`. Either the bundle moves to the bottom of `<body>` (changing IIFE init timing), or it omits the `defer` attribute, or it strips the `?v=4` cache-buster — silently breaking `js/ticket-panel.js`'s assumption that `js/locations.js` has run.
**Why it happens:** Astro's default `<script>` processing turns inline-style script tags into Vite-managed bundles. Documented behavior since Astro 4 (controlled by `vite.build.assetsInlineLimit` and Astro's `experimental.directRenderScript` settings; latest stable is Astro 6.1.10). [CITED: docs.astro.build/en/guides/client-side-scripts/]
**How to avoid:** `is:inline` on every script tag in `SiteScripts.astro`. Add a build-output check that asserts `dist/index.html` contains `src="/js/ticket-panel.js?v=4"` literally.
**Warning signs:** Smoke test `tests/smoke/site.spec.js` line 12 fails because `#ticketLocation` never hydrates; `dist/*.html` shows `/_astro/...js` URLs in the script tag block; `check-accessibility-baseline.js` fails because page no longer contains the literal string `js/a11y.js`.

### Pitfall 2: `<style>` Scoping Hashes Selectors Used by IIFE Scripts
**What goes wrong:** `js/nav.js` queries `.nav-menu-btn`, but Astro renders the markup as `class="nav-menu-btn astro-XYZ"` and the CSS is rewritten with `[data-astro-cid-XYZ]`. Computed styles change in subtle ways even when the class still resolves; specificity can flip; new specificity collides with `css/nav.css` rules that were authored for unscoped selectors.
**Why it happens:** Astro applies a build-time class hash to `<style>` blocks unless they carry `is:global`.
**How to avoid:** D-06 — keep global CSS imported via `<link>` to `/css/*.css`. For new component-local rules, prefer `<style is:global>` over scoped `<style>` whenever the rules touch selectors also targeted by `js/*.js`.
**Warning signs:** Visual regression in nav (especially `.scrolled`, `.menu-open`, `.location-open` modifier classes) on Astro pages; legacy pages look correct, Astro pages don't.

### Pitfall 3: HTML Comment Marker Lost in JSX-Style Migration
**What goes wrong:** Developer migrates `<!-- Ticket Popup Panel -->` to `{/* Ticket Popup Panel */}` for "consistency." Astro strips it from the output. `scripts/check-components.js` line 33 (`content.includes('<!-- Ticket Popup Panel -->')`) and `build.sh` line 48 (`grep -q '<!-- Ticket Popup Panel -->'`) both fail. The drift check now treats every page as missing the panel.
**Why it happens:** `{/* */}` in `.astro` is a JSX-flavored comment that does not appear in the rendered HTML; only `<!-- -->` is preserved.
**How to avoid:** Always use `<!-- -->` in `.astro` for markers consumed by tooling. Add a unit test or `check-component-markers.js` that asserts the comment exists in `TicketPanel.astro` source AND in `dist/*.html` output.
**Warning signs:** `check-components.js` reports "X is missing #ticketPanel" or "X loads ticket-panel.js without the ticket panel marker" for an Astro-rendered page.

### Pitfall 4: Drift Between `data-location` Slug and Storage Slug
**What goes wrong:** A representative location page sets `body[data-location="Houston"]` (display name) instead of `body[data-location="houston"]` (slug). `js/ticket-panel.js` line 56 reads `pageLocation` and calls `window.TM.get(normalized)` — `normalizeLocation('Houston')` returns `'houston'`, so it works for IDs that match the lowercase slug pattern, but display-name slugs with apostrophes (`Houston (Marq'E)`) return null and the auto-redirect from `?book=1` silently breaks.
**Why it happens:** Two storage keys exist (`tm_location` slug vs `timeMissionLocation` display name) and components copy the wrong one.
**How to avoid:** Always set `data-location={location.slug}` from `src/data/locations.ts`. Add a check in `check-location-routes-alignment.js` (already exists from Phase 3) that scans Astro pages for `body[data-location=...]` and verifies the value is in the slug set.
**Warning signs:** `?book=1` does not auto-redirect on a migrated location page; `tests/smoke/site.spec.js` location-persistence test fails.

### Pitfall 5: `getStaticPaths` Over-Generates Pages and Overwrites Legacy `*.html`
**What goes wrong:** A planner introduces `src/pages/[slug].astro` with `getStaticPaths` over `allLocations`. Astro emits all 10 location HTMLs into `dist/`. Phase 1's `sync-static-to-public.mjs` had been copying legacy `*.html` to `public/`, but Astro overrides any matching path. Legacy pages that were not yet migrated lose their content.
**Why it happens:** Astro emits to `dist/` after `public/` is copied; `dist/philadelphia.html` from `[slug].astro` replaces `public/philadelphia.html` from sync.
**How to avoid:** For Phase 4, prefer one explicit `*.astro` file per representative. If using a dynamic route, filter `getStaticPaths` to `representativeSlugs.includes(loc.slug)`. Document this in the PLAN.
**Warning signs:** `check-astro-dist-manifest.js` passes for `philadelphia.html` but the file is now an empty Astro placeholder.

### Pitfall 6: Font Preloads Path Drift Between Legacy and Astro
**What goes wrong:** Legacy pages use relative `assets/fonts/MonumentExtended-Regular.otf`. Astro pages need `/assets/fonts/...` (root-relative). If a layout uses `assets/fonts/...` from a page at `src/pages/groups/corporate.astro`, the preload resolves to `groups/assets/fonts/...` and 404s. FOUT (flash of unstyled text) appears, accessibility/a11y reviewer flags missing brand fonts.
**How to avoid:** Always use absolute paths beginning with `/` in `SiteHead.astro` for stylesheet, font, and asset URLs. Phase 2's clean-URL contract already standardized internal links; extend the same posture to assets.
**Warning signs:** Network 404s for `/groups/assets/fonts/...` in browser devtools on the corporate page; fonts revert to system stack.

## Runtime State Inventory

> Phase 4 is a composition / migration phase, not a rename. Inventory below confirms no runtime state outside the repo would shift.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 4 produces only HTML/CSS files. `localStorage` keys (`tm_location`, `timeMissionLocation`) remain unchanged because `js/*.js` is not edited. | None |
| Live service config | None — site is fully static, no n8n/Datadog/Cloudflare-Tunnel runtime config tied to component IDs. | None |
| OS-registered state | None — no scheduled tasks, pm2, launchd, systemd registrations reference template paths. | None |
| Secrets / env vars | None — Phase 4 does not introduce env-var-driven configuration; GTM/consent-mode wiring is Phase 6 scope. | None |
| Build artifacts | `dist/` is a build output; `public/data/locations.json` is materialized by `scripts/sync-static-to-public.mjs` before each Astro build. **Action: ensure `sync-static-to-public.mjs` continues to run before `astro build`** (already wired in `build:astro` script, lines 24 of `package.json`) and that representative pages do not accidentally get added to `public/` (which would conflict with `src/pages/` output). | Verify `public/` does not contain `*.html` files matching migrated routes; if Phase 1 sync creates them, exclude migrated pages from sync via an explicit allow/deny list. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js >= 18 | Astro build, npm scripts | ✓ (assumed by `package-lock.json` lockfile-version 3) | per host | — |
| `astro` CLI | `npm run build:astro`, `npm run preview:astro` | ✓ via `devDependencies` | 6.1.10 | — |
| Python 3 | `playwright.config.js` web server (`python3 -m http.server 4173`); `build.sh` regex substitution | ✓ (Phase 1 already requires it) | per host | — |
| `@playwright/test` | `tests/smoke/site.spec.js`, `npm run verify` | ✓ via `devDependencies` | 1.59.1 | — |
| Chromium (Playwright) | smoke run | ✓ if `npx playwright install` has run on this host | bundled | install on demand |
| `bash` | `./build.sh` | ✓ on macOS / Linux (host is darwin 25.4.0) | system | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None. All Phase 4 work runs with the existing toolchain.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Static checks framework | Plain Node CommonJS scripts in `scripts/check-*.js` |
| Browser smoke framework | `@playwright/test` 1.59.1 |
| Build framework | `astro@6.1.10` (`output: 'static'`, `build.format: 'file'`) |
| Existing config files | `playwright.config.js`, `astro.config.mjs`, `tsconfig.json` (extends `astro/tsconfigs/strict`), `package.json` scripts |
| Quick run command | `npm run check` |
| Full suite command | `npm run verify:phase4` *(to be added — see "Wave 0 Gaps" below)* |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| FND-02 | Visual + behavioral parity for migrated pages | smoke (Playwright against `dist/`) | `npm run test:smoke` after pointing `playwright.config.js` web server at `dist/` | ✅ partial — `tests/smoke/site.spec.js` exists; webServer currently serves repo root |
| FND-02 | Visual diff (deferred to Phase 8 per VER-04) | manual screenshot comparison | n/a Phase 4 (recorded as risk) | ❌ |
| COMP-01 | Shared chrome rendered through components | source-side | new `scripts/check-component-usage.js` — asserts every `src/pages/*.astro` imports `SiteLayout` | ❌ Wave 0 |
| COMP-01 | Data-driven chrome | static (`check-site-data.js`) | `npm run check:site-data` | ✅ exists |
| COMP-02 | Preserved DOM contract for ticket panel + nav + a11y | dist-side scan | new `scripts/check-ticket-panel-parity.js` — scans `dist/**/*.html` | ❌ Wave 0 |
| COMP-02 | Accessibility hooks preserved | static | `npm run check:a11y` (already scans markers) | ✅ exists |
| COMP-02 | Drift check for legacy + Astro | static | `npm run check:components` (extend to also scan `dist/`) | ✅ exists, extension required |
| COMP-03 | `build.sh` retired only after components render panel everywhere | dist-side gate | new `scripts/check-ticket-panel-source-parity.js` — diffs `TicketPanel.astro` rendered output vs `components/ticket-panel.html` | ❌ Wave 0 |
| COMP-04 | Representative pages emit to expected `outputFile` | dist manifest | `npm run check:astro-dist` (extend manifest list) | ✅ exists, extension required |
| COMP-04 | Internal links resolve under clean-URL contract | static | `npm run check:routes -- --dist`, `npm run check:links` | ✅ exists |
| FND-02 + COMP-02 | Smoke flows: homepage hero, ticket panel hydration, location selection, FAQ, contact | Playwright | `npm run test:smoke` (extended) | ✅ exists, server target needs Phase 4 update |

### Sampling Rate
- **Per task commit:** `npm run check` (sub-30s; runs all 10 existing static checks).
- **Per wave merge:** `npm run build:astro && npm run check:astro-dist && npm run check:ticket-panel-parity` (validates dist contract for migrated pages).
- **Per phase gate:** `npm run verify:phase4` (must include `check`, `build:astro`, `check:astro-dist`, `check:ticket-panel-parity`, `check:ticket-panel-source-parity`, `check:routes -- --dist`, and a Playwright run pointed at `dist/`).
- **Smoke target:** Update `playwright.config.js` `webServer.command` from `python3 -m http.server 4173` (serving repo root) to either `python3 -m http.server 4173 --directory dist` (after `npm run build:astro`) or `astro preview --port 4173` (note: `astro preview` is intended for SSR adapters; for `output: 'static'` use the Python static server).

### Wave 0 Gaps
- [ ] `scripts/check-ticket-panel-parity.js` — dist-side scan of `dist/**/*.html` asserting marker, `#ticketPanel`, `#ticketClose aria-label="Close ticket panel"`, `#ticketLocation`, `#ticketBookBtn` for every page that loads `js/ticket-panel.js`.
- [ ] `scripts/check-ticket-panel-source-parity.js` — diff `TicketPanel.astro` rendered output (via `astro build` or a dedicated render harness) against `components/ticket-panel.html`, modulo the `<option>` list. Required for COMP-03.
- [ ] `scripts/check-component-usage.js` — assert every `src/pages/**/*.astro` imports `SiteLayout` and that `SiteLayout.astro` imports `TicketPanel`, `SiteNav`, `SiteFooter`, `SiteScripts`. Source-side companion to COMP-01.
- [ ] Extend `scripts/check-astro-dist-manifest.js` to assert all eight representative `outputFile` paths from `routes.json` exist (not just the six it asserts today).
- [ ] Extend `scripts/check-components.js` to also scan `dist/**/*.html` (not just repo root) once any Astro-rendered page exists. Update its directory filter to skip both `public/` and `dist/` for the **source** scan and add a new dist-side branch.
- [ ] `package.json` script: `verify:phase4` chaining the above with `build:astro` and `test:smoke`.
- [ ] `playwright.config.js` web server pointed at the built `dist/` (or a flag-controlled toggle so legacy and Astro can both be exercised during the migration window).

## Security Domain

The site is a static marketing/location front end. There is no server-side auth, no user accounts, no session management, no admin panel, and no first-party data collection in Phase 4 scope. Forms (contact + lead) are deferred to Phase 6 per requirements.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a — no authenticated users in Phase 4 |
| V3 Session Management | no | n/a — `localStorage` keys (`tm_location`, `timeMissionLocation`) are non-sensitive UI preferences |
| V4 Access Control | no | n/a — fully public static site |
| V5 Input Validation | partial — `check-site-data.js` already blocks `<` / `>` in FAQ JSON to prevent HTML smuggling | Continue: do **not** use `set:html` on JSON-sourced strings; let Astro's default text interpolation escape entities |
| V6 Cryptography | no | n/a — no secrets, no encryption surface |
| V7 Error Handling & Logging | n/a | n/a |
| V8 Data Protection | partial — no PII in `localStorage` (location slug + display name only) | Continue: forbid storing email/phone in browser storage; analytics PII guidance is Phase 6 |
| V9 Communication | yes — HTTPS-only canonical site (`https://timemission.com`) | Static `_headers` file enforces HSTS at the host; no Phase 4 change |
| V14 Configuration | yes — CSP via `_headers` MUST continue to permit current font + ROLLER widget origins | Phase 4 must not introduce new `<script src="https://...">` origins; if it does, update CSP. The `is:inline` directive **does not** add `'unsafe-inline'` requirements because it preserves `<script src>` tags, not inline JS bodies. |

### Known Threat Patterns for Static Astro Sites

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| HTML injection through JSON-fed component content | Tampering | Use Astro's default `{value}` text interpolation (auto-escapes); never `set:html` on JSON-sourced strings. `check-site-data.js` rejects `<`/`>` in FAQ JSON as a defense-in-depth gate. |
| Inline event handlers re-introduced during migration | Tampering | CSP forbids inline scripts (current `_headers` policy). New components must NOT add `onclick="..."` attributes. The behavior layer is `js/*.js`. |
| ROLLER widget origin drift | Tampering / Information Disclosure | Phase 5 owns the booking integration. Phase 4 must not hardcode ROLLER URLs in components — pull from `src/data/locations.ts.bookingUrl`. |
| Open-redirect via `bookingUrl` field | Tampering | DATA-02 contract validates `bookingUrl` is `https://` only; Phase 4 inherits the validator from Phase 3. |
| Stored XSS via location data | Tampering | Locations are author-controlled JSON, not user input. Validation in `scripts/check-location-contracts.js` ensures schema. |

> No new threat surface introduced by Phase 4. Posture is "preserve current security headers, preserve current CSP origin allowlist, do not introduce inline JS or `set:html` on data."

## Code Examples

### Example 1: Pages Composing the Layout
```astro
---
// src/pages/about.astro
import SiteLayout from '../layouts/SiteLayout.astro';
---
<SiteLayout
  title="About — Time Mission"
  description="Learn about Time Mission, the team behind 25+ immersive mission rooms."
  canonicalPath="/about"
>
  <main class="about-main">
    {/* Page-local content migrated from about.html body verbatim */}
  </main>

  <Fragment slot="head-extra">
    <link rel="preload" as="image" href="/assets/photos/about/hero.jpg" />
  </Fragment>
</SiteLayout>
```

### Example 2: Location Page with `data-location`
```astro
---
// src/pages/philadelphia.astro
import SiteLayout from '../layouts/SiteLayout.astro';
import { allLocations } from '../data/locations';
const philly = allLocations.find((l) => l.slug === 'philadelphia');
if (!philly) throw new Error('philadelphia missing from locations data');
---
<SiteLayout
  title={`${philly.name} — Time Mission`}
  description={`Book Time Mission ${philly.name}: ${philly.address.line1}, ${philly.address.city}.`}
  canonicalPath={`/${philly.slug}`}
  bodyDataLocation={philly.slug}
>
  <main class="location-main" data-region={philly.region}>
    {/* Page-local sections migrated verbatim from philadelphia.html */}
  </main>
</SiteLayout>
```

> `bodyDataLocation={philly.slug}` is the contract `js/ticket-panel.js` line 56 reads. Always pass the slug, never the display name.

### Example 3: Site Head Component
```astro
---
// src/components/SiteHead.astro
interface Props {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage?: string;
}
const { title, description, canonicalPath, ogImage } = Astro.props;
const baseUrl = 'https://timemission.com';
const canonicalUrl = `${baseUrl}${canonicalPath === '/' ? '/' : canonicalPath}`;
const og = ogImage ?? `${baseUrl}/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg`;
---
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonicalUrl} />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="Time Mission" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonicalUrl} />
<meta property="og:image" content={og} />
<meta name="twitter:card" content="summary_large_image" />

<link rel="icon" type="image/png" href="/assets/logo/TM_Favicon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" as="font" href="/assets/fonts/MonumentExtended-Regular.otf" type="font/otf" crossorigin />
<link rel="preload" as="font" href="/assets/fonts/MonumentExtended-Ultrabold.otf" type="font/otf" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

<link rel="stylesheet" href="/css/variables.css" />
<link rel="stylesheet" href="/css/base.css" />
<link rel="stylesheet" href="/css/nav.css?v=17" />
```

### Example 4: Output-side Drift Check (Wave 0 Gap)
```javascript
// scripts/check-ticket-panel-parity.js — sketch
const fs = require('node:fs');
const path = require('node:path');

const distDir = path.resolve(__dirname, '..', 'dist');
const errors = [];

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, files);
    else if (e.name.endsWith('.html')) files.push(full);
  }
  return files;
}

if (!fs.existsSync(distDir)) {
  console.error('Run npm run build:astro first.');
  process.exit(1);
}

for (const file of walk(distDir)) {
  const rel = path.relative(distDir, file);
  if (rel === '404.html') continue;
  const html = fs.readFileSync(file, 'utf8');
  const usesPanel = html.includes('js/ticket-panel.js');
  if (!usesPanel) continue;
  if (!html.includes('<!-- Ticket Popup Panel -->')) errors.push(`${rel}: missing marker`);
  if (!html.includes('id="ticketPanel"')) errors.push(`${rel}: missing #ticketPanel`);
  if (!html.includes('id="ticketClose" aria-label="Close ticket panel"'))
    errors.push(`${rel}: missing labeled close button`);
  if (!html.includes('id="ticketLocation"')) errors.push(`${rel}: missing #ticketLocation`);
  if (!html.includes('id="ticketBookBtn"')) errors.push(`${rel}: missing #ticketBookBtn`);
}

if (errors.length) {
  console.error('Ticket panel dist parity check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Ticket panel dist parity check passed.');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Astro.glob('./pages/*.md')` for content discovery | `import.meta.glob` (Vite) | Astro 5+ (deprecation), removed in Astro 6 | If a planner reaches for `Astro.glob`, replace with `import.meta.glob`. Phase 4 likely doesn't need globbing — explicit imports are fine. |
| `<style>` global by default in early Astro | `<style>` scoped by default; `is:global` opt-in | Astro 1+ | Phase 4 must use `is:global` for any new shared style rule, or stick to `<link>` to `/css/*`. |
| `<script>` raw passthrough by default | `<script>` Vite-bundled by default; `is:inline` opt-out | Astro 2+ | Phase 4 must use `is:inline` on every legacy script reference. |
| `astro/jsx-runtime` JSX-style HTML comments | Mixed: HTML comments `<!-- -->` preserved, JSX `{/* */}` stripped | unchanged | The marker comment for ticket panel must remain `<!-- ... -->`. |
| `output: 'server'` and `astro preview` for SSR | `output: 'static'` with any static server | Astro 4+ | Project is static; do not rely on `astro preview` for tests. Use `python3 -m http.server` against `dist/`. |

**Deprecated/outdated:**
- `Astro.glob()`: replace with `import.meta.glob` if used.
- Legacy `components/ticket-panel.html` + `build.sh` workflow: superseded by `TicketPanel.astro` (see retirement sequencing).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `astro preview` is not necessary for `output: 'static'` smoke testing — `python3 -m http.server` against `dist/` is equivalent | Validation Architecture | LOW — if planner discovers `astro preview` is preferred, swap the webServer command in `playwright.config.js`. No artifact change. |
| A2 | Astro's default `<script>` bundling described as Pitfall 1 still applies in Astro 6.1.10 (was true in 4.x and 5.x; unverified directly via Context7 fetch in this session) | Common Pitfalls 1, Architecture Pattern 2 | MEDIUM — if defaults relaxed in 6.x, `is:inline` is still safe (always opt-out) so plans don't break, but planner can simplify components. Verify via a one-line test page during Plan 1. |
| A3 | `<!-- HTML comments -->` are preserved through `.astro` → emitted HTML (true historically; not re-verified this session) | Pitfall 3 | LOW — easy to test in 5 minutes during Plan 1; if stripped, switch to a sentinel like `<meta name="tm-ticket-panel" />` instead. |
| A4 | Eight representative templates (one per archetype) is sufficient to satisfy COMP-04 success criterion #5 | Representative Template List | LOW — directly aligned with ROADMAP wording; deferring additional pages to bulk migration is explicit Phase 4 boundary in CONTEXT D-09. |
| A5 | `playwright.config.js` currently serves the repo root — the smoke server is one of `python3 -m http.server 4173` (already cited from STACK.md). Swapping the directory to `dist/` is a one-line config change. | Validation Architecture, Wave 0 Gaps | LOW — verifiable in 30 seconds. |

**Resolution path:** A1, A2, and A3 should be sanity-checked during the first Plan in Phase 4 (the layout + first representative page) and either confirmed (no further action) or surfaced as planner-corrected guidance.

## Open Questions

1. **Single layout or multiple?** D-01 leaves planner discretion. Recommendation: **one `SiteLayout.astro`** for representative scope; if a future page (Phase 5+) needs distinctly different chrome (e.g., a checkout iframe page with no nav), introduce a second layout at that time.
   - What we know: All eight representatives share nav, footer, ticket panel, head cascade.
   - What's unclear: Whether `locations.astro` index needs a slim variant (no ticker, no hero video preload).
   - Recommendation: Pass a `variant?: 'default' | 'index' | 'legal'` prop to `SiteLayout` and toggle slot fills.

2. **Dynamic `[slug].astro` for locations now or later?** Phase 4 ships only 2 representative location pages (`philadelphia`, `houston`). A dynamic route is cleaner long-term but risks Pitfall 5.
   - What we know: 10 location slugs exist in `locations.json`; only 2 are migrated this phase.
   - What's unclear: How Phase 5 will sequence the remaining 8 location migrations.
   - Recommendation: Phase 4 ships explicit `*.astro` files for the two representatives; defer dynamic route to Phase 5/7 PLAN.

3. **`scripts/check-components.js` extension shape.** The current script scans repo-root `*.html`. After migration, those pages disappear, but new Astro-rendered files appear in `dist/`. The extension can either (a) gain a `--dist` flag like `check-route-contract.js`, or (b) split into source-side (component usage) + dist-side (output drift) checks.
   - What we know: The existing pattern of `--dist` flag exists in `check-route-contract.js`.
   - What's unclear: Whether the planner prefers a flag-toggled single script or two scripts.
   - Recommendation: Two scripts (`check-component-usage.js` for source, `check-ticket-panel-parity.js` for dist) — clearer responsibility, simpler to wire into `verify:phase4`.

4. **Should `LocationOverlay` data come from `js/nav.js`'s `locationData` literal or from `src/data/locations.ts`?** The literal duplicates `locations.json` (PITFALLS.md Pitfall 3 is exactly this). Phase 4 has the components in scope, but the consumer is `js/nav.js`.
   - What we know: PITFALLS.md flags this duplication as drift surface.
   - What's unclear: Whether modifying `js/nav.js` to read `window.TM` instead of the literal is in Phase 4 scope (D-05 prefers no JS changes).
   - Recommendation: **Phase 4 makes the Astro-rendered nav DOM data-driven**, but leaves `js/nav.js` `locationData` literal alone (D-05). Track a Phase 5/7 todo to remove the duplication via `gitnexus_rename` + impact analysis.

## Sources

### Primary (HIGH confidence)
- `package.json` (read 2026-04-29) — Astro 6.1.10 + scripts surface, including all 10 existing checks and Phase 1–3 verify gates.
- `astro.config.mjs` (read 2026-04-29) — `output: 'static'`, `trailingSlash: 'never'`, `build.format: 'file'`.
- `tsconfig.json` (read 2026-04-29) — extends `astro/tsconfigs/strict`, `resolveJsonModule: true`.
- `components/ticket-panel.html`, `build.sh`, `scripts/check-components.js`, `scripts/check-accessibility-baseline.js`, `scripts/check-astro-dist-manifest.js`, `scripts/check-site-data.js` — direct reads for DOM contracts.
- `js/ticket-panel.js`, `js/nav.js` — direct reads for selector + storage-key contracts.
- `src/data/locations.ts`, `src/data/site/navigation.json`, `src/data/site/footer.json`, `src/data/routes.json` — Phase 3 outputs Phase 4 consumes.
- `tests/smoke/site.spec.js` — five existing smoke contracts.
- `.planning/phases/04-shared-components-template-parity/04-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/phases/03-validated-data-foundation/03-RESEARCH.md` — phase scope and prior research.
- `npm view astro version`, `npm view astro time --json` (executed 2026-04-29) — Astro 6.1.10 published 2026-04-28T12:32:02Z. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` Pitfalls 1–3 — read directly; informs Pitfall 4 here and the location-data drift open question.
- Astro `is:inline` / `is:global` directive semantics — not re-verified via Context7 in this session; behavior consistent with Astro 4–5 documentation reviewed in earlier phase research. [ASSUMED — A2 in Assumptions Log]

### Tertiary (LOW confidence)
- None. Phase 4 research is grounded in direct codebase reads and registry-verified version data.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package versions verified, no new dependencies.
- Architecture patterns: HIGH for shape (slot, layout, component composition); MEDIUM for `is:inline` / `is:global` directive name stability across Astro 6 minors (A2).
- DOM contract preservation: HIGH — read directly from each consuming script and check.
- Pitfalls: HIGH — derived from explicit codebase invariants (build.sh comment matching, check-components.js attribute matching, IIFE selector usage); A2 caveat applies to Pitfall 1.
- Validation architecture: HIGH — extends an established pattern (`scripts/check-*.js` and `verify:phaseN`).

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (30 days; Astro is on a fast minor cadence — re-check version cadence and `is:inline` semantics in 30 days if Phase 4 has not started).

## RESEARCH COMPLETE
