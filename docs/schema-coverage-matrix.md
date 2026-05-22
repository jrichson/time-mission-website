# Schema Coverage Matrix

**Last updated:** 2026-05-22

## Scope

All indexed public routes are rendered by Astro page modules and validated from built `dist/` output. The source of truth for route coverage is:

- `src/data/routes.json`
- `src/data/site/astro-rendered-output-files.json`
- `src/lib/schema/graph.ts`
- `scripts/check-schema-output.js`

`npm run check:schema-output` runs after `npm run build:astro` and validates JSON-LD against the built HTML. It fails when required schema nodes are missing, malformed, or drift from `data/locations.json`.

## Coverage

| Route family | Required schema |
| --- | --- |
| `/` | `Organization`, primary media schema where configured |
| `/about` | `Organization` |
| `/faq` | `Organization`; visible FAQs remain on-page, but `FAQPage` JSON-LD is intentionally omitted because Google restricts FAQ rich results |
| `/contact`, `/locations`, legal pages | `Organization`, `BreadcrumbList` |
| `/groups/*` | `Organization`, `BreadcrumbList`, `Service`; visible FAQs remain on-page without `FAQPage` JSON-LD |
| Open schema-eligible locations | `Organization`, `BreadcrumbList`, `EntertainmentBusiness`, NAP, `GeoCoordinates`, map URL, parent organization, ISO country code, E.164 phone, and schema-normalized hours from `data/locations.json` |
| Coming-soon locations | `Organization`, `BreadcrumbList`; no `EntertainmentBusiness` or opening hours until schema-eligible |
| `/contact-thank-you` | No JSON-LD required |

## Validation

Run:

```bash
npm run build:astro
npm run check:schema-output
```

The full launch gate is:

```bash
npm run verify
```

## Related Docs

- [verification-pipeline.md](verification-pipeline.md)
- [geo-answer-first-review.md](geo-answer-first-review.md)
- [booking-cta-surface-matrix.md](booking-cta-surface-matrix.md)
