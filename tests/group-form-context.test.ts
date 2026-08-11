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
        ['houston', '262186150244149', '1786402794617', '1786402794618', 'Houston', 'HOU'],
        ['philadelphia', '262217710699160', '1786402040663', '1786402040663', 'Philadelphia', 'PHL'],
    ])('routes %s through its franchise form with exact CRM values', (slug, formId, executionTrackerBuildDate, buildDate, locationValue, prefix) => {
        expect(jotformGroupFormConfigFor(slug)).toEqual({
            formId,
            executionTrackerBuildDate,
            buildDate,
            pipedriveLocationValue: locationValue,
            dealTitlePrefix: prefix,
        });
        expect(groupInquiryPath(slug, 'corporate')).toBe(`/groups/inquire/${slug}/corporate`);
    });

    it('fails closed for a location without a configured Jotform account', () => {
        expect(() => jotformGroupFormConfigFor('dallas')).toThrow(/Unsupported Jotform group inquiry location/);
    });

    it('keeps staged franchise configs dormant while Roller URLs are active', () => {
        const houston = allLocations.find((location) => location.slug === 'houston');
        const philadelphia = allLocations.find((location) => location.slug === 'philadelphia');
        const manassas = allLocations.find((location) => location.slug === 'manassas');
        expect(houston).toBeDefined();
        expect(philadelphia).toBeDefined();
        expect(manassas).toBeDefined();
        expect(hasOnSiteGroupInquiryRoute(houston!, 'corporate')).toBe(false);
        expect(hasOnSiteGroupInquiryRoute(philadelphia!, 'corporate')).toBe(false);
        expect(hasOnSiteGroupInquiryRoute(manassas!, 'corporate')).toBe(true);
        expect(hasOnSiteGroupInquiryRoute({ ...houston!, groupFormUrls: undefined }, 'corporate')).toBe(false);
        expect(groupInquiryPaths().filter((entry) => entry.location.slug === 'houston')).toHaveLength(0);
        expect(groupInquiryPaths().filter((entry) => entry.location.slug === 'philadelphia')).toHaveLength(0);
        expect(groupInquiryPaths().filter((entry) => entry.location.slug === 'manassas')).toHaveLength(7);
    });
});
