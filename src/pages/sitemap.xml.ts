import type { APIRoute } from 'astro';
import routes from '../data/routes.json';

export const prerender = true;

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export const GET: APIRoute = () => {
    const baseUrl = routes.baseUrl as string;
    const items = (routes.routes as Array<{ canonicalPath: string; sitemap: boolean }>)
        .filter((r) => r.sitemap === true)
        .map((r) => {
            const path = r.canonicalPath === '/' ? '/' : r.canonicalPath;
            const loc = path === '/' ? `${baseUrl}/` : `${baseUrl}${path}`;
            return `  <url><loc>${escapeXml(loc)}</loc></url>`;
        })
        .join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
    return new Response(xml, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
};
