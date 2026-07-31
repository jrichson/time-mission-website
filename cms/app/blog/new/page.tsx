import Link from 'next/link';

import BlogAuthoringForm from '../../../components/BlogAuthoringForm';
import type { BlogMediaOption } from '../../../components/BlogHeroPicker';
import { requireCmsUser } from '../../../lib/cms-auth';
import { LOCATION_DETAIL_OPTIONS } from '../../../lib/location-details-options.js';
import styles from '../blog.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export const metadata = {
  title: 'New blog post - Time Mission CMS',
};

export default async function NewBlogPostPage({ searchParams }: PageProps) {
  const { payload, user } = await requireCmsUser('/blog/new');
  const [params, mediaResult] = await Promise.all([
    searchParams,
    payload.find({
      collection: 'media' as never,
      depth: 0,
      limit: 30,
      overrideAccess: false,
      sort: '-createdAt',
      user,
    }),
  ]);

  return (
    <main className={styles.shell}>
      <nav className={styles.topbar} aria-label="CMS shortcuts">
        <Link className={styles.brand} href="/">
          <span>Time Mission</span>
          <strong>CMS</strong>
        </Link>
        <nav aria-label="Blog actions">
          <Link href="/blog">All posts</Link>
          <Link href="/deploy">Deploy</Link>
        </nav>
      </nav>

      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Mission Control</Link>
        <span aria-hidden="true">/</span>
        <Link href="/blog">Blog</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">New post</span>
      </nav>

      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>New story</p>
          <h1>Make it worth the click.</h1>
          <p>
            The editor below supports rich text and inline images. Save and preview to see the
            exact public blog design before approving the post.
          </p>
        </div>
        <div className={styles.headerFact}>
          <span>Release state</span>
          <strong>Draft first</strong>
        </div>
      </header>

      <section className={styles.workspace}>
        <BlogAuthoringForm
          error={params.error}
          locations={LOCATION_DETAIL_OPTIONS}
          media={mediaResult.docs as unknown as BlogMediaOption[]}
        />
      </section>
    </main>
  );
}
