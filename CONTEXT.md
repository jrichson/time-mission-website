# Time Mission Context

## Domain Terms

- **Public site**: the customer-facing Time Mission website that sells the physical immersive social-gaming venue experience and routes visitors to the right location, event, or booking path.
- **Location Catalog**: the durable roster of Time Mission venues, including status, page slug, address, hours, booking provider facts, EU outbound-site facts, and coming-soon lead capture facts.
- **Booking Journey**: the decision flow from visitor intent to the correct booking outcome: location prompt, iframe booking, direct EU outbound link, group/event form, waiver, gift card, or coming-soon signup.
- **Public URL Surface**: the canonical set of public paths, redirect sources, sitemap URLs, dynamic landing paths, and output files that preserve SEO and deploy behavior.
- **Cloudflare Artifact**: the static output prepared for Cloudflare Pages, including copied public assets, generated headers, redirects, sitemap output, and large-media offload rules.
- **Landing Page Contract**: the renderable content rules for campaign landing pages, including launch state, CTA behavior, SEO head fields, sitemap eligibility, and editor warnings.

## Operational Priority

- Launch-week architecture work should favor the Public site, Booking Journey, Location Catalog, Public URL Surface, and Cloudflare Artifact.
- CMS editor/operator cleanup is lower priority unless it blocks publishing or deploy ownership.
