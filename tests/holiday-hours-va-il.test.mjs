import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allLocations } from '../src/data/locations';
import { locationHoursRows } from '../src/lib/location-view';
import { localBusinessNode } from '../src/lib/schema/localBusiness';
import { HOLIDAY_HOURS_VA_IL_SNAPSHOT as snapshot } from '../cms/migration-data/20261126_holiday_hours_va_il_snapshot';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fallback = JSON.parse(fs.readFileSync(path.join(root, 'data/locations.json'), 'utf8')).locations;

describe('Manassas, Mount Prospect and Orland Park holiday hours', () => {
  it('lists the venue-supplied dates in the code fallback', () => {
    for (const slug of snapshot.locations) {
      const location = fallback.find((candidate) => candidate.slug === slug);
      expect(location.specialHours).toEqual(snapshot.specialHours.map((row) => Object.fromEntries(
        Object.entries(row).filter(([, value]) => value != null),
      )));
    }
    expect(snapshot.specialHours.find((row) => row.date === '2026-11-26')).toMatchObject({ label: 'Closed', open: null });
    expect(snapshot.specialHours.find((row) => row.date === '2026-12-25')).toMatchObject({ open: '12:00', close: '00:00' });
  });

  it('shows upcoming holiday rows above the weekly hours and drops past ones', () => {
    for (const slug of snapshot.locations) {
      const location = allLocations.find((candidate) => candidate.slug === slug);
      const rows = locationHoursRows(location, new Date('2026-12-24T15:00:00Z'));
      expect(rows[0]).toEqual({ day: 'Christmas Eve, Dec 24', label: '11am - 8pm' });
      expect(rows.some((row) => row.day.startsWith('Black Friday'))).toBe(false);
      expect(rows.at(-1)).toEqual({ day: 'Sunday', label: '10am - 8pm' });
    }
  });

  it('publishes open holiday dates as special opening hours, skipping closed days', () => {
    const location = allLocations.find((candidate) => candidate.slug === 'manassas');
    const business = localBusinessNode(location, '/manassas', new Date('2026-11-26T15:00:00Z'));
    const specs = business?.specialOpeningHoursSpecification ?? [];
    expect(specs).toHaveLength(snapshot.specialHours.length - 1);
    expect(specs[0]).toMatchObject({ validFrom: '2026-11-27', opens: '11:00' });
  });
});
