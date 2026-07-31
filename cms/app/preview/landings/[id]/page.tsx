import { notFound } from 'next/navigation';
import Link from 'next/link';

import type { Landing } from '../../../../payload-types';
import {
  landingArchetypeForDoc,
  landingCtaForDoc,
  landingLaunchStateForDoc,
  landingReviewWarningsForDoc,
  landingShouldAppearInSitemap,
  landingTemplateLabel,
} from '../../../../lib/landing-contract.js';
import {
  publicAssetURL as mediaPublicAssetURL,
  publicAssetWasRepaired,
} from '../../../../lib/media-library.js';
import { requireCmsUser } from '../../../../lib/cms-auth';
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
  searchParams: Promise<{ status?: string }>;
};

function publicAssetURL(path: string | null | undefined): string {
  const origin = process.env.PAYLOAD_PUBLIC_SITE_ORIGIN?.trim().replace(/\/+$/, '');
  return mediaPublicAssetURL(path, origin);
}

function publicPathURL(path: string): string {
  const origin = process.env.PAYLOAD_PUBLIC_SITE_ORIGIN?.trim().replace(/\/+$/, '');
  if (!origin || !path.startsWith('/') || path.startsWith('/admin')) return path;
  return `${origin}${path}`;
}

function landingCanonicalPath(slug: string): string {
  return `/c/${slug}`;
}

function landingBullets(doc: Landing): string[] {
  const bullets = doc.content?.bullets
    ?.map((bullet) => String(bullet?.text || '').trim())
    .filter(Boolean);

  return bullets?.length
    ? bullets
    : ['25+ interactive mission rooms', 'Team-based scoring', 'Built for every age and group size'];
}

async function loadLanding(id: string): Promise<Landing> {
  const { payload, user } = await requireCmsUser(`/preview/landings/${id}`);

  const doc = (await payload.findByID({
    collection: 'landings',
    depth: 0,
    disableErrors: true,
    id,
    overrideAccess: false,
    user,
  })) as Landing | null;

  if (!doc) notFound();
  return doc;
}

export default async function LandingPreviewPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
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
  const reviewStatus = reviewWarnings.length ? 'Needs review' : 'Ready to publish';
  const saveMessage = query.status === 'draft-created'
    ? {
        body: reviewWarnings.length
          ? 'Your draft was saved. Review the warnings below before publishing it for the next site deploy.'
          : 'Your draft was saved. No blocking warnings were detected in the preview checks.',
        title: 'Draft saved',
      }
    : null;
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
          <Link className={styles.previewAdminLink} href="/">
            Back to Mission Control
          </Link>
          <a className={`${styles.previewAdminLink} ${styles.previewPublicLink}`} href={publicUrl}>
            Open public URL
          </a>
          <Link className={styles.previewAdminLink} href={`/landings/${doc.id}`}>
            Edit draft
          </Link>
        </div>
      </div>

      <nav className={styles.previewBreadcrumb} aria-label="Breadcrumb">
        <Link href="/">Mission Control</Link>
        <span aria-hidden="true">/</span>
        <Link href="/landings">Landing Pages</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Preview</span>
      </nav>

      {saveMessage ? (
        <section className={styles.savePanel} aria-live="polite" role="status">
          <div>
            <span className={styles.previewEyebrow}>Save status</span>
            <h2>{saveMessage.title}</h2>
          </div>
          <p>{saveMessage.body}</p>
        </section>
      ) : null}

      <section className={styles.statusPanel} aria-label="Landing review status">
        <div>
          <span>Review</span>
          <strong>{reviewStatus}</strong>
        </div>
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
