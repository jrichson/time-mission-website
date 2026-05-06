import type { LocationRecord } from '../../data/locations';

const baseUrl = 'https://timemission.com';

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
    priceRange?: string;
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
    sameAs?: string[];
}

const DEFAULT_VENUE_IMAGE = 'https://timemission.com/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg';
const DEFAULT_PRICE_RANGE = '$$';

/**
 * Returns null when the location is NOT eligible (coming-soon OR localBusinessSchemaEligible !== true).
 * Callers MUST treat null as "skip this node entirely" — Pitfall 6 / D-07 / D-10.
 */
export function localBusinessNode(loc: LocationRecord, canonicalPath: string): LocalBusinessNode | null {
    if (loc.status !== 'open') return null;
    if (loc.localBusinessSchemaEligible !== true) return null;

    const node: LocalBusinessNode = {
        '@type': 'EntertainmentBusiness',
        '@id': `${baseUrl}${canonicalPath}#business`,
        name: loc.name,
        url: `${baseUrl}${canonicalPath}`,
        image: DEFAULT_VENUE_IMAGE,
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

    const hourEntries = Object.entries(loc.hours ?? {}).filter(
        ([, h]) => h && typeof h.open === 'string' && typeof h.close === 'string',
    );
    if (hourEntries.length > 0) {
        node.openingHoursSpecification = hourEntries.map(([day, h]) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: dayOfWeekMap[day] ?? day,
            opens: h.open!,
            closes: h.close!,
        }));
    }
    return node;
}
