import { describe, expect, it } from 'vitest';
import {
  createAnchor,
  createBrowserContext,
  runScript,
} from './browser-contract-helpers.mjs';

describe('browser navigation contracts', () => {
  it('navigation links carry the selected location through shared pages', async () => {
    let subscriber = null;
    const anchors = [
      createAnchor('/', { className: 'nav-logo' }),
      createAnchor('/about'),
      createAnchor('/groups/corporate?utm_source=test#details'),
      createAnchor('/philadelphia'),
      createAnchor('/contact'),
      createAnchor('/mount-prospect', { closestSelectors: ['.footer-location-list'] }),
      createAnchor('https://example.com/about'),
      createAnchor('mailto:hello@example.com'),
    ];
    const { context, window, document } = createBrowserContext({
      TM: {
        ready: Promise.resolve(),
        current: {
          id: 'mount-prospect',
          slug: 'mount-prospect',
          shortName: 'Mount Prospect',
        },
        locations: [
          { id: 'mount-prospect', slug: 'mount-prospect', shortName: 'Mount Prospect' },
          { id: 'philadelphia', slug: 'philadelphia', shortName: 'Philadelphia' },
        ],
        normalizeSlug(value) {
          return String(value || '').toLowerCase().trim().replace(/\s+/g, '-');
        },
        onChange(callback) {
          subscriber = callback;
          return function unsubscribe() {};
        },
      },
    });
    window.location.origin = 'https://timemission.com';
    document.querySelectorAll = (selector) => (selector === 'a[href]' ? anchors : []);

    runScript('js/nav.js', context);
    await Promise.resolve();

    expect(anchors[0].getAttribute('href')).toBe('/mount-prospect');
    expect(anchors[1].getAttribute('href')).toBe('/mount-prospect/about');
    expect(anchors[2].getAttribute('href')).toBe('/mount-prospect/groups/corporate?utm_source=test#details');
    expect(anchors[3].getAttribute('href')).toBe('/philadelphia');
    expect(anchors[4].getAttribute('href')).toBe('/mount-prospect/contact');
    expect(anchors[5].getAttribute('href')).toBe('/mount-prospect');
    expect(anchors[6].getAttribute('href')).toBe('https://example.com/about');
    expect(anchors[7].getAttribute('href')).toBe('mailto:hello@example.com');

    window.TM.current = { id: 'houston', slug: 'houston', shortName: 'Houston' };
    window.TM.locations.push({ id: 'houston', slug: 'houston', shortName: 'Houston' });
    subscriber(window.TM.current);

    expect(anchors[0].getAttribute('href')).toBe('/houston');
    expect(anchors[1].getAttribute('href')).toBe('/houston/about');
    expect(anchors[2].getAttribute('href')).toBe('/houston/groups/corporate?utm_source=test#details');
  });

  it('navigation links still scope when nav.js loads before locations.js', async () => {
    const anchors = [
      createAnchor('/'),
      createAnchor('/about'),
    ];
    const { context, window, document } = createBrowserContext();
    window.location.origin = 'https://timemission.com';
    document.querySelectorAll = (selector) => (selector === 'a[href]' ? anchors : []);

    runScript('js/nav.js', context);
    expect(anchors[0].getAttribute('href')).toBe('/');

    window.TM = {
      current: {
        id: 'west-nyack',
        slug: 'west-nyack',
        shortName: 'West Nyack',
      },
      locations: [
        { id: 'west-nyack', slug: 'west-nyack', shortName: 'West Nyack' },
      ],
      normalizeSlug(value) {
        return String(value || '').toLowerCase().trim().replace(/\s+/g, '-');
      },
    };
    document.dispatchEvent({
      type: 'tm:locations-ready',
      detail: window.TM.current,
    });

    expect(anchors[0].getAttribute('href')).toBe('/west-nyack');
    expect(anchors[1].getAttribute('href')).toBe('/west-nyack/about');
  });
});
