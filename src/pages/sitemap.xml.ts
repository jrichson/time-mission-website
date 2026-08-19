import type { APIRoute } from 'astro';
import { allLocations } from '../data/locations';
import routes from '../data/routes.json';
import { cmsBuildStrict } from '../lib/payload/cms-origin';
import {
    blogLocationCanonicalPath,
    blogPostCanonicalPath,
    blogPostLocationSlug,
    blogPostShouldHaveDetailPage,
    blogPostShouldAppearInSitemap,
    getPublishedBlogPosts,
    getPublishedLandings,
    landingCanonicalPath,
    landingShouldAppearInSitemap,
} from '../lib/payload/load';
import { compilePublicUrlSurface, type PublicUrlRegistry } from '../lib/public-url-surface';
import { activeSiteProfile, isInternalLocation, localizedPath } from '../lib/site-profile';

export const prerender = true;

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
    const surface = compilePublicUrlSurface(routes as PublicUrlRegistry);

    const items: string[] = [];
    const addLocalizedUrls = (canonicalPath: string) => {
        for (const locale of activeSiteProfile.locales) {
            items.push(
                `${activeSiteProfile.origin}${localizedPath(canonicalPath, locale, activeSiteProfile)}`,
            );
        }
    };
    for (const route of surface.routes) {
        const canonicalPath = route.canonicalPath;
        const location = allLocations.find(({ slug }) => (
            canonicalPath === `/${slug}` || canonicalPath.startsWith(`/${slug}/`)
        ));
        const shouldInclude = location
            ? isInternalLocation(location, activeSiteProfile)
            : route.sitemap === true;
        if (!shouldInclude) continue;

        addLocalizedUrls(canonicalPath);
    }

    try {
        const landings = await getPublishedLandings();
        for (const doc of landings) {
            if (!landingShouldAppearInSitemap(doc)) continue;
            const cp = landingCanonicalPath(doc.slug, surface.dynamicLandingPrefix);
            addLocalizedUrls(cp);
        }
        const blogPosts = await getPublishedBlogPosts();
        const renderableBlogPosts = blogPosts.filter(blogPostShouldHaveDetailPage);
        if (renderableBlogPosts.length > 0) {
            addLocalizedUrls('/blog');
        }
        const locationSlugsWithPosts = new Set(renderableBlogPosts.map(blogPostLocationSlug));
        for (const location of allLocations) {
            if (!locationSlugsWithPosts.has(location.slug)) continue;
            addLocalizedUrls(blogLocationCanonicalPath(location.slug));
        }
        for (const doc of blogPosts) {
            if (!blogPostShouldAppearInSitemap(doc)) continue;
            addLocalizedUrls(blogPostCanonicalPath(String(doc.slug)));
        }
    } catch (e) {
        if (cmsBuildStrict()) throw e;
        /* Payload unavailable at build -> code-owned registry sitemap only (non-strict) */
    }

    items.sort();

    // Build-time stamp serves as `<lastmod>` for every URL. Static-site snapshots
    // freshness at deploy time, so this is the truthful answer at sitemap-fetch
    // moment. Google deprecated `priority` (always 0.5 effectively) but uses
    // `lastmod` to schedule recrawls — emitting it is the only useful sitemap signal.
    const lastmod = new Date().toISOString().slice(0, 10);
    const body = [...new Set(items)]
        .map((loc) => `  <url><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod></url>`)
        .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
    return new Response(xml, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
};
