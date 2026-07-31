import Link from 'next/link';

import { requireCmsUser } from '../../lib/cms-auth';
import styles from './blog.module.css';

export const dynamic = 'force-dynamic';

type BlogListDocument = {
  id: number | string;
  locationSlug?: string | null;
  postType?: string | null;
  publishDate?: string | null;
  published?: boolean | null;
  slug?: string | null;
  title?: string | null;
  updatedAt?: string | null;
};

function dateLabel(value: unknown): string {
  if (typeof value !== 'string') return 'Date needed';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
    : 'Date needed';
}

function locationLabel(value: unknown): string {
  if (typeof value !== 'string' || !value) return 'Location needed';
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export const metadata = {
  title: 'Blog workspace - Time Mission CMS',
};

export default async function BlogWorkspacePage() {
  const { payload, user } = await requireCmsUser('/blog');
  const result = await payload.find({
    collection: 'blog-posts' as never,
    depth: 0,
    limit: 250,
    overrideAccess: false,
    sort: '-publishDate',
    user,
  });
  const posts = result.docs as unknown as BlogListDocument[];

  return (
    <main className={styles.shell}>
      <nav className={styles.topbar} aria-label="CMS shortcuts">
        <Link className={styles.brand} href="/">
          <span>Time Mission</span>
          <strong>CMS</strong>
        </Link>
        <nav aria-label="Blog actions">
          <Link href="/deploy">Deploy</Link>
          <Link className={styles.primary} href="/blog/new">New post</Link>
        </nav>
      </nav>

      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Mission Control</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Blog</span>
      </nav>

      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Editorial workspace</p>
          <h1>Stories, not database records.</h1>
          <p>
            Write original articles with images, share external coverage, preview the public design,
            and approve posts for the next deploy.
          </p>
        </div>
        <div className={styles.headerFact}>
          <span>Saved posts</span>
          <strong>{posts.length}</strong>
        </div>
      </header>

      <section className={styles.workspace} aria-labelledby="saved-posts-title">
        <div className={styles.listHeader}>
          <div>
            <h2 id="saved-posts-title">Saved posts</h2>
            <p>Select a row to keep editing or previewing it.</p>
          </div>
        </div>

        {posts.length ? (
          <div className={styles.postList}>
            {posts.map((post) => (
              <Link className={styles.postRow} href={`/blog/${post.id}`} key={post.id}>
                <div className={styles.postTitle}>
                  <span>{post.postType === 'external' ? 'Shared link' : 'Original article'}</span>
                  <strong>{post.title || 'Untitled post'}</strong>
                  <p>/blog/{post.slug || 'url-needed'}</p>
                </div>
                <div className={styles.postMeta}>
                  <span>Location</span>
                  <strong>{locationLabel(post.locationSlug)}</strong>
                </div>
                <div className={styles.postMeta}>
                  <span>Publish date</span>
                  <strong>{dateLabel(post.publishDate)}</strong>
                </div>
                <span className={`${styles.status} ${post.published ? styles.published : ''}`}>
                  {post.published ? 'Published in CMS' : 'Draft'}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <div>
              <strong>No blog posts yet</strong>
              <p>Create the first article or shared press link.</p>
              <Link href="/blog/new">Create a post</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
