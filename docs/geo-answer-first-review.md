# GEO/AI answer-first review (Phase 7 D-13)

**Last updated:** 2026-04-29

**Scope:** This document is a baseline review per D-13. It does not commit Phase 7 to content rewrites; it is input for a future content phase or marketing planning.

## Methodology

For each route below, the reviewer read the page’s primary H1/H2 and opening body copy (or the Astro template / shared partial where applicable) and judged whether the first ~50 words answered a likely visitor or AI-surfaced question (hours, booking, what Time Mission is, location specifics).

## Per-page review

| Route | Page intent | Answer-first lead present? (Y/N/Partial) | Question-shaped headings? (Y/N) | FAQ schema source | Recommendation | Status |
|-------|-------------|------------------------------------------|--------------------------------|-------------------|----------------|--------|
| `/` | Brand + book | Partial | N | Site `faqs.json` on FAQ page only | rewrite | pending |
| `/about` | Brand story | Partial | N | — | add FAQ | pending |
| `/faq` | Policy / how it works | Y | Partial | `src/data/site/faqs.json` | no action | pending |
| `/contact` | Reach the team | Y | N | — | no action | pending |
| `/locations` | Find a venue | Partial | N | — | rewrite | pending |
| `/privacy` | Legal | Partial | N | — | no action | pending |
| `/groups/corporate` | B2B booking | Partial | Partial | — | add FAQ | pending |
| `/philadelphia` | Local venue + book | Partial | N | — | add FAQ | pending |
| `/houston` | Coming soon | Partial | N | — | no action | pending |
| `/mount-prospect` | Local venue + book | Partial | N | — | add FAQ | pending |
| `/west-nyack` | Local venue + book | Partial | N | — | add FAQ | pending |
| `/lincoln` | Local venue + book | Partial | N | — | add FAQ | pending |
| `/manassas` | Local venue + book | Partial | N | — | add FAQ | pending |
| `/antwerp` | Local venue + book | Partial | N | — | add FAQ | pending |

## AI citation gaps

- **Per-location `faqs[]` in `data/locations.json`:** No location rows currently ship validated `faqs[]` entries (arrays are empty). Per-location FAQPage / rich FAQ surfaces cannot emit from source until those arrays are authored and validated.

- **Recommendation:** Consider populating `faqs[]` per location after Phase 7 cutover so per-location FAQPage can emit per D-08.

## Out-of-scope (D-13)

Phase 7 explicitly does not require any content rewrites listed above. Items marked `rewrite` or `add FAQ` are routed to backlog or a future Phase 8+ content review.

## Cross-reference

- See [schema-coverage-matrix.md](./schema-coverage-matrix.md) for JSON-LD coverage and Phase 8 input.
