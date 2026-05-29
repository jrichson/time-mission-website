import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { LocationDetails } from '../cms/collections/LocationDetails.js';
import { LOCATION_DETAIL_OPTIONS } from '../cms/lib/location-details-options.js';

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
    name?: string;
    options?: unknown[];
    required?: boolean;
    type?: string;
    unique?: boolean;
};

function findField(fields: CollectionField[], name: string): CollectionField | null {
    for (const field of fields) {
        if (field?.name === name) return field;
        if (Array.isArray(field?.fields)) {
            const nested = findField(field.fields, name);
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
        const publishedField = findField(LocationDetails.fields, 'published');

        expect(config).toContain('LocationDetails as CollectionConfig');
        expect(LocationDetails.labels.singular).toBe('Location Detail');
        expect(LocationDetails.admin.description).toContain('existing code-owned locations only');
        expect(LocationDetails.admin.description).toContain('does not create new public pages');
        expect(locationSlugField).toMatchObject({ name: 'locationSlug', type: 'select', required: true, unique: true });
        expect(locationSlugField?.options).toContainEqual({ label: 'Time Mission Philadelphia', value: 'philadelphia' });
        expect(addressField?.admin?.description).toContain('directions link is generated from this address');
        expect(addressField?.admin?.description).toContain('booking URLs and contact settings stay code-owned');
        expect(hoursField?.type).toBe('group');
        expect(publishedField?.label).toBe('Published in CMS');
        expect(publishedField?.admin?.description).toContain('Live after deploy');
        expect(migration).toContain('CREATE TABLE "location_details"');
        expect(migration).toContain("('Time Mission Philadelphia', 'philadelphia'");
    });

    it('keeps CMS location options aligned with the code-owned location roster', () => {
        const locations = JSON.parse(read('data/locations.json')).locations as Array<{ name: string; slug: string }>;
        const rosterOptions = locations.map((loc) => ({ label: loc.name, value: loc.slug }));

        expect(LOCATION_DETAIL_OPTIONS).toEqual(rosterOptions);
    });
});
