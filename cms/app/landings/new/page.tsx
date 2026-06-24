import config from '@payload-config';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';

import {
  CTA_SURFACE_OPTIONS,
  defaultLandingCtaLabel,
  LANDING_CAMPAIGN_PRESETS,
  LANDING_TEMPLATE_OPTIONS,
  landingCampaignPreset,
  landingCtaSurface,
  landingLaunchState,
  landingSourceChannel,
  landingTemplate,
  SOURCE_CHANNEL_OPTIONS,
  slugifyLandingPath,
  truncateLandingText,
  validHttpsUrl,
} from '../../../lib/landing-contract.js';
import {
  DEFAULT_LANDING_HERO_IMAGE,
  publicAssetPathIsValid,
  PUBLIC_ASSET_PATH_MAX_LENGTH,
} from '../../../lib/media-library.js';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type LandingTemplate = 'paid_social_campaign' | 'local_venue_city' | 'group_event';
type SourceChannel = 'paid_ad' | 'organic_social' | 'email' | 'local_search' | 'partner' | 'internal' | 'other';
type LaunchState = 'open' | 'coming_soon';
type CtaSurface = 'book_panel' | 'missions' | 'groups' | 'contact' | 'gift_cards' | 'external';
type CampaignPresetDefaults = {
  audience: string;
  ctaSurface: CtaSurface;
  eventType: string;
  groupSize: string;
  headline: string;
  launchState: LaunchState;
  locationOrCity: string;
  offerType: string;
  ogImage: string;
  primaryCtaLabel: string;
  proofPoints: string[];
  slug: string;
  sourceChannel: SourceChannel;
  sourceName: string;
  sourcePromise: string;
  subheadline: string;
  successMetric: string;
  title: string;
  visitorIntent: string;
};
type CampaignPreset = {
  id: string;
  template: LandingTemplate;
  label: string;
  meta: string;
  intent: string;
  defaults: CampaignPresetDefaults;
};

type PageProps = {
  searchParams: Promise<{
    error?: string;
    preset?: string;
    template?: string;
  }>;
};

const URL_MAX_LENGTH = 2048;

const templateOptions = LANDING_TEMPLATE_OPTIONS as Array<{
  value: LandingTemplate;
  label: string;
  help: string;
  bestFor: string;
  creates: string[];
}>;
const sourceChannelOptions = SOURCE_CHANNEL_OPTIONS as Array<{ value: SourceChannel; label: string }>;
const ctaSurfaceOptions = CTA_SURFACE_OPTIONS as Array<{ value: CtaSurface; label: string }>;
const campaignPresets = LANDING_CAMPAIGN_PRESETS as unknown as CampaignPreset[];
const fallbackProofPoints = [
  '25+ interactive mission rooms',
  'Team-based scoring and competition',
  'Flexible session lengths',
];

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function firstText(...values: Array<string | undefined>): string {
  for (const value of values) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (text) return text;
  }

  return '';
}

function proofPointsFromForm(formData: FormData, defaults: Partial<CampaignPresetDefaults>): string[] {
  const submitted = ['proofPoint1', 'proofPoint2', 'proofPoint3']
    .map((key) => formString(formData, key))
    .filter(Boolean);
  const presetProof = Array.isArray(defaults.proofPoints) ? defaults.proofPoints : [];

  return [...submitted, ...presetProof, ...fallbackProofPoints]
    .map((text) => String(text).trim())
    .filter(Boolean)
    .slice(0, 3);
}

function wizardUrl(template: LandingTemplate, error: string, preset: string): string {
  const params = new URLSearchParams({ error, template });
  if (preset) params.set('preset', preset);
  return `/landings/new?${params.toString()}`;
}

