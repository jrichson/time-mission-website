# CMS Landing Template Redesign Implementation Plan

**Goal:** Build guided CMS landing archetypes with editor prompts, actual previews, and matching public `/c/{slug}` renderers for paid/social, local venue/city, and group/event pages.

**Architecture:** Keep Payload `landings` as the source of truth. Add shared compatibility helpers in `src/lib/payload/landing-contract.ts`, mirror the runtime shape in `src/lib/payload/load.ts`, update the CMS collection/home/preview surfaces, and refactor the Astro landing page into archetype-aware rendering while preserving legacy template values.

**Tech Stack:** Payload 3, Next 16 CMS app, Astro 6 public site, TypeScript, Vitest.

---

## File Structure

- Modify `src/lib/payload/landing-contract.ts`: canonical archetype normalization, CTA defaults, launch-state helpers, warning helpers.
- Modify `src/lib/payload/load.ts`: Payload landing document shape for new nested groups.
- Modify `cms/collections/Landings.js`: editor-facing template options, strategy/template groups, guided descriptions, list columns, validation.
- Modify `cms/migrations/20260508_213000_landing_templates.ts`: enum compatibility for new archetype values.
- Create `cms/migrations/20260511_190000_landing_archetype_fields.ts`: add new landing strategy/content columns.
- Modify `cms/migrations/index.ts`: register the new migration.
- Modify `cms/payload-types.ts`: generated-type mirror for repository tests/builds if type generation cannot run in the environment.
- Modify `cms/app/page.tsx` and `cms/app/home.module.css`: clearer operator dashboard and template entry actions.
- Modify `cms/app/preview/landings/[id]/page.tsx` and `page.module.css`: archetype-aware saved-content preview and status warnings.
- Modify `src/pages/c/[slug].astro`: archetype-specific public render paths using shared helpers.
- Modify tests under `tests/`: update landing contract tests and CMS template tests; add public template structure checks.

## Tasks

### Task 1: Shared landing contract

- [x] **Step 1: Add failing tests for archetype compatibility**

Update `tests/payload-landing-contract.test.ts` with expectations for:

```ts
expect(landingArchetypeForDoc({ ...baseDoc, template: 'campaign' })).toBe('paid_social_campaign');
expect(landingArchetypeForDoc({ ...baseDoc, template: 'location_promo' })).toBe('local_venue_city');
expect(landingArchetypeForDoc({ ...baseDoc, template: 'coming_soon' })).toBe('local_venue_city');
expect(landingLaunchStateForDoc({ ...baseDoc, template: 'coming_soon' })).toBe('coming_soon');
expect(landingTemplateLabel('paid_social_campaign')).toBe('Paid/Social Campaign');
```

Run:

```bash
npm run test:unit -- tests/payload-landing-contract.test.ts
```

Expected: fail because the new helper names and archetype values do not exist.

- [x] **Step 2: Implement compatibility helpers**

Update `src/lib/payload/landing-contract.ts` to add:

```ts
export type PayloadLandingArchetype = 'paid_social_campaign' | 'local_venue_city' | 'group_event';
export type PayloadLandingLegacyTemplate = 'campaign' | 'location_promo' | 'coming_soon';
export type PayloadLandingTemplate = PayloadLandingArchetype | PayloadLandingLegacyTemplate;
export type PayloadLandingLaunchState = 'open' | 'coming_soon';
```

Add `landingArchetypeForDoc`, keep `landingTemplateForDoc` as a compatibility alias, add `landingLaunchStateForDoc`, update labels/options, and update `landingCtaForDoc` so group/event defaults to contact and coming-soon local pages do not default to booking.

- [x] **Step 3: Run the contract test**

Run:

```bash
npm run test:unit -- tests/payload-landing-contract.test.ts
```

Expected: pass.

### Task 2: Payload collection and migrations

- [x] **Step 1: Add failing collection tests**

Update `tests/cms-landing-templates.test.mjs` to expect new archetype values in `cms/collections/Landings.js` and migrations, plus editor guidance strings such as `Ad or social campaign`, `Local venue or city campaign`, and `Group or event landing`.

Run:

```bash
npm run test:unit -- tests/cms-landing-templates.test.mjs
```

Expected: fail because the collection still exposes the old template-only labels.

