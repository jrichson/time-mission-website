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

type PageProps = {
  params: Promise<{ id: string }>;
};

function publicAssetURL(path: string | null | undefined): string {
  const fallback = '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg';
  const raw = path && path.startsWith('/assets/') ? path : fallback;
  const origin = process.env.PAYLOAD_PUBLIC_SITE_ORIGIN?.trim().replace(/\/+$/, '');
  return origin ? `${origin}${raw}` : raw;
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

  const primaryHref = doc.content?.ctaExternalUrl || '/missions';
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

  if (!doc.content?.subheadline) warnings.push('Add a subheadline so visitors understand the offer before they choose.');
  if (bullets < 3) warnings.push('Add at least three concrete proof points.');
  if (doc.content?.ctaSurface === 'external' && !doc.content.ctaExternalUrl) warnings.push('Add the external CTA URL before publishing.');
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
  const meta = templateMeta[template];
  const bullets = landingBullets(doc);
  const heroImage = publicAssetURL(doc.seo?.ogImage);
  const publicPath = landingCanonicalPath(doc.slug);
  const publicUrl = publicPathURL(publicPath);
  const ctaModel = landingCtaForDoc(doc);
  const warnings = landingReviewWarningsForDoc(doc);
  const cta = {
    href: publicPathURL(ctaModel.primaryHref),
    label: doc.content?.primaryCtaLabel || 'Book now',
  };
  const secondaryHref = publicPathURL(meta.secondaryHref);
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
          <strong>{landingTemplateLabel(template)}</strong>
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

      {warnings.length ? (
        <section className={styles.warningPanel} aria-labelledby="review-warnings-title">
          <span className={styles.previewEyebrow}>Review warnings</span>
          <h2 id="review-warnings-title">Tighten this before launch</h2>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.hero}>
        <div
          aria-hidden="true"
          className={styles.heroImage}
          style={{ backgroundImage: `url("${heroImage}")` }}
        />
        <div className={styles.heroContent}>
          <span className={styles.templateBadge}>{landingTemplateLabel(template)}</span>
          <h1>{doc.content?.headline || doc.title}</h1>
          {doc.content?.subheadline ? <p>{doc.content.subheadline}</p> : null}
          <div className={styles.actions}>
            <a className={styles.primaryAction} href={cta.href}>
              {cta.label}
            </a>
            <a className={styles.secondaryAction} href={secondaryHref}>
              {meta.secondaryLabel}
            </a>
          </div>
        </div>
      </section>

      <section className={styles.proofSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.templateBadge}>Preview checklist</span>
          <h2>{meta.headline}</h2>
          <p>{doc.seo?.metaDescription || 'Review the headline, call to action, and proof points before this page goes live.'}</p>
        </div>
        <div className={styles.proofGrid}>
          {bullets.slice(0, 3).map((bullet, index) => (
            <article className={styles.proofCard} key={`${bullet}-${index}`}>
              <span>Visitor reason {String(index + 1).padStart(2, '0')}</span>
              <h3>{bullet}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.splitSection}>
        <div
          aria-hidden="true"
          className={styles.splitImage}
          style={{ backgroundImage: `url("${heroImage}")` }}
        />
        <div className={styles.splitCopy}>
          <span className={styles.templateBadge}>Customer journey</span>
          <h2>{launchState === 'coming_soon' ? 'Give visitors a reason to come back' : meta.journeyHeading}</h2>
          <ul>
            {bullets.map((bullet, index) => (
              <li key={`${bullet}-detail-${index}`}>{bullet}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
