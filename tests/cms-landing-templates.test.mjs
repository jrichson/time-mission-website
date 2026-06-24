import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  LANDING_CAMPAIGN_PRESETS,
  LANDING_TEMPLATE_OPTIONS,
  LEGACY_LANDING_TEMPLATE_OPTIONS,
  landingCampaignPreset,
  landingReviewWarningsForDoc,
  payloadLandingTemplateOptions,
  safeExternalLandingHref,
  validHttpsUrl,
} from '../cms/lib/landing-contract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('CMS landing templates', () => {
  it('keeps the Payload collection options aligned with the database migration', () => {
    const collection = read('cms/collections/Landings.js');
    const migration = read('cms/migrations/20260508_213000_landing_templates.ts');
    const briefMigration = read('cms/migrations/20260511_201500_landing_brief_fields.ts');
    const currentTemplates = LANDING_TEMPLATE_OPTIONS.map((option) => option.value);
    const legacyTemplates = LEGACY_LANDING_TEMPLATE_OPTIONS.map((option) => option.legacyValue);
    const payloadTemplateOptions = payloadLandingTemplateOptions();

    for (const template of ['paid_social_campaign', 'local_venue_city', 'group_event']) {
      expect(currentTemplates).toContain(template);
      expect(migration).toContain(`'${template}'`);
    }

    for (const template of ['campaign', 'location_promo', 'coming_soon']) {
      expect(legacyTemplates).toContain(template);
      expect(migration).toContain(`'${template}'`);
    }

    for (const guidance of [
      'Ad or social campaign',
      'Local venue or city campaign',
      'Group or event landing',
    ]) {
      expect(JSON.stringify(payloadTemplateOptions)).toContain(guidance);
    }

    expect(collection).toContain('payloadLandingTemplateOptions()');
    expect(collection).toContain('legacyTemplateNote()');
    expect(collection).toContain('preview: landingPreviewPath');
    expect(migration).toContain('ALTER TABLE "landings" ADD COLUMN "template"');
    expect(collection).toContain("name: 'brief'");
    expect(collection).toContain('Campaign brief');
    expect(collection).toContain("name: 'sourcePromise'");
    expect(collection).toContain("name: 'visitorIntent'");
    expect(briefMigration).toContain('"brief_source_promise"');
    expect(briefMigration).toContain('"brief_visitor_intent"');
  });

  it('requires an authenticated Payload user for CMS preview pages', () => {
    const previewRoute = read('cms/app/preview/landings/[id]/page.tsx');

    expect(previewRoute).toContain('payload.auth');
    expect(previewRoute).toContain('overrideAccess: false');
    expect(previewRoute).toContain('/admin/login?redirect=');
    expect(previewRoute).toContain('Public path');
    expect(previewRoute).toContain('Open public URL');
    expect(previewRoute).toContain('Campaign brief');
    expect(previewRoute).toContain('Sitemap');
    expect(previewRoute).toContain('Review warnings');
    expect(previewRoute).toContain('landingReviewWarningsForDoc');
    expect(previewRoute).toContain('mediaPublicAssetURL');
    expect(previewRoute).toContain('landingCtaForDoc');
    expect(previewRoute).toContain('missing-page-url');
    expect(previewRoute).toContain('Use a root-relative /assets/... hero image path.');
    expect(previewRoute).toContain('data-preview-section="paid-social-proof"');
    expect(previewRoute).toContain('data-preview-section="local-venue-signal"');
    expect(previewRoute).toContain('data-preview-section="group-planner-reassurance"');
    expect(previewRoute).toContain('Book tickets instead');
  });

  it('routes marketing landing creation through a brief-first wizard', () => {
    const home = read('cms/app/page.tsx');
    const wizard = read('cms/app/landings/new/page.tsx');
    const collection = read('cms/collections/Landings.js');
    const payloadConfig = read('cms/payload.config.ts');
    const dashboardCard = read('cms/components/LandingWizardDashboard.tsx');
    const importMap = read('cms/app/(payload)/admin/importMap.js');

    for (const template of ['paid_social_campaign', 'local_venue_city', 'group_event']) {
      expect(home).toContain(`/landings/new?template=${template}`);
    }

    expect(wizard).toContain('Landing launch wizard');
    expect(wizard).toContain('Mission Control');
    expect(wizard).toContain('Landing Pages');
    expect(wizard).toContain("export const dynamic = 'force-dynamic'");
    expect(wizard).toContain('createLandingDraft');
    expect(wizard).toContain("collection: 'landings'");
    expect(wizard).toContain('payload.auth');
    expect(wizard).toContain('overrideAccess: false');
    expect(wizard).toContain('validHttpsUrl');
    expect(wizard).toContain('invalid-source-url');
    expect(wizard).toContain('lookup-failed');
    expect(wizard).toContain('create-failed');
    expect(wizard).toContain('sourcePromise');
    expect(wizard).toContain('visitorIntent');
    expect(wizard).toContain('LANDING_CAMPAIGN_PRESETS');
    expect(wizard).toContain("name=\"preset\"");
    expect(wizard).toContain('Recommended campaign pages');
    expect(wizard).toContain('redirect(`/preview/landings/${created.id}`)');
    expect(payloadConfig).toContain("beforeDashboard: ['/components/LandingWizardDashboard.tsx']");
    expect(collection).toContain("beforeList: ['/components/LandingWizardDashboard.tsx']");
    expect(dashboardCard).toContain('Back to Mission Control');
    expect(dashboardCard).toContain('Create landing draft');
    expect(dashboardCard).toContain('Review landing drafts');
    expect(dashboardCard).toContain('Use this bridge only for landing-page work.');
    expect(dashboardCard).not.toContain('Payload shortcuts');
    expect(dashboardCard).not.toContain('Payload admin');
    expect(dashboardCard).toContain("href: '/landings/new'");
    expect(dashboardCard).toContain('/landings/new?template=paid_social_campaign');
    expect(dashboardCard).toContain('/landings/new?template=local_venue_city');
    expect(dashboardCard).toContain('/landings/new?template=group_event');
    expect(importMap).toContain('/components/LandingWizardDashboard.tsx#default');
  });

  it('prefills high-intent campaign landing starters', () => {
    const wizard = read('cms/app/landings/new/page.tsx');
    const wizardStyles = read('cms/app/landings/new/page.module.css');
    const presetIds = LANDING_CAMPAIGN_PRESETS.map((preset) => preset.id);

    expect(presetIds).toEqual([
      'friends-night-out',
      'birthday-party-missions',
      'corporate-team-building',
      'grand-opening-updates',
      'opening-offer-form',
      'general-ticket-booking',
      'general-group-inquiry',
      'local-venue-booking',
      'gift-card-campaign',
    ]);
    expect(landingCampaignPreset('corporate-team-building').defaults.primaryCtaLabel).toBe('Request Team Event Help');
    expect(landingCampaignPreset('grand-opening-updates').defaults.launchState).toBe('coming_soon');
    expect(landingCampaignPreset('opening-offer-form').defaults.ctaSurface).toBe('contact');
    expect(landingCampaignPreset('opening-offer-form').defaults.successMetric).toBe('Opening offer form submissions');
    expect(landingCampaignPreset('general-ticket-booking').defaults.ctaSurface).toBe('book_panel');
    expect(landingCampaignPreset('gift-card-campaign').defaults.ctaSurface).toBe('gift_cards');
    expect(landingCampaignPreset('missing')).toBeNull();
    expect(wizard).toContain('href={`/landings/new?preset=${preset.id}`}');

    for (const preset of LANDING_CAMPAIGN_PRESETS) {
      expect(preset.defaults.proofPoints).toHaveLength(3);
      expect(preset.defaults.primaryCtaLabel).not.toMatch(/^(learn more|submit|click here)$/i);
      expect(preset.defaults.ogImage).toMatch(/^\/assets\//);
    }

    expect(wizard).toContain('selectedPreset?.defaults');
    expect(wizard).toContain('defaultValue={defaults.headline ||');
    expect(wizardStyles).toContain('.presetGrid');
    expect(wizardStyles).toContain('.presetCardActive');
  });

  it('hardens CMS landing surfaces against unsafe URLs and long text', () => {
    const wizard = read('cms/app/landings/new/page.tsx');
    const wizardStyles = read('cms/app/landings/new/page.module.css');
    const previewRoute = read('cms/app/preview/landings/[id]/page.tsx');
    const previewStyles = read('cms/app/preview/landings/[id]/page.module.css');

    expect(validHttpsUrl('https://example.com/source')).toBe(true);
    expect(validHttpsUrl('http://example.com/source')).toBe(false);
    expect(safeExternalLandingHref('https://user:pass@example.com/source')).toBeNull();
    expect(wizard).toContain('maxLength={URL_MAX_LENGTH}');
    expect(wizard).toContain('dir="auto"');
    expect(previewRoute).toContain('publicAssetWasRepaired');
    expect(previewRoute).toContain('reviewWarnings.unshift');
    expect(wizard).toContain('publicAssetPathIsValid');
    expect(wizardStyles).toContain('overflow-wrap: anywhere');
    expect(wizardStyles).toContain('hyphens: auto');
    expect(previewStyles).toContain('overflow-wrap: anywhere');
    expect(previewStyles).toContain('hyphens: auto');
    expect(landingReviewWarningsForDoc({
      content: { primaryCtaLabel: 'Learn More' },
    })).toContain('Use a verb-first CTA that names the action, such as Book Your Mission or Request Event Help.');
  });
});
