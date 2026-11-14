/**
 * Venue-specific group pages (/<venue>/groups and /<venue>/groups/<type>) and the
 * "Visiting <venue>" facts block.
 *
 * A venue gets real, self-canonical local pages only when it has both a localFacts record
 * in data/locations.json and copy in src/data/site/local-group-pages.json. Every other venue
 * keeps the build-time copy of the national group page, whose canonical is the national page.
 * Local pages reuse the national page body and add the venue's own answer, facts, hours,
 * contact details and questions, so they are not a city-name swap of the national page.
 */
import { allLocations, type LocationRecord } from '../data/locations';
import localGroupPages from '../data/site/local-group-pages.json';
import routes from '../data/routes.json';
import { locationAddressLines, locationHoursRows, locationPhoneHref } from './location-view';

export const LOCAL_GROUP_TYPES = [
    'birthdays',
    'corporate',
    'holidays',
    'field-trips',
    'private-events',
    'bachelor-ette',
] as const;
export type LocalGroupType = (typeof LOCAL_GROUP_TYPES)[number];

interface LocalFaq {
    q: string;
    a: string;
}

interface LocalPageCopy {
    serviceName: string;
    breadcrumb: string;
    answerTitle: string;
    answer: string;
    faqs: LocalFaq[];
}

interface LocalHubCopy extends LocalPageCopy {
    moreTitle: string;
    more: Array<{ id: string; title: string; text: string; linkLabel: string; type?: LocalGroupType; href?: string }>;
}

interface LocalVenueCopy {
    badge: string;
    heroVenueLine: string;
    sharedFaqs: Record<string, string>;
    hub: LocalHubCopy;
    types: Record<LocalGroupType, LocalPageCopy>;
}

const venueCopy = localGroupPages as unknown as Record<string, LocalVenueCopy | string>;
const registeredPaths = new Set(
    (routes as { routes: Array<{ canonicalPath: string }> }).routes.map((route) => route.canonicalPath),
);

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function locationBySlug(slug: string): LocationRecord {
    const location = allLocations.find((entry) => entry.slug === slug);
    if (!location) throw new Error(`${slug} missing from src/data/locations`);
    return location;
}

function copyFor(slug: string): LocalVenueCopy {
    const copy = venueCopy[slug];
    if (!copy || typeof copy === 'string') throw new Error(`No local group page copy for ${slug}`);
    return copy;
}

/** True when this venue has a registered local page for the group type (or the hub when type is omitted). */
export function hasLocalGroupPage(slug: string, type?: string): boolean {
    return registeredPaths.has(localGroupPath(slug, type));
}

export function localGroupPath(slug: string, type?: string): string {
    return type ? `/${slug}/groups/${type}` : `/${slug}/groups`;
}

function fillTokens(text: string, location: LocationRecord, copy: LocalVenueCopy): string {
    return text
        .replace(/\{(\w+)\}/g, (match, key: string) => {
            if (key === 'phone') return location.contact.phone;
            return copy.sharedFaqs[key] ?? match;
        });
}

/** The venue's facts, hours and contact details, as one self-contained block. */
export function localFactsHtml(location: LocationRecord, headingLevel: 2 | 3 = 2): string {
    const facts = location.localFacts;
    if (!facts) return '';
    const h = `h${headingLevel}`;
    const phoneHref = locationPhoneHref(location);
    const hours = locationHoursRows(location);
    const items = facts.items
        .map((item) => `
                <div class="local-facts-item">
                    <dt>${escapeHtml(item.label)}</dt>
                    <dd>${escapeHtml(item.text)}</dd>
                </div>`)
        .join('');
    const hoursRows = hours
        .map((row) => `
                    <li><span class="local-hours-day">${escapeHtml(row.day)}</span> <span class="local-hours-time">${escapeHtml(row.label)}</span></li>`)
        .join('');
    return `
    <section class="local-venue" id="visiting" aria-labelledby="local-venue-title-${escapeHtml(location.slug)}">
        <div class="local-venue-inner">
            <div class="section-badge">${escapeHtml(facts.area)}</div>
            <${h} class="local-venue-title" id="local-venue-title-${escapeHtml(location.slug)}">Visiting ${escapeHtml(location.name)}</${h}>
            <p class="local-venue-summary">${escapeHtml(facts.summary)}</p>
${facts.rating ? `            <p class="local-venue-rating">${escapeHtml(facts.rating)}</p>\n` : ''}            <dl class="local-facts">${items}
            </dl>
            <div class="local-venue-contact">
                <div class="local-venue-contact-block">
                    <p class="local-venue-label">Hours</p>
                    <ul class="local-hours">${hoursRows}
                    </ul>
                </div>
                <div class="local-venue-contact-block">
                    <p class="local-venue-label">Address</p>
                    <address class="local-venue-address" data-page-i18n="ignore">${escapeHtml(locationAddressLines(location).join(', '))}</address>
                    <p class="local-venue-links">
                        <a href="${escapeHtml(location.mapUrl)}" target="_blank" rel="noopener noreferrer">Get directions</a>${phoneHref ? `
                        <a href="${escapeHtml(phoneHref)}" data-page-i18n="ignore">${escapeHtml(location.contact.phone)}</a>` : ''}
                    </p>
                </div>
            </div>
        </div>
    </section>`;
}

function answerSectionHtml(location: LocationRecord, copy: LocalVenueCopy, page: LocalPageCopy): string {
    return `
    <section class="local-answer" aria-labelledby="local-answer-title">
        <div class="local-answer-inner">
            <div class="section-badge">${escapeHtml(copy.badge)}</div>
            <h2 id="local-answer-title">${escapeHtml(page.answerTitle)}</h2>
            <p class="local-answer-lead">${escapeHtml(fillTokens(page.answer, location, copy))}</p>
        </div>
    </section>`;
}

