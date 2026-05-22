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
        mainHtml: applyTmMediaBase(mainRaw),
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
