import type { APIRoute } from 'astro';
import routes from '../data/routes.json';
import seoRoutes from '../data/site/seo-routes.json';

export const prerender = true;

const HOME_BLURB =
    'Time Mission is interactive mission-room entertainment for teams of 2 to 5 — 25+ themed missions across multiple US and EU venues.';

interface RouteEntry {
    canonicalPath: string;
    sitemap: boolean;
}

type SeoEntry = { title: string; description: string };

function decodeBasicEntities(s: string): string {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function abs(baseUrl: string, canonicalPath: string): string {
    return canonicalPath === '/' ? `${baseUrl}/` : `${baseUrl}${canonicalPath}`;
}

function describe(canonicalPath: string): { title: string; description: string } | null {
    const entry = (seoRoutes as Record<string, SeoEntry>)[canonicalPath];
    if (!entry) return null;
    return {
        title: decodeBasicEntities(entry.title),
        description: decodeBasicEntities(entry.description),
    };
}

const SITEMAP_ELIGIBLE = new Set(
    (routes.routes as RouteEntry[]).filter((r) => r.sitemap === true).map((r) => r.canonicalPath),
);

const CORE = ['/', '/missions', '/locations', '/faq', '/about', '/contact', '/groups', '/gift-cards'];
const LOCATIONS_US = [
    '/mount-prospect',
    '/orland-park',
    '/west-nyack',
    '/philadelphia',
    '/lincoln',
    '/dallas',
    '/houston',
    '/manassas',
];
const LOCATIONS_EU = ['/antwerp', '/brussels'];
const GROUP_PAGES = [
    '/groups/birthdays',
    '/groups/corporate',
    '/groups/private-events',
    '/groups/field-trips',
    '/groups/holidays',
    '/groups/bachelor-ette',
];

function bullet(baseUrl: string, canonicalPath: string): string | null {
    if (!SITEMAP_ELIGIBLE.has(canonicalPath)) return null;
    const meta = describe(canonicalPath);
    if (!meta) return null;
    return `- [${meta.title}](${abs(baseUrl, canonicalPath)}): ${meta.description}`;
}

function section(baseUrl: string, heading: string, paths: string[]): string {
    const lines = paths.map((p) => bullet(baseUrl, p)).filter((x): x is string => Boolean(x));
    if (lines.length === 0) return '';
    return `## ${heading}\n${lines.join('\n')}\n`;
}

export const GET: APIRoute = () => {
    const baseUrl = routes.baseUrl as string;
    const out: string[] = [];
    out.push('# Time Mission', '', `> ${HOME_BLURB}`, '');
    out.push(section(baseUrl, 'Core Pages', CORE));
    out.push(section(baseUrl, 'Locations', [...LOCATIONS_US, ...LOCATIONS_EU]));
    out.push(section(baseUrl, 'Group & Event Pages', GROUP_PAGES));
    return new Response(out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
};
