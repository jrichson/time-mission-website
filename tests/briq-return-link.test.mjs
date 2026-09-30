import { describe, expect, it } from 'vitest';
import { createBrowserContext, runScript } from './browser-contract-helpers.mjs';

const palisades = {
  id: 'west-nyack', slug: 'west-nyack', status: 'open',
  bookingProvider: 'briq', briqWidget: { domain: 'timemission-palisades' },
};

describe('Briq hosted booking return links', () => {
  it.each([
    ['#bwr=o|is|true', [palisades], '/west-nyack?book=1&utm_source=email'],
    ['#bwr=bu|is|timemission-palisades|and|o|is|true', [palisades], '/west-nyack?book=1&utm_source=email'],
    ['#bwr=bu|is|unknown|and|o|is|true', [palisades], ''],
    ['#bwr=o|is|false', [palisades], ''],
    ['#bwr=o|is|true', [palisades, { ...palisades, id: 'other', slug: 'other', briqWidget: { domain: 'other' } }], ''],
  ])('routes %s only when the venue is unambiguous', async (hash, locations, destination) => {
    const { context, window } = createBrowserContext({
      TM: { locations, ready: Promise.resolve() },
      TMBookingNavigationAdapters: {},
    });
    window.location.hash = hash;
    window.location.search = '?utm_source=email';
    runScript('js/booking-journey.js', context);
    runScript('js/booking-controller.js', context);
    await Promise.resolve();
    expect(window.location.href).toBe(destination);
  });
});
