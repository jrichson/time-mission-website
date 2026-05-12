import config from '@payload-config';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';

import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type LandingTemplate = 'paid_social_campaign' | 'local_venue_city' | 'group_event';
type SourceChannel = 'paid_ad' | 'organic_social' | 'email' | 'local_search' | 'partner' | 'internal' | 'other';
type LaunchState = 'open' | 'coming_soon';
type CtaSurface = 'book_panel' | 'missions' | 'groups' | 'contact' | 'gift_cards' | 'external';

type PageProps = {
  searchParams: Promise<{
    error?: string;
    template?: string;
  }>;
};

const DEFAULT_HERO_IMAGE = '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg';
const ASSET_PATH_MAX_LENGTH = 512;
const URL_MAX_LENGTH = 2048;

const templateOptions: Array<{
  value: LandingTemplate;
  label: string;
  help: string;
  bestFor: string;
  creates: string[];
}> = [
  {
    value: 'paid_social_campaign',
    label: 'Paid/Social Campaign',
    help: 'A matching destination for an ad, post, email, or seasonal offer.',
    bestFor: 'One promise, one primary booking action, fast proof.',
    creates: ['Campaign hero', 'Proof cards', 'Friction reducers', 'Booking CTA'],
  },
  {
    value: 'local_venue_city',
    label: 'Local Venue/City',
    help: 'A city, venue opening, local SEO push, or place-specific offer.',
    bestFor: 'Place-first demand where the city or venue has to feel real.',
    creates: ['City signal', 'Venue confidence', 'Launch-state copy', 'Local CTA'],
  },
  {
    value: 'group_event',
    label: 'Group/Event',
    help: 'A buyer or planner page for birthdays, corporate outings, schools, or private events.',
    bestFor: 'Planner confidence, logistics reassurance, and inquiry-friendly conversion.',
    creates: ['Planner promise', 'Logistics proof', 'Group-size framing', 'Inquiry CTA'],
  },
];

const sourceChannelOptions: Array<{ value: SourceChannel; label: string }> = [
  { value: 'paid_ad', label: 'Paid ad' },
  { value: 'organic_social', label: 'Organic social' },
  { value: 'email', label: 'Email' },
  { value: 'local_search', label: 'Local search / SEO' },
  { value: 'partner', label: 'Partner / referral' },
  { value: 'internal', label: 'Internal campaign' },
  { value: 'other', label: 'Other' },
];

const ctaSurfaceOptions: Array<{ value: CtaSurface; label: string }> = [
  { value: 'book_panel', label: 'Open booking panel' },
  { value: 'contact', label: 'Contact / inquiry' },
  { value: 'groups', label: 'Groups hub' },
  { value: 'missions', label: 'Missions page' },
  { value: 'gift_cards', label: 'Gift cards' },
  { value: 'external', label: 'External URL' },
];

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function landingTemplate(value: string): LandingTemplate {
  return templateOptions.some((option) => option.value === value)
    ? (value as LandingTemplate)
    : 'paid_social_campaign';
}

function sourceChannel(value: string): SourceChannel {
  return sourceChannelOptions.some((option) => option.value === value) ? (value as SourceChannel) : 'paid_ad';
}

function launchState(value: string): LaunchState {
  return value === 'coming_soon' ? 'coming_soon' : 'open';
}

function ctaSurface(value: string, template: LandingTemplate, state: LaunchState): CtaSurface {
  if (ctaSurfaceOptions.some((option) => option.value === value)) return value as CtaSurface;
  if (template === 'group_event' || state === 'coming_soon') return 'contact';
  return 'book_panel';
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 1).replace(/\s+\S*$/, '').trimEnd();
}

function wizardUrl(template: LandingTemplate, error: string): string {
  const params = new URLSearchParams({ error, template });
  return `/landings/new?${params.toString()}`;
}

function defaultCtaLabel(template: LandingTemplate, state: LaunchState): string {
  if (state === 'coming_soon') return 'Ask About Opening Updates';
  if (template === 'group_event') return 'Request Event Help';
  if (template === 'local_venue_city') return 'Book This Location';
  return 'Book Now';
}

function validAssetPath(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= ASSET_PATH_MAX_LENGTH &&
    value.startsWith('/assets/') &&
    !value.includes('://') &&
    !value.includes('..') &&
    !/[<>"'\\\s]/.test(value)
  );
}

