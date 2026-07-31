import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { SitePage } from '../../payload-types';
import { requireCmsUser } from '../../lib/cms-auth';
import { publicAssetPathIsValid } from '../../lib/media-library.js';
import workspaceStyles from '../blog/blog.module.css';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    count?: string;
    status?: string;
  }>;
};

function key(id: number | string, field: string): string {
  return `page:${id}:${field}`;
}

function text(formData: FormData, id: number | string, field: string, maxLength: number): string {
  const value = formData.get(key(id, field));
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

async function saveSearchPreviews(formData: FormData) {
  'use server';

  const { payload, user } = await requireCmsUser('/search');
  const ids = formData.getAll('sitePageId').map(String).filter(Boolean);

  for (const id of ids) {
    const title = text(formData, id, 'metaTitle', 90);
    const description = text(formData, id, 'metaDescription', 220);
    const ogImage = text(formData, id, 'ogImage', 512);
    const twitterImage = text(formData, id, 'twitterImage', 512);
    if (
      !title ||
      !description ||
      !publicAssetPathIsValid(ogImage) ||
      (twitterImage && !publicAssetPathIsValid(twitterImage))
    ) {
      redirect('/search?status=invalid-fields');
    }

    const existing = await payload.findByID({
      collection: 'site-pages',
      depth: 0,
      id,
      overrideAccess: false,
      user,
    }) as SitePage;
    await payload.update({
      collection: 'site-pages',
      data: {
        published: formData.has(key(id, 'published')),
        seo: {
          ...existing.seo,
          metaDescription: description,
          metaTitle: title,
          ogImage,
          ...(user.role === 'admin'
            ? {
                robots: text(formData, id, 'robots', 30) === 'noindex,follow'
                  ? 'noindex,follow'
                  : 'index,follow',
              }
            : {}),
          twitterImage,
        },
      },
      id,
      overrideAccess: false,
      user,
    });
  }

  redirect(`/search?status=saved&count=${ids.length}`);
}

export const metadata = {
  title: 'Search and sharing - Time Mission CMS',
};

export default async function SearchPreviewsPage({ searchParams }: PageProps) {
  const [{ payload, user }, query] = await Promise.all([
    requireCmsUser('/search'),
    searchParams,
  ]);
  const result = await payload.find({
    collection: 'site-pages',
    depth: 0,
    limit: 500,
    overrideAccess: false,
    sort: 'path',
    user,
  });
  const pages = result.docs as SitePage[];

  return (
    <main className={workspaceStyles.shell}>
      <nav className={workspaceStyles.topbar} aria-label="CMS shortcuts">
        <Link className={workspaceStyles.brand} href="/">
          <span>Time Mission</span>
          <strong>CMS</strong>
        </Link>
        <nav aria-label="Search preview actions">
          <Link href="/deploy">Deploy</Link>
        </nav>
      </nav>

      <nav className={workspaceStyles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Mission Control</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Search and sharing</span>
      </nav>

      <header className={workspaceStyles.header}>
        <div>
          <p className={workspaceStyles.kicker}>Search and social previews</p>
          <h1>Edit page previews in bulk.</h1>
          <p>
            These fields change browser tabs, search results, and social cards. They do not change
            the page’s visible body copy or layout.
          </p>
        </div>
        <div className={workspaceStyles.headerFact}>
          <span>Code-owned pages</span>
          <strong>{pages.length}</strong>
        </div>
      </header>

      <section className={workspaceStyles.workspace}>
        {query.status === 'saved' ? (
          <p className={styles.success} role="status">{query.count || pages.length} page previews saved.</p>
        ) : null}
        {query.status === 'invalid-fields' ? (
          <p className={styles.error} role="alert">
            Every page needs a search title, description, and approved /assets/ social image path.
          </p>
        ) : null}

        <form action={saveSearchPreviews} className={styles.form}>
          <div className={styles.pageList}>
            {pages.map((page) => (
              <section className={styles.row} key={page.id}>
                <input name="sitePageId" type="hidden" value={String(page.id)} />
                <div className={styles.identity}>
                  <div>
                    <span>{page.path}</span>
                    <strong>{page.title}</strong>
                  </div>
                  <label className={styles.publish}>
                    <input
                      defaultChecked={page.published !== false}
                      name={key(page.id, 'published')}
                      type="checkbox"
                    />
                    <span>Published in CMS</span>
                  </label>
                </div>
                <div className={styles.fields}>
                  <label>
                    <span>Search title</span>
                    <input
                      defaultValue={page.seo.metaTitle}
                      maxLength={90}
                      name={key(page.id, 'metaTitle')}
                      required
                    />
                  </label>
                  <label className={styles.description}>
                    <span>Search description</span>
                    <textarea
                      defaultValue={page.seo.metaDescription}
                      maxLength={220}
                      name={key(page.id, 'metaDescription')}
                      required
                      rows={2}
                    />
                  </label>
                  <label>
                    <span>Social image path</span>
                    <input
                      defaultValue={page.seo.ogImage}
                      maxLength={512}
                      name={key(page.id, 'ogImage')}
                      required
                    />
                  </label>
                  <label>
                    <span>X / Twitter image <small>Optional</small></span>
                    <input
                      defaultValue={page.seo.twitterImage || ''}
                      maxLength={512}
                      name={key(page.id, 'twitterImage')}
                    />
                  </label>
                  {user.role === 'admin' ? (
                    <label>
                      <span>Search visibility</span>
                      <select defaultValue={page.seo.robots || 'index,follow'} name={key(page.id, 'robots')}>
                        <option value="index,follow">Show in search results</option>
                        <option value="noindex,follow">Hide from search results</option>
                      </select>
                    </label>
                  ) : null}
                </div>
              </section>
            ))}
          </div>

          <footer className={styles.actions}>
            <div>
              <strong>Save the full review set</strong>
              <span>Changes become public only after the next deploy.</span>
            </div>
            <button type="submit">Save search previews</button>
          </footer>
        </form>
      </section>
    </main>
  );
}