- [x] **Step 2: Update the collection**

Modify `cms/collections/Landings.js`:

- Replace editor-facing template labels with Paid/Social Campaign, Local Venue/City, Group/Event.
- Keep legacy values available only through validation/normalization, not as preferred editor labels.
- Add strategy fields: `audience`, `campaignGoal`, `offerType`, `locationOrCity`, `eventType`, `launchState`, `proofAngle`, `ctaIntent`.
- Add template-specific groups conditioned on `template`.
- Add clear descriptions and examples for proof points, hero images, CTAs, and publish state.
- Update `defaultColumns` to include `slug`, `template`, `published`, `content.ctaSurface`, `updatedAt`.

- [x] **Step 3: Add migration compatibility**

Update `cms/migrations/20260508_213000_landing_templates.ts` to include the new enum values and add `cms/migrations/20260511_190000_landing_archetype_fields.ts` for new strategy/group columns. Register it in `cms/migrations/index.ts`.

- [x] **Step 4: Run collection tests**

Run:

```bash
npm run test:unit -- tests/cms-landing-templates.test.mjs
```

Expected: pass.

### Task 3: CMS home and preview

- [x] **Step 1: Add/extend tests for preview wiring**

Extend `tests/cms-landing-templates.test.mjs` to check the preview route contains archetype status, public path, sitemap/indexability text, and authenticated `payload.auth`.

- [x] **Step 2: Update CMS home**

Modify `cms/app/page.tsx` and `cms/app/home.module.css` so the home page shows operator-dashboard actions for the three landing archetypes, a manage-all link, and an invite-users link. Use semantic sections, real links, 44px targets, visible focus, and no nested interactive elements.

- [x] **Step 3: Update preview route**

Modify `cms/app/preview/landings/[id]/page.tsx` and `page.module.css` to use shared archetype concepts, show status chips/warnings, and render template-specific preview sections. Preserve authenticated preview behavior and HTTPS-safe public asset handling.

- [x] **Step 4: Run CMS-related unit tests**

Run:

```bash
npm run test:unit -- tests/cms-landing-templates.test.mjs tests/payload-landing-contract.test.ts
```

Expected: pass.

### Task 4: Public landing renderer

- [x] **Step 1: Add public renderer fixture checks**

Add or extend tests to assert `src/pages/c/[slug].astro` contains distinct archetype branches/classes for paid/social, local venue/city, and group/event and preserves safe analytics attributes.

- [x] **Step 2: Refactor public renderer**

Modify `src/pages/c/[slug].astro` so it uses `landingArchetypeForDoc` and `landingLaunchStateForDoc`. Render different section headings, CTAs, secondary links, and proof framing per archetype while keeping shared SEO, image handling, schema, and analytics.

- [x] **Step 3: Run public renderer tests**

Run:

```bash
npm run test:unit -- tests/payload-landing-contract.test.ts tests/cms-landing-templates.test.mjs
```

Expected: pass.

### Task 5: Full verification and commit

- [x] **Step 1: Run source verification**

Run:

```bash
npm run check
```

Expected: pass.

- [x] **Step 2: Run Astro build**

Run:

```bash
npm run build:astro
```

Expected: pass.

- [ ] **Step 3: Run CMS checks when environment allows**

Result during execution: `npm run typecheck` passed in `cms/`. `npm run build` stalled twice at Next/Turbopack's `Creating an optimized production build ...` phase and was stopped after no further output; ignored `.next` cache was removed afterward.

Run:

```bash
cd cms
npm run typecheck
npm run build
```

Expected: pass, unless blocked by missing local CMS environment. If blocked, record the exact blocker.

- [x] **Step 4: Review affected change scope**

Review staged/all changes before commit and confirm the affected scope is CMS landings, preview, and public renderer.

- [x] **Step 5: Commit implementation**

Commit the implementation with:

```bash
git add src/lib/payload/landing-contract.ts src/lib/payload/load.ts src/pages/c/[slug].astro cms/collections/Landings.js cms/migrations cms/payload-types.ts cms/app/page.tsx cms/app/home.module.css cms/app/preview/landings/[id]/page.tsx cms/app/preview/landings/[id]/page.module.css tests
git commit -m "Implement guided CMS landing templates"
```
