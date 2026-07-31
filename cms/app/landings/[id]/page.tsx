import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { Landing } from '../../../payload-types';
import { requireCmsUser } from '../../../lib/cms-auth';
import { saveLandingPage } from './actions';
import workspaceStyles from '../../blog/blog.module.css';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

const ctaOptions = [
  ['book_panel', 'Open ticket booking'],
  ['missions', 'View missions'],
  ['groups', 'View group events'],
  ['contact', 'Contact Time Mission'],
  ['gift_cards', 'Buy gift cards'],
  ['external', 'Open an external URL'],
] as const;

function message(status: string | undefined): string {
  const messages: Record<string, string> = {
    'external-url': 'Add a complete https:// URL for an external CTA.',
    'required-fields': 'Complete every required field and use an approved /assets/ image path.',
    'slug-exists': 'That public page URL is already in use.',
  };
  return status ? messages[status] || '' : '';
}

export const metadata = {
  title: 'Edit landing page - Time Mission CMS',
};

export default async function EditLandingPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { payload, user } = await requireCmsUser(`/landings/${id}`);
  const landing = await payload
    .findByID({
      collection: 'landings',
      depth: 0,
      id,
      overrideAccess: false,
      user,
    })
    .catch(() => null) as Landing | null;
  if (!landing) notFound();

  const bullets = landing.content?.bullets?.map((item) => item.text).filter(Boolean) || [];
  const error = message(query.status);

  return (
    <main className={workspaceStyles.shell}>
      <nav className={workspaceStyles.topbar} aria-label="CMS shortcuts">
        <Link className={workspaceStyles.brand} href="/">
          <span>Time Mission</span>
          <strong>CMS</strong>
        </Link>
        <nav aria-label="Landing actions">
          <Link href="/landings">All landing pages</Link>
          <Link href={`/preview/landings/${landing.id}`}>Preview</Link>
          <Link href="/deploy">Deploy</Link>
        </nav>
      </nav>

      <nav className={workspaceStyles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Mission Control</Link>
        <span aria-hidden="true">/</span>
        <Link href="/landings">Landing pages</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{landing.title}</span>
      </nav>

      <header className={workspaceStyles.header}>
        <div>
          <p className={workspaceStyles.kicker}>Edit campaign page</p>
          <h1>{landing.title}</h1>
          <p>Update the public copy and release controls, then preview the actual landing layout.</p>
        </div>
        <div className={workspaceStyles.headerFact}>
          <span>Current state</span>
          <strong>{landing.published ? 'Published in CMS' : 'Draft'}</strong>
        </div>
      </header>

      <section className={workspaceStyles.workspace}>
        <form action={saveLandingPage} className={styles.form}>
          <input name="id" type="hidden" value={String(landing.id)} />

          {query.status === 'saved' ? (
            <p className={styles.success} role="status">Landing page saved.</p>
          ) : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span>Public identity</span>
                <h2>Page and URL</h2>
              </div>
              <p>The URL stays under /c/. Changing it changes the public destination after deploy.</p>
            </div>
            <div className={styles.fields}>
              <label>
                <span>Internal page title</span>
                <input defaultValue={landing.title} maxLength={120} name="title" required />
              </label>
              <label>
                <span>Public page URL</span>
                <div className={styles.slug}>
                  <small>/c/</small>
                  <input
                    defaultValue={landing.slug}
                    maxLength={120}
                    name="slug"
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    required
                  />
                </div>
              </label>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span>Public copy</span>
                <h2>Headline and proof</h2>
              </div>
              <p>These fields are shown directly in the landing page design.</p>
            </div>
            <div className={styles.fields}>
              <label className={styles.full}>
                <span>Headline</span>
                <textarea defaultValue={landing.content.headline} maxLength={180} name="headline" required rows={2} />
              </label>
              <label className={styles.full}>
                <span>Subheadline</span>
                <textarea
                  defaultValue={landing.content.subheadline || ''}
                  maxLength={360}
                  name="subheadline"
                  rows={3}
                />
              </label>
              {[0, 1, 2].map((index) => (
                <label key={index}>
                  <span>Proof point {index + 1}</span>
                  <input defaultValue={bullets[index] || ''} maxLength={180} name={`bullet${index + 1}`} />
                </label>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span>Primary action</span>
                <h2>What visitors should do</h2>
              </div>
              <p>Choose the existing website action or a deliberate external destination.</p>
            </div>
            <div className={styles.fields}>
              <label>
                <span>Button label</span>
                <input
                  defaultValue={landing.content.primaryCtaLabel}
                  maxLength={80}
                  name="primaryCtaLabel"
                  required
                />
              </label>
              <label>
                <span>Button destination</span>
                <select defaultValue={landing.content.ctaSurface} name="ctaSurface">
                  {ctaOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className={styles.full}>
                <span>External CTA URL <small>Only used when external is selected</small></span>
                <input
                  defaultValue={landing.content.ctaExternalUrl || ''}
                  maxLength={2048}
                  name="ctaExternalUrl"
                  placeholder="https://"
                  type="url"
                />
              </label>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span>Search and release</span>
                <h2>Approval controls</h2>
              </div>
              <p>Published in CMS approves the page for the next deliberate website deploy.</p>
            </div>
            <div className={styles.checks}>
              <label>
                <input defaultChecked={landing.published === true} name="published" type="checkbox" />
                <span><strong>Published in CMS</strong><small>Build this page on the next deploy.</small></span>
              </label>
              <label>
                <input
                  defaultChecked={landing.includeInSitemap !== false}
                  name="includeInSitemap"
                  type="checkbox"
                />
                <span><strong>Include in sitemap</strong><small>Allow search engines to discover it.</small></span>
              </label>
            </div>
            <div className={styles.fields}>
              <label>
                <span>Search title</span>
                <input defaultValue={landing.seo.metaTitle} maxLength={90} name="metaTitle" required />
              </label>
              <label>
                <span>Search visibility</span>
                <select defaultValue={landing.seo.robots || 'index,follow'} name="robots">
                  <option value="index,follow">Show in search results</option>
                  <option value="noindex,follow">Hide from search results</option>
                </select>
              </label>
              <label className={styles.full}>
                <span>Search description</span>
                <textarea
                  defaultValue={landing.seo.metaDescription}
                  maxLength={220}
                  name="metaDescription"
                  required
                  rows={3}
                />
              </label>
              <label className={styles.full}>
                <span>Social image path</span>
                <input defaultValue={landing.seo.ogImage} maxLength={512} name="ogImage" required />
              </label>
            </div>
          </section>

          <footer className={styles.actions}>
            <div>
              <strong>Save before leaving</strong>
              <span>Preview opens only after saved data is available.</span>
            </div>
            <div>
              <button name="intent" type="submit" value="save">Save changes</button>
              <button className={styles.primary} name="intent" type="submit" value="preview">
                Save and preview
              </button>
            </div>
          </footer>
        </form>
      </section>
    </main>
  );
}
