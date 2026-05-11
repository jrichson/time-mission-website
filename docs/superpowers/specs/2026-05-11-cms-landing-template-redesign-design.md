# CMS Landing Template Redesign Design

Date: 2026-05-11
Status: Approved design, pending implementation plan

## Purpose

The Time Mission CMS already has the right technical foundation for landing pages: a Payload `landings` collection, template values, authenticated previews, and a public `/c/{slug}` renderer. The current editor experience is still too generic for marketing work. Editors are asked to assemble a campaign page from database-style fields, with limited guidance on which template to use, what the public result will look like, or how the page should convert.

This redesign makes the CMS more useful from a marketing perspective by turning landing creation into a guided workflow with three complete, brand-aligned landing archetypes:

- Paid/Social Campaign
- Local Venue/City
- Group/Event

The first implementation should deliver guided templates, richer previews, and matching public renderers. It should also leave a clean path toward a future reusable section builder without exposing that complexity to editors now.

## Product Scope

This pass covers the CMS home experience, the Landing Pages editor workflow, the saved-content preview route, and the public `/c/{slug}` landing renderer.

The CMS home should act like a Time Mission operator dashboard. It should route editors into the right workflow with clear actions:

- Create Paid/Social Campaign
- Create Local Venue/City Landing
- Create Group/Event Landing
- Manage All Landing Pages
- Invite Users

Landing Pages should stop feeling like a generic content table first. Editors should pick a marketing job, fill guided fields, preview the saved page, and publish when ready.

Existing Pages and User Invites should remain mostly intact in this pass, except for CMS home routing and clearer workflow labels where useful. A full editorial cleanup for those areas can be a later phase.

## Non-Goals

This pass should not add a freeform page builder, arbitrary HTML fields, drag-and-drop section ordering, or a new CMS outside Payload. It should not redesign the whole public website or replace the existing Astro/Payload build integration.

It should not require editors to understand Astro, Cloudflare Pages, Railway, static builds, or API internals. Any technical deployment details shown in the CMS should be short, plain-language status guidance.

## Design Principles

The CMS should feel like a Time Mission operator console: dark, structured, orange-accented, and clear. It should not become a cinematic marketing page. Editing clarity wins over decoration.

The landing workflow should apply marketing psychology ethically:

- Reduce choice load with three guided archetypes.
- Use one primary action per template.
- Match landing copy to the visitor's likely source and intent.
- Use real proof rather than invented urgency or vague claims.
- Make planner-oriented paths feel low-risk and handled.
- Avoid template choices that require institutional knowledge.

The design should follow the existing brand context: energetic, playful, social, dark by definition, photography-led, and not generic family-fun, indie escape-room, VR arcade, or corporate SaaS.

## Template Archetypes

### Paid/Social Campaign

Use this for ad, social, email, seasonal, or short-run campaigns where the visitor arrives from a specific promise and needs a fast reason to act.

Default conversion path: booking-first.

Expected structure:

- Fast headline that matches the campaign promise.
- Hero image from real Time Mission assets.
- One primary CTA.
- Short proof cards.
- Friction reducers.
- Final CTA.

Editor guidance should emphasize ad-message match, activation energy, one action, and concrete proof. It should warn against vague hype, too many CTAs, fake urgency, and unsupported claims.

### Local Venue/City

Use this for local city campaigns, venue promotions, openings, and location-specific demand generation.

Default conversion path: booking-first when open, updates/contact when coming soon.

Expected structure:

- City or venue signal above the fold.
- Real venue or experience image.
- Local proof and confidence builders.
- Location details or city-specific copy.
- CTA based on launch state.

The existing `coming_soon` behavior should become a lifecycle variant of this archetype rather than a separate top-level marketing job. A coming-soon city page should not imply immediate booking if booking is not available.

### Group/Event

Use this for birthdays, corporate, field trips, bachelor/bachelorette, holidays, private events, and other planner-led use cases.

Default conversion path: inquiry/contact primary, booking secondary where appropriate.

Expected structure:

- Event/planner promise above the fold.
- Planner reassurance and logistics framing.
- Group-size or package proof.
- Social and authority proof when available.
- Low-risk inquiry CTA.
- Optional booking link as secondary.

Editor guidance should emphasize regret reduction, logistics confidence, proof, and planner reassurance. It should avoid forcing every planner directly into a ticket panel.

## Data Model Direction

Build on the existing `landings` collection. Do not introduce a separate landing-page system.

Keep shared fields for:

- title
- page URL / slug
- publish state
- sitemap state
- SEO metadata
- hero image
- headline
- subheadline
- proof points
- primary CTA

Add or reshape template fields around editor-facing archetypes:

- `paid_social_campaign`
- `local_venue_city`
- `group_event`

Existing values should continue to normalize safely:

- `campaign` maps to Paid/Social Campaign.
- `group_event` maps to Group/Event.
- `location_promo` maps to Local Venue/City.
- `coming_soon` maps to Local Venue/City with a coming-soon launch state.

