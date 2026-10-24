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

describe('Briq payment redirect returns', () => {
  const b64 = (raw) => Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const atob = (value) => Buffer.from(value, 'base64').toString('binary');

  it.each([
    ['Stripe return with bw hash', '?payment_intent=pi_1&payment_intent_client_secret=s&redirect_status=succeeded', `#bw=${b64('bk|is|BK1|and|sk|is|SK1|and|pk|is|PK1|and|bu|is|timemission-palisades')}`, [palisades], 1],
    ['pay-by-link return with raw state', '', '#bwr=bk|is|BK1|and|sk|is|SK1|and|bu|is|timemission-palisades|and|ws|is|CheckPaymentStatus|and|o|is|true', [palisades], 1],
    ['Stripe query only', '?payment_intent=pi_1&redirect_status=succeeded', '', [palisades], 1],
    ['unknown business unit', '', `#bw=${b64('bk|is|BK1|and|bu|is|unknown')}`, [palisades], 0],
    ['ambiguous venue', '?payment_intent=pi_1&redirect_status=succeeded', '', [palisades, { ...palisades, id: 'other', slug: 'other', briqWidget: { domain: 'other' } }], 0],
  ])('resumes the widget in place for a %s', async (_label, search, hash, locations, expectedCalls) => {
    const resumed = [];
    const { context, window } = createBrowserContext({
      TM: { locations, ready: Promise.resolve() },
      TMBookingNavigationAdapters: {},
      TMBookingBriq: { resume(loc) { resumed.push(loc.slug); return true; } },
      atob,
    });
    window.location.search = search;
    window.location.hash = hash;
    runScript('js/booking-journey.js', context);
    runScript('js/booking-controller.js', context);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(resumed).toEqual(expectedCalls ? ['west-nyack'] : []);
    // The payment state must stay in the URL for Briq to read it.
    expect(window.location.href).toBe('');
  });
});
