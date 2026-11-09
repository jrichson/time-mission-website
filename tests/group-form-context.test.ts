import { describe, expect, it } from 'vitest';

import { allLocations } from '../src/data/locations';
import {
    groupInquiryPaths,
    groupInquiryPath,
    hasOnSiteGroupInquiryRoute,
    jotformGroupFormConfigFor,
} from '../src/lib/group-form-context';

describe('group inquiry Jotform account routing', () => {
    it('uses the Dallas source form and specialist phone for all event routes', () => {
        expect(jotformGroupFormConfigFor('dallas')).toEqual({
            formId: '263074857864168',
            executionTrackerBuildDate: '1793830688768',
            buildDate: '1793830688768',
            pipedriveLocationValue: 'Dallas',
            dealTitlePrefix: 'DAL',
            specialistPhone: {
                display: '469-722-0900',
                href: 'tel:+14697220900',
            },
        });
        expect(groupInquiryPaths().filter((entry) => entry.location.slug === 'dallas')).toHaveLength(7);
    });

    it('keeps the existing operator locations on the original form', () => {
        expect(jotformGroupFormConfigFor('manassas')).toMatchObject({
            formId: '261936424348059',
            executionTrackerBuildDate: '1784236513760',
            buildDate: '1784236513760',
            pipedriveLocationValue: 'Manassas',
            dealTitlePrefix: 'MAN',
            specialistPhone: {
                display: '813-773-5250',
                href: 'tel:+18137735250',
            },
        });
    });

    it.each([
        ['houston', '262186150244149', '1788292905464', 'Houston', 'HOU'],
        ['philadelphia', '262217710699160', '1788292891937', 'Philadelphia', 'PHI'],
    ])('routes %s through its franchise form with exact source and CRM values', (
        slug,
        formId,
        buildDate,
        locationValue,
        prefix,
    ) => {
        expect(jotformGroupFormConfigFor(slug)).toEqual({
            formId,
            executionTrackerBuildDate: buildDate,
            buildDate,
            pipedriveLocationValue: locationValue,
            dealTitlePrefix: prefix,
            specialistPhone: null,
        });
        expect(groupInquiryPath(slug, 'corporate')).toBe(`/groups/inquire/${slug}/corporate`);
    });

    it('fails closed for a location without a configured Jotform account', () => {
        expect(() => jotformGroupFormConfigFor('nashville')).toThrow(/Unsupported Jotform group inquiry location/);
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
