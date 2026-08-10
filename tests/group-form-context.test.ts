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

    it('only emits inquiry routes when the active profile retains the on-site form URLs', () => {
        const houston = allLocations.find((location) => location.slug === 'houston');
        expect(houston).toBeDefined();
        expect(hasOnSiteGroupInquiryRoute(houston!, 'corporate')).toBe(true);
        expect(hasOnSiteGroupInquiryRoute({ ...houston!, groupFormUrls: undefined }, 'corporate')).toBe(false);
        expect(groupInquiryPaths().filter((entry) => entry.location.slug === 'houston')).toHaveLength(7);
    });
});
