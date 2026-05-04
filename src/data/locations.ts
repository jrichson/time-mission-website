import locationsJson from '../../data/locations.json';

export interface LocationDayHours {
    open?: string;
    close?: string;
    label: string;
}

export interface LocationRecord {
    id: string;
    slug: string;
    name: string;
    shortName: string;
    venueName: string | null;
    region: string;
    status: 'open' | 'coming-soon';
    address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    };
    contact: {
        phone: string;
        email: string;
    };
    hours: Record<string, LocationDayHours>;
    bookingUrl: string;
    rollerCheckoutUrl?: string;
    navLabel: string;
    mapUrl: string;
    faqs: unknown[];
    ticker: string;
    giftCardUrl: string;
    countryCode: string | null;
    locale: string | null;
    timeZone: string | null;
    currency: string | null;
    phoneE164: string | null;
    hreflang: Array<{ lang: string; url: string }> | null;
    localBusinessSchemaEligible: boolean;
    alternateName?: string;
}

export interface LocationsDocument {
    locations: LocationRecord[];
}

export const locationsDocument = locationsJson as LocationsDocument;
export const allLocations = locationsDocument.locations;
