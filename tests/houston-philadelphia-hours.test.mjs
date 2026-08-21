import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allLocations } from '../src/data/locations';
import { localBusinessNode } from '../src/lib/schema/localBusiness';
import { down as migrateDown, up as migrateUp } from '../cms/migrations/20260821_090000_houston_philadelphia_hours';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const locations = JSON.parse(read('data/locations.json')).locations;

describe('Houston and Philadelphia hours', () => {
  for (const slug of ['houston', 'philadelphia']) {
    it(`opens ${slug} at noon on weekdays and publishes Labor Day hours`, () => {
      const location = locations.find((candidate) => candidate.slug === slug);

      expect(location).toBeDefined();
      for (const day of ['mon', 'tue', 'wed', 'thu', 'fri']) {
        expect(location.hours[day].open).toBe('12:00');
        expect(location.hours[day].label).toMatch(/^12pm - /);
      }
      expect(location.hours.sat.open).toBe('10:00');
      expect(location.hours.sun.open).toBe('10:00');
      expect(location.specialHours).toEqual([
        {
          date: '2026-09-07',
          name: 'Labor Day',
          open: '10:00',
          close: '22:00',
          label: '10am - 10pm',
        },
      ]);
      expect(location.timeZone).toBe(slug === 'houston' ? 'America/Chicago' : 'America/New_York');
      expect(location.ticker).toBe(slug === 'houston' ? 'HOUSTON NOW OPEN' : 'PHILADELPHIA NOW OPEN');
    });
  }

  it('publishes the Labor Day exception in structured opening-hours data', () => {
    for (const slug of ['houston', 'philadelphia']) {
      const location = allLocations.find((candidate) => candidate.slug === slug);
      if (!location) throw new Error(`${slug} location missing`);

      const business = localBusinessNode(location, `/${slug}`, new Date('2026-08-21T12:00:00Z'));
      expect(business?.specialOpeningHoursSpecification).toEqual([
        {
          '@type': 'OpeningHoursSpecification',
          opens: '10:00',
          closes: '22:00',
          validFrom: '2026-09-07',
          validThrough: '2026-09-07',
        },
      ]);
    }
  });

  it('keeps the CMS location details and ticker in sync with the public fallback', () => {
    const migrationName = '20260821_090000_houston_philadelphia_hours';
    const migration = read(`cms/migrations/${migrationName}.ts`);
    const snapshot = read('cms/migration-data/20260821_houston_philadelphia_hours_snapshot.ts');
    const migrationIndex = read('cms/migrations/index.ts');

    expect(migrationIndex).toContain(migrationName);
    expect(migrateUp).toBeTypeOf('function');
    expect(migrateDown).toBeTypeOf('function');
    expect(migration).toContain('HOUSTON_PHILADELPHIA_HOURS_SNAPSHOT');
    expect(snapshot).toContain("open: '12:00'");
    expect(snapshot).toContain("label: '12pm - 10pm'");
    expect(snapshot).toContain("label: '12pm - 11pm'");
    expect(snapshot).toContain("message: 'LABOR DAY HOURS: 10AM - 10PM'");
    expect(snapshot).toContain("announcementEndsAt: '2026-09-08T05:00:00.000Z'");
    expect(snapshot).toContain("announcementEndsAt: '2026-09-08T04:00:00.000Z'");
    expect(snapshot).toContain("announcementTargetId: '20260821-labor-day-hours-houston'");
    expect(snapshot).toContain("announcementTargetId: '20260821-labor-day-hours-philadelphia'");
    expect(snapshot).toContain("slug: 'houston'");
    expect(snapshot).toContain("slug: 'philadelphia'");
    expect(migration).toContain('INSERT INTO "announcement_banners"');
    expect(migration).toContain('"starts_at"');
    expect(migration).toContain('"ends_at"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "location_details_special_hours"');
    expect(migration).toContain('ON CONFLICT ("id") DO NOTHING');
    expect(migration).toContain('"announcement_banners_target_locations"');
    expect(migration).toContain('AND "hours_fri_label" = ${weekdayHours.fri.label}');
  });
});
