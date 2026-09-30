# Language and location routing

The US site publishes English (unprefixed) and Spanish (`/es`). The EU site publishes English (unprefixed), Dutch (`/nl`), French (`/fr`), and Spanish (`/es`). Selecting a venue must not select a different language.

`js/navigation-context.js` supplies `TMNavigation.href()` for browser navigation. The embedded site contract supplies the route aliases, venue roster, and dynamic route families from `config/navigation-routes.json`. `functions/_shared/location-route-normalizer.mjs` serves scoped URLs using the generated route manifest.

| Destination | Language and venue behavior |
| --- | --- |
| Shared pages, including FAQ, groups, contact, gifts, legal and press | `/<language>/<venue>/<page>`; omit the language prefix for English |
| Blog articles and CMS landing pages | Preserve the venue before `/blog/<slug>` or `/c/<slug>` |
| Venue pages and venue-specific campaigns | Keep the destination's explicit venue; never add another venue prefix |
| Group inquiry and group thank-you pages | Keep their existing embedded venue segment and add only the language prefix |
| Generic Jotform return | Recover the supported language and venue from a validated same-site inquiry source URL |
| Internal booking fallbacks and form success navigation | Apply the same routing policy while retaining query parameters and fragments |
| Region switch | Carry Spanish between US and EU; Dutch/French visitors entering the US use English |
| Third-party checkouts, forms, maps, email, downloads and API calls | Keep provider/file/API destinations intact; website language does not imply provider translation |
| Route without a selected venue | Preserve the language; do not invent a venue |

Location context comes from the current page URL, page metadata, or an explicit venue selection. Contact URLs also recognize a valid `location` query/fragment. A venue's external booking destination does not make its local website page external (for example, Edison).

Language changes keep the current page and venue. Ordinary anchor links are rewritten before interaction, including links inserted after initial load. Programmatic navigation must call `TMNavigation.href()`; provider URLs remain unchanged. Query parameters and fragments survive these transformations.

Scoped shared URLs serve the existing localized HTML. Their SEO canonical URLs and sitemap entries remain the underlying shared page URLs.

## Verification

- `npm run check` verifies source contracts and routing unit tests.
- Build each region, then run `npm run check:navigation-output`. It checks generated page links against every local venue and confirms that each internal destination has a serving HTML artifact in the correct language.
- `npm run verify:artifact` also runs the regional browser suite, including article navigation, reload/history, venue and language changes, dynamically inserted links, and US group-form returns.
- Browser tests use the local Cloudflare Pages handler because static Astro preview cannot serve scoped routes.

When adding a dynamic page family, register its bounded path prefix in `config/navigation-routes.json` and add a browser journey. Unknown paths are not treated as arbitrary shared pages.
