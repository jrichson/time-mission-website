import type { APIRoute } from 'astro';
import routes from '../data/routes.json';
import seoRoutes from '../data/site/seo-routes.json';
import geoAnswerBlocksData from '../data/site/geo-answer-blocks.json';

export const prerender = true;

const HOME_BLURB =
    'Time Mission is interactive mission-room entertainment for teams of 2 to 5 — 25+ themed missions across multiple US and EU venues.';

interface RouteEntry {
    canonicalPath: string;
    sitemap: boolean;
}

interface MachineReadableRouteEntry extends RouteEntry {
    id: string;
}

type SeoEntry = { title: string; description: string };
type GeoAnswerBlock = { heading: string; text: string; publicPath: string };
type LinkEntry = string | { canonicalPath: string; href: string };

const citationBlocks = Object.values(geoAnswerBlocksData.blocks) as GeoAnswerBlock[];

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
    '/nashville',
    '/houston',
    '/manassas',
];
const LOCATIONS_EU: LinkEntry[] = [
    { canonicalPath: '/antwerp', href: 'https://timemission.eu/antwerp' },
    { canonicalPath: '/brussels', href: 'https://timemission.eu/brussels' },
];
const GROUP_PAGES = [
    '/groups/birthdays',
    '/groups/corporate',
    '/groups/private-events',
    '/groups/field-trips',
    '/groups/holidays',
    '/groups/bachelor-ette',
];
const MACHINE_READABLE_COPY: Record<string, { label: string; description: string }> = {
    '/llms-full.txt': {
        label: 'Full AI context bundle',
        description: 'Comprehensive machine-readable bundle with citation blocks, locations, FAQ facts, pricing caveats, and source links.',
    },
    '/ai-context.md': {
        label: 'AI context',
        description: 'Direct-answer markdown summary of Time Mission facts, locations, booking caveats, and citation guidance.',
    },
    '/pricing.md': {
        label: 'Pricing facts',
        description: 'Machine-readable pricing, booking, gift card, group quote, and live-checkout guidance.',
    },
};

function bullet(baseUrl: string, entry: LinkEntry): string | null {
    const canonicalPath = typeof entry === 'string' ? entry : entry.canonicalPath;
    if (!SITEMAP_ELIGIBLE.has(canonicalPath)) return null;
    const meta = describe(canonicalPath);
    if (!meta) return null;
    const href = typeof entry === 'string' ? abs(baseUrl, canonicalPath) : entry.href;
    return `- [${meta.title}](${href}): ${meta.description}`;
}

function section(baseUrl: string, heading: string, paths: LinkEntry[]): string {
    const lines = paths.map((p) => bullet(baseUrl, p)).filter((x): x is string => Boolean(x));
    if (lines.length === 0) return '';
    return `## ${heading}\n${lines.join('\n')}\n`;
}

function machineReadableSection(baseUrl: string): string {
    const registryRoutes = ((routes as typeof routes & { machineReadableRoutes?: MachineReadableRouteEntry[] })
        .machineReadableRoutes || [])
        .filter((r) => r.canonicalPath !== '/llms.txt');
    const lines = registryRoutes.map((route) => {
        const copy = MACHINE_READABLE_COPY[route.canonicalPath];
        if (!copy) return null;
        return `- [${copy.label}](${abs(baseUrl, route.canonicalPath)}): ${copy.description}`;
    }).filter((line): line is string => Boolean(line));
    if (lines.length === 0) return '';
    return `## Machine-Readable Context\n${lines.join('\n')}\n`;
}

function citationReadySection(): string {
    const lines = citationBlocks.flatMap((block) => [`### ${block.heading}`, block.text, '']);
    return `## Citation-Ready Answer Blocks\n${lines.join('\n')}`;
}

export const GET: APIRoute = () => {
    const baseUrl = routes.baseUrl as string;
    const out: string[] = [];
    out.push('# Time Mission', '', `> ${HOME_BLURB}`, '');
    out.push(
        '## Direct Answer Summary',
        'Time Mission is an active entertainment venue where teams of 2 to 5 players complete 25+ short mission rooms in 60, 90, or 120 minute sessions. It is used for families, friends, birthdays, corporate team building, field trips, private events, and group outings.',
        '',
    );
    out.push(citationReadySection());
    out.push(
        '## Key Facts',
        '- Teams: 2 to 5 players per team; larger groups split into multiple teams.',
        '- Ages: 6+; kids 6–13 need an adult in the group, and ages 14+ can play on their own.',
        '- Missions: individual challenge rooms, typically 1–5 minutes each, played in any order.',
        '- Session lengths: 60, 90, or 120 minutes; most groups complete 15–20 missions in 90 minutes.',
        '- Booking: advance online booking is recommended; walk-ins depend on availability.',
        '- Pricing: final prices vary by location, date, session length, package, and headcount; use the location checkout for exact prices.',
        '',
    );
    out.push(machineReadableSection(baseUrl));
    out.push(section(baseUrl, 'Core Pages', CORE));
    out.push(section(baseUrl, 'Locations', [...LOCATIONS_US, ...LOCATIONS_EU]));
    out.push(section(baseUrl, 'Group & Event Pages', GROUP_PAGES));
    return new Response(out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
};
