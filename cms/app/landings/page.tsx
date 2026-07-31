import Link from 'next/link';

import type { Landing } from '../../payload-types';
import { requireCmsUser } from '../../lib/cms-auth';
import styles from '../blog/blog.module.css';

export const dynamic = 'force-dynamic';

function templateLabel(value: Landing['template']): string {
  const labels: Record<string, string> = {
    campaign: 'Campaign',
    coming_soon: 'Coming soon',
    general: 'General',
    group_event: 'Group event',
    location_promo: 'Location promotion',
    local_venue_city: 'Local venue',
    paid_social_campaign: 'Paid / social',
  };
  return labels[value] || value.replaceAll('_', ' ');
}

export const metadata = {
  title: 'Landing pages - Time Mission CMS',
};

export default async function LandingWorkspacePage() {
  const { payload, user } = await requireCmsUser('/landings');
  const result = await payload.find({
    collection: 'landings',
    depth: 0,
    limit: 250,
    overrideAccess: false,
    sort: '-updatedAt',
    user,
  });
  const landings = result.docs as Landing[];

  return (
    <main className={styles.shell}>
      <nav className={styles.topbar} aria-label="CMS shortcuts">
        <Link className={styles.brand} href="/">
          <span>Time Mission</span>
          <strong>CMS</strong>
        </Link>
        <nav aria-label="Landing actions">
          <Link href="/deploy">Deploy</Link>
          <Link className={styles.primary} href="/landings/new">New landing page</Link>
        </nav>
      </nav>

      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Mission Control</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Landing pages</span>
      </nav>

      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Campaign workspace</p>
          <h1>Every campaign page, in one place.</h1>
          <p>
            Review saved landing drafts, edit the public copy, open the site-design preview, and
            approve only the pages ready for the next deploy.
          </p>
        </div>
        <div className={styles.headerFact}>
          <span>Saved pages</span>
          <strong>{landings.length}</strong>
        </div>
      </header>

      <section className={styles.workspace} aria-labelledby="saved-landings-title">
        <div className={styles.listHeader}>
          <div>
            <h2 id="saved-landings-title">Saved landing pages</h2>
            <p>Select a page to edit its public copy and release settings.</p>
          </div>
        </div>

        {landings.length ? (
          <div className={styles.postList}>
            {landings.map((landing) => (
              <Link className={styles.postRow} href={`/landings/${landing.id}`} key={landing.id}>
                <div className={styles.postTitle}>
                  <span>{templateLabel(landing.template)}</span>
                  <strong>{landing.title}</strong>
                  <p>/c/{landing.slug}</p>
                </div>
                <div className={styles.postMeta}>
                  <span>CTA</span>
                  <strong>{landing.content?.primaryCtaLabel || 'CTA needed'}</strong>
                </div>
                <div className={styles.postMeta}>
                  <span>Last edited</span>
                  <strong>
                    {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(
                      new Date(landing.updatedAt),
                    )}
                  </strong>
                </div>
                <span className={`${styles.status} ${landing.published ? styles.published : ''}`}>
                  {landing.published ? 'Published in CMS' : 'Draft'}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <div>
              <strong>No landing drafts yet</strong>
              <p>Start with the guided campaign-page wizard.</p>
              <Link href="/landings/new">Create a landing page</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
