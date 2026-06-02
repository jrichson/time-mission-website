import { describe, expect, it } from 'vitest';
import {
  createBrowserContext,
  runScript,
} from './browser-contract-helpers.mjs';

describe('browser location state contracts', () => {
  it('homepage clears stale saved location instead of restoring it on hard refresh', async () => {
    const { context, window } = createBrowserContext({
      TM_DATA: {
        locations: [
          {
            id: 'philadelphia',
            slug: 'philadelphia',
            name: 'Time Mission Philadelphia',
            shortName: 'Philadelphia',
            status: 'open',
            bookingUrl: 'https://book.philadelphia.timemission.com',
            rollerCheckoutUrl: 'https://book.philadelphia.timemission.com',
            groupFormUrls: {},
          },
        ],
      },
    });
    window.location.pathname = '/';
    window.localStorage.setItem('tm_location', 'philadelphia');
    window.localStorage.setItem('timeMissionLocation', 'Philadelphia');

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    await window.TM.ready;

    expect(window.TM.current).toBeNull();
    expect(window.LocationContext.getCurrent()).toBeNull();
    expect(window.LocationContext.getSavedSlug()).toBe('');
    expect(window.localStorage.getItem('tm_location')).toBeNull();
    expect(window.localStorage.getItem('timeMissionLocation')).toBeNull();
  });

  it('location-prefixed shared pages select the location from the URL', async () => {
    const { context, window } = createBrowserContext({
      TM_DATA: {
        locations: [
          {
            id: 'mount-prospect',
            slug: 'mount-prospect',
            name: 'Time Mission Mount Prospect',
            shortName: 'Mount Prospect',
            status: 'open',
            bookingUrl: 'https://book.mountprospect.timemission.com',
            rollerCheckoutUrl: 'https://book.mountprospect.timemission.com',
            groupFormUrls: {},
          },
        ],
      },
    });
    window.location.pathname = '/mount-prospect/about';
    window.localStorage.setItem('tm_location', 'philadelphia');

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    await window.TM.ready;

    expect(window.TM.current?.id).toBe('mount-prospect');
    expect(window.localStorage.getItem('tm_location')).toBeNull();
  });
});
