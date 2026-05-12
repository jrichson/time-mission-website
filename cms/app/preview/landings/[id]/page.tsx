import config from '@payload-config';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getPayload } from 'payload';

import type { Landing } from '../../../../payload-types';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Landing preview - Time Mission CMS',
  robots: {
    index: false,
    follow: false,
  },
};

type PayloadLandingArchetype = 'paid_social_campaign' | 'local_venue_city' | 'group_event';
type PayloadLandingSurface = 'book_panel' | 'missions' | 'groups' | 'contact' | 'gift_cards' | 'external';
type PayloadLandingLaunchState = 'open' | 'coming_soon';
type PayloadLandingSourceChannel = 'paid_ad' | 'organic_social' | 'email' | 'local_search' | 'partner' | 'internal' | 'other';

const templateMeta: Record<PayloadLandingArchetype, { headline: string; journeyHeading: string; secondaryHref: string; secondaryLabel: string; }> = {
  paid_social_campaign: {
    headline: 'Check the source promise',
    journeyHeading: 'Focused, fast, and easy to act on',
    secondaryHref: '/missions',
    secondaryLabel: 'View missions',
  },
  group_event: {
    headline: 'Confirm the planner promise',
    journeyHeading: 'A session built for your crew',
    secondaryHref: '/groups',
    secondaryLabel: 'View group events',
  },
  local_venue_city: {
    headline: 'Confirm the venue story',
    journeyHeading: 'A place-specific reason to book',
    secondaryHref: '/locations',
    secondaryLabel: 'View locations',
  },
};

const templateClasses: Record<PayloadLandingArchetype, string> = {
  paid_social_campaign: styles.campaignTemplate,
  group_event: styles.groupEventTemplate,
  local_venue_city: styles.locationPromoTemplate,
};

const DEFAULT_HERO_IMAGE = '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg';
const ASSET_PATH_MAX_LENGTH = 512;
const EXTERNAL_URL_MAX_LENGTH = 2048;

