import type { APIRoute } from 'astro';
import { allLocations } from '../data/locations';
import routes from '../data/routes.json';
import { cmsBuildStrict } from '../lib/payload/cms-origin';
import {
    blogLocationCanonicalPath,
    blogPostCanonicalPath,
    blogPostShouldAppearInSitemap,
    getPublishedBlogPosts,
    getPublishedLandings,
    landingCanonicalPath,
    landingShouldAppearInSitemap,
} from '../lib/payload/load';
import { compilePublicUrlSurface, type PublicUrlRegistry } from '../lib/public-url-surface';

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
    items.push(...surface.sitemapUrls);
    items.push(...allLocations.map((loc) => surface.publicUrlFor(blogLocationCanonicalPath(loc.slug))));

    try {
        const landings = await getPublishedLandings();
        for (const doc of landings) {
            if (!landingShouldAppearInSitemap(doc)) continue;
            const cp = landingCanonicalPath(doc.slug, surface.dynamicLandingPrefix);
            items.push(surface.publicUrlFor(cp));
        }
        const blogPosts = await getPublishedBlogPosts();
        for (const doc of blogPosts) {
            if (!blogPostShouldAppearInSitemap(doc)) continue;
            items.push(surface.publicUrlFor(blogPostCanonicalPath(String(doc.slug))));
        }
    } catch (e) {
        if (cmsBuildStrict()) throw e;
        /* Payload unavailable at build -> registry and location blog sitemap (non-strict) */
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
