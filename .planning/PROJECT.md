# Time Mission Website Astro Migration

## What This Is

Time Mission Website is a static marketing and location website for Time Mission venues. The current site is hand-authored HTML/CSS/JavaScript with data-driven location behavior, booking CTAs, group/event landing pages, location pages, SEO metadata, static hosting config, and verification scripts.

This project migrates that existing verified site to an Astro-based static foundation without redesigning it. The migration should preserve the current visual experience while improving maintainability, clean URL structure, analytics instrumentation, SEO/GEO readiness, schema generation, and cutover safety.

## Core Value

The migrated site must preserve the existing customer-facing experience and conversion paths while making the site easier to maintain, measure, optimize, and scale.

## Requirements

### Validated

- ✓ Static marketing site renders core pages for homepage, missions, groups, locations, policies, FAQ, contact, and group/event subpages — existing
- ✓ Location pages exist for open and coming-soon venues with local content, contact details, booking CTAs, and map links — existing
- ✓ `data/locations.json` acts as the central location data source for IDs, slugs, status, addresses, hours, booking URLs, gift card URLs, maps, nav labels, and ticker copy — existing
- ✓ `js/locations.js` exposes the `window.TM` browser API for location loading, selection, localStorage persistence, and DOM updates — existing
- ✓ `js/ticket-panel.js` provides site-wide booking panel behavior and uses `window.TM` location data — existing
- ✓ `js/roller-checkout.js` supports Roller iframe checkout behavior for locations with `rollerCheckoutUrl` — existing
- ✓ Shared styles in `css/` and page-local styles define the current brand presentation — existing
- ✓ `_headers`, `_redirects`, `robots.txt`, and `sitemap.xml` support static hosting, security headers, redirects, crawler behavior, and search discovery — existing
- ✓ `npm run verify` runs static contract checks and Playwright smoke tests for key flows — existing

### Active

- [ ] Migrate the site to Astro static output without redesigning the customer-facing experience.
- [ ] Launch with clean extensionless canonical URLs using no trailing slash, while redirecting legacy `.html` URLs.
- [ ] Preserve current assets, CSS cascade, typography, layouts, copy, imagery, animations, nav, footer, ticket panel, location overlays, and page-specific behavior unless a bug fix is intentional.
- [ ] Convert repeated nav, footer, location picker, ticket panel, SEO head, and shared page sections into Astro components with render parity.
- [ ] Move durable business facts into validated data modules, including locations, groups, missions, FAQs, navigation, SEO metadata, schema inputs, and tracking labels.
- [ ] Replace iframe-first Roller checkout behavior with tracked external checkout links as the default booking path, while documenting whether iframe support remains as an optional fallback.
- [ ] Add GTM-first analytics with a shared event contract for browser `dataLayer` events and server-side event forwarding readiness.
- [ ] Support Google Consent Mode v2-ready tracking and ensure non-essential browser/server events respect consent state.
- [ ] Add stable `event_id` and dedupe fields to analytics payloads so browser and server-side events can be reconciled.
- [ ] Include ROLLER-side GTM/GA4 setup and purchase-event validation in launch readiness when Venue Manager/playground access is available.
- [ ] Make SEO, GEO, AI-search extractability, and schema markup baseline migration requirements rather than post-launch enhancements.
- [ ] Implement a full local SEO baseline for location pages, including NAP consistency, map links, hours where applicable, LocalBusiness eligibility, location FAQs where content exists, and clear open vs coming-soon rules.
- [ ] Keep the first Astro release English-only while making location data and schema international-ready for country, locale, timezone, phone format, currency, and future `hreflang`.
- [ ] Preserve or improve verification gates for static checks, browser flows, clean URLs, redirects, analytics events, schema, local SEO, accessibility, and visual parity.
- [ ] Keep the old static site deployable until Astro launch is proven and document Cloudflare rollback steps and failure triggers.

### Out of Scope

- Full visual redesign — this migration is parity-first; redesign and CRO work should happen after the Astro foundation is stable.
- Full internationalization/translations — initial launch stays English-only while data/schema become international-ready.
- Mandatory completed-purchase attribution before Astro launch — the site must track outbound booking intent; ROLLER purchase validation is a launch checklist item when access allows.
- Final contact form provider selection before planning — the frontend form contract should stay provider-flexible until a backend choice is made.
- Replacing the booking platform — ROLLER remains the checkout system.

