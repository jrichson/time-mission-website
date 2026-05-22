# GEO/AI Answer-First Review

**Last updated:** 2026-05-22

This review tracks whether public pages answer likely visitor and AI-citation questions quickly: what Time Mission is, where to book, what each location offers, and what practical details are available near the top of the page.

## Methodology

For each route below, review the primary H1/H2 and opening body copy, then judge whether the first roughly 50 words answer the visitor's likely question. FAQ content source is included where relevant; FAQPage JSON-LD is intentionally omitted because Google restricts FAQ rich results.

## Per-Page Review

| Route | Page intent | Answer-first lead present? | Question-shaped headings? | FAQ content source | Recommendation | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | Brand + book | Partial | No | Site `faqs.json` on FAQ page only | Rewrite opening copy | Pending |
| `/about` | Brand story | Partial | No | None | Add focused FAQ content | Pending |
| `/faq` | Policy / how it works | Yes | Partial | `src/data/site/faqs.json` | No action | Pending |
| `/contact` | Reach the team | Yes | No | None | No action | Pending |
| `/locations` | Find a venue | Partial | No | None | Rewrite opening copy | Pending |
| `/privacy` | Legal | Partial | No | None | No action | Pending |
| `/groups/corporate` | B2B booking | Partial | Partial | None | Add focused FAQ content | Pending |
| `/philadelphia` | Local venue + book | Partial | No | Location data when authored | Add location FAQ content | Pending |
| `/houston` | Coming soon | Partial | No | Location data when authored | No action | Pending |
| `/mount-prospect` | Local venue + book | Partial | No | Location data when authored | Add location FAQ content | Pending |
| `/west-nyack` | Local venue + book | Partial | No | Location data when authored | Add location FAQ content | Pending |
| `/lincoln` | Local venue + book | Partial | No | Location data when authored | Add location FAQ content | Pending |
| `/manassas` | Local venue + book | Partial | No | Location data when authored | Add location FAQ content | Pending |
| `/antwerp` | Local venue + book | Partial | No | Location data when authored | Add location FAQ content | Pending |

## AI Citation Gaps

- Per-location `faqs[]` rows in `data/locations.json` remain useful visible content, but they are no longer emitted as FAQPage JSON-LD.
- Location pages should answer practical venue questions earlier when new copy is authored: age fit, group size, booking flow, parking or mall context, and whether the venue is open or coming soon.

## Cross-Reference

- See [schema-coverage-matrix.md](./schema-coverage-matrix.md) for current JSON-LD coverage.
