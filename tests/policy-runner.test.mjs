import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { locationsFingerprintFromRecords } from '../src/lib/locations-fingerprint.ts';
import { runPolicies } from '../scripts/lib/policy-runner.js';

const require = createRequire(import.meta.url);
const bookingPolicies = require('../scripts/policies/booking-policies.cjs');

describe('policy-runner (golden)', () => {
  it('flags forbidden bookingUrls map in ticket-panel', () => {
    const errors = [];
    const subset = bookingPolicies.filter((p) => p.id === 'no-ticket-panel-booking-urls-map');
    runPolicies('/virtual', subset, errors, { 'js/ticket-panel.js': 'var bookingUrls = {};' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('passes clean ticket-panel snippet for bookingUrls rule', () => {
    const errors = [];
    const subset = bookingPolicies.filter((p) => p.id === 'no-ticket-panel-booking-urls-map');
    runPolicies('/virtual', subset, errors, {
      'js/ticket-panel.js': '// no inline maps\nfunction getTMBooking() { return window.TMBooking; }',
    });
    expect(errors).toEqual([]);
  });
});

describe('locations fingerprint', () => {
  it('is stable under reorder', () => {
    const locs = [
      { id: 'z', status: 'open' },
      { id: 'a', status: 'coming-soon' },
    ];
    const a = locationsFingerprintFromRecords(locs);
    const b = locationsFingerprintFromRecords([locs[1], locs[0]]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('TMFacade wiring', () => {
  it('booking-controller assigns window.TMFacade', () => {
    const src = fs.readFileSync(path.join(__dirname, '../js/booking-controller.js'), 'utf8');
    expect(src.includes('window.TMFacade')).toBe(true);
  });
});
