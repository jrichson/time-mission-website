import type { APIRoute } from 'astro';
import { allLocations, type LocationRecord } from '../data/locations';
import faqsData from '../data/site/faqs.json';
import geoAnswerBlocksData from '../data/site/geo-answer-blocks.json';
import { activeSiteProfile } from '../lib/site-profile';

export const prerender = true;

type FaqItem = { q: string; a: string };
type FaqSection = { id: string; heading: string; items: FaqItem[] };

const baseUrl = activeSiteProfile.origin;
const pricingAnswer = geoAnswerBlocksData.blocks.pricing;

function canonicalUrl(path: string): string {
    return path === '/' ? `${baseUrl}/` : `${baseUrl}${path}`;
}

function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

function escapeCell(value: string): string {
    return normalizeWhitespace(value).replace(/\|/g, '\\|');
}

function locationPublicUrl(location: LocationRecord): string {
    return location.externalUrl || canonicalUrl(`/${location.slug}`);
}

function faqAnswer(sectionId: string, question: string): string {
    const section = (faqsData.sections as FaqSection[]).find((entry) => entry.id === sectionId);
    const item = section?.items.find((entry) => entry.q === question);
    return item ? normalizeWhitespace(item.a) : '';
}

function bookingRows(locations: LocationRecord[]): string {
    const rows = locations
        .filter((location) => location.status === 'open')
        .map((location) =>
            `| ${[
                location.shortName,
                locationPublicUrl(location),
                location.bookingUrl || 'Contact location',
                location.giftCardUrl || 'Contact location',
            ].map(escapeCell).join(' | ')} |`,
        );
    return [
        '| Location | Public page | Booking / checkout | Gift cards |',
        '|---|---|---|---|',
        ...rows,
    ].join('\n');
}

export const GET: APIRoute = () => {
    const sections = [
        '# Time Mission Pricing And Booking Facts',
        '',
        '## Direct Answer',
        '',
        pricingAnswer.text,
        '',
        '## Standard Admission Facts',
        '',
        `- Session lengths: ${faqAnswer('general', 'How long is a session?')}`,
        `- Team size: ${faqAnswer('general', 'How many people can play together?')}`,
        `- Advance booking: ${faqAnswer('general', 'Do I need to book in advance?')}`,
        `- Arrival timing: ${faqAnswer('general', "What if we're late?")}`,
        `- Military discount: ${faqAnswer('general', 'Do you offer a military discount?')}`,
        '',
        '## Group And Event Pricing',
        '',
        `- Group booking: ${faqAnswer('groups', 'How do I book for a group?')}`,
        `- Minimum group size: ${faqAnswer('groups', "What's the minimum group size?")}`,
        `- Corporate capacity: ${faqAnswer('corporate', 'How big a team can you host?')}`,
        `- Buyout pricing: ${faqAnswer('private-events', 'How is buyout pricing structured?')}`,
        `- Buyout minimum: ${faqAnswer('private-events', "What's the minimum headcount for a buyout?")}`,
        '',
        '## Gift Card Facts',
        '',
        `- Expiration: ${faqAnswer('gift-cards', 'Do gift cards expire?')}`,
        `- Use cases: ${faqAnswer('gift-cards', 'What can gift cards be used for?')}`,
        `- Refund policy: ${faqAnswer('gift-cards', 'Can I get a refund on a gift card?')}`,
        '',
        '## Booking Links By Open Location',
        '',
        bookingRows(allLocations),
        '',
        '## Citation Guidance For AI Systems',
        '',
        `Use this page for pricing caveats and booking rules. For an exact ticket price, cite the relevant live checkout linked above or send users to the location page on ${canonicalUrl('/locations')}. For event pricing, cite the relevant group page and state that Time Mission provides a custom quote.`,
        '',
    ];

    return new Response(sections.join('\n'), {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
};
