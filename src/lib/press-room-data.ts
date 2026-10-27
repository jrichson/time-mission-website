// Press room landing page data: the same sources the Releases and In the News pages use
// (CMS posts first, JSON fallbacks for anything the CMS doesn't have).
import pressReleaseFallbacks from '../data/site/press-releases.json';
import pressCoverage from '../data/site/press-coverage.json';
import { cmsBuildStrict } from './payload/cms-origin';
import {
    blogPostCanonicalPath,
    blogPostDateLabel,
    blogPostExcerptForDoc,
    blogPostExternalPublisher,
    blogPostExternalUrl,
    blogPostHeroImage,
    blogPostIsExternal,
    blogPostIsPressCoverage,
    blogPostPublishDate,
    blogPostShowsInPressRoom,
    getPublishedBlogPosts,
    sortBlogPosts,
} from './payload/load';

function coverageDateLabel(publishDateIso: string): string {
    return new Date(`${publishDateIso}T00:00:00.000Z`).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
        year: 'numeric',
    });
}

export async function loadPressReleases() {
    const fallbackById = new Map(pressReleaseFallbacks.items.map((release) => [release.id, release]));
    const cms = sortBlogPosts(
        (await getPublishedBlogPosts()).filter((post) => blogPostShowsInPressRoom(post) && !blogPostIsExternal(post)),
    ).map((post) => {
        const id = String(post.slug);
        const fallback = fallbackById.get(id);
        return {
            ctaLabel: fallback?.ctaLabel || 'Read Press Release',
            href: blogPostCanonicalPath(id),
            id,
            image: fallback?.image || blogPostHeroImage(post),
            imageHeight: fallback?.imageHeight || 1067,
            imageWidth: fallback?.imageWidth || 1600,
            kicker: fallback?.kicker || blogPostDateLabel(post) || blogPostExternalPublisher(post) || 'Press Release',
            summary: fallback?.summary || blogPostExcerptForDoc(post),
            title: fallback?.title || String(post.title || ''),
        };
    });
    const cmsIds = new Set(cms.map((release) => release.id));
    return [...cms, ...pressReleaseFallbacks.items.filter((release) => !cmsIds.has(release.id))];
}

export async function loadPressCoverage() {
    const fallbackById = new Map(pressCoverage.items.map((article) => [article.id, article]));
    const cms = sortBlogPosts((await getPublishedBlogPosts()).filter(blogPostIsPressCoverage)).map((post) => {
        const id = String(post.slug);
        const fallback = fallbackById.get(id);
        const publisher = blogPostExternalPublisher(post);
        return {
            ctaLabel: fallback?.ctaLabel || (publisher ? `Read on ${publisher}` : 'Read Original Story'),
            href: blogPostExternalUrl(post),
            id,
            image: fallback?.image || blogPostHeroImage(post),
            imageAlt: fallback?.imageAlt || '',
            imageHeight: fallback?.imageHeight || 1067,
            imageWidth: fallback?.imageWidth || 1600,
            publishDate: coverageDateLabel(blogPostPublishDate(post)),
            publishDateIso: blogPostPublishDate(post),
            publisher,
            summary: blogPostExcerptForDoc(post),
            title: String(post.title || ''),
        };
    });
    const cmsIds = new Set(cms.map((article) => article.id));
    const fallback = cmsBuildStrict() ? [] : pressCoverage.items.filter((article) => !cmsIds.has(article.id));
    return [...cms, ...fallback.map((article) => ({ ...article, publishDate: coverageDateLabel(article.publishDateIso) }))];
}
