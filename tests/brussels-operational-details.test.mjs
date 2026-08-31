import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { publicLocationForProfile, resolveSiteProfile } from '../config/site-profiles.mjs';
import { locationHoursRows } from '../src/lib/location-view';
import { localBusinessNode } from '../src/lib/schema/localBusiness';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const locations = JSON.parse(read('data/locations.json')).locations;
const brussels = locations.find((location) => location.slug === 'brussels');
const formUrl = 'https://forms.roller.app/#/terminal1/4fc51060f1c8424/form';
const groupFormKeys = [
  'default',
  'birthdays',
  'corporate',
  'field-trips',
  'bachelor-ette',
  'private-events',
  'holidays',
];

describe('Brussels operational details', () => {
  it('publishes the supplied hours, contact email, and inquiry form', () => {
    expect(brussels).toBeDefined();
    expect(brussels.contact.email).toBe('brussels@timemission.com');
    expect(brussels.hours).toEqual({
      mon: { label: 'Closed' },
      tue: { label: 'Closed' },
      wed: { open: '14:00', close: '20:00', label: '14:00 – 20:00' },
      thu: { open: '16:00', close: '23:00', label: '16:00 – 23:00' },
      fri: { open: '16:00', close: '23:00', label: '16:00 – 23:00' },
      sat: { open: '12:00', close: '23:00', label: '12:00 – 23:00' },
      sun: { open: '10:00', close: '20:00', label: '10:00 – 20:00' },
    });
    expect(brussels.groupFormUrls).toEqual(Object.fromEntries(
      groupFormKeys.map((key) => [key, formUrl]),
    ));
    expect(brussels.groupFormPresentation).toBe('iframe');
  });

  it('keeps closed days visible while omitting them from structured opening hours', () => {
    expect(locationHoursRows(brussels)).toEqual([
      { day: 'Monday', label: 'Closed' },
      { day: 'Tuesday', label: 'Closed' },
      { day: 'Wednesday', label: '14:00 – 20:00' },
      { day: 'Thursday', label: '16:00 – 23:00' },
      { day: 'Friday', label: '16:00 – 23:00' },
      { day: 'Saturday', label: '12:00 – 23:00' },
      { day: 'Sunday', label: '10:00 – 20:00' },
    ]);

    const business = localBusinessNode(brussels, '/brussels');
    expect(business?.openingHoursSpecification?.map(({ dayOfWeek, opens, closes }) => ({
      dayOfWeek,
      opens,
      closes,
    }))).toEqual([
      { dayOfWeek: 'Wednesday', opens: '14:00', closes: '20:00' },
      { dayOfWeek: 'Thursday', opens: '16:00', closes: '23:00' },
      { dayOfWeek: 'Friday', opens: '16:00', closes: '23:00' },
      { dayOfWeek: 'Saturday', opens: '12:00', closes: '23:00' },
      { dayOfWeek: 'Sunday', opens: '10:00', closes: '20:00' },
    ]);
  });

  it('keeps the Brussels inquiry form inside the EU profile only', () => {
    const eu = resolveSiteProfile({ TM_SITE_PROFILE: 'eu' });
    const us = resolveSiteProfile({ TM_SITE_PROFILE: 'us' });

    expect(publicLocationForProfile(brussels, eu).groupFormUrls).toEqual(brussels.groupFormUrls);
    expect(publicLocationForProfile(brussels, eu).groupFormPresentation).toBe('iframe');
    expect(publicLocationForProfile(brussels, us).groupFormUrls).toBeUndefined();
    expect(publicLocationForProfile(brussels, us).groupFormPresentation).toBeUndefined();
  });

  it('keeps the CMS override and EU delivery routing aligned with the fallback data', () => {
    const migrationName = '20260831_090000_brussels_operational_details';
    const migration = read(`cms/migrations/${migrationName}.ts`);
    const snapshot = read('cms/migration-data/20260831_brussels_operational_details_snapshot.ts');
    const migrationIndex = read('cms/migrations/index.ts');

    expect(migrationIndex).toContain(migrationName);
    expect(migration).toContain('export async function up');
    expect(migration).toContain('export async function down');
    expect(migration).toContain('BRUSSELS_OPERATIONAL_DETAILS_SNAPSHOT');
    expect(migration).toContain('location_details_group_form_urls');
    expect(snapshot).toContain(formUrl);
    expect(read('wrangler.eu.toml.tmpl')).toContain(
      'CONTACT_TO_EMAIL_BRUSSELS = "brussels@timemission.com"',
    );
  });
});
