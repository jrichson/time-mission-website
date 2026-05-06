import type { APIRoute } from 'astro';
import routes from '../data/routes.json';
import { cmsBuildStrict } from '../lib/payload/cms-origin';
import { getPublishedLandings, landingCanonicalPath } from '../lib/payload/load';

export const prerender = true;

type RoutesFile = typeof routes;

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
    const baseUrl = (routes as RoutesFile).baseUrl as string;
    const meta = (routes as RoutesFile & { _meta?: { dynamicLandingPrefix?: string } })._meta;
    const landingPrefix = meta?.dynamicLandingPrefix || '/c';

    const items: string[] = [];

    const registryUrls = (
        (routes as RoutesFile).routes as Array<{ canonicalPath: string; sitemap: boolean }>
    )
        .filter((r) => r.sitemap === true)
        .map((r) => {
            const path = r.canonicalPath === '/' ? '/' : r.canonicalPath;
            return path === '/' ? `${baseUrl}/` : `${baseUrl}${path}`;
        });
    items.push(...registryUrls);

    try {
        const landings = await getPublishedLandings();
        const prefix = landingPrefix.startsWith('/') ? landingPrefix : `/${landingPrefix}`;
        for (const doc of landings) {
            if (!doc.slug) continue;
            if (doc.includeInSitemap === false) continue;
            const seo = doc.seo;
            if (!seo?.metaTitle) continue;
            if (seo.robots === 'noindex,follow') continue;
            const cp = landingCanonicalPath(doc.slug, prefix);
            const loc = `${baseUrl}${cp}`;
            items.push(loc);
        }
    } catch (e) {
        if (cmsBuildStrict()) throw e;
        /* Payload unavailable at build → registry-only sitemap (non-strict) */
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
