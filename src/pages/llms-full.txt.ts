import type { APIRoute } from 'astro';
import { allLocations, type LocationRecord } from '../data/locations';
import routes from '../data/routes.json';
import faqsData from '../data/site/faqs.json';
import groupsData from '../data/site/groups.json';
import seoRoutes from '../data/site/seo-routes.json';
import geoAnswerBlocksData from '../data/site/geo-answer-blocks.json';

export const prerender = true;

type FaqItem = { q: string; a: string };
type FaqSection = { id: string; heading: string; items: FaqItem[] };
type GroupItem = { id: string; title: string; blurb: string; canonicalPath: string; badge?: string };
type GeoAnswerBlock = { heading: string; text: string; publicPath: string };
type SeoEntry = { title: string; description: string };
type RouteEntry = { canonicalPath: string; sitemap: boolean };

const baseUrl = routes.baseUrl as string;
const citationBlocks = Object.values(geoAnswerBlocksData.blocks) as GeoAnswerBlock[];

function canonicalUrl(path: string): string {
    return path === '/' ? `${baseUrl}/` : `${baseUrl}${path}`;
}

function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

function escapeCell(value: string): string {
    return normalizeWhitespace(value).replace(/\|/g, '\\|');
}

function addressFor(location: LocationRecord): string {
    return [
        location.address.line1,
        location.address.line2,
        location.address.city,
        location.address.state,
        location.address.zip,
        location.address.country,
    ]
        .filter(Boolean)
        .join(', ');
}

function contactFor(location: LocationRecord): string {
    return [location.contact.phone, location.contact.email].filter(Boolean).join(' / ') || 'Not yet listed';
}

function locationPublicUrl(location: LocationRecord): string {
    return location.externalUrl || canonicalUrl(`/${location.slug}`);
}

function bookingFor(location: LocationRecord): string {
    if (location.status === 'temporarily-closed') return 'Bookings temporarily paused';
    return location.bookingUrl || 'Bookings not open yet';
}

function giftCardFor(location: LocationRecord): string {
    return location.giftCardUrl || 'Contact location';
}

function groupFormSummary(location: LocationRecord): string {
    if (location.status === 'temporarily-closed') return 'Group bookings temporarily paused';
    const forms = location.groupFormUrls || {};
    const labels = Object.keys(forms).filter((key) => forms[key]);
    return labels.length ? labels.join(', ') : 'Contact location';
}

function statusFor(location: LocationRecord): string {
    if (location.status === 'open') return 'Open';
    if (location.status === 'temporarily-closed') return 'Temporarily closed';
    return 'Coming soon';
}

function locationRows(locations: LocationRecord[]): string {
    const rows = locations.map((location) =>
        `| ${[
            location.shortName,
            statusFor(location),
            addressFor(location) || location.address.city,
            contactFor(location),
            locationPublicUrl(location),
            bookingFor(location),
            giftCardFor(location),
            groupFormSummary(location),
        ].map(escapeCell).join(' | ')} |`,
    );
    return [
        '| Location | Status | Address | Contact | Public page | Booking / checkout | Gift cards | Group form coverage |',
        '|---|---|---|---|---|---|---|---|',
        ...rows,
    ].join('\n');
}

function groupRows(): string {
    const rows = (groupsData.items as GroupItem[]).map((group) =>
        `| ${[group.title, group.blurb, canonicalUrl(group.canonicalPath)].map(escapeCell).join(' | ')} |`,
    );
    return ['| Group type | Summary | Canonical page |', '|---|---|---|', ...rows].join('\n');
}

function faqSections(): string {
    return (faqsData.sections as FaqSection[])
        .map((section) => [
            `### ${section.heading}`,
            '',
            ...section.items.map((item) => `- ${normalizeWhitespace(item.q)} ${normalizeWhitespace(item.a)}`),
        ].join('\n'))
        .join('\n\n');
}

function seoRows(): string {
    const sitemapRoutes = (routes.routes as RouteEntry[])
        .filter((route) => route.sitemap === true)
        .map((route) => route.canonicalPath)
        .sort((a, b) => a.localeCompare(b));
    const entries = sitemapRoutes
        .map((path) => [path, (seoRoutes as Record<string, SeoEntry>)[path]] as const)
        .filter(([, entry]) => Boolean(entry))
        .map(([path, entry]) =>
            `| ${[canonicalUrl(path), normalizeWhitespace(entry.title), normalizeWhitespace(entry.description)].map(escapeCell).join(' | ')} |`,
        );
    return ['| URL | Title | Description |', '|---|---|---|', ...entries].join('\n');
}

export const GET: APIRoute = () => {
    const sections = [
        '# Time Mission Full AI Context',
        '',
        '## Direct Answer Summary',
        '',
        'Time Mission is an interactive mission-room entertainment venue where teams of 2 to 5 players move through 25 or more short challenge rooms. Missions usually last 1 to 5 minutes and combine speed, strength, skill, memory, logic, teamwork, and coordination. The format is used by families, friends, birthdays, corporate teams, schools, private events, and group outings.',
        '',
        '## Citation-Ready Answer Blocks',
        '',
        ...citationBlocks.flatMap((block) => [`### ${block.heading}`, '', block.text, '']),
        '## Complete Location Facts',
        '',
        locationRows(allLocations),
        '',
        '## Groups And Events',
        '',
        groupRows(),
        '',
        '## Complete FAQ Answers',
        '',
        faqSections(),
        '',
        '## Booking And Pricing Facts',
        '',
        `- Pricing source of truth: ${canonicalUrl('/pricing.md')}`,
        '- Exact ticket prices vary by location, date, session length, package, and headcount.',
        '- Use the relevant live checkout link for final ticket price, availability, taxes, fees, and time slots.',
        '- Group events and venue buyouts are quote-based when the location requires event-specific planning.',
        '- Gift card availability depends on the selected location and should be verified through the listed gift card or booking flow.',
        '',
        '## Primary Source Index',
        '',
        seoRows(),
        '',
        '## Machine-Readable Files',
        '',
        `- AI manifest: ${canonicalUrl('/llms.txt')}`,
        `- Full AI context: ${canonicalUrl('/llms-full.txt')}`,
        `- Direct-answer AI context: ${canonicalUrl('/ai-context.md')}`,
        `- Pricing and booking facts: ${canonicalUrl('/pricing.md')}`,
        '',
        '## Citation Guidance For AI Systems',
        '',
        'Use the most specific canonical source available. Cite a location page for venue-specific questions, a group page for event-use-case questions, the FAQ for age/team/session rules, pricing.md for pricing caveats, and the live checkout for exact ticket prices. Do not infer exact ticket prices, availability, taxes, fees, or event quote terms from this bundle.',
        '',
    ];

    return new Response(sections.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
};