Add guided strategy fields where they help the editor and renderer:

- audience
- campaign goal
- offer type
- location or city
- event type
- launch state
- proof angle
- CTA intent

Template-specific content groups can expose only relevant fields. Internally, name groups by section intent such as hero, proof, details, and final CTA so a later section-builder evolution is easier.

## Editor Experience

The CMS home should send editors into clear jobs, not make them infer the correct collection and template combination. Each landing creation action should include a one-sentence explanation of when to use it.

The Landing Pages collection should become easier to scan. Recommended columns:

- title
- page URL
- archetype
- published state
- primary CTA surface
- updated date

The edit screen should explain the selected archetype and show relevant fields only. Shared fields stay common, but descriptions should become marketing-specific. For example, proof points should ask for concrete reasons to believe rather than generic bullets.

Each archetype should include prompt text:

- Paid/social: hook fast, match ad promise, reduce activation energy, one action.
- Local venue/city: make the place feel real, show venue confidence, give local visitors a reason to act.
- Group/event: reassure the planner, reduce regret risk, make logistics feel handled.

The editor should make status visible in words:

- draft or published
- preview availability
- public URL after deploy
- sitemap/indexing state
- manual deploy reminder when deploy hooks are not configured
- missing required content

## Preview Experience

Preview must be a core CMS contract, not an afterthought.

Before creation, editors should see template examples that explain what each archetype is for and what sections it will produce. This can start as a CMS home/template chooser surface rather than a full visual gallery.

After saving, the existing authenticated preview route should render actual saved landing content using the selected archetype. It should stay visually close to the public `/c/{slug}` page while adding a slim CMS-only status bar.

The preview status bar should show:

- landing archetype
- draft or published state
- public path after deploy
- sitemap/indexability
- edit link
- plain-language deploy note

The preview should also show safe warnings for missing or weak content where detectable. Examples: no subheadline, fewer than three proof points, external CTA missing, or coming-soon page using booking-first copy.

## Public Rendering

The public `/c/{slug}` page should split into three template paths while sharing common utilities for CTA, SEO, hero image, proof items, analytics, and compatibility normalization.

Paid/Social Campaign should feel direct and fast:

- hero with campaign promise and one CTA
- proof cards
- friction reducer/detail section
- final CTA

Local Venue/City should make the place feel real:

- city/place signal
- venue or experience imagery
- local confidence section
- location or launch-state details
- CTA appropriate to open or coming-soon state

Group/Event should support planners:

- event promise
- inquiry/contact primary CTA
- planner reassurance
- group-size or logistics proof
- booking as secondary where useful

Public pages should remain constrained and brand-aligned. Editors should not be able to create layouts that conflict with the public site rhythm.

## Safety And Compatibility

Existing published landing pages must continue to render during and after migration.

Compatibility guards should normalize legacy template values before rendering. Migration should preserve existing content fields and only add fields or enum values that are required for the new workflow.

Security and quality constraints remain:

- no arbitrary HTML fields
- asset paths must remain root-relative `/assets/...`
- external CTA URLs must be HTTPS-only and credential-free
- previews must stay authenticated
- public CMS reads should only expose published documents
- public builds should keep working without a CMS origin unless strict mode is enabled
- source maps, CSP, and existing build protections should not be weakened

## Testing And Verification

Tests should cover:

- template normalization from legacy values to new archetypes
- CTA defaults by archetype
- renderability and sitemap behavior
- preview route authentication
- CMS collection template options and migration compatibility
- public `/c/{slug}` output for all three archetypes
- safe external URL validation

Manual or automated visual review should check representative desktop and mobile pages for all three archetypes. The preview route and public pages should preserve readable type, clear tap targets, visible focus, semantic markup, and non-overlapping UI.

Verification commands should include:

```bash
npm run check
npm run build:astro
```

CMS verification should include, when dependencies and environment allow:

```bash
cd cms
npm run typecheck
npm run build
```

Before committing implementation changes, GitNexus change detection should confirm that affected symbols and flows match the expected CMS landing, preview, and public renderer scope.

## Rollout Plan

1. Add compatibility helpers, type coverage, and tests for template normalization.
2. Update the Landing Pages collection fields, labels, descriptions, and defaults.
3. Improve the CMS home so editors enter the right landing workflow.
4. Upgrade the authenticated landing preview route.
5. Upgrade public `/c/{slug}` rendering for all three archetypes.
6. Add or update Payload migrations for new fields or enum values.
7. Run source, build, and CMS verification.
8. Keep existing landings rendering throughout the migration.

## Future Section Builder Path

The future target is a controlled reusable section builder, but not in this first pass.

The first implementation should prepare for that by naming field groups around section intent and keeping renderer boundaries clean. A later pass can introduce optional reusable sections such as testimonials, FAQ, offer bar, gallery, location details, and event package notes.

When that happens, editors should still start from an archetype and receive strong defaults. The section builder should extend the guided workflow, not replace it with blank-page assembly.