## Context

The current codebase is a brownfield static site. GitNexus indexed 77 files, 282 symbols, and 12 execution flows, with the runtime graph centered on browser JavaScript. The GSD codebase map documents a static marketing architecture with vanilla JavaScript hydration and location-driven behavior.

Important current files:

- `index.html`, `missions.html`, `groups.html`, `faq.html`, `contact.html`, and location/group HTML pages define the current public site.
- `data/locations.json` is the location source of truth.
- `js/locations.js` owns the `window.TM` location API and DOM updates.
- `js/ticket-panel.js` owns booking panel behavior and location-based booking URL resolution.
- `js/roller-checkout.js` owns current iframe checkout overlay behavior.
- `components/ticket-panel.html` is synced into pages by `build.sh`.
- `scripts/*.js`, `playwright.config.js`, and `tests/smoke/site.spec.js` define current verification gates.
- `.planning/codebase/` contains the GSD codebase map.
- `ARCHITECTURE.md` contains the GitNexus-generated architecture map.

Preflight decisions already made:

- Canonical clean URLs use no trailing slash: `/missions`, `/groups/birthdays`, `/philadelphia`.
- Legacy `.html` URLs redirect directly to clean canonical paths.
- The marketing site owns outbound booking intent tracking.
- ROLLER progressive checkout purchase tracking should be validated via ROLLER GTM/GA4 in playground/staging when access exists.
- GTM is the primary browser analytics integration.
- Google Consent Mode v2-ready hooks are required from the first release.
- Browser and server-side analytics events share one normalized payload with stable event identity.
- Local SEO is part of the initial Astro migration baseline.
- International readiness is data/schema-level for the initial English-only release.
- Business facts and tracking labels should live in validated data modules, not component literals.
- A strong rollback plan is required before cutover.

## Constraints

- **Visual parity:** The current static site is the design contract; Astro migration work should not introduce a redesign.
- **Static output:** Astro should produce static output suitable for Cloudflare Pages-style hosting.
- **URL migration:** Extensionless no-trailing-slash URLs are canonical; `.html` URLs must redirect without loops.
- **Analytics:** GTM-first browser tracking, Consent Mode v2 readiness, and server-side event compatibility must be considered from the start.
- **Privacy:** No PII should be sent to GTM or server-side analytics endpoints.
- **ROLLER dependency:** Completed purchase event visibility depends on ROLLER progressive checkout settings, plan/access level, and cross-domain configuration.
- **SEO:** Search metadata, sitemap entries, canonicals, internal links, structured data, and AI crawler policy must remain coherent during migration.
- **Data governance:** Durable business facts should be represented in validated data modules.
- **Verification:** `npm run verify` or its Astro equivalent must remain the cutover gate.
- **Dirty worktree:** The repository currently contains many unrelated modified and untracked files. Migration commits must be scoped carefully and avoid reverting unrelated work.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Astro static output | Marketing site does not require SSR, auth, or dynamic inventory in the first migration | — Pending |
| Preserve visual design during migration | Prevents scope creep and protects conversion behavior | — Pending |
| Use clean extensionless URLs with no trailing slash | Better long-term URL shape and user-facing polish | — Pending |
| Redirect legacy `.html` URLs | Preserves SEO equity, bookmarks, and existing indexed links | — Pending |
| Use GTM as the primary analytics integration | Most tracking will be managed through Google Tag Manager | — Pending |
| Include server-side tracking readiness from day one | Avoids redesigning the event contract later | — Pending |
| Use Consent Mode v2-ready analytics hooks | Supports EU/privacy-aware tracking requirements | — Pending |
| Treat local SEO and schema as launch requirements | Location pages are a core acquisition surface | — Pending |
| Keep initial launch English-only but international-ready | Supports Belgium/non-US locations without requiring full translation work now | — Pending |
| Keep old static site deployable until cutover is proven | Reduces launch risk | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition**:
1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. "What This Is" still accurate? Update if drifted.

**After each milestone**:
1. Full review of all sections.
2. Core Value check: still the right priority?
3. Audit Out of Scope: reasons still valid?
4. Update Context with current state.

---
*Last updated: 2026-04-29 after initialization*
