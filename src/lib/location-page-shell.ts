import { allLocations, type LocationRecord } from '../data/locations';
import { definePage } from './define-page';
import { comingSoonLocationPageTaglines, locationPageTaglines } from './location-page-registry';
import { hasTicketBooking, locationOpeningDateText, locationOpeningLabel } from './location-status';
import { locationCtaView, locationMarket } from './location-view';
import { buildLocationGraph, serializeGraph } from './schema/graph';
import { applyTmMediaBase } from './tm-media';

function locationBySlug(slug: string): LocationRecord {
    const location = allLocations.find((entry) => entry.slug === slug);
    if (!location) throw new Error(`${slug} missing from src/data/locations`);
    return location;
}

function locationJsonLd(location: LocationRecord) {
    const canonicalPath = `/${location.slug}`;
    return serializeGraph(
        buildLocationGraph(location.slug, canonicalPath, [
            { label: 'Home', href: '/' },
            { label: 'Locations', href: '/locations' },
            { label: location.shortName, href: canonicalPath },
        ]),
    );
}

function cityPageInit(location: LocationRecord, taglines: string[]) {
    return {
        mode: 'city',
        config: {
            city: location.shortName,
            taglines,
        },
    };
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function contactHref(slug: string, type = 'closure'): string {
    const params = new URLSearchParams();
    params.set('location', slug);
    params.set('type', type);
    return `/contact#${params.toString()}`;
}

function temporaryClosureStrip(location: LocationRecord): string {
    if (location.status !== 'temporarily-closed' || !location.temporaryClosure) return '';
    const closure = location.temporaryClosure;
    return `
    <section class="tm-closure-strip" aria-labelledby="tm-closure-strip-title">
        <div class="tm-closure-strip__inner">
            <p class="tm-closure-strip__eyebrow">${escapeHtml(closure.label || closure.title)}</p>
            <h2 id="tm-closure-strip-title">${escapeHtml(closure.title)}</h2>
            <p>${escapeHtml(closure.summary)}</p>
            <p>${escapeHtml(closure.detail)}</p>
            <div class="tm-closure-strip__actions">
                <a href="${escapeHtml(contactHref(location.slug))}" class="tm-closure-button tm-closure-button--primary" data-tm-no-location-scope>${escapeHtml(closure.ctaLabel)}</a>
                <a href="mailto:${escapeHtml(location.contact.email)}" class="tm-closure-button tm-closure-button--secondary">${escapeHtml(closure.contactLabel)}</a>
            </div>
        </div>
    </section>`;
}

function withTemporaryClosureStrip(mainRaw: string, location: LocationRecord): string {
    const notice = temporaryClosureStrip(location);
    if (!notice) return mainRaw;
    const firstSectionClose = mainRaw.indexOf('</section>');
    if (firstSectionClose === -1) return notice + mainRaw;
    return `${mainRaw.slice(0, firstSectionClose + '</section>'.length)}${notice}${mainRaw.slice(firstSectionClose + '</section>'.length)}`;
}

export function buildOpenLocationPage({
    mainRaw,
    slug,
}: {
    mainRaw: string;
    slug: string;
}) {
    const location = locationBySlug(slug);
    const canonicalPath = `/${slug}`;
    return {
        canonicalPath,
        ld: locationJsonLd(location),
        location,
        mainHtml: applyTmMediaBase(withTemporaryClosureStrip(mainRaw, location)),
        page: definePage({ canonicalPath }),
        pageInit: cityPageInit(location, locationPageTaglines(slug)),
    };
}

export function buildComingSoonLocationPage(slug: string) {
    const location = locationBySlug(slug);
    const canonicalPath = `/${slug}`;
    const isBookable = hasTicketBooking(location);
    const openingLabel = locationOpeningLabel(location);
    const openingDateText = locationOpeningDateText(location);
    const market = locationMarket(location);
    const statusLabel = openingLabel || (isBookable ? 'Now Booking' : 'Coming Soon');
    const pageDescription = openingLabel
        ? `${location.name} opens ${openingDateText}${market ? ` in ${market}` : ''}. Advance tickets are available for 25+ immersive mission rooms.`
        : isBookable
        ? `${location.name} is now booking${market ? ` in ${market}` : ''}. Reserve tickets for 25+ immersive mission rooms.`
        : `${location.name} is coming soon${market ? ` in ${market}` : ''}. Contact the location team for launch timing and opening updates.`;

    return {
        canonicalPath,
        cta: locationCtaView(location),
        isBookable,
        ld: locationJsonLd(location),
        location,
        openingDateText,
        openingLabel,
        page: definePage({ canonicalPath }),
        pageDescription,
        pageInit: cityPageInit(location, comingSoonLocationPageTaglines(statusLabel)),
        pageTitle: `${location.name} | ${statusLabel}`,
    };
}
