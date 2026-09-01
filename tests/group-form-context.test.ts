import { describe, expect, it } from 'vitest';

import { allLocations } from '../src/data/locations';
import {
    groupInquiryPaths,
    groupInquiryPath,
    hasOnSiteGroupInquiryRoute,
    jotformGroupFormConfigFor,
} from '../src/lib/group-form-context';

describe('group inquiry Jotform account routing', () => {
    it('keeps the existing operator locations on the original form', () => {
        expect(jotformGroupFormConfigFor('manassas')).toMatchObject({
            formId: '261936424348059',
            executionTrackerBuildDate: '1784236513760',
            buildDate: '1784236513760',
            pipedriveLocationValue: 'Manassas',
            dealTitlePrefix: 'MAN',
        });
    });

    it.each([
        ['houston', '262186150244149', '1788292905464', 'Houston', 'HOU', '713-588-1630', 'tel:+17135881630'],
        ['philadelphia', '262217710699160', '1788292891937', 'Philadelphia', 'PHI', '267-710-1240', 'tel:+12677101240'],
    ])('routes %s through its franchise form with exact source and CRM values', (
        slug,
        formId,
        buildDate,
        locationValue,
        prefix,
        groupPhoneDisplay,
        groupPhoneHref,
    ) => {
        expect(jotformGroupFormConfigFor(slug)).toEqual({
            formId,
            executionTrackerBuildDate: buildDate,
            buildDate,
            pipedriveLocationValue: locationValue,
            dealTitlePrefix: prefix,
            specialistPhone: {
                display: groupPhoneDisplay,
                href: groupPhoneHref,
            },
        });
        expect(groupInquiryPath(slug, 'corporate')).toBe(`/groups/inquire/${slug}/corporate`);
    });

    it('fails closed for a location without a configured Jotform account', () => {
        expect(() => jotformGroupFormConfigFor('dallas')).toThrow(/Unsupported Jotform group inquiry location/);
    });

    it('publishes every configured franchise form through the shared on-site route', () => {
        const houston = allLocations.find((location) => location.slug === 'houston');
        const philadelphia = allLocations.find((location) => location.slug === 'philadelphia');
        const manassas = allLocations.find((location) => location.slug === 'manassas');
        expect(houston).toBeDefined();
        expect(philadelphia).toBeDefined();
        expect(manassas).toBeDefined();
        expect(hasOnSiteGroupInquiryRoute(houston!, 'corporate')).toBe(true);
        expect(hasOnSiteGroupInquiryRoute(philadelphia!, 'corporate')).toBe(true);
        expect(hasOnSiteGroupInquiryRoute(manassas!, 'corporate')).toBe(true);
        expect(hasOnSiteGroupInquiryRoute({ ...houston!, groupFormUrls: undefined }, 'corporate')).toBe(false);
        expect(groupInquiryPaths().filter((entry) => entry.location.slug === 'houston')).toHaveLength(7);
        expect(groupInquiryPaths().filter((entry) => entry.location.slug === 'philadelphia')).toHaveLength(7);
        expect(groupInquiryPaths().filter((entry) => entry.location.slug === 'manassas')).toHaveLength(7);
    });
});
