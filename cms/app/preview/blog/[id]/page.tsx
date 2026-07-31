import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  previewBlogPostBodyHtml,
  previewBlogPostDateLabel,
  previewBlogPostExcerptHtml,
  previewBlogPostExternalPublisher,
  previewBlogPostExternalUrl,
  previewBlogPostHeroImage,
  type PreviewBlogPostDoc,
} from '../../../../lib/blog-preview-contract';
import { requireCmsUser } from '../../../../lib/cms-auth';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function absoluteAssetUrl(value: string, publicOrigin: string): string {
  return value.startsWith('/') ? `${publicOrigin}${value}` : value;
}

export const metadata = {
  title: 'Blog preview - Time Mission CMS',
  robots: {
    follow: false,
    index: false,
  },
};

export default async function BlogPreviewPage({ params }: PageProps) {
  const { id } = await params;
  const { payload, user } = await requireCmsUser(`/preview/blog/${id}`);
  const post = await payload
    .findByID({
      collection: 'blog-posts' as never,
      depth: 1,
      id,
      overrideAccess: false,
      user,
    })
    .catch(() => null) as unknown as PreviewBlogPostDoc | null;

  if (!post) notFound();

  const publicOrigin =
    process.env.PAYLOAD_PUBLIC_SITE_ORIGIN?.trim().replace(/\/+$/, '') || 'https://www.timemission.com';
  const heroImage = absoluteAssetUrl(previewBlogPostHeroImage(post), publicOrigin);
  const externalUrl = previewBlogPostExternalUrl(post);
  const externalPublisher = previewBlogPostExternalPublisher(post);

  return (
    <main className={styles.previewShell}>
      <link href={`${publicOrigin}/css/variables.css`} rel="stylesheet" />
      <link href={`${publicOrigin}/css/base.css`} rel="stylesheet" />
      <link href={`${publicOrigin}/css/page-blog.css?v=2`} rel="stylesheet" />

      <nav className={styles.previewBar} aria-label="Preview controls">
        <div>
          <span>Saved CMS preview</span>
          <strong>{post.published ? 'Published in CMS' : 'Draft'}</strong>
        </div>
        <p>This uses the public blog layout. Save the post again to refresh this preview.</p>
        <div className={styles.previewActions}>
          <Link href={`/blog/${post.id}`}>Edit post</Link>
          <Link href="/deploy">Make changes live</Link>
        </div>
      </nav>

      <div className="tm-blog-page">
        <article className="tm-blog-article">
          <header className="tm-blog-article-hero">
            <picture className="tm-blog-article-media">
              <img
                alt=""
                decoding="async"
                fetchPriority="high"
                height="1067"
                loading="eager"
                src={heroImage}
                width="1600"
              />
            </picture>
            <div className="tm-blog-shell tm-blog-article-copy">
              <span className="tm-blog-back">Blog preview</span>
              <p className="tm-blog-kicker">{previewBlogPostDateLabel(post) || 'Publish date needed'}</p>
              <h1>{post.title || 'Untitled post'}</h1>
              <div
                className="tm-blog-article-excerpt"
                dangerouslySetInnerHTML={{ __html: previewBlogPostExcerptHtml(post) }}
              />
            </div>
          </header>

          {externalUrl ? (
            <div className="tm-blog-shell tm-blog-body">
              <aside className="tm-blog-source-card">
                <p className="tm-blog-kicker">Shared from the source</p>
                <h2>{externalPublisher || 'External coverage'}</h2>
                <p>This story is hosted by the original publisher. Open it there to read the complete article.</p>
                <a href={externalUrl} rel="noopener noreferrer" target="_blank">
                  Read the original story
                </a>
              </aside>
            </div>
          ) : (
            <div
              className="tm-blog-shell tm-blog-body"
              dangerouslySetInnerHTML={{ __html: previewBlogPostBodyHtml(post) }}
            />
          )}
        </article>
      </div>
    </main>
  );
}
