# Phase 7: SEO, Schema & Local Search Baseline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `07-CONTEXT.md`.

**Date:** 2026-04-29
**Phase:** 7 — SEO, Schema & Local Search Baseline
**Areas discussed:** Meta & head parity, Sitemap, JSON-LD types, Local NAP, GEO/AI readiness

---

## Meta & head parity

| Topic | Options considered | Selected |
|--------|---------------------|----------|
| Source of truth for title/description/OG/Twitter | Catalog-only vs parity-first literals vs hybrid | **Validated catalogs (`src/data/site` or sibling)** |
| Robots / indexing | Mirror static HTML vs central rules table | **Central rules table** keyed by route patterns, validated vs registry |
| Social images | Default + overrides vs explicit every page | **Explicit og:image (+ Twitter) per migrated route** |

**Notes:** Aligns with SEO-01 and ROUTE-03 coherence via Phase 2 registry validation for robots rules.

---

## Sitemap

| Topic | Options considered | Selected |
|--------|---------------------|----------|
| Mechanism | Astro/build generation vs static+validate vs discretion | **Build-time generation (e.g. Astro endpoint) from route registry** |
| Extra fields | loc-only vs lastmod vs priority/changefreq | User: **best practices** → recorded as **planner discretion** (loc + lastmod when reliable; deprecate low-value tags unless parity needs) |

---

## JSON-LD types

| Topic | Options considered | Selected |
|--------|---------------------|----------|
| WebSite vs Organization-only | Minimal WebSite vs SearchAction vs org-only | **Organization sufficient for v1 — no WebSite requirement** |
| Location open vs coming-soon | Specific pairing vs planner discretion | **Planner discretion** within SEO-03/04 + DATA-02 |
| FAQPage scope | FAQ route only vs +locations vs visible-only | User deferred → **Recommender default:** `/faq` always; locations when validated Q&A in data |

---

## Local SEO & NAP

| Topic | Options considered | Selected |
|--------|---------------------|----------|
| Enforcement strictness | Automated DOM vs data-only vs both | User deferred → **Recommender default:** primary = schema/meta vs **location data module**; optional secondary checks in `verify:phase7` |
| Coming-soon hours | Omit vs limited copy vs follow DATA-02 | **Omit opening hours from schema for coming-soon** |

---

## GEO / AI readiness

| Topic | Options considered | Selected |
|--------|---------------------|----------|
| llms.txt | Ship curated vs defer vs minimal stub | **Ship curated privacy-safe `llms.txt`** |
| AI bots in robots.txt | Parity vs allow-major vs restrictive | **Explicitly allow major AI crawlers** (exact tokens verified at implementation) |
| Answer-first content | Review doc vs fix thin pages vs ops-only | **Internal review doc listing gaps — no mandatory rewrites** |

---

## Claude's Discretion

Catalog schema layout, `SiteHead` helper shape, sitemap endpoint implementation, FAQPage eligibility per location, secondary NAP check depth, exact `User-agent` strings.

## Deferred Ideas

Full thin-location content rewrites; WebSite+SearchAction without on-site search.