async function requireCmsUser(redirectPath: string) {
  const payload = await getPayload({ config });
  const auth = await payload.auth({ headers: await headers() });

  if (!auth.user) {
    redirect(`/admin/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  return { payload, user: auth.user };
}

async function createLandingDraft(formData: FormData) {
  'use server';

  const preset = formString(formData, 'preset');
  const selectedPreset = landingCampaignPreset(preset) as CampaignPreset | null;
  const defaults = (selectedPreset?.defaults || {}) as Partial<CampaignPresetDefaults>;
  const template = landingTemplate(formString(formData, 'template') || selectedPreset?.template || '') as LandingTemplate;
  const state = landingLaunchState(formString(formData, 'launchState') || defaults.launchState || 'open') as LaunchState;
  const title = firstText(formString(formData, 'title'), defaults.title);
  const slug = slugifyLandingPath(formString(formData, 'slug') || title);
  const headline = firstText(formString(formData, 'headline'), defaults.headline);
  const subheadline = firstText(formString(formData, 'subheadline'), defaults.subheadline);
  const sourceName = firstText(formString(formData, 'sourceName'), defaults.sourceName, title);
  const sourcePromise = firstText(formString(formData, 'sourcePromise'), defaults.sourcePromise, subheadline, headline);
  const visitorIntent = firstText(
    formString(formData, 'visitorIntent'),
    defaults.visitorIntent,
    'They want to know if this Time Mission page is right for them.',
  );
  const successMetric = firstText(formString(formData, 'successMetric'), defaults.successMetric, 'Bookings or inquiries');
  const sourceUrl = formString(formData, 'sourceUrl');
  const proofPoints = proofPointsFromForm(formData, defaults);
  const imagePath = firstText(formString(formData, 'ogImage'), defaults.ogImage, DEFAULT_LANDING_HERO_IMAGE);

  if (!title || !slug || !headline || !subheadline) {
    redirect(wizardUrl(template, 'missing-required-fields', preset));
  }
  if (!publicAssetPathIsValid(imagePath)) {
    redirect(wizardUrl(template, 'invalid-image-path', preset));
  }
  if (!validHttpsUrl(sourceUrl)) {
    redirect(wizardUrl(template, 'invalid-source-url', preset));
  }

  const { payload, user } = await requireCmsUser('/landings/new');
  const existing = await payload
    .find({
      collection: 'landings',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      user,
      where: {
        slug: { equals: slug },
      },
    })
    .catch((error: unknown) => {
      console.error('[landings] draft slug lookup failed', error);
      redirect(wizardUrl(template, 'lookup-failed', preset));
    });

  if (existing.totalDocs > 0) {
    redirect(wizardUrl(template, 'slug-exists', preset));
  }

  const selectedCtaSurface = landingCtaSurface(
    formString(formData, 'ctaSurface') || defaults.ctaSurface || '',
    template,
    state,
  ) as CtaSurface;
  const primaryCtaLabel = firstText(
    formString(formData, 'primaryCtaLabel'),
    defaults.primaryCtaLabel,
    defaultLandingCtaLabel(template, state),
  );
  const metaTitle = truncateLandingText(`${headline} | Time Mission`, 90);
  const metaDescription = truncateLandingText(subheadline || sourcePromise, 220);
  const sourceChannel = landingSourceChannel(formString(formData, 'sourceChannel') || defaults.sourceChannel || '') as SourceChannel;
  const audience = firstText(formString(formData, 'audience'), defaults.audience, 'Time Mission visitors');
  const eventType = firstText(formString(formData, 'eventType'), defaults.eventType);
  const groupSize = firstText(formString(formData, 'groupSize'), defaults.groupSize);
  const locationOrCity = firstText(formString(formData, 'locationOrCity'), defaults.locationOrCity);
  const offerType = firstText(formString(formData, 'offerType'), defaults.offerType, sourceName);
  const created = await payload
    .create({
      collection: 'landings',
      data: {
        brief: {
          sourceChannel,
          sourceName,
          sourcePromise,
          sourceUrl,
          successMetric,
          visitorIntent,
        },
        content: {
          bullets: proofPoints.map((text) => ({ text })),
          ctaSurface: selectedCtaSurface,
          primaryCtaLabel,
          subheadline,
          headline,
        },
        groupEvent: {
          groupSize,
          logisticsNote: template === 'group_event' ? proofPoints[2] : '',
          plannerReassurance: template === 'group_event' ? visitorIntent : '',
        },
        includeInSitemap: true,
        localVenue: {
          cityProof: template === 'local_venue_city' ? proofPoints[0] : '',
          openingNote: state === 'coming_soon' ? subheadline : '',
          venueConfidence: template === 'local_venue_city' ? proofPoints[1] : '',
        },
        paidSocial: {
          frictionReducer: template === 'paid_social_campaign' ? visitorIntent : '',
          sourcePromise: template === 'paid_social_campaign' ? sourcePromise : '',
        },
        published: false,
        seo: {
          metaDescription,
          metaTitle,
          ogImage: imagePath,
          robots: 'index,follow',
        },
        slug,
        strategy: {
          audience,
          campaignGoal: successMetric,
          eventType,
          launchState: state,
          locationOrCity,
          offerType,
          proofAngle: proofPoints[0],
          ctaIntent: primaryCtaLabel,
        },
        template,
        title,
      },
      overrideAccess: false,
      user,
    })
    .catch((error: unknown) => {
      console.error('[landings] draft create failed', error);
      redirect(wizardUrl(template, 'create-failed', preset));
    });

  redirect(`/preview/landings/${created.id}?status=draft-created`);
}

function errorCopy(error: string | undefined): string | null {
  if (!error) return null;
  const messages: Record<string, string> = {
    'create-failed': 'The CMS could not create the draft. Check the fields and try again.',
    'invalid-image-path': 'Use a root-relative image path under /assets/ with no spaces.',
    'invalid-source-url': 'Use a credential-free https source URL, or leave it empty.',
    'lookup-failed': 'The CMS could not check that page URL. Try again before creating the draft.',
    'missing-required-fields': 'Add the page title, page URL, headline, and subheadline.',
    'slug-exists': 'That page URL already exists. Choose a unique slug.',
  };
  return messages[error] || 'The draft could not be created. Check the required fields and try again.';
}

export const metadata = {
  title: 'New landing page - Time Mission CMS',
  robots: {
    follow: false,
    index: false,
  },
};

export default async function NewLandingPage({ searchParams }: PageProps) {
  await requireCmsUser('/landings/new');
  const params = await searchParams;
  const selectedPreset = landingCampaignPreset(params.preset || '') as CampaignPreset | null;
  const defaults = (selectedPreset?.defaults || {}) as Partial<CampaignPresetDefaults>;
  const selectedTemplate = landingTemplate(selectedPreset?.template || params.template || '') as LandingTemplate;
  const error = errorCopy(params.error);
  const selectedTemplateOption = templateOptions.find((option) => option.value === selectedTemplate) || templateOptions[0];

  return (
    <main className={styles.shell}>
      <nav className={styles.topbar} aria-label="CMS shortcuts">
        <Link className={styles.brandMark} href="/">
          <span>Time Mission</span>
          <strong>CMS</strong>
        </Link>
        <div className={styles.topbarActions}>
          <Link href="/">Back to Mission Control</Link>
        </div>
      </nav>

      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Mission Control</Link>
        <span aria-hidden="true">/</span>
        <Link href="/admin/collections/landings">Landing Pages</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">New Draft</span>
      </nav>

      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Landing launch wizard</p>
          <h1>Create a campaign landing draft</h1>
          <p>
            Capture the real campaign context, write the first-pass page copy, and create a draft that opens
            directly in preview.
          </p>
        </div>
        <aside className={styles.statusPanel} aria-label="Landing draft status">
          <span>Draft only</span>
          <strong>{selectedTemplateOption.label}</strong>
          <p>Creates a saved CMS draft and opens preview before any public publish step.</p>
          {selectedPreset ? <p>Starter: {selectedPreset.label}</p> : null}
          <Link className={styles.secondaryLink} href="/admin/collections/landings">
            View landing drafts
          </Link>
        </aside>
      </header>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <form action={createLandingDraft} className={styles.form}>
        <section className={styles.panel} aria-labelledby="starter-title">
          <div className={styles.panelIntro}>
            <span>Start here</span>
            <h2 id="starter-title">Pick the closest starter</h2>
            <p>Starters fill the internal brief, proof points, CTA, and image so the draft can be created quickly.</p>
          </div>
          <div className={styles.presetHeader}>
            <span>Fast starters</span>
            <p>Choose one, then adjust the public copy in the short form below.</p>
          </div>
          <div className={styles.presetGrid}>
            {campaignPresets.map((preset) => (
              <Link
                className={`${styles.presetCard} ${selectedPreset?.id === preset.id ? styles.presetCardActive : ''}`}
                href={`/landings/new?preset=${preset.id}`}
                key={preset.id}
              >
                <span>{preset.meta}</span>
                <strong>{preset.label}</strong>
                <p>{preset.intent}</p>
                <em>{preset.defaults.primaryCtaLabel}</em>
              </Link>
            ))}
          </div>
        </section>

        <input name="preset" type="hidden" value={selectedPreset?.id || ''} />

        <section className={styles.panel} aria-labelledby="draft-title">
          <div className={styles.panelIntro}>
            <span>Short form</span>
            <h2 id="draft-title">Fill in the public page basics</h2>
            <p>Only four fields are required. The CMS fills the longer brief from the starter unless you open optional details.</p>
          </div>
          <div className={styles.fieldGrid}>
            <label>
              Page title
              <input
                defaultValue={defaults.title || ''}
                dir="auto"
                maxLength={120}
                name="title"
                placeholder="Summer Adventures at Time Mission"
                required
              />
            </label>
            <label>
              Page URL
              <input
                defaultValue={defaults.slug || ''}
                dir="ltr"
                maxLength={80}
                name="slug"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="summer-adventures"
                required
              />
              <span className={styles.fieldHelp}>Lowercase words and hyphens. The public path will be /c/page-url.</span>
            </label>
            <label className={styles.wide}>
              Headline
              <input
                defaultValue={defaults.headline || ''}
                dir="auto"
                maxLength={160}
                name="headline"
                placeholder="Summer Adventures Built for Active Groups"
                required
              />
            </label>
            <label className={styles.wide}>
              Subheadline
              <textarea
                defaultValue={defaults.subheadline || ''}
                dir="auto"
                maxLength={360}
                name="subheadline"
                placeholder="Explain the offer, occasion, or local reason to act in one or two sentences."
                required
              />
            </label>
            <label>
              Primary CTA label
              <input
                defaultValue={defaults.primaryCtaLabel || ''}
                dir="auto"
                maxLength={80}
                name="primaryCtaLabel"
                placeholder="Book Now"
              />
            </label>
          </div>

          <details className={styles.advancedDetails}>
            <summary>
              <span>Optional details</span>
              <strong>Adjust the brief, template, proof, or image</strong>
            </summary>
            <div className={styles.advancedDetailsBody}>
              <fieldset className={styles.templateFieldset}>
                <legend>Landing shape</legend>
                <div className={styles.optionGrid}>
                  {templateOptions.map((option) => (
                    <label className={styles.choice} key={option.value}>
                      <input
                        defaultChecked={option.value === selectedTemplate}
                        name="template"
                        type="radio"
                        value={option.value}
                      />
                      <strong>{option.label}</strong>
                      <span>{option.help}</span>
                      <em>{option.bestFor}</em>
                      <span className={styles.previewLabel}>Preview sections</span>
                      <ul>
                        {option.creates.map((section) => (
                          <li key={section}>{section}</li>
                        ))}
                      </ul>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className={styles.advancedFields}>
                <label>
                  Source channel
                  <select name="sourceChannel" defaultValue={defaults.sourceChannel || 'paid_ad'}>
                    {sourceChannelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Source name
                  <input
                    defaultValue={defaults.sourceName || ''}
                    dir="auto"
                    maxLength={120}
                    name="sourceName"
                    placeholder="Meta summer campaign"
                  />
                  <span className={styles.fieldHelp}>The campaign, channel, request, or audience this page came from.</span>
                </label>
                <label className={styles.wide}>
                  Source/reference URL
                  <input
                    autoComplete="url"
                    dir="ltr"
                    maxLength={URL_MAX_LENGTH}
                    name="sourceUrl"
                    pattern="https://.*"
                    placeholder="https://..."
                    type="url"
                  />
                  <span className={styles.fieldHelp}>Optional. Use an https URL without usernames, passwords, or spaces.</span>
                </label>
                <label className={styles.wide}>
                  Source promise
                  <textarea
                    defaultValue={defaults.sourcePromise || ''}
                    dir="auto"
                    maxLength={280}
                    name="sourcePromise"
                    placeholder="What did the ad, post, email, search query, or request promise?"
                  />
                  <span className={styles.fieldHelp}>Keep this close to what the visitor already saw or asked for.</span>
                </label>
                <label className={styles.wide}>
                  Visitor intent
                  <textarea
                    defaultValue={defaults.visitorIntent || ''}
                    dir="auto"
                    maxLength={240}
                    name="visitorIntent"
                    placeholder="What is this visitor trying to decide or accomplish?"
                  />
                  <span className={styles.fieldHelp}>This becomes guidance for the page copy and preview warnings.</span>
                </label>
                <label>
                  Success metric
                  <input
                    defaultValue={defaults.successMetric || ''}
                    dir="auto"
                    maxLength={120}
                    name="successMetric"
                    placeholder="Bookings, inquiries, waitlist submissions"
                  />
                </label>
                <label>
                  Audience
                  <input
                    defaultValue={defaults.audience || ''}
                    dir="auto"
                    maxLength={120}
                    name="audience"
                    placeholder="Parents, event planners, local friend groups"
                  />
                </label>
                <label>
                  Proof point 1
                  <input
                    defaultValue={defaults.proofPoints?.[0] || ''}
                    dir="auto"
                    maxLength={200}
                    name="proofPoint1"
                    placeholder="25+ interactive mission rooms"
                  />
                </label>
                <label>
                  Proof point 2
                  <input
                    defaultValue={defaults.proofPoints?.[1] || ''}
                    dir="auto"
                    maxLength={200}
                    name="proofPoint2"
                    placeholder="Teams of 2-5 compete together"
                  />
                </label>
                <label>
                  Proof point 3
                  <input
                    defaultValue={defaults.proofPoints?.[2] || ''}
                    dir="auto"
                    maxLength={200}
                    name="proofPoint3"
                    placeholder="60, 90, and 120 minute sessions"
                  />
                </label>
                <label>
                  CTA target
                  <select name="ctaSurface" defaultValue={defaults.ctaSurface || ''}>
                    <option value="">Use recommended target</option>
                    {ctaSurfaceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className={styles.fieldHelp}>Leave recommended unless the campaign has a specific conversion path.</span>
                </label>
                <label>
                  Launch state
                  <select name="launchState" defaultValue={defaults.launchState || 'open'}>
                    <option value="open">Open for booking</option>
                    <option value="coming_soon">Coming soon</option>
                  </select>
                  <span className={styles.fieldHelp}>Coming soon changes the default action away from booking.</span>
                </label>
                <label>
                  Location or city
                  <input
                    defaultValue={defaults.locationOrCity || ''}
                    dir="auto"
                    maxLength={120}
                    name="locationOrCity"
                    placeholder="Philadelphia, Houston, Dallas"
                  />
                </label>
                <label>
                  Event type
                  <input
                    defaultValue={defaults.eventType || ''}
                    dir="auto"
                    maxLength={120}
                    name="eventType"
                    placeholder="Birthday, corporate outing, school trip"
                  />
                </label>
                <label>
                  Offer type
                  <input
                    defaultValue={defaults.offerType || ''}
                    dir="auto"
                    maxLength={120}
                    name="offerType"
                    placeholder="Summer outing, grand opening, team building"
                  />
                </label>
                <label>
                  Group-size framing
                  <input
                    defaultValue={defaults.groupSize || ''}
                    dir="auto"
                    maxLength={120}
                    name="groupSize"
                    placeholder="Small crews, school groups, full-venue buyouts"
                  />
                </label>
                <label className={styles.wide}>
                  Hero / social image
                  <input
                    dir="ltr"
                    maxLength={PUBLIC_ASSET_PATH_MAX_LENGTH}
                    name="ogImage"
                    defaultValue={defaults.ogImage || DEFAULT_LANDING_HERO_IMAGE}
                    pattern="/assets/.*"
                  />
                  <span className={styles.fieldHelp}>Use a root-relative public asset path, for example /assets/photos/example.webp.</span>
                </label>
              </div>
            </div>
          </details>
        </section>

        <footer className={styles.footer}>
          <p>The wizard creates a draft, not a live page. Publish and deploy only after preview review.</p>
          <button type="submit">Create draft and preview</button>
        </footer>
      </form>
    </main>
  );
}
