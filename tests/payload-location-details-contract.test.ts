import { describe, expect, it } from 'vitest';

import type { LocationRecord } from '../src/data/locations';
import {
    applyLocationDetailsOverrides,
    locationDetailsDocLooksUsable,
    type PayloadLocationDetailsDoc,
} from '../src/lib/payload/location-details-contract';

const baseLocation = {
    id: 'philadelphia',
    slug: 'philadelphia',
    name: 'Time Mission Philadelphia',
    shortName: 'Philadelphia',
    venueName: null,
    region: 'us',
    status: 'temporarily-closed',
    address: {
        line1: '1530 Chestnut Street',
        city: 'Philadelphia',
        state: 'PA',
        zip: '19102',
        country: 'United States',
    },
    contact: {
        phone: '',
        email: '',
    },
    hours: {
        mon: { label: 'Temporarily closed' },
        tue: { label: 'Temporarily closed' },
    },
    bookingUrl: '',
    bookingProvider: 'roller',
    navLabel: 'Philadelphia',
    mapUrl: '',
    faqs: [],
    ticker: '',
    giftCardUrl: '',
    groupFormUrls: {},
    countryCode: null,
    locale: null,
    timeZone: null,
    currency: null,
    phoneE164: null,
    hreflang: null,
    localBusinessSchemaEligible: false,
} as LocationRecord;

const baseDoc: PayloadLocationDetailsDoc = {
    id: 1,
    locationSlug: 'philadelphia',
    published: true,
    address: {
        line1: '1530 Chestnut St',
        line2: 'Second Floor',
        city: 'Philadelphia',
        state: 'PA',
        zip: '19102',
        country: 'United States',
    },
    hours: {
        mon: { label: '12pm - 9pm', open: '12:00', close: '21:00' },
        fri: { label: '12pm - Midnight', open: '12:00', close: '00:00' },
    },
};

describe('Payload location details contract', () => {
    it('applies published address and hours overrides without changing other location fields', () => {
        const [location] = applyLocationDetailsOverrides([baseLocation], [baseDoc]);

        expect(location.slug).toBe('philadelphia');
        expect(location.status).toBe('temporarily-closed');
        expect(location.bookingUrl).toBe('');
        expect(location.address).toMatchObject({
            line1: '1530 Chestnut St',
            line2: 'Second Floor',
            city: 'Philadelphia',
            state: 'PA',
            zip: '19102',
        });
        expect(location.hours).toMatchObject({
            mon: { label: '12pm - 9pm', open: '12:00', close: '21:00' },
            tue: { label: 'Temporarily closed' },
            fri: { label: '12pm - Midnight', open: '12:00', close: '00:00' },
        });
        expect(location.mapUrl).toBe(
            'https://maps.google.com/?q=1530%20Chestnut%20St%20Second%20Floor%20Philadelphia%20PA%2019102%20United%20States',
        );
    });

    it('applies sanitized external link overrides and merges group form URLs', () => {
        const [location] = applyLocationDetailsOverrides(
            [baseLocation],
            [
                {
                    ...baseDoc,
                    address: null,
                    hours: null,
                    externalLinks: {
                        bookingUrl: 'https://checkout.example/philly',
                        giftCardUrl: ' https://gift.example/philly ',
                        waiverUrl: 'javascript:alert(1)',
                    },
                    groupFormUrls: [
                        { formKey: 'default', url: 'https://forms.example/philly/default' },
                        { formKey: 'birthdays', url: '/groups/inquire/philadelphia/birthdays' },
                        { formKey: 'bad key', url: 'https://forms.example/philly/bad' },
                    ],
                },
            ],
        );

        expect(location.bookingUrl).toBe('https://checkout.example/philly');
        expect(location.rollerCheckoutUrl).toBe('https://checkout.example/philly');
        expect(location.giftCardUrl).toBe('https://gift.example/philly');
        expect(location.waiverUrl).toBeUndefined();
        expect(location.groupFormUrls?.default).toBe('https://forms.example/philly/default');
        expect(location.groupFormUrls?.birthdays).toBe('/groups/inquire/philadelphia/birthdays');
        expect(location.groupFormUrls?.['bad key']).toBeUndefined();
    });

    it('preserves the source map URL when the CMS address is unchanged', () => {
        const sourceMapUrl = 'https://maps.google.com/?q=1530+Chestnut+Street';
        const [location] = applyLocationDetailsOverrides(
            [{ ...baseLocation, mapUrl: sourceMapUrl }],
            [{
                ...baseDoc,
                address: { ...baseLocation.address },
                hours: null,
            }],
        );

        expect(location.mapUrl).toBe(sourceMapUrl);
    });

    it('applies hidden mission overrides and allows editors to clear them', () => {
        const [hiddenLocation] = applyLocationDetailsOverrides(
            [baseLocation],
            [
                {
                    ...baseDoc,
                    address: null,
                    hours: null,
                    hiddenMissionIds: [
                        { missionId: '1005' },
                        { missionId: 'bad' },
                        { missionId: '1005' },
                        { missionId: '1011' },
                    ],
                },
            ],
        );
        const [clearedLocation] = applyLocationDetailsOverrides(
            [{ ...baseLocation, hiddenMissionIds: ['1005'] }],
            [{ ...baseDoc, address: null, hours: null, hiddenMissionIds: [] }],
        );

        expect(hiddenLocation.hiddenMissionIds).toEqual(['1005', '1011']);
        expect(clearedLocation.hiddenMissionIds).toEqual([]);
    });

    it('ignores unpublished docs and docs for non-code-owned locations', () => {
        const changed = applyLocationDetailsOverrides(
            [baseLocation],
            [
                { ...baseDoc, id: 2, published: false },
                { ...baseDoc, id: 3, locationSlug: 'new-city' },
            ],
        );

        expect(changed).toEqual([baseLocation]);
    });

    it('treats address or displayable hours as usable content', () => {
        expect(locationDetailsDocLooksUsable(baseDoc)).toBe(true);
        expect(locationDetailsDocLooksUsable({ ...baseDoc, address: null, hours: null })).toBe(false);
        expect(
            locationDetailsDocLooksUsable({
                ...baseDoc,
                address: null,
                hours: null,
                externalLinks: { bookingUrl: 'https://checkout.example/philly' },
            }),
        ).toBe(true);
        expect(
            locationDetailsDocLooksUsable({
                ...baseDoc,
                address: null,
                hours: { mon: { label: 'Temporarily closed' } },
            }),
        ).toBe(true);
        expect(
            locationDetailsDocLooksUsable({
                ...baseDoc,
                address: null,
                hours: null,
                hiddenMissionIds: [],
            }),
        ).toBe(true);
    });

    it('drops invalid open-close times while preserving safe display labels', () => {
        const [location] = applyLocationDetailsOverrides(
            [baseLocation],
            [
                {
                    ...baseDoc,
                    address: null,
                    hours: { mon: { label: 'By appointment', open: 'noon', close: '9pm' } },
                },
            ],
        );

        expect(location.hours.mon).toEqual({ label: 'By appointment' });
    });
});
