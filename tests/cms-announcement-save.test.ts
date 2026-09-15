import { describe, expect, it } from 'vitest';
import { announcementDataChanged, announcementDateForSave } from '../cms/lib/announcement-authoring';

describe('announcement save preservation', () => {
  it('keeps the exact local-midnight instant when the displayed date is unchanged', () => {
    expect(announcementDateForSave('2026-10-01', '2026-10-01T05:00:00.000Z', '2026-10-01T23:59:59.999Z'))
      .toBe('2026-10-01T05:00:00.000Z');
  });
  it('applies an explicitly changed or cleared date', () => {
    expect(announcementDateForSave('2026-10-02', '2026-10-01T05:00:00.000Z', '2026-10-02T23:59:59.999Z'))
      .toBe('2026-10-02T23:59:59.999Z');
    expect(announcementDateForSave('', '2026-10-01T05:00:00.000Z', null)).toBeNull();
  });
  it('does not rewrite rows for empty optional fields, target order, or database IDs', () => {
    expect(announcementDataChanged({
      message: 'School nights', linkUrl: null,
      targetLocations: [{ id: 'a', locationSlug: 'houston' }, { id: 'b', locationSlug: 'manassas' }],
    }, {
      message: 'School nights', linkUrl: '',
      targetLocations: [{ locationSlug: 'manassas' }, { locationSlug: 'houston' }],
    })).toBe(false);
  });
  it('detects a real message, permission-state, or targeting change', () => {
    expect(announcementDataChanged({ message: 'Old' }, { message: 'New' })).toBe(true);
    expect(announcementDataChanged({ published: true }, { published: false })).toBe(true);
    expect(announcementDataChanged({ targetLocations: [] }, { targetLocations: [{ locationSlug: 'houston' }] })).toBe(true);
  });
});
