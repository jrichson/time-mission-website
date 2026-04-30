# Schema coverage matrix (Phase 7 → Phase 8 input)

**Last updated:** 2026-04-29

## Scope

Phase 7 fully covers JSON-LD **composition and validation** for Astro-rendered routes: `/`, `/about`, `/faq`, `/contact`, `/contact-thank-you` (no JSON-LD by design), `/privacy`, `/locations`, `/groups/corporate`, `/philadelphia`, `/houston`. These emit a single `@graph` block from `src/lib/schema/graph.ts` (except thank-you).

Legacy **public-copied HTML** retains whatever inline JSON-LD (or none) exists in repo-root `*.html` — Phase 8 migrates or audits those pages (per 07-RESEARCH Open Questions Q1, Assumption A3).

## Per-route matrix

| Route | Source | Organization | BreadcrumbList | LocalBusiness / EntertainmentBusiness | FAQPage | OpeningHours | Notes |
|-------|--------|:------------:|:--------------:|:---------------------------------------:|:-------:|:------------:|-------|
| `/` | Astro | ✅ | — | — | — | — | `buildHomeGraph` |
| `/about` | Astro | ✅ | — | — | — | — | Org only |
| `/missions` | Legacy HTML | ✅ typical | varies | ❌ typical | ❌ | ❌ | Inline legacy |
| `/groups` | Legacy | ✅ | ❌ | ❌ | ❌ | ❌ | |
| `/groups/bachelor-ette` | Legacy | ❌ | ❌ | ❌ | ❌ | ❌ | No ld+json in file (Phase 8) |
| `/groups/birthdays` | Legacy | ❌ | ❌ | ❌ | ❌ | ❌ | |
| `/groups/corporate` | Astro | ✅ | ✅ | ❌ | ❌ | — | |
| `/groups/field-trips` | Legacy | ❌ | ❌ | ❌ | ❌ | ❌ | |
| `/groups/holidays` | Legacy | ❌ | ❌ | ❌ | ❌ | ❌ | |
| `/groups/private-events` | Legacy | ❌ | ❌ | ❌ | ❌ | ❌ | |
| `/gift-cards` | Legacy | ✅ | ❌ | ❌ | ❌ | ❌ | |
| `/faq` | Astro | ✅ | — | — | ✅ | — | `buildFaqGraph` |
| `/contact` | Astro | ✅ | ✅ | ❌ | ❌ | — | |
| `/contact-thank-you` | Astro | — | — | — | — | — | No JSON-LD |
| `/locations` | Astro | ✅ | ✅ | ❌ | ❌ | — | |
| `/philadelphia` | Astro | ✅ | ✅ | ✅ | ❌ | ✅ | Open + eligible |
| `/houston` | Astro | ✅ | ✅ | ❌ | ❌ | — | Coming-soon |
| `/mount-prospect` | Legacy | ✅ | ❌ | ❌ | ❌ | ❌ | Org-only legacy — Phase 8 EntertainmentBusiness |
| `/west-nyack` | Legacy | ✅ | ❌ | ❌ | ❌ | ❌ | |
| `/lincoln` | Legacy | ✅ | ❌ | ❌ | ❌ | ❌ | |
| `/manassas` | Legacy | ✅ | ❌ | ❌ | ❌ | ❌ | |
| `/antwerp` | Legacy | ✅ | ❌ | ❌ | ❌ | ❌ | |
| `/orland-park` | Legacy | ✅ | ❌ | ❌ | ❌ | ❌ | Coming-soon copy |
| `/dallas` | Legacy | ✅ | ❌ | ❌ | ❌ | ❌ | |
| `/brussels` | Legacy | ✅ | ❌ | ❌ | ❌ | ❌ | |
| `/privacy` | Astro | ✅ | ✅ | ❌ | ❌ | — | |
| `/terms` | Legacy | ✅ | ❌ | ❌ | ❌ | ❌ | |
| `/code-of-conduct` | Legacy | ✅ | ❌ | ❌ | ❌ | ❌ | |
| `/cookies` | Legacy | ✅ | ❌ | ❌ | ❌ | ❌ | |
| `/accessibility` | Legacy | ✅ | ❌ | ❌ | ❌ | ❌ | |
| `/licensing` | Legacy | ✅ | ❌ | ❌ | ❌ | ❌ | |
| `/waiver` | Legacy | ❌ | ❌ | ❌ | ❌ | ❌ | Utility |

*Legacy “✅ typical” for Organization means the file contains at least one `application/ld+json` Organization-style block when grepped; see repo HTML for exact shape.*

## Phase 8 cleanup checklist

1. **Open + eligible locations** still on legacy HTML only (`mount-prospect`, `west-nyack`, `lincoln`, `manassas`, `antwerp`): add Astro pages or upgrade inline JSON-LD to **EntertainmentBusiness + NAP + hours** parity with `data/locations.json`.
2. **Coming-soon legacy** (`dallas`, `brussels`, `orland-park`): confirm Organization-only / no LocalBusiness matches D-10.
3. **Group subpages** on legacy HTML: decide breadcrumb + schema parity vs hub `/groups`.
4. **Validator extension:** `scripts/check-schema-output.js` enforces **Astro routes only** today. Phase 8 extends to `dist/` legacy copies or completes migration so all indexed routes pass one gate.

## Validator gap

`check-schema-output` does **not** read legacy-sourced `dist/*.html` for non-Astro routes. Phase 8 must either migrate those URLs to Astro or add a second validator pass for copied legacy HTML.

## Cross-reference

- GEO / answer-first gaps: [`docs/geo-answer-first-review.md`](geo-answer-first-review.md) (created in Plan 07-05).