function validHttpsUrl(value: string): boolean {
  if (!value) return true;
  if (value.length > URL_MAX_LENGTH || /[<>"'\\\s]/.test(value)) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
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

  const template = landingTemplate(formString(formData, 'template'));
  const state = launchState(formString(formData, 'launchState'));
  const title = formString(formData, 'title');
  const slug = slugify(formString(formData, 'slug') || title);
  const headline = formString(formData, 'headline');
  const subheadline = formString(formData, 'subheadline');
  const sourcePromise = formString(formData, 'sourcePromise');
  const visitorIntent = formString(formData, 'visitorIntent');
  const successMetric = formString(formData, 'successMetric');
  const sourceUrl = formString(formData, 'sourceUrl');
  const proofPoints = ['proofPoint1', 'proofPoint2', 'proofPoint3']
    .map((key) => formString(formData, key))
    .filter(Boolean);
  const imagePath = formString(formData, 'ogImage') || DEFAULT_HERO_IMAGE;

  if (!title || !slug || !headline || !subheadline || !sourcePromise || !visitorIntent || !successMetric) {
    redirect(wizardUrl(template, 'missing-required-fields'));
  }
  if (proofPoints.length < 3) {
    redirect(wizardUrl(template, 'missing-proof-points'));
  }
  if (!validAssetPath(imagePath)) {
    redirect(wizardUrl(template, 'invalid-image-path'));
  }
  if (!validHttpsUrl(sourceUrl)) {
    redirect(wizardUrl(template, 'invalid-source-url'));
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
      redirect(wizardUrl(template, 'lookup-failed'));
    });

  if (existing.totalDocs > 0) {
    redirect(wizardUrl(template, 'slug-exists'));
  }

  const selectedCtaSurface = ctaSurface(formString(formData, 'ctaSurface'), template, state);
  const primaryCtaLabel = formString(formData, 'primaryCtaLabel') || defaultCtaLabel(template, state);
  const metaTitle = truncate(`${headline} | Time Mission`, 90);
  const metaDescription = truncate(subheadline || sourcePromise, 220);
  const created = await payload
    .create({
      collection: 'landings',
      data: {
        brief: {
          sourceChannel: sourceChannel(formString(formData, 'sourceChannel')),
          sourceName: formString(formData, 'sourceName'),
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
          groupSize: formString(formData, 'groupSize'),
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
          audience: formString(formData, 'audience'),
          campaignGoal: successMetric,
          eventType: formString(formData, 'eventType'),
          launchState: state,
          locationOrCity: formString(formData, 'locationOrCity'),
          offerType: formString(formData, 'offerType') || formString(formData, 'sourceName'),
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
      redirect(wizardUrl(template, 'create-failed'));
    });

  redirect(`/preview/landings/${created.id}`);
}

function errorCopy(error: string | undefined): string | null {
  if (!error) return null;
  const messages: Record<string, string> = {
    'create-failed': 'The CMS could not create the draft. Check the fields and try again.',
    'invalid-image-path': 'Use a root-relative image path under /assets/ with no spaces.',
    'invalid-source-url': 'Use a credential-free https source URL, or leave it empty.',
    'lookup-failed': 'The CMS could not check that page URL. Try again before creating the draft.',
    'missing-proof-points': 'Add at least three concrete proof points before creating the draft.',
    'missing-required-fields': 'Complete the required brief and first-draft fields.',
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
  const selectedTemplate = landingTemplate(params.template || '');
  const error = errorCopy(params.error);
  const selectedTemplateOption = templateOptions.find((option) => option.value === selectedTemplate) || templateOptions[0];

  return (
    <main className={styles.shell}>
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
          <Link className={styles.secondaryLink} href="/admin/collections/landings">
            Manage landing pages
          </Link>
        </aside>
      </header>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <form action={createLandingDraft} className={styles.form}>
        <section className={styles.panel} aria-labelledby="shape-title">
          <div className={styles.panelIntro}>
            <span>Step 1</span>
            <h2 id="shape-title">Choose the landing shape</h2>
            <p>The shape should follow the campaign job, not the other way around.</p>
          </div>
          <fieldset className={styles.templateFieldset}>
            <legend className={styles.srOnly}>Landing shape</legend>
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
        </section>

        <section className={styles.panel} aria-labelledby="brief-title">
          <div className={styles.panelIntro}>
            <span>Step 2</span>
            <h2 id="brief-title">Capture the campaign brief</h2>
            <p>This is the source of truth for the page. If the brief is fuzzy, the landing page will be fuzzy.</p>
          </div>
          <div className={styles.fieldGrid}>
            <label>
              Source channel
              <select name="sourceChannel" defaultValue="paid_ad">
                {sourceChannelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Source name
              <input dir="auto" maxLength={120} name="sourceName" placeholder="Meta spring break ad" required />
              <span className={styles.fieldHelp}>The campaign, channel, request, or audience this page came from.</span>
            </label>
            <label>
              Page title
              <input dir="auto" maxLength={120} name="title" placeholder="Spring Break at Time Mission" required />
            </label>
            <label>
              Page URL
              <input
                dir="ltr"
                maxLength={80}
                name="slug"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="spring-break"
                required
              />
              <span className={styles.fieldHelp}>Lowercase words and hyphens. The public path will be /c/page-url.</span>
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
                dir="auto"
                maxLength={280}
                name="sourcePromise"
                placeholder="What did the ad, post, email, search query, or request promise?"
                required
              />
              <span className={styles.fieldHelp}>Keep this close to what the visitor already saw or asked for.</span>
            </label>
            <label className={styles.wide}>
              Visitor intent
              <textarea
                dir="auto"
                maxLength={240}
                name="visitorIntent"
                placeholder="What is this visitor trying to decide or accomplish?"
                required
              />
              <span className={styles.fieldHelp}>This becomes guidance for the page copy and preview warnings.</span>
            </label>
            <label>
              Success metric
              <input
                dir="auto"
                maxLength={120}
                name="successMetric"
                placeholder="Bookings, inquiries, waitlist submissions"
                required
              />
            </label>
            <label>
              Audience
              <input dir="auto" maxLength={120} name="audience" placeholder="Parents, event planners, local friend groups" />
            </label>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="copy-title">
          <div className={styles.panelIntro}>
            <span>Step 3</span>
            <h2 id="copy-title">Write the first draft</h2>
            <p>Use the brief. This draft opens in preview, then the detailed Payload editor can refine it.</p>
          </div>
          <div className={styles.fieldGrid}>
            <label className={styles.wide}>
              Headline
              <input
                dir="auto"
                maxLength={160}
                name="headline"
                placeholder="Spring Break Missions Built for Active Groups"
                required
              />
            </label>
            <label className={styles.wide}>
              Subheadline
              <textarea
                dir="auto"
                maxLength={360}
                name="subheadline"
                placeholder="Explain the offer, occasion, or local reason to act in one or two sentences."
                required
              />
            </label>
            <label>
              Proof point 1
              <input dir="auto" maxLength={200} name="proofPoint1" placeholder="25+ interactive mission rooms" required />
            </label>
            <label>
              Proof point 2
              <input dir="auto" maxLength={200} name="proofPoint2" placeholder="Teams of 2-5 compete together" required />
            </label>
            <label>
              Proof point 3
              <input dir="auto" maxLength={200} name="proofPoint3" placeholder="60, 90, and 120 minute sessions" required />
            </label>
            <label>
              Primary CTA label
              <input dir="auto" maxLength={80} name="primaryCtaLabel" placeholder="Book Now" />
            </label>
            <label>
              CTA target
              <select name="ctaSurface" defaultValue="">
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
              <select name="launchState" defaultValue="open">
                <option value="open">Open for booking</option>
                <option value="coming_soon">Coming soon</option>
              </select>
              <span className={styles.fieldHelp}>Coming soon changes the default action away from booking.</span>
            </label>
            <label>
              Location or city
              <input dir="auto" maxLength={120} name="locationOrCity" placeholder="Philadelphia, Houston, Dallas" />
            </label>
            <label>
              Event type
              <input dir="auto" maxLength={120} name="eventType" placeholder="Birthday, corporate outing, school trip" />
            </label>
            <label>
              Offer type
              <input dir="auto" maxLength={120} name="offerType" placeholder="Spring break, grand opening, team building" />
            </label>
            <label>
              Group-size framing
              <input dir="auto" maxLength={120} name="groupSize" placeholder="Small crews, school groups, full-venue buyouts" />
            </label>
            <label className={styles.wide}>
              Hero / social image
              <input
                dir="ltr"
                maxLength={ASSET_PATH_MAX_LENGTH}
                name="ogImage"
                defaultValue={DEFAULT_HERO_IMAGE}
                pattern="/assets/.*"
                required
              />
            </label>
          </div>
        </section>

        <footer className={styles.footer}>
          <p>The wizard creates a draft, not a live page. Publish and deploy only after preview review.</p>
          <button type="submit">Create draft and preview</button>
        </footer>
      </form>
    </main>
  );
}
