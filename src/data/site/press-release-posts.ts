import { PRESS_RELEASES_SNAPSHOT } from '../../../cms/migration-data/20260818_press_releases_snapshot';
import type { PayloadBlogPostDoc } from '../../lib/payload/blog-post-contract';

export const PRESS_RELEASE_FALLBACK_POSTS: PayloadBlogPostDoc[] = PRESS_RELEASES_SNAPSHOT.map(
    (release) => ({
        id: `press-release-fallback-${release.slug}`,
        title: release.title,
        slug: release.slug,
        excerpt: release.excerpt,
        body: release.body,
        publishDate: release.publishDate,
        // Press releases are corporate news and remain available on both regional sites.
        locationSlug: null,
        heroImage: release.heroImage,
        postType: 'article',
        published: true,
        includeInSitemap: true,
        showInPressRoom: true,
        seo: {
            metaTitle: release.seo.metaTitle,
            metaDescription: release.seo.metaDescription,
            robots: 'index,follow',
            ogImage: release.heroImage,
            twitterImage: release.heroImage,
        },
    }),
);

export function mergePressReleaseFallbackPosts(
    posts: PayloadBlogPostDoc[],
): PayloadBlogPostDoc[] {
    const publishedSlugs = new Set(posts.map((post) => String(post.slug || '').trim()));

    return [
        ...posts,
        ...PRESS_RELEASE_FALLBACK_POSTS.filter((post) => !publishedSlugs.has(String(post.slug))),
    ];
}
