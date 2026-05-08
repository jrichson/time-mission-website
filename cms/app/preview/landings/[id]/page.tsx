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

type LandingTemplate = 'campaign' | 'group_event' | 'location_promo' | 'coming_soon';

const DEFAULT_TEMPLATE: LandingTemplate = 'campaign';

const templateMeta: Record<LandingTemplate, { label: string; headline: string; secondaryHref: string; secondaryLabel: string }> = {
  campaign: {
    label: 'Simple Campaign',
    headline: 'Make the first click count',
    secondaryHref: '/admin/collections/landings',
    secondaryLabel: 'Back to landings',
  },
  group_event: {
    label: 'Group Event',
    headline: 'Built for groups that want more than a reservation',
    secondaryHref: '/groups',
    secondaryLabel: 'Explore events',
  },
  location_promo: {
    label: 'Location Promo',
    headline: 'A venue-first way to sell the mission',
    secondaryHref: '/locations',
    secondaryLabel: 'View locations',
  },
  coming_soon: {
    label: 'Coming Soon',
    headline: 'Get ready before the doors open',
    secondaryHref: '/locations',
    secondaryLabel: 'View locations',
  },
};

const templateClasses: Record<LandingTemplate, string> = {
  campaign: styles.campaignTemplate,
  group_event: styles.groupEventTemplate,
  location_promo: styles.locationPromoTemplate,
  coming_soon: styles.comingSoonTemplate,
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function normalizeTemplate(value: unknown): LandingTemplate {
  if (value === 'group_event' || value === 'location_promo' || value === 'coming_soon') return value;
  return DEFAULT_TEMPLATE;
}

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

function landingBullets(doc: Landing): string[] {
  const bullets = doc.content?.bullets
    ?.map((bullet) => String(bullet?.text || '').trim())
    .filter(Boolean);

  return bullets?.length
    ? bullets
    : ['25+ interactive mission rooms', 'Team-based scoring', 'Built for every age and group size'];
}

function ctaHref(doc: Landing): string {
  const surface = doc.content?.ctaSurface || 'book_panel';
  if (surface === 'book_panel') return '#tickets';
  if (surface === 'missions') return '/missions';
  if (surface === 'groups') return '/groups';
  if (surface === 'contact') return '/contact';
  if (surface === 'gift_cards') return '/gift-cards';
  return doc.content?.ctaExternalUrl || '/missions';
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
  const template = normalizeTemplate(doc.template);
  const meta = templateMeta[template];
  const bullets = landingBullets(doc);
  const heroImage = publicAssetURL(doc.seo?.ogImage);
  const cta = {
    href: publicPathURL(ctaHref(doc)),
    label: doc.content?.primaryCtaLabel || 'Book now',
  };
  const secondaryHref = publicPathURL(meta.secondaryHref);

  return (
    <main className={`${styles.previewPage} ${templateClasses[template]}`}>
      <div className={styles.previewBar}>
        <div>
          <span className={styles.previewEyebrow}>CMS preview</span>
          <p>{doc.published ? 'Published landing page' : 'Unpublished landing page'}</p>
        </div>
        <a className={styles.previewAdminLink} href={`/admin/collections/landings/${doc.id}`}>
          Edit page
        </a>
      </div>

      <section className={styles.hero}>
        <div
          aria-hidden="true"
          className={styles.heroImage}
          style={{ backgroundImage: `url("${heroImage}")` }}
        />
        <div className={styles.heroContent}>
          <span className={styles.templateBadge}>{meta.label}</span>
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
          <span className={styles.templateBadge}>Template guide</span>
          <h2>{meta.headline}</h2>
          <p>{doc.seo?.metaDescription}</p>
        </div>
        <div className={styles.proofGrid}>
          {bullets.slice(0, 3).map((bullet, index) => (
            <article className={styles.proofCard} key={`${bullet}-${index}`}>
              <span>Proof {String(index + 1).padStart(2, '0')}</span>
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
          <span className={styles.templateBadge}>Page structure</span>
          <h2>{template === 'coming_soon' ? 'Opening momentum, captured early' : 'A landing page with the site rhythm baked in'}</h2>
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
