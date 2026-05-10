# Time Mission GEO Analysis

Analysis date: 2026-05-10

Scope: public-facing Astro site only. CMS authoring/admin surfaces are out of scope.

## 1. GEO Readiness Score: 92/100

| Category | Score | Notes |
|---|---:|---|
| Citability | 24/25 | Shared 134-167 word citation-ready answer blocks now appear in `/ai-context.md`, `/llms.txt`, and visible HTML on the homepage, `/missions`, `/groups`, `/locations`, and `/faq`. |
| Structural readability | 20/20 | Priority public pages now lead with question-shaped answer passages, FAQ content, compact location status/NAP data, and machine-readable markdown sources. |
| Multi-modal content | 14/15 | Primary hero/mission/group imagery is now represented with `ImageObject` schema, and homepage video metadata is emitted when a stable media host is configured. |
| Authority and brand signals | 14/20 | Entity consistency is stronger through shared answer copy, LinkedIn sameAs, and an off-site authority brief. The main remaining gap is durable third-party authority. |
| Technical accessibility | 20/20 | Static SSR output, AI crawler allow rules, sitemap inclusion, `llms.txt`, machine-readable markdown context, and RSL discovery are now in place. |

## 2. Platform Breakdown

| Platform | Score | Current position | Main next lever |
|---|---:|---|---|
| Google AI Overviews | 91/100 | Strong: traditional SEO, structured data, sitemap, SSR, FAQ/schema, crawlability, and visible answer-first passages. | Keep high-priority pages fresh and monitor Search Console query coverage. |
| ChatGPT Search | 83/100 | Strong technical extractability and clearer entity copy; weaker entity graph because ChatGPT often leans on third-party sources. | Build/claim entity sources: Wikipedia/Wikidata where eligible, YouTube/video profiles, and PR citations. |
| Perplexity | 81/100 | Better source structure, visible answer blocks, crawler access, and media schema; community-validation footprint remains weak. | Generate credible community and third-party discussion signals without spam. |
| Bing Copilot | 88/100 | Bingbot is explicitly allowed, sitemap is clean, and answer-first public pages are easier to extract. | Add IndexNow submission workflow once a Bing/IndexNow key is available. |

## 3. AI Crawler Access Status

Allowed in `robots.txt` and covered by `check:robots-ai`:

- GPTBot
- OAI-SearchBot
- ChatGPT-User
- Bingbot
- ClaudeBot
- Claude-User
- Claude-SearchBot
- anthropic-ai
- PerplexityBot
- Google-Extended
- Applebot-Extended
- CCBot

RSL is now discoverable with `License: https://timemission.com/license.xml` in `robots.txt`, a global HTTP `Link` header in `_headers.tmpl`, and `/license.xml` served as `application/rsl+xml`. The selected RSL terms permit `search`, `ai-index`, and `ai-input` with attribution while prohibiting `ai-train`.

## 4. llms.txt Status

Status: Present and upgraded.

`/llms.txt` now includes:

- H1 and blockquote intro.
- Direct Answer Summary.
- Key Facts.
- Machine-readable context links to `/ai-context.md` and `/pricing.md`.
- Canonical core, location, and group/event URLs.

Validator coverage:

- `check:llms-txt` confirms no `.html` URLs, no booking query parameters, no archive/thank-you URLs, and at least five 134-167 word citation-ready answer blocks in `ai-context.md`.
- `check:geo-answer-blocks` confirms the shared answer blocks appear in visible public HTML, `/llms.txt`, and `/ai-context.md`, and verifies primary `ImageObject` media schema for the homepage, `/missions`, and `/groups`.

## 5. Brand Mention Analysis

Current live-search evidence:

- LinkedIn: discoverable Time Mission company/entity page with entertainment category, headquarters, employee roster, expansion updates, and brand description. Source: https://www.linkedin.com/company/timemission-corp
- Trade/event entity source: IAAPA Expo listing includes Time Mission description, founding date, website, category, phone, and address. Source: https://iaapaexpo2024.smallworldlabs.com/?boothId=boothId%3D355362&page_id=2424
- Regional press: CultureMap Dallas covered the Mockingbird Station/Dallas expansion and described the Time Mission format, age range, portal count, and coming Texas locations. Source: https://dallas.culturemap.com/news/entertainment/time-mission-immersive-mockingbird-station/
- Trade press: Shopping Center Business coverage mentions Time Mission in an experiential-retail context. Source: https://static1.squarespace.com/static/56ba5a722eeb81df69a2c57b/t/69baa1e69557253dc506315a/1773838825478/SCB_Entertainment_0226.pdf
- LinkedIn/reposted partner signals: LOL Entertainment and Emerging Concepts pages also surface Time Mission expansion mentions and press links. Source: https://www.linkedin.com/company/lol-entertainment-llc

Gaps:

- No high-confidence Wikipedia or Wikidata entity result surfaced in the live search pass.
- No strong Reddit discussion footprint surfaced in the live search pass.
- No official YouTube channel result surfaced reliably; LinkedIn does mention a sizzle reel, but YouTube entity authority appears underdeveloped.

## 6. Passage-Level Citability

Best current citation targets:

