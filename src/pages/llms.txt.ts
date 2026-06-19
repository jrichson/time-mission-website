import type { APIRoute } from 'astro';
import routes from '../data/routes.json';

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

function abs(baseUrl: string, canonicalPath: string): string {
    return canonicalPath === '/' ? `${baseUrl}/` : `${baseUrl}${canonicalPath}`;
}

const MACHINE_READABLE_COPY: Record<string, { label: string; description: string }> = {
    '/llms-full.txt': {
        label: 'Full AI context bundle',
        description: 'Complete location facts, FAQ answers, source index, and citation guidance.',
    },
    '/ai-context.md': {
        label: 'Citation-ready AI context',
        description: 'Direct-answer passages for AI citations and summaries.',
    },
    '/pricing.md': {
        label: 'Pricing facts',
        description: 'Machine-readable pricing, booking, gift-card, and group-quote guidance.',
    },
};

const PRIMARY_PAGES = [
    ['Home', '/', 'Overview of the Time Mission experience.'],
    ['Locations', '/locations', 'Current venues, coming-soon markets, directions, and booking paths.'],
    ['FAQ', '/faq', 'Age, team size, session length, booking, and visit questions.'],
    ['Groups', '/groups', 'Birthdays, corporate events, field trips, private events, holidays, and bach parties.'],
] as const;

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
    const baseUrl = routes.baseUrl as string;
    const lines = [
        `- [Citation-ready AI context](${abs(baseUrl, '/ai-context.md')}): Short answer blocks for what Time Mission is, how mission rooms work, locations, visiting, pricing, and groups.`,
        `- [Full AI context bundle](${abs(baseUrl, '/llms-full.txt')}): Complete facts for location-specific and FAQ-specific answers.`,
    ];
    return `## Citation-Ready Answer Blocks\n${lines.join('\n')}`;
}

function primaryPagesSection(baseUrl: string): string {
    const lines = PRIMARY_PAGES.map(([label, path, description]) => `- [${label}](${abs(baseUrl, path)}): ${description}`);
    return `## Primary Pages\n${lines.join('\n')}\n`;
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
    out.push(citationReadySection(), '');
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
    out.push(
        '## Public GET Endpoints',
        `- GET [llms.txt](${abs(baseUrl, '/llms.txt')}): Compact AI navigation index.`,
        `- GET [llms-full.txt](${abs(baseUrl, '/llms-full.txt')}): Full machine-readable context.`,
        `- GET [ai-context.md](${abs(baseUrl, '/ai-context.md')}): Citation-ready answer blocks.`,
        `- GET [pricing.md](${abs(baseUrl, '/pricing.md')}): Pricing and booking facts.`,
        '- No authenticated public API is advertised for agent actions; booking uses the selected location checkout.',
        '',
    );
    out.push(primaryPagesSection(baseUrl));
    return new Response(out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
};