const sourceChannelLabels: Record<PayloadLandingSourceChannel, string> = {
  email: 'Email',
  internal: 'Internal campaign',
  local_search: 'Local search / SEO',
  organic_social: 'Organic social',
  other: 'Other',
  paid_ad: 'Paid ad',
  partner: 'Partner / referral',
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function safePublicAssetPath(path: string | null | undefined): string {
  const raw = typeof path === 'string' ? path.trim() : '';
  if (
    !raw ||
    raw.length > ASSET_PATH_MAX_LENGTH ||
    !raw.startsWith('/assets/') ||
    raw.includes('://') ||
    raw.includes('..') ||
    /[<>"'\\\s]/.test(raw)
  ) {
    return DEFAULT_HERO_IMAGE;
  }
  return raw;
}

function publicAssetURL(path: string | null | undefined): string {
  const raw = safePublicAssetPath(path);
  const origin = process.env.PAYLOAD_PUBLIC_SITE_ORIGIN?.trim().replace(/\/+$/, '');
  return origin ? `${origin}${raw}` : raw;
}

function publicAssetWasRepaired(path: string | null | undefined): boolean {
  const raw = typeof path === 'string' ? path.trim() : '';
  return Boolean(raw && safePublicAssetPath(raw) !== raw);
}

function safeExternalLandingHref(value: string | null | undefined): string | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw.length > EXTERNAL_URL_MAX_LENGTH || /[<>"'\\\s]/.test(raw)) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function publicPathURL(path: string): string {
  const origin = process.env.PAYLOAD_PUBLIC_SITE_ORIGIN?.trim().replace(/\/+$/, '');
  if (!origin || !path.startsWith('/') || path.startsWith('/admin')) return path;
  return `${origin}${path}`;
}

function landingCanonicalPath(slug: string): string {
  return `/c/${slug}`;
}

function landingArchetypeForDoc(doc: Landing): PayloadLandingArchetype {
  if (doc.template === 'group_event') return 'group_event';
  if (doc.template === 'local_venue_city' || doc.template === 'location_promo' || doc.template === 'coming_soon') {
    return 'local_venue_city';
  }
  return 'paid_social_campaign';
}

function landingTemplateLabel(template: PayloadLandingArchetype): string {
  if (template === 'group_event') return 'Group Event';
  if (template === 'local_venue_city') return 'Local Venue/City';
  return 'Paid/Social Campaign';
}

function landingLaunchStateForDoc(doc: Landing): PayloadLandingLaunchState {
  if (doc.template === 'coming_soon') return 'coming_soon';
  return doc.strategy?.launchState === 'coming_soon' ? 'coming_soon' : 'open';
}

function defaultCtaSurfaceForDoc(doc: Landing): PayloadLandingSurface {
  if (landingArchetypeForDoc(doc) === 'group_event') return 'contact';
  if (landingLaunchStateForDoc(doc) === 'coming_soon') return 'contact';
  return 'book_panel';
}

function landingCtaForDoc(doc: Landing): { surface: PayloadLandingSurface; primaryHref: string; bookTrigger: boolean; linkPath: string } {
  const surface = (doc.content?.ctaSurface || defaultCtaSurfaceForDoc(doc)) as PayloadLandingSurface;
  if (surface === 'book_panel') {
    return { surface, primaryHref: '#tickets', bookTrigger: true, linkPath: '/tickets' };
  }

  const internalHrefs: Record<Exclude<PayloadLandingSurface, 'book_panel' | 'external'>, string> = {
    contact: '/contact',
    gift_cards: '/gift-cards',
    groups: '/groups',
    missions: '/missions',
  };

  if (surface !== 'external') {
    const href = internalHrefs[surface] || '/missions';
    return { surface, primaryHref: href, bookTrigger: false, linkPath: href };
  }

  const primaryHref = safeExternalLandingHref(doc.content?.ctaExternalUrl);
  if (!primaryHref) {
    return { surface: 'missions', primaryHref: '/missions', bookTrigger: false, linkPath: '/missions' };
  }

  let linkPath = '/';
  try {
    linkPath = new URL(primaryHref).pathname || '/';
  } catch {
    linkPath = '/';
  }
  return { surface, primaryHref, bookTrigger: false, linkPath };
}

function landingShouldAppearInSitemap(doc: Landing): boolean {
  if (doc.includeInSitemap === false) return false;
  if (doc.seo?.robots === 'noindex,follow') return false;
  return Boolean(doc.slug && doc.seo?.metaTitle && doc.seo?.metaDescription && doc.seo?.ogImage && doc.content?.headline && doc.content?.primaryCtaLabel);
}

function landingBullets(doc: Landing): string[] {
  const bullets = doc.content?.bullets
    ?.map((bullet) => String(bullet?.text || '').trim())
    .filter(Boolean);

  return bullets?.length
    ? bullets
    : ['25+ interactive mission rooms', 'Team-based scoring', 'Built for every age and group size'];
}

function landingReviewWarningsForDoc(doc: Landing): string[] {
  const warnings: string[] = [];
  const bullets = doc.content?.bullets?.filter((bullet) => String(bullet?.text || '').trim()).length ?? 0;
  const sourcePromise = String(doc.brief?.sourcePromise || '').trim();
  const visitorIntent = String(doc.brief?.visitorIntent || '').trim();

  if (!sourcePromise) warnings.push('Add the source promise from the ad, post, email, search query, or campaign request.');
  if (!visitorIntent) warnings.push('Add the visitor intent so the page copy is tied to a real decision path.');
  if (!doc.content?.subheadline) warnings.push('Add a subheadline so visitors understand the offer before they choose.');
  if (bullets < 3) warnings.push('Add at least three concrete proof points.');
  if (doc.content?.ctaSurface === 'external' && !safeExternalLandingHref(doc.content.ctaExternalUrl)) {
    warnings.push('Add a credential-free https external CTA URL before publishing.');
  }
  if (landingLaunchStateForDoc(doc) === 'coming_soon' && doc.content?.ctaSurface === 'book_panel') {
    warnings.push('Coming-soon pages should use contact or updates language instead of immediate booking.');
  }

  return warnings;
}

async function loadLanding(id: string): Promise<Landing> {
  const payload = await getPayload({ config });
  const auth = await payload.auth({ headers: await headers() });

  if (!auth.user) {
    redirect(`/admin/login?redirect=${encodeURIComponent(`/preview/landings/${id}`)}`);
  }

  const doc = (await payload.findByID({
    collection: 'landings',
    depth: 0,
    disableErrors: true,
    id,
    overrideAccess: false,
    user: auth.user,
  })) as Landing | null;

  if (!doc) notFound();
  return doc;
}

export default async function LandingPreviewPage({ params }: PageProps) {
  const { id } = await params;
  const doc = await loadLanding(id);
  const template = landingArchetypeForDoc(doc);
  const launchState = landingLaunchStateForDoc(doc);
  const brief = doc.brief || {};
  const strategy = doc.strategy || {};
  const paidSocial = doc.paidSocial || {};
  const localVenue = doc.localVenue || {};
  const groupEvent = doc.groupEvent || {};
  const meta = templateMeta[template];
  const bullets = landingBullets(doc);
  const proofItems = bullets.slice(0, 3);
  const heroImage = publicAssetURL(doc.seo?.ogImage);
  const publicPath = doc.slug ? landingCanonicalPath(doc.slug) : '/c/missing-page-url';
  const publicUrl = publicPathURL(publicPath);
  const ctaModel = landingCtaForDoc(doc);
  const reviewWarnings = landingReviewWarningsForDoc(doc);
  if (!doc.slug) reviewWarnings.unshift('Add a page URL before publishing.');
  if (publicAssetWasRepaired(doc.seo?.ogImage)) {
    reviewWarnings.push('Use a root-relative /assets/... hero image path.');
  }
  const sourceChannel = (brief.sourceChannel || 'paid_ad') as PayloadLandingSourceChannel;
  const sourceLabel = sourceChannelLabels[sourceChannel] || 'Campaign source';
  const cta = {
    href: publicPathURL(ctaModel.primaryHref),
    label: doc.content?.primaryCtaLabel || 'Book now',
  };
  const secondaryHref = publicPathURL(meta.secondaryHref);
  const templateLabel = landingTemplateLabel(template);
  const headline = doc.content?.headline || doc.title;
  const subheadline = doc.content?.subheadline || doc.seo?.metaDescription;
  const sourcePromise = brief.sourcePromise || paidSocial.sourcePromise || subheadline;
  const paidFriction = paidSocial.frictionReducer || brief.visitorIntent || 'Check that the first click has a clear next step.';
  const locationName = strategy.locationOrCity || brief.sourceName || doc.title;
  const cityProof = localVenue.cityProof || strategy.proofAngle || proofItems[0] || 'Add city-specific proof before launch.';
  const venueConfidence = localVenue.venueConfidence || proofItems[1] || 'Add a concrete venue-confidence point.';
  const openingNote = localVenue.openingNote || 'Use updates/contact language until booking is available.';
  const eventType = strategy.eventType || strategy.offerType || 'Group event';
  const groupSize = groupEvent.groupSize || strategy.audience || 'Add group-size framing.';
  const plannerReassurance = groupEvent.plannerReassurance || brief.visitorIntent || 'Add the planner reassurance.';
  const logisticsNote = groupEvent.logisticsNote || 'Add logistics details the planner should trust.';
  const showGroupBookingSecondary = template === 'group_event' && !ctaModel.bookTrigger && launchState !== 'coming_soon';
  const statusCopy = doc.published
    ? 'Published in the CMS. It appears publicly after the next approved site deploy.'
    : 'Draft in the CMS. Publish it when the page is ready for the next site deploy.';

  return (
    <main className={`${styles.previewPage} ${templateClasses[template]}`}>
      <div className={styles.previewBar}>
        <div>
          <span className={styles.previewEyebrow}>Landing preview</span>
          <p>{statusCopy}</p>
        </div>
        <div className={styles.previewActions}>
          <a className={styles.previewAdminLink} href={publicUrl}>
            Public path
          </a>
          <a className={styles.previewAdminLink} href={`/admin/collections/landings/${doc.id}`}>
            Edit landing page
          </a>
        </div>
      </div>

      <section className={styles.statusPanel} aria-label="Landing review status">
        <div>
          <span>Archetype</span>
          <strong>{templateLabel}</strong>
        </div>
        <div>
          <span>Public path</span>
          <strong>{publicPath}</strong>
        </div>
        <div>
          <span>Sitemap</span>
          <strong>{landingShouldAppearInSitemap(doc) ? 'Eligible' : 'Excluded'}</strong>
        </div>
        <div>
          <span>Launch state</span>
          <strong>{launchState === 'coming_soon' ? 'Coming soon' : 'Open for booking'}</strong>
        </div>
      </section>

      <section className={styles.briefPanel} aria-labelledby="campaign-brief-title">
        <div>
          <span className={styles.previewEyebrow}>Campaign brief</span>
          <h2 id="campaign-brief-title">{brief.sourceName || sourceLabel}</h2>
          <p>
            {brief.sourcePromise ||
              'Add the real ad, post, email, search query, or campaign request that sent this visitor here.'}
          </p>
        </div>
        <dl>
          <div>
            <dt>Source</dt>
            <dd>{sourceLabel}</dd>
          </div>
          <div>
            <dt>Visitor intent</dt>
            <dd>{brief.visitorIntent || 'Not defined yet'}</dd>
          </div>
          <div>
            <dt>Success metric</dt>
            <dd>{brief.successMetric || 'Not defined yet'}</dd>
          </div>
        </dl>
      </section>

      {reviewWarnings.length ? (
        <section className={styles.warningPanel} aria-labelledby="review-warnings-title">
          <span className={styles.previewEyebrow}>Review warnings</span>
          <h2 id="review-warnings-title">Tighten this before launch</h2>
          <ul>
            {reviewWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.hero} data-preview-section={`${template}-hero`}>
        <div aria-hidden="true" className={styles.heroImage} style={{ backgroundImage: `url("${heroImage}")` }} />
        <div className={styles.heroContent}>
          <span className={styles.templateBadge}>{template === 'local_venue_city' ? locationName : templateLabel}</span>
          <h1>{headline}</h1>
          {subheadline ? <p>{subheadline}</p> : null}
          <div className={styles.actions}>
            <a className={styles.primaryAction} href={cta.href} data-preview-cta-surface={ctaModel.surface}>
              {cta.label}
            </a>
            {showGroupBookingSecondary ? (
              <a className={styles.secondaryAction} href="#tickets">
                Book tickets instead
              </a>
            ) : (
              <a className={styles.secondaryAction} href={secondaryHref}>
                {meta.secondaryLabel}
              </a>
            )}
          </div>
        </div>
      </section>

      {template === 'paid_social_campaign' ? (
        <section className={styles.previewTemplateBlock} data-preview-section="paid-social-proof">
          <div className={styles.sectionHeader}>
            <span className={styles.templateBadge}>Campaign match</span>
            <h2>{meta.headline}</h2>
            <p>{sourcePromise || 'Add the source promise so the preview can verify message match.'}</p>
          </div>
          <div className={styles.proofGrid}>
            {proofItems.map((bullet, index) => (
              <article className={styles.proofCard} key={`${bullet}-${index}`}>
                <span>Proof {String(index + 1).padStart(2, '0')}</span>
                <h3>{bullet}</h3>
              </article>
            ))}
          </div>
          <div className={styles.previewSplit}>
            <div className={styles.previewCopyPanel}>
              <span className={styles.templateBadge}>Friction reducer</span>
              <h2>{meta.journeyHeading}</h2>
              <p>{paidFriction}</p>
            </div>
            <div aria-hidden="true" className={styles.splitImage} style={{ backgroundImage: `url("${heroImage}")` }} />
          </div>
        </section>
      ) : template === 'local_venue_city' ? (
        <section className={styles.previewTemplateBlock} data-preview-section="local-venue-signal">
          <div className={styles.locationGrid}>
            <article className={`${styles.proofCard} ${styles.leadCard}`}>
              <span>Local signal</span>
              <h2>{locationName}</h2>
              <p>{cityProof}</p>
            </article>
            <article className={styles.proofCard}>
              <span>Venue confidence</span>
              <h3>Feels real before booking</h3>
              <p>{venueConfidence}</p>
            </article>
            <article className={styles.proofCard}>
              <span>{launchState === 'coming_soon' ? 'Opening state' : 'Next step'}</span>
              <h3>{launchState === 'coming_soon' ? 'Get updates first' : 'Book this location'}</h3>
              <p>{launchState === 'coming_soon' ? openingNote : sourcePromise}</p>
            </article>
          </div>
          <div className={styles.previewSplit}>
            <div aria-hidden="true" className={styles.splitImage} style={{ backgroundImage: `url("${heroImage}")` }} />
            <div className={styles.previewCopyPanel}>
              <span className={styles.templateBadge}>Customer journey</span>
              <h2>{launchState === 'coming_soon' ? 'Give visitors a reason to come back' : meta.journeyHeading}</h2>
              <ul>
                {bullets.map((bullet, index) => (
                  <li key={`${bullet}-detail-${index}`}>{bullet}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : (
        <section className={styles.previewTemplateBlock} data-preview-section="group-planner-reassurance">
          <div className={styles.locationGrid}>
            <article className={`${styles.proofCard} ${styles.leadCard}`}>
              <span>Planner promise</span>
              <h2>{eventType}</h2>
              <p>{plannerReassurance}</p>
            </article>
            <article className={styles.proofCard}>
              <span>Group size</span>
              <h3>Built for the crew</h3>
              <p>{groupSize}</p>
            </article>
            <article className={styles.proofCard}>
              <span>Logistics</span>
              <h3>Make planning feel handled</h3>
              <p>{logisticsNote}</p>
            </article>
          </div>
          <div className={styles.sectionHeader}>
            <span className={styles.templateBadge}>Group confidence</span>
            <h2>{meta.headline}</h2>
            <p>{strategy.proofAngle || plannerReassurance}</p>
          </div>
          <div className={styles.proofGrid}>
            {proofItems.map((bullet, index) => (
              <article className={styles.proofCard} key={`${bullet}-${index}`}>
                <span>Reason {String(index + 1).padStart(2, '0')}</span>
                <h3>{bullet}</h3>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