| Query pattern | Best page/source | Why it is citable |
|---|---|---|
| What is Time Mission? | Homepage, `/ai-context.md`, `/llms.txt` | 145-word standalone definition with team size, room count, session length, format, and use cases. |
| How do Time Mission rooms work? | `/missions`, `/ai-context.md`, `/llms.txt` | 134-word answer block explaining mission rooms, scoring, replay, challenge variety, and location-specific booking. |
| Is Time Mission good for groups? | `/groups`, `/ai-context.md`, `/llms.txt` | 138-word standalone block covering birthdays, corporate events, field trips, private events, and buyouts. |
| How does Time Mission pricing work? | `/ai-context.md` and `/pricing.md` pricing blocks | 137-word block explains checkout-specific pricing without inventing prices. |
| Time Mission age/team/session rules | `/faq`, `/ai-context.md`, `/llms.txt` | Visible top summary plus direct answers from source FAQ content. |
| Time Mission locations | `/locations`, location pages, and `/ai-context.md` location table | Canonical URLs, NAP details, open/coming-soon status, and booking links. |

The prior visible-HTML reformatting opportunity is complete for the homepage, `/missions`, `/groups`, `/locations`, and `/faq`.

## 7. Server-Side Rendering Check

Status: Pass.

Evidence:

- Astro static build emits HTML and endpoint files into `dist/`.
- `ai-context.md`, `pricing.md`, `llms.txt`, and `sitemap.xml` are generated at build time.
- Existing smoke/SEO checks validate rendered output rather than relying on client-side hydration.
- Known local verification issue: preview-server checks require permission to bind `127.0.0.1:4173`; the final escalated `npm run verify` pass completed.

JavaScript dependency risk: low for content extraction. Interactive booking/location behavior depends on JS, but primary copy, schema, NAP, sitemap, and AI markdown are server-rendered/static.

## 8. Top 5 Highest-Impact Changes

1. Done: create `/ai-context.md` and `/pricing.md` with direct answer, location, group, booking, and citation guidance.
2. Done: upgrade `/llms.txt` to include direct facts plus machine-readable context links.
3. Done: add RSL discovery through `license.xml`, `robots.txt`, and `_headers.tmpl`.
4. Done: add LinkedIn company profile to Organization `sameAs` and AI context entity profiles.
5. Done: add visible answer-first blocks, media schema, open-location FAQPage schema, and `check:geo-answer-blocks`.

Remaining highest-impact non-code lever: create durable third-party authority sources, especially Wikipedia/Wikidata if eligible, YouTube explainer/sizzle content, and legitimate community discussion/PR that describes Time Mission in the same factual terms as the site.

## 9. Schema Recommendations

Current schema strengths:

- Organization with `sameAs`.
- WebSite.
- LocalBusiness on eligible open locations.
- FAQPage on FAQ and group pages.
- Service schema on group/event landing pages.
- BreadcrumbList where expected.

Recommended next additions:

- Add `sameAs` entries only when profiles are verified and stable. LinkedIn is now added; keep Instagram, TikTok, Facebook.
- Add `foundingDate`, `founder`/`employee` only if the business is comfortable treating those facts as canonical public facts.
- Consider `VideoObject` for any public sizzle reel or venue walkthrough embedded on the site.
- Done: add `ImageObject` metadata for homepage hero imagery and the root `/missions` and `/groups` pages.
- Consider `Event` schema only for dated promotions or launch/opening events, not evergreen location pages.

## 10. Content Reformatting Suggestions

Priority rewrites:

- Done: homepage has a visible "What is Time Mission?" section with the 145-word citation block from `/ai-context.md`.
- Done: `/missions` has a question-led "How do Time Mission rooms work?" block before the mission grid.
- Done: `/groups` has a "What group events can Time Mission host?" answer block before use-case cards.
- Done: `/locations` has a "Where is Time Mission located?" answer block followed by a compact status/NAP table.
- Done: `/faq` has a top pre-visit summary block before accordion content.

Off-site content brief:

- Every third-party profile and press pitch should repeat the same entity facts: Time Mission is a team-based interactive mission-room entertainment venue; teams are 2-5 players; sessions are 60/90/120 minutes; each mission is about 1-5 minutes; venues include 25+ mission rooms; ideal use cases include families, birthdays, corporate team building, field trips, private events, and date nights.
- Durable repo brief: `docs/offsite-geo-brief.md`.

## Sources

- RSL getting started: https://rslstandard.org/guide/getting-started
- RSL robots.txt discovery: https://rslstandard.org/guide/robots-txt
- RSL media type and HTTP association: https://rslstandard.org/rsl
- Time Mission LinkedIn: https://www.linkedin.com/company/timemission-corp
- IAAPA Expo listing: https://iaapaexpo2024.smallworldlabs.com/?boothId=boothId%3D355362&page_id=2424
- CultureMap Dallas coverage: https://dallas.culturemap.com/news/entertainment/time-mission-immersive-mockingbird-station/
- Shopping Center Business PDF: https://static1.squarespace.com/static/56ba5a722eeb81df69a2c57b/t/69baa1e69557253dc506315a/1773838825478/SCB_Entertainment_0226.pdf
