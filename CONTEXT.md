# Time Mission Context

## Domain Terms

- **Public site**: the customer-facing Time Mission website that sells the physical immersive social-gaming venue experience and routes visitors to the right location, event, or booking path.
- **Location Catalog**: the durable roster of Time Mission venues, including editor-safe operational facts and protected routing or booking facts.
- **Booking Journey**: the decision flow from visitor intent to the correct booking outcome: location prompt, iframe booking, direct EU outbound link, group/event form, waiver, gift card, or coming-soon signup.
- **Public URL Surface**: the canonical set of public paths, redirect sources, sitemap URLs, dynamic landing paths, and output files that preserve SEO and deploy behavior.
- **Cloudflare Artifact**: the static output prepared for Cloudflare Pages, including copied public assets, generated headers, redirects, sitemap output, and large-media offload rules.
- **Landing Page Contract**: the renderable content rules for campaign landing pages, including launch state, CTA behavior, SEO head fields, sitemap eligibility, and editor warnings.
- **Language Surface**: the public-site translation catalog and runtime rules that resolve language codes, fall back to the default language, update visible copy, and keep language switcher controls in sync.
- **CMS Content Scope**: the editor-owned content boundary for campaign landing pages and reusable site surfaces, excluding canonical page body and layout content.
- **Code-Owned Page**: a canonical public-site page whose body content and layout are changed through code rather than through the CMS.
- **Reusable Site Surface**: a cross-page public-site element or shared fact that can change independently of a full page.
- **Announcement Banner**: a text-only Reusable Site Surface for short site-wide, location-targeted, or region-targeted messages shown near the top of the Public site.
- **Navigation Surface**: a Reusable Site Surface for public-site navigation and footer links, including labels, order, visibility, and destinations but not layout structure.
- **FAQ Surface**: reusable question-and-answer content that can be scoped globally, categorically, or by location without giving editors control over page layout.
- **Mission Catalog**: reusable facts about Time Mission experiences, including names, descriptions, imagery, status, sort order, and location availability.
- **Media Library**: editor-managed approved imagery and metadata used by CMS-owned content without granting arbitrary page media placement.
- **Deploy-Gated CMS Content**: CMS-owned content that is approved in the CMS but becomes visible on the Public site only after the next approved static-site deploy.
- **CMS Publish Status**: the editor-facing state language for CMS-owned content: Draft, Published in CMS, and Live after deploy.
- **CMS Deploy Permission**: an owner-granted CMS capability that allows a user to trigger a public-site deploy after CMS content approval.
- **CMS Audit Trail**: owner-visible history of CMS content approval, deploy triggers, deploy outcomes, and public-site refresh timing.
- **Page SEO Override**: editor-owned metadata for a Code-Owned Page that changes search, social, or indexing presentation without changing page body or layout content.

## Relationships

- The **CMS Content Scope** includes the **Landing Page Contract**, **Reusable Site Surface**, **Announcement Banner**, **Navigation Surface**, **FAQ Surface**, **Mission Catalog**, **Media Library**, **Deploy-Gated CMS Content**, **CMS Publish Status**, **CMS Deploy Permission**, **CMS Audit Trail**, and **Page SEO Override**.
- The **Public site** may have multiple **Announcement Banner** records, but only one should be presented in a given banner position at a time.
- An **Announcement Banner** may target all visitors, one or more **Location Catalog** entries, or a location region.
- An **Announcement Banner** does not contain imagery.
- When multiple **Announcement Banner** records are eligible for the same visitor, the highest-priority banner wins, with the most recent active start date as the tiebreaker.
- A **Navigation Surface** should link to known **Public URL Surface** paths or explicitly allowed external URLs.
- The **CMS Content Scope** may include editor-safe **Location Catalog** facts, while protected routing or booking facts need stronger controls.
- Normal editors may update operational **Location Catalog** facts; admins own route-critical or booking-critical **Location Catalog** facts.
- Location-specific marketing copy and full location page sections remain **Code-Owned Page** content unless they are part of a **Landing Page Contract**.
- Editors may manage **FAQ Surface** entries, while **Code-Owned Page** templates decide where FAQ sections appear.
- Editors may manage **Mission Catalog** facts, while the Missions page remains a **Code-Owned Page**.
- Editors may select approved assets from the **Media Library** for CMS-owned content, while media placement in **Code-Owned Page** templates remains code-owned.
- A **Media Library** record owns media metadata and approval context separately from durable file storage.
- Published CMS changes are **Deploy-Gated CMS Content** until they are included in a new **Cloudflare Artifact**.
- **CMS Publish Status** distinguishes editor approval from public visibility.
- **CMS Deploy Permission** is separate from CMS role and must be granted explicitly by the owner.
- Only users with **CMS Deploy Permission** may trigger the deploy that turns **Deploy-Gated CMS Content** into a new **Cloudflare Artifact**.
- **CMS Deploy Permission** allows publishing approved CMS changes to the Public site, not arbitrary deployment control.
- The **CMS Audit Trail** should show who approved CMS content, who triggered deploy, whether deploy succeeded, and when the Public site last refreshed.
- Full **CMS Audit Trail** history is owner-only; admins may see limited deploy status when needed for their workflow.
- A **Code-Owned Page** can have zero or one **Page SEO Override**.
- Editors may update safe **Page SEO Override** fields, while crawlability-sensitive fields require stronger permissions.
- **Page SEO Override** records should be tied to known **Public URL Surface** paths rather than arbitrary editor-entered routes.
- The **Landing Page Contract** is the only CMS-owned workflow that creates new Public site URLs.
- Published **Landing Page Contract** URLs are protected; changing them requires stronger permissions and redirect planning.
- CMS-managed redirects may exist for retired or changed **Landing Page Contract** URLs, but they require admin or owner control.
- Non-landing redirects remain code-owned because they affect the broader **Public URL Surface**.
- A **Landing Page Contract** creates campaign pages inside the **Public URL Surface**, but a **Code-Owned Page** remains outside page-body CMS editing.

## Flagged ambiguities

- "Existing Pages" sounds like editors can change full page content; resolved: use **Page SEO Override** when the CMS only controls metadata for a **Code-Owned Page**.

## Operational Priority

- Launch-week architecture work should favor the Public site, Booking Journey, Location Catalog, Public URL Surface, Cloudflare Artifact, and Language Surface.
- CMS editor/operator cleanup is lower priority unless it blocks publishing or deploy ownership.
