import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { LocationDetails } from '../cms/collections/LocationDetails.js';
import { LOCATION_DETAIL_OPTIONS, LOCATION_MISSION_OPTIONS } from '../cms/lib/location-details-options.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

type CollectionField = {
    access?: { update?: unknown };
    admin?: { description?: string };
    fields?: CollectionField[];
    label?: string;
    labels?: { plural?: string; singular?: string };
    name?: string;
    options?: unknown[];
    required?: boolean;
    tabs?: Array<{ fields?: CollectionField[] }>;
    type?: string;
    unique?: boolean;
    validate?: (value: unknown) => boolean | string;
};

function findField(fields: CollectionField[], name: string): CollectionField | null {
    for (const field of fields) {
        if (field?.name === name) return field;
        if (Array.isArray(field?.fields)) {
            const nested = findField(field.fields, name);
            if (nested) return nested;
        }
        for (const tab of field?.tabs ?? []) {
            const nested = findField(tab.fields ?? [], name);
            if (nested) return nested;
        }
    }
    return null;
}

describe('CMS location details', () => {
    it('registers an existing-location-only Payload collection', () => {
        const config = read('cms/payload.config.ts');
        const migration = read('cms/migrations/20260529_090000_location_details.ts');
        const locationSlugField = findField(LocationDetails.fields, 'locationSlug');
        const addressField = findField(LocationDetails.fields, 'address');
        const hoursField = findField(LocationDetails.fields, 'hours');
        const specialHoursField = findField(LocationDetails.fields, 'specialHours');
        const specialHoursDateField = findField(LocationDetails.fields, 'date');
        const externalLinksField = findField(LocationDetails.fields, 'externalLinks');
        const bookingUrlField = findField(LocationDetails.fields, 'bookingUrl');
        const groupFormUrlsField = findField(LocationDetails.fields, 'groupFormUrls');
        const formKeyField = findField(LocationDetails.fields, 'formKey');
        const formUrlField = findField(LocationDetails.fields, 'url');
        const hiddenMissionIdsField = findField(LocationDetails.fields, 'hiddenMissionIds');
        const missionIdField = findField(LocationDetails.fields, 'missionId');
        const publishedField = findField(LocationDetails.fields, 'published');

        expect(config).toContain('LocationDetails as CollectionConfig');
        expect(LocationDetails.labels.singular).toBe('Location');
        expect(LocationDetails.admin.description).toContain('existing locations');
        expect(LocationDetails.admin.components.beforeList).toContain(
            '/components/AdminCollectionGuides.tsx#LocationDetailsGuide',
        );
        expect(locationSlugField).toMatchObject({ name: 'locationSlug', type: 'select', required: true, unique: true });
        expect(locationSlugField?.options).toContainEqual({ label: 'Time Mission Philadelphia', value: 'philadelphia' });
        expect(addressField?.admin?.description).toContain('Booking and inquiry destinations');
        expect(hoursField?.type).toBe('group');
        expect(specialHoursField).toMatchObject({ name: 'specialHours', type: 'array' });
        expect(specialHoursField?.admin?.description).toContain('holiday');
        expect(specialHoursDateField?.validate?.('2026-09-07')).toBe(true);
        expect(specialHoursDateField?.validate?.('09/07/2026')).toContain('YYYY-MM-DD');
        expect(externalLinksField?.admin?.description).toContain('Only administrators');
        expect(externalLinksField?.access?.update).toBeTypeOf('function');
        expect(bookingUrlField?.label).toBe('Ticket booking URL');
        expect(groupFormUrlsField?.type).toBe('array');
        expect(groupFormUrlsField?.access?.update).toBeTypeOf('function');
        expect(formKeyField?.admin?.description || formKeyField?.label).toBeTruthy();
        expect(formUrlField?.validate?.('/groups/inquire/manassas/default')).toBe(true);
        expect(formUrlField?.validate?.('https://forms.example/manassas')).toBe(true);
        expect(formUrlField?.validate?.('javascript:alert(1)')).toContain('same-site /path');
        expect(hiddenMissionIdsField).toMatchObject({ name: 'hiddenMissionIds', type: 'array' });
        expect(hiddenMissionIdsField?.label).toBe('Unavailable missions');
        expect(hiddenMissionIdsField?.labels).toEqual({
            singular: 'Unavailable mission',
            plural: 'Unavailable missions',
        });
        expect(hiddenMissionIdsField?.admin?.description).toContain('hidden from this location');
        expect(missionIdField).toMatchObject({ name: 'missionId', type: 'select', required: true });
        expect(missionIdField?.label).toBe('Mission');
        expect(missionIdField?.options).toBe(LOCATION_MISSION_OPTIONS);
        expect(publishedField?.label).toBe('Published in CMS');
        expect(publishedField?.admin?.description).toContain('Live after deploy');
        expect(migration).toContain('CREATE TABLE "location_details"');
        expect(migration).toContain("('Time Mission Philadelphia', 'philadelphia'");
        expect(read('cms/migrations/20260605_160000_location_details_external_links.ts')).toContain(
            'CREATE TABLE IF NOT EXISTS "location_details_group_form_urls"',
        );
        expect(read('cms/migrations/20260617_090000_location_details_hidden_missions.ts')).toContain(
            'CREATE TABLE IF NOT EXISTS "location_details_hidden_mission_ids"',
        );
        expect(read('cms/migrations/20260821_090000_houston_philadelphia_hours.ts')).toContain(
            'CREATE TABLE IF NOT EXISTS "location_details_special_hours"',
        );
    });

    it('keeps CMS location options aligned with the code-owned location roster', () => {
        const locations = JSON.parse(read('data/locations.json')).locations as Array<{ name: string; slug: string }>;
        const rosterOptions = locations.map((loc) => ({ label: loc.name, value: loc.slug }));

        expect(LOCATION_DETAIL_OPTIONS).toEqual(rosterOptions);
    });

    it('keeps CMS mission options aligned with rendered mission cards', () => {
        const missionsMain = read('src/partials/missions-main.frag.txt');
        const renderedMissionIds = Array.from(missionsMain.matchAll(/data-mission-id="(\d{4})"/g), (match) => match[1]);

        expect(new Set(renderedMissionIds).size).toBe(renderedMissionIds.length);
        expect(LOCATION_MISSION_OPTIONS.map((option) => option.value)).toEqual(renderedMissionIds.sort());
    });
});
