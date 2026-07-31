import Link from 'next/link';
import { notFound } from 'next/navigation';

import BlogAuthoringForm, {
  type BlogEditorDocument,
} from '../../../components/BlogAuthoringForm';
import type { BlogMediaOption } from '../../../components/BlogHeroPicker';
import { lexicalPlainText } from '../../../lib/blog-authoring';
import { requireCmsUser } from '../../../lib/cms-auth';
import { LOCATION_DETAIL_OPTIONS } from '../../../lib/location-details-options.js';
import styles from '../blog.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    status?: string;
  }>;
};

type StoredBlogDocument = BlogEditorDocument & {
  excerpt?: unknown;
};

export const metadata = {
  title: 'Edit blog post - Time Mission CMS',
};

export default async function EditBlogPostPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { payload, user } = await requireCmsUser(`/blog/${id}`);
  const [post, mediaResult] = await Promise.all([
    payload
      .findByID({
        collection: 'blog-posts' as never,
        depth: 1,
        id,
        overrideAccess: false,
        user,
      })
      .catch(() => null),
    payload.find({
      collection: 'media' as never,
      depth: 0,
      limit: 30,
      overrideAccess: false,
      sort: '-createdAt',
      user,
    }),
  ]);

  if (!post) notFound();
  const stored = post as unknown as StoredBlogDocument;
  const document: BlogEditorDocument = {
    ...stored,
    excerptText: lexicalPlainText(stored.excerpt),
  };

  return (
    <main className={styles.shell}>
      <nav className={styles.topbar} aria-label="CMS shortcuts">
        <Link className={styles.brand} href="/">
          <span>Time Mission</span>
          <strong>CMS</strong>
        </Link>
        <nav aria-label="Blog actions">
          <Link href="/blog">All posts</Link>
          <Link href={`/preview/blog/${id}`}>Preview</Link>
          <Link href="/deploy">Deploy</Link>
        </nav>
      </nav>

      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Mission Control</Link>
        <span aria-hidden="true">/</span>
        <Link href="/blog">Blog</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{document.title || 'Untitled post'}</span>
      </nav>

      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Edit story</p>
          <h1>{document.title || 'Untitled post'}</h1>
          <p>
            Save and preview after major edits. Published in CMS means approved for the next
            deliberate website deploy.
          </p>
        </div>
        <div className={styles.headerFact}>
          <span>Current state</span>
          <strong>{document.published ? 'Published in CMS' : 'Draft'}</strong>
        </div>
      </header>

      <section className={styles.workspace}>
        <BlogAuthoringForm
          document={document}
          error={query.error}
          locations={LOCATION_DETAIL_OPTIONS}
          media={mediaResult.docs as unknown as BlogMediaOption[]}
          status={query.status}
        />
      </section>
    </main>
  );
}
