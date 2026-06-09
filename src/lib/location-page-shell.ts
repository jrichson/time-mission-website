import { allLocations, type LocationRecord } from '../data/locations';
import { definePage } from './define-page';
import { comingSoonLocationPageTaglines, locationPageTaglines } from './location-page-registry';
import { hasTicketBooking, locationDisplayStatus, locationOpeningDateText, locationOpeningLabel } from './location-status';
import { locationCtaView, locationMarket } from './location-view';
import { buildLocationGraph, serializeGraph } from './schema/graph';
import { locationPurchaseTermsFaqItemHtml } from './location-policy-faq';
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

function replaceToken(source: string, token: string, value: unknown): string {
    return source.replaceAll(`{{${token}}}`, escapeHtml(String(value ?? '')));
}

function replaceRawToken(source: string, token: string, value: string): string {
    return source.replaceAll(`{{${token}}}`, value);
}

function locationPageStatusLabel(location: LocationRecord): string {
    return location.status === 'open' ? 'Now Open' : locationDisplayStatus(location);
}

function locationPrimaryCtaAttrs(location: LocationRecord): string {
    if (!hasTicketBooking(location)) return '';
    const checkoutUrl = String(location.rollerCheckoutUrl || location.bookingUrl || '').trim();
    return `data-tm-booking-trigger="" data-tm-booking-kind="tickets" data-tm-location="${escapeHtml(location.slug)}" data-tm-booking-url="${escapeHtml(checkoutUrl)}"`;
}

function withLocationTemplateTokens(mainRaw: string, location: LocationRecord): string {
    if (!mainRaw.includes('{{')) return mainRaw;

    const isBookable = hasTicketBooking(location);
    const primaryCta = locationCtaView(location);
    const openingLabel = location.status === 'open' ? '' : locationOpeningLabel(location);
    const openingDateText = openingLabel ? locationOpeningDateText(location) : '';
    const bookingFaqQuestion = isBookable ? 'Can I book now?' : 'When can I book?';
    const bookingFaqAnswer = isBookable
        ? openingLabel
            ? `${location.shortName} opens ${openingDateText}. Online booking is available now, so use Book Now to choose your date and time through our secure checkout.`
            : `Yes. Online booking is available for ${location.shortName}. Use Book Now to choose your date and time through our secure checkout.`
        : `Booking opens closer to launch. Contact the ${location.shortName} team for opening updates and launch timing.`;
    const finalCtaTitle = isBookable ? (openingLabel ? 'BOOK AHEAD' : 'BOOK YOUR MISSION') : 'STAY CLOSE TO LAUNCH';
    const finalCtaText = isBookable
        ? openingLabel
            ? `${location.shortName} opens ${openingDateText}. Choose your date, rally your team, and get ready to play.`
            : `Tickets for ${location.shortName} are available now. Choose your date, rally your team, and get ready to play.`
        : `Reach out about ${location.shortName} and we will route your message to the right team.`;

    let resolved = mainRaw;
    resolved = replaceToken(resolved, 'LOCATION_NAME', location.name);
    resolved = replaceToken(resolved, 'LOCATION_SHORT_NAME', location.shortName);
    resolved = replaceToken(resolved, 'LOCATION_SLUG', location.slug);
    resolved = replaceToken(resolved, 'LOCATION_PAGE_STATUS_LABEL', locationPageStatusLabel(location));
    resolved = replaceToken(resolved, 'PRIMARY_CTA_LABEL', primaryCta.label);
    resolved = replaceToken(resolved, 'PRIMARY_CTA_HREF', primaryCta.href);
    resolved = replaceToken(resolved, 'PRIMARY_CTA_CLASS', isBookable ? 'btn-location-book' : 'btn-location-lead');
    resolved = replaceRawToken(resolved, 'PRIMARY_CTA_ATTRS', locationPrimaryCtaAttrs(location));
    resolved = replaceToken(resolved, 'BOOKING_FAQ_QUESTION', bookingFaqQuestion);
    resolved = replaceToken(resolved, 'BOOKING_FAQ_ANSWER', bookingFaqAnswer);
    resolved = replaceRawToken(resolved, 'LOCATION_POLICY_FAQ_ITEM', locationPurchaseTermsFaqItemHtml(location));
    resolved = replaceToken(resolved, 'FINAL_CTA_TITLE', finalCtaTitle);
    resolved = replaceToken(resolved, 'FINAL_CTA_TEXT', finalCtaText);
    return resolved;
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
        mainHtml: applyTmMediaBase(withTemporaryClosureStrip(withLocationTemplateTokens(mainRaw, location), location)),
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
