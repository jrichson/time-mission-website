import type { LocationRecord } from '../../data/locations';
import org from '../../data/site/seo-organization.json';
import { upcomingLocationSpecialHours } from '../location-hours';
import { activeSiteProfile } from '../site-profile';

const baseUrl = activeSiteProfile.origin;

const dayOfWeekMap: Record<string, string> = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
};

export interface LocalBusinessNode {
    '@type': 'EntertainmentBusiness';
    '@id': string;
    name: string;
    alternateName?: string;
    url: string;
    image?: string;
    telephone?: string;
    email?: string;
    hasMap?: string;
    parentOrganization?: { '@id': string };
    priceRange?: string;
    geo?: {
        '@type': 'GeoCoordinates';
        latitude: number;
        longitude: number;
    };
    address: {
        '@type': 'PostalAddress';
        streetAddress: string;
        addressLocality: string;
        addressRegion?: string;
        postalCode: string;
        addressCountry: string;
    };
    openingHoursSpecification?: Array<{
        '@type': 'OpeningHoursSpecification';
        dayOfWeek: string;
        opens: string;
        closes: string;
    }>;
    specialOpeningHoursSpecification?: Array<{
        '@type': 'OpeningHoursSpecification';
        opens: string;
        closes: string;
        validFrom: string;
        validThrough: string;
    }>;
    sameAs?: string[];
}

const DEFAULT_VENUE_IMAGE = `${baseUrl}/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg`;
const DEFAULT_PRICE_RANGE = '$$';

function schemaClockTime(time: string): string {
    // Schema.org treats 00:00 as the next day boundary; use the last minute of the visible day for "Midnight" closes.
    return time === '00:00' ? '23:59' : time;
}

function hasValidGeo(loc: LocationRecord): loc is LocationRecord & { geo: { latitude: number; longitude: number } } {
    return (
        typeof loc.geo?.latitude === 'number' &&
        Number.isFinite(loc.geo.latitude) &&
        typeof loc.geo.longitude === 'number' &&
        Number.isFinite(loc.geo.longitude)
    );
}

/**
 * Returns null when the location is NOT eligible (coming-soon, temporarily closed, OR localBusinessSchemaEligible !== true).
 * Callers MUST treat null as "skip this node entirely" — Pitfall 6 / D-07 / D-10.
 */
export function localBusinessNode(loc: LocationRecord, canonicalPath: string, now = new Date()): LocalBusinessNode | null {
    if (loc.status !== 'open') return null;
    if (loc.localBusinessSchemaEligible !== true) return null;

    const node: LocalBusinessNode = {
        '@type': 'EntertainmentBusiness',
        '@id': `${baseUrl}${canonicalPath}#business`,
        name: loc.name,
        url: `${baseUrl}${canonicalPath}`,
        image: DEFAULT_VENUE_IMAGE,
        parentOrganization: { '@id': org['@id'] },
        priceRange: DEFAULT_PRICE_RANGE,
        address: {
            '@type': 'PostalAddress',
            streetAddress: [loc.address.line1, loc.address.line2].filter(Boolean).join(', '),
            addressLocality: loc.address.city,
            postalCode: loc.address.zip,
            addressCountry: loc.countryCode ?? loc.address.country,
        },
    };
    if (typeof loc.alternateName === 'string' && loc.alternateName.trim()) {
        node.alternateName = loc.alternateName;
    }
    if (loc.address.state && loc.address.state.trim()) {
        node.address.addressRegion = loc.address.state;
    }
    if (loc.phoneE164 ?? loc.contact?.phone) {
        node.telephone = loc.phoneE164 ?? loc.contact.phone;
    }
    if (loc.contact?.email) {
        node.email = loc.contact.email;
    }
    if (loc.mapUrl && loc.mapUrl.trim()) {
        node.hasMap = loc.mapUrl;
    }
    if (hasValidGeo(loc)) {
        node.geo = {
            '@type': 'GeoCoordinates',
            latitude: loc.geo.latitude,
            longitude: loc.geo.longitude,
        };
    }

    const hourEntries = Object.entries(loc.hours ?? {}).filter(
        ([, h]) => h && typeof h.open === 'string' && typeof h.close === 'string',
    );
    if (hourEntries.length > 0) {
        node.openingHoursSpecification = hourEntries.map(([day, h]) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: dayOfWeekMap[day] ?? day,
            opens: schemaClockTime(h.open!),
            closes: schemaClockTime(h.close!),
        }));
    }
    const specialHourEntries = upcomingLocationSpecialHours(loc, now).filter(
        (hours) => typeof hours.open === 'string' && typeof hours.close === 'string',
    );
    if (specialHourEntries.length > 0) {
        node.specialOpeningHoursSpecification = specialHourEntries.map((hours) => ({
            '@type': 'OpeningHoursSpecification',
            opens: schemaClockTime(hours.open!),
            closes: schemaClockTime(hours.close!),
            validFrom: hours.date,
            validThrough: hours.date,
        }));
    }
    return node;
}