function localFaqHtml(location: LocationRecord, copy: LocalVenueCopy, page: LocalPageCopy): string {
    const items = page.faqs
        .map((faq) => `
                <div class="local-questions-item">
                    <h3>${escapeHtml(fillTokens(faq.q, location, copy))}</h3>
                    <p>${escapeHtml(fillTokens(faq.a, location, copy))}</p>
                </div>`)
        .join('');
    return `
    <section class="local-questions" aria-labelledby="local-questions-title">
        <div class="local-questions-inner">
            <h2 id="local-questions-title">Questions about ${escapeHtml(location.shortName)}</h2>
            <div class="local-questions-list">${items}
            </div>
        </div>
    </section>`;
}

function hubMoreHtml(location: LocationRecord, hub: LocalHubCopy): string {
    const items = hub.more
        .map((item) => `
                <div class="local-more-item" id="${escapeHtml(item.id)}">
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.text)}</p>
                    <a href="${escapeHtml(item.href ?? localGroupPath(location.slug, item.type))}">${escapeHtml(item.linkLabel)}</a>
                </div>`)
        .join('');
    return `
    <section class="local-more" aria-labelledby="local-more-title">
        <div class="local-more-inner">
            <h2 id="local-more-title">${escapeHtml(hub.moreTitle)}</h2>
            <div class="local-more-grid">${items}
            </div>
        </div>
    </section>`;
}

/**
 * Point the shared body at this venue: group links go to the venue's own group pages where
 * they exist, and booking buttons carry the venue so they open its checkout or inquiry form
 * without asking which location.
 */
export function scopeGroupBodyToVenue(html: string, slug: string): string {
    let scoped = html.replace(/href="\/groups(?:\/([a-z-]+))?"/g, (match, type?: string) => (
        hasLocalGroupPage(slug, type) ? `href="${localGroupPath(slug, type)}"` : match
    ));
    scoped = scoped.replace(/data-tm-booking-trigger(?![^>]*data-tm-location)/g, `data-tm-booking-trigger data-tm-location="${slug}"`);
    return scoped;
}

function insertAfterFirstSection(html: string, addition: string): string {
    const end = html.indexOf('</section>');
    if (end === -1) throw new Error('Group page body has no hero section');
    const at = end + '</section>'.length;
    return `${html.slice(0, at)}${addition}${html.slice(at)}`;
}

function insertBeforeMarker(html: string, marker: string, addition: string, label: string): string {
    const at = html.indexOf(marker);
    if (at === -1) throw new Error(`${label}: marker ${marker} not found`);
    // Insert before the section's leading whitespace and comment so the markup stays tidy.
    const lineStart = html.lastIndexOf('\n', at);
    const insertAt = lineStart === -1 ? at : lineStart;
    return `${html.slice(0, insertAt)}${addition}${html.slice(insertAt)}`;
}

function withHeroVenueLine(html: string, copy: LocalVenueCopy): string {
    // Some national headings are swapped at runtime by a shared i18n key. The venue heading has
    // its own text, so it is translated as page copy instead and the key is dropped.
    const keyed = html.replace(/(<h1\b[^>]*?)\s+data-i18n-html="[^"]*"/, '$1');
    return appendVenueLine(keyed, copy);
}

function appendVenueLine(html: string, copy: LocalVenueCopy): string {
    const close = html.indexOf('</h1>');
    if (close === -1) throw new Error('Group page body has no h1');
    return `${html.slice(0, close)}<span class="hero-title-venue">${escapeHtml(copy.heroVenueLine)}</span>\n            ${html.slice(close)}`;
}

export function buildLocalGroupTypePage(slug: string, type: LocalGroupType, nationalBody: string) {
    const location = locationBySlug(slug);
    const copy = copyFor(slug);
    const page = copy.types[type];
    if (!page) throw new Error(`No local copy for ${slug}/${type}`);
    if (!location.localFacts) throw new Error(`${slug} has no localFacts record`);

    let body = withHeroVenueLine(nationalBody, copy);
    body = insertAfterFirstSection(body, answerSectionHtml(location, copy, page));
    body = insertBeforeMarker(
        body,
        '<section class="event-page-cta">',
        `${localFactsHtml(location)}${localFaqHtml(location, copy, page)}\n`,
        `${slug}/${type}`,
    );
    return {
        canonicalPath: localGroupPath(slug, type),
        copy: page,
        location,
        mainHtml: scopeGroupBodyToVenue(body, slug),
    };
}

export function buildLocalGroupsHubPage(slug: string, nationalBody: string) {
    const location = locationBySlug(slug);
    const copy = copyFor(slug);
    if (!location.localFacts) throw new Error(`${slug} has no localFacts record`);

    // The national hub opens with a national answer block; the venue page states its own.
    let body = nationalBody.replace(/\s*<section class="geo-answer-section"[\s\S]*?<\/section>/, '');
    body = withHeroVenueLine(body, copy);
    body = insertAfterFirstSection(body, answerSectionHtml(location, copy, copy.hub));
    body = insertBeforeMarker(
        body,
        '<section class="faq">',
        `${hubMoreHtml(location, copy.hub)}${localFactsHtml(location)}${localFaqHtml(location, copy, copy.hub)}\n`,
        `${slug}/groups`,
    );
    return {
        canonicalPath: localGroupPath(slug),
        copy: copy.hub,
        location,
        mainHtml: scopeGroupBodyToVenue(body, slug),
    };
}
