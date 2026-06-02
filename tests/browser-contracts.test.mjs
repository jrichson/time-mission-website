import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { getPublicSiteContract } from '../src/lib/site-contract.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const locationDoc = JSON.parse(fs.readFileSync(path.join(root, 'data', 'locations.json'), 'utf8'));
const locationRecords = locationDoc.locations || [];
const groupTypes = [
  'birthdays',
  'corporate',
  'field-trips',
  'bachelor-ette',
  'private-events',
  'holidays',
];

function readScript(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      const arr = listeners.get(type) || [];
      arr.push(listener);
      listeners.set(type, arr);
    },
    removeEventListener(type, listener) {
      const arr = listeners.get(type) || [];
      listeners.set(type, arr.filter((fn) => fn !== listener));
    },
    dispatchEvent(event) {
      const arr = listeners.get(event.type) || [];
      for (const listener of arr) listener.call(this, event);
      return true;
    },
  };
}

function createCustomEvent(type, init = {}) {
  return { type, detail: init.detail };
}

function createBrowserContext(extraWindow = {}) {
  const local = new Map();
  const document = {
    ...createEventTarget(),
    readyState: 'complete',
    body: { dataset: {}, style: {} },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        style: {},
        dataset: {},
        children: [],
        setAttribute(name, value) { this[name] = value; },
        appendChild(child) { this.children.push(child); return child; },
        addEventListener() {},
      };
    },
    createTextNode(text) { return { textContent: text }; },
    dispatchEvent: createEventTarget().dispatchEvent,
  };
  Object.assign(document, createEventTarget());

  const window = {
    ...createEventTarget(),
    document,
    console,
    CustomEvent: createCustomEvent,
    location: {
      pathname: '/',
      search: '',
      href: '',
      assign(url) { this.href = url; },
    },
    openCalls: [],
    open(url, target, features) {
      this.openCalls.push({ features, target, url });
      return { opener: null };
    },
    history: { replaceState() {} },
    matchMedia() { return { matches: false }; },
    navigator: {
      language: 'en-US',
      languages: ['en-US'],
    },
    requestAnimationFrame(cb) { cb(); },
    setTimeout,
    clearTimeout,
    localStorage: {
      getItem(key) { return local.has(key) ? local.get(key) : null; },
      setItem(key, value) { local.set(key, String(value)); },
      removeItem(key) { local.delete(key); },
    },
    sessionStorage: {
      getItem() { return null; },
      setItem() {},
    },
    dataLayer: [],
    __TM_SITE_CONTRACT__: getPublicSiteContract(),
    ...extraWindow,
  };

  const context = {
    window,
    document,
    console,
    CustomEvent: createCustomEvent,
    setTimeout,
    clearTimeout,
    Promise,
    Date,
    URL,
    URLSearchParams,
    navigator: window.navigator,
    localStorage: window.localStorage,
    sessionStorage: window.sessionStorage,
  };
  return { context, window, document };
}

function runScript(rel, context) {
  vm.runInNewContext(readScript(rel), context, { filename: rel });
}

function createAnchor(href, options = {}) {
  const attrs = new Map(Object.entries(options.attrs || {}));
  attrs.set('href', href);
  const classes = new Set(String(options.className || '').split(/\s+/).filter(Boolean));
  const closestSelectors = new Set(options.closestSelectors || []);
  return {
    dataset: options.dataset || {},
    style: {},
    href,
    textContent: options.textContent || '',
    classList: {
      contains(name) {
        return classes.has(name);
      },
      add(name) {
        classes.add(name);
      },
      remove(name) {
        classes.delete(name);
      },
    },
    getAttribute(name) {
      return attrs.has(name) ? attrs.get(name) : null;
    },
    setAttribute(name, value) {
      attrs.set(name, String(value));
      if (name === 'href') this.href = String(value);
    },
    removeAttribute(name) {
      attrs.delete(name);
    },
    hasAttribute(name) {
      return attrs.has(name);
    },
    closest(selector) {
      return closestSelectors.has(selector) ? this : null;
    },
    addEventListener() {},
  };
}

describe('browser architecture contracts', () => {
  it('real location data exposes required external routing facts', () => {
    const byId = new Map(locationRecords.map((loc) => [loc.id, loc]));
    const requireUrl = (locationId, field, value) => {
      expect(value, `${locationId}.${field}`).toMatch(/^https?:\/\//);
    };

    for (const locationId of [
      'mount-prospect',
      'west-nyack',
      'lincoln',
      'manassas',
      'houston',
      'antwerp',
      'orland-park',
    ]) {
      const groupFormUrls = byId.get(locationId)?.groupFormUrls || {};
      for (const groupType of groupTypes) {
        requireUrl(locationId, `groupFormUrls.${groupType}`, groupFormUrls[groupType]);
      }
    }

    for (const locationId of ['mount-prospect', 'lincoln', 'manassas', 'orland-park']) {
      requireUrl(locationId, 'giftCardUrl', byId.get(locationId)?.giftCardUrl);
    }

    for (const locationId of ['mount-prospect', 'manassas', 'houston', 'orland-park']) {
      requireUrl(locationId, 'waiverUrl', byId.get(locationId)?.waiverUrl);
    }

    expect(byId.get('philadelphia')?.status).toBe('temporarily-closed');
    expect(byId.get('philadelphia')?.bookingUrl).toBe('');
    expect(byId.get('philadelphia')?.rollerCheckoutUrl).toBe('');
    expect(byId.get('philadelphia')?.groupFormUrls).toEqual({});
    expect(byId.get('west-nyack')?.briqWidget?.domain).toBe('timemission-palisades');
    expect(byId.get('antwerp')?.externalUrl).toBe('https://timemission.eu/antwerp');
    expect(byId.get('brussels')?.externalUrl).toBe('https://timemission.eu/brussels');
    expect(byId.get('brussels')?.navLabel).toBe('Belgium – Brussels');
    expect(byId.get('brussels')?.openingDate).toBe('2026-06-18');
    expect(byId.get('brussels')?.openingLabel).toBe('Opening June 18, 2026');
  });

  it('TMConsent.update notifies document and window listeners with the same state', () => {
    const gtagCalls = [];
    const { context, window, document } = createBrowserContext({
      __TM_CONSENT_STATE__: { analytics_storage: 'denied' },
      gtag: (...args) => gtagCalls.push(args),
    });
    const seen = [];
    document.addEventListener('tm:consent-updated', (event) => {
      seen.push(['document', event.detail.analytics_storage]);
    });
    window.addEventListener('tm:consent-updated', (event) => {
      seen.push(['window', event.detail.analytics_storage]);
    });

    runScript('js/consent-bridge.js', context);
    const state = window.TMConsent.update({ analytics_storage: 'granted' });

    expect(state.analytics_storage).toBe('granted');
    expect(window.__TM_CONSENT_STATE__.analytics_storage).toBe('granted');
    expect(gtagCalls).toEqual([['consent', 'update', { analytics_storage: 'granted' }]]);
    expect(seen).toEqual([
      ['document', 'granted'],
      ['window', 'granted'],
    ]);
  });

  it('cookie banner consent flows through TMConsent.update', () => {
    const { context, window, document } = createBrowserContext({
      __TM_TAGGING_CONFIG__: { consent_profile: 'eu_strict' },
      __TM_CONSENT_STATE__: {},
    });
    const seen = [];
    document.addEventListener('tm:consent-updated', (event) => {
      seen.push(['document', event.detail.ad_storage]);
    });
    window.addEventListener('tm:consent-updated', (event) => {
      seen.push(['window', event.detail.ad_storage]);
    });

    runScript('js/consent-bridge.js', context);
    window.CookieConsent = {
      run(config) {
        config.onConsent({
          cookie: { categories: ['analytics', 'marketing'] },
        });
      },
    };
    runScript('js/cookie-consent.js', context);

    expect(window.__TM_CONSENT_STATE__).toMatchObject({
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
    expect(seen).toEqual([
      ['document', 'granted'],
      ['window', 'granted'],
    ]);
  });

  it('LocationContext delegates booking URL decisions to TMBooking after both scripts load', async () => {
    const { context, window } = createBrowserContext({
      TM_DATA: {
        locations: [
          {
            id: 'manassas',
            slug: 'manassas',
            status: 'open',
            rollerCheckoutUrl: 'https://checkout.example/manassas',
            bookingUrl: 'https://fallback.example/manassas',
            giftCardUrl: 'https://gift.example/manassas',
            groupFormUrls: {
              corporate: 'https://forms.example/manassas-corporate',
              birthdays: 'https://forms.example/manassas-birthdays',
            },
            waiverUrl: 'https://waiver.example/manassas',
          },
          {
            id: 'houston',
            slug: 'houston',
            shortName: 'Houston',
            region: 'us',
            status: 'coming-soon',
            address: {
              city: 'Houston',
              state: 'TX',
              country: 'United States',
            },
            openingLabel: 'Opening June 5, 2026',
            bookingUrl: 'https://checkout.example/houston',
            rollerCheckoutUrl: 'https://checkout.example/houston',
            giftCardUrl: '',
            groupFormUrls: {},
          },
          {
            id: 'antwerp',
            slug: 'antwerp',
            shortName: 'Antwerp',
            region: 'europe',
            status: 'open',
            externalUrl: 'https://timemission.eu/antwerp',
            navLabel: 'Belgium – Antwerp',
            bookingUrl: 'https://experience.example/antwerp',
            groupFormUrls: {
              corporate: 'https://experience.example/antwerp-corporate',
            },
          },
          {
            id: 'brussels',
            slug: 'brussels',
            shortName: 'Brussels',
            region: 'europe',
            status: 'coming-soon',
            openingDate: '2026-06-18',
            openingLabel: 'Opening June 18, 2026',
            externalUrl: 'https://timemission.eu/brussels',
            navLabel: 'Belgium – Brussels',
            bookingUrl: '',
            giftCardUrl: '',
            groupFormUrls: {},
          },
          {
            id: 'west-nyack',
            slug: 'west-nyack',
            status: 'open',
            bookingProvider: 'briq',
            bookingUrl: 'https://timemission-palisades.briqbookings.com',
            briqWidget: {
              domain: 'timemission-palisades',
            },
            giftCardUrl: 'https://timemission-palisades.briqbookings.com',
            groupFormUrls: {
              corporate: 'https://timemission-palisades.briqbookings.com',
              'private-events': 'https://timemission-palisades.briqbookings.com',
            },
          },
          {
            id: 'dallas',
            slug: 'dallas',
            status: 'coming-soon',
            bookingUrl: '',
            giftCardUrl: '',
            groupFormUrls: {},
          },
        ],
      },
    });

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    runScript('js/booking-frame.js', context);
    runScript('js/booking-provider-briq.js', context);
    runScript('js/booking-controller.js', context);
    await Promise.resolve();
    await Promise.resolve();

    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'manassas' }))
      .toBe('https://checkout.example/manassas');
    expect(window.TMBooking.resolveIntent({ kind: 'tickets', locationId: 'manassas' }))
      .toMatchObject({
        href: 'https://checkout.example/manassas',
        presentation: 'roller',
        usesRollerCheckout: true,
      });
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'manassas' }))
      .toBe('https://checkout.example/manassas');
    expect(window.LocationContext.getOverlayView('manassas').cta)
      .toMatchObject({
        href: '#',
        bookingUrl: 'https://checkout.example/manassas',
        trigger: true,
        externalLocation: false,
      });
    const manassasCta = createAnchor('#');
    window.TMBookingJourney.applyCtaView(manassasCta, window.LocationContext.getOverlayView('manassas').cta);
    expect(manassasCta.getAttribute('data-tm-booking-trigger')).toBe('');
    expect(manassasCta.getAttribute('data-tm-booking-url')).toBe('https://checkout.example/manassas');
    expect(manassasCta.getAttribute('data-tm-location')).toBe('manassas');
    expect(manassasCta.getAttribute('target')).toBeNull();
    expect(manassasCta.getAttribute('rel')).toBeNull();
    expect(window.TMBooking.getDestination({ kind: 'gift-cards', locationId: 'manassas' }))
      .toBe('https://gift.example/manassas');
    expect(window.TMBooking.getDestination({
      kind: 'groups',
      groupType: 'corporate',
      locationId: 'manassas',
    })).toBe('https://forms.example/manassas-corporate');
    const manassasGroupIntent = window.TMBooking.resolveIntent({
      kind: 'groups',
      groupType: 'corporate',
      locationId: 'manassas',
    });
    const manassasGroupCta = createAnchor('#');
    window.TMBookingJourney.applyCtaView(
      manassasGroupCta,
      window.TMBookingJourney.ctaAttributesForIntent(manassasGroupIntent),
    );
    expect(manassasGroupCta.getAttribute('target')).toBe('_blank');
    expect(manassasGroupCta.getAttribute('rel')).toBe('noopener');
    expect(window.TMBooking.getDestination({
      kind: 'groups',
      groupType: 'birthdays',
      locationId: 'manassas',
    }))
      .toBe('https://forms.example/manassas-birthdays');
    expect(window.TMBooking.getDestination({ kind: 'waiver', locationId: 'manassas' }))
      .toBe('https://waiver.example/manassas');
    window.TMBooking.navigate({
      source: 'waiver_test',
      href: 'https://waiver.example/manassas',
      kind: 'waiver',
      locationId: 'manassas',
      event: { preventDefault() {} },
    });
    expect(window.openCalls.at(-1)).toEqual({
      features: 'noopener',
      target: '_blank',
      url: 'https://waiver.example/manassas',
    });
    expect(window.location.href).toBe('');
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'houston' }))
      .toBe('https://checkout.example/houston');
    expect(window.LocationContext.getLocationView('houston'))
      .toMatchObject({
        hoursText: 'Opening June 5, 2026',
        openingLabel: 'Opening June 5, 2026',
      });
    expect(window.LocationContext.listTicketOptions().find((opt) => opt.value === 'houston')?.label)
      .toBe('TX – Houston (Opening June 5, 2026)');
    expect(window.LocationContext.listTicketOptions().find((opt) => opt.value === 'antwerp')?.label)
      .toBe('Belgium – Antwerp');
    expect(window.LocationContext.listTicketOptions().find((opt) => opt.value === 'brussels')?.label)
      .toBe('Belgium – Brussels (Opening June 18, 2026)');
    expect(window.TMBooking.getDestination({ kind: 'groups', locationId: 'houston' }))
      .toBe('');
    expect(window.TMBooking.getDestination({ kind: 'gift-cards', locationId: 'houston' }))
      .toBe('');
    expect(window.TMBooking.getDestination({ kind: 'waiver', locationId: 'houston' }))
      .toBe('');
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'antwerp' }))
      .toBe('https://experience.example/antwerp');
    expect(window.TMBooking.resolveIntent({ kind: 'tickets', locationId: 'antwerp' }))
      .toMatchObject({
        href: 'https://experience.example/antwerp',
        presentation: 'link',
        externalLocationSite: false,
      });
    expect(window.TMBooking.getDestination({
      kind: 'groups',
      groupType: 'corporate',
      locationId: 'antwerp',
    }))
      .toBe('https://experience.example/antwerp-corporate');
    expect(window.TMBooking.getDestination({ kind: 'gift-cards', locationId: 'antwerp' }))
      .toBe('');
    expect(window.LocationContext.getOverlayView('antwerp').cta)
      .toMatchObject({
        href: 'https://timemission.eu/antwerp',
        bookingUrl: '',
        trigger: false,
        externalLocation: true,
      });
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'brussels' }))
      .toBe('https://timemission.eu/brussels');
    expect(window.LocationContext.getOverlayView('brussels').cta)
      .toMatchObject({
        href: 'https://timemission.eu/brussels',
        bookingUrl: '',
        trigger: false,
        externalLocation: true,
      });
    window.localStorage.setItem('tm_location', 'antwerp');
    window.LocationContext.select('antwerp');
    expect(window.LocationContext.getCurrent()?.slug).toBe('antwerp');
    expect(window.LocationContext.getSavedSlug()).toBe('');
    expect(window.localStorage.getItem('tm_location')).toBeNull();
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'west-nyack' }))
      .toBe('#briq-widget-container');
    expect(window.TMBooking.resolveIntent({ kind: 'tickets', locationId: 'west-nyack' }))
      .toMatchObject({
        href: '#briq-widget-container',
        presentation: 'briq-widget',
        usesBriqWidget: true,
      });
    expect(window.TMBooking.getDestination({
      kind: 'groups',
      groupType: 'corporate',
      locationId: 'west-nyack',
    }))
      .toBe('#briq-widget-container');
    expect(window.TMBooking.getDestination({
      kind: 'groups',
      groupType: 'private-events',
      locationId: 'west-nyack',
    }))
      .toBe('#briq-widget-container');
    expect(window.TMBooking.resolveIntent({
      kind: 'groups',
      groupType: 'private-events',
      locationId: 'west-nyack',
    }))
      .toMatchObject({
        href: '#briq-widget-container',
        presentation: 'briq-widget',
        usesBriqWidget: true,
      });
    expect(window.LocationContext.getOverlayView('west-nyack').cta)
      .toMatchObject({
        href: '#',
        bookingUrl: '#briq-widget-container',
        trigger: true,
      });
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'dallas' }))
      .toBe('/contact#location=dallas&type=updates');
    expect(window.TMBooking.getDestination({ kind: 'groups', groupType: 'corporate', locationId: 'dallas' }))
      .toBe('');
    expect(window.TMBooking.getDestination({ kind: 'gift-cards', locationId: 'dallas' }))
      .toBe('');
    expect(window.TMBooking.getDestination({ kind: 'waiver', locationId: 'dallas' }))
      .toBe('');
    expect(window.LocationContext.getOverlayView('dallas').cta)
      .toMatchObject({
        href: '/contact#location=dallas&type=updates',
        bookingUrl: '',
        trigger: false,
      });
    expect(window.LocationContext.getLocationView('dallas'))
      .toMatchObject({
        bookUrl: '/contact#location=dallas&type=updates',
        bookLabel: 'Contact Us',
        comingSoon: true,
      });
    expect(window.TMBooking.getDestination({
      kind: 'tickets',
      locationId: 'manassas',
      preferLocationPageFlow: true,
    })).toBe('/manassas?book=1');
  });

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

  it('booking destinations preserve marketing params on external links and keep Briq local', async () => {
    const { context, window } = createBrowserContext({
      TM_DATA: {
        locations: [
          {
            id: 'lincoln',
            slug: 'lincoln',
            status: 'open',
            bookingUrl: 'https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959',
            giftCardUrl: '',
            groupFormUrls: {},
          },
          {
            id: 'west-nyack',
            slug: 'west-nyack',
            status: 'open',
            bookingProvider: 'briq',
            bookingUrl: 'https://timemission-palisades.briqbookings.com',
            briqWidget: { domain: 'timemission-palisades' },
            giftCardUrl: '',
            groupFormUrls: {},
          },
        ],
      },
    });
    window.location.search = '?utm_source=paid&utm_campaign=spring&gclid=abc123&book=1';

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    runScript('js/booking-frame.js', context);
    runScript('js/booking-provider-briq.js', context);
    runScript('js/booking-controller.js', context);
    await Promise.resolve();
    await Promise.resolve();

    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'lincoln' }))
      .toBe('https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959&utm_source=paid&utm_campaign=spring&gclid=abc123');
    expect(window.TMBooking.resolveIntent({ kind: 'tickets', locationId: 'lincoln' }))
      .toMatchObject({
        presentation: 'link',
        usesBookingFrame: false,
      });
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'west-nyack' }))
      .toBe('#briq-widget-container');
  });

  it('forces a venue-page reload if multiple Briq widget domains are configured', async () => {
    const { context, window } = createBrowserContext({
      TM_DATA: {
        locations: [
          {
            id: 'west-nyack',
            slug: 'west-nyack',
            status: 'open',
            bookingProvider: 'briq',
            bookingUrl: 'https://timemission-palisades.briqbookings.com',
            briqWidget: { domain: 'timemission-palisades' },
            groupFormUrls: {},
          },
          {
            id: 'future-briq',
            slug: 'future-briq',
            status: 'open',
            bookingProvider: 'briq',
            bookingUrl: 'https://future-briq.briqbookings.com',
            briqWidget: { domain: 'future-briq' },
            groupFormUrls: {},
          },
        ],
      },
    });

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    runScript('js/booking-frame.js', context);
    runScript('js/booking-provider-briq.js', context);
    runScript('js/booking-controller.js', context);
    await Promise.resolve();
    await Promise.resolve();

    window.TMBooking.navigate({
      source: 'test_briq_guard',
      href: '#briq-widget-container',
      kind: 'tickets',
      locationId: 'future-briq',
    });

    expect(window.location.href).toBe('/future-briq?book=1');
  });

  it('runtime group, gift-card, and waiver routing follows location data', async () => {
    const byId = new Map(locationRecords.map((loc) => [loc.id, loc]));
    const { context, window } = createBrowserContext({
      TM_DATA: locationDoc,
    });

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
    runScript('js/booking-frame.js', context);
    runScript('js/booking-provider-briq.js', context);
    runScript('js/booking-controller.js', context);
    await Promise.resolve();
    await Promise.resolve();

    for (const [locationId, loc] of byId) {
      const groupUrls = loc.groupFormUrls || {};
      for (const groupType of groupTypes) {
        const isWestNyackBriq = locationId === 'west-nyack' && !!groupUrls[groupType];
        const expectedRuntimeHref = loc.status === 'temporarily-closed'
          ? `/contact#location=${loc.slug || loc.id}&type=closure`
          : isWestNyackBriq
          ? '#briq-widget-container'
          : (groupUrls[groupType] || '');
        const expectedPresentation = isWestNyackBriq
          ? 'briq-widget'
          : (expectedRuntimeHref ? 'link' : 'panel');
        expect(window.TMBooking.getDestination({
          kind: 'groups',
          groupType,
          locationId,
        })).toBe(expectedRuntimeHref);
        expect(window.TMBooking.resolveIntent({
          kind: 'groups',
          groupType,
          locationId,
        })).toMatchObject({
          href: expectedRuntimeHref,
          presentation: expectedPresentation,
          usesBookingFrame: false,
        });
        if (isWestNyackBriq) {
          expect(window.TMBooking.resolveIntent({
            kind: 'groups',
            groupType,
            locationId,
          })).toMatchObject({
            href: '#briq-widget-container',
            presentation: 'briq-widget',
            usesBriqWidget: true,
          });
        }
      }
    }

    for (const [locationId, loc] of byId) {
      const expected = loc.status === 'temporarily-closed'
        ? `/contact#location=${loc.slug || loc.id}&type=closure`
        : loc.giftCardUrl || '';
      expect(window.TMBooking.getDestination({ kind: 'gift-cards', locationId })).toBe(expected);
    }

    for (const [locationId, loc] of byId) {
      const expected = loc.status === 'temporarily-closed'
        ? `/contact#location=${loc.slug || loc.id}&type=closure`
        : loc.waiverUrl || '';
      expect(window.TMBooking.getDestination({ kind: 'waiver', locationId })).toBe(expected);
    }
  });

  it('booking click handler prompts for tickets without a selected location but still navigates non-ticket links', async () => {
    const { context, window } = createBrowserContext();
    runScript('js/booking-journey.js', context);
    runScript('js/booking-frame.js', context);
    runScript('js/booking-provider-briq.js', context);
    runScript('js/booking-controller.js', context);

    function makeButton(attrs) {
      let clickHandler = null;
      const values = { ...attrs };
      return {
        className: 'btn-ticket-book',
        getAttribute(name) { return values[name] ?? null; },
        setAttribute(name, value) { values[name] = String(value); },
        removeAttribute(name) { delete values[name]; },
        addEventListener(type, handler) {
          if (type === 'click') clickHandler = handler;
        },
        removeEventListener() {},
        click() {
          clickHandler({
            currentTarget: this,
            preventDefault() {},
          });
        },
      };
    }

    const ticketCta = makeButton({
      href: '#',
      'data-tm-booking-url': 'https://checkout.example/manassas',
      'data-tm-booking-kind': 'tickets',
    });
    let opened = 0;
    window.TMBooking.attach(
      { querySelectorAll: () => [ticketCta] },
      { openPanel: () => { opened += 1; } },
    );
    ticketCta.click();
    expect(window.location.href).toBe('');
    expect(opened).toBe(1);

    const waiverCta = makeButton({
      href: '/waiver',
      'data-tm-booking-kind': 'waiver',
    });
    window.TMBooking.attach(
      { querySelectorAll: () => [waiverCta] },
      { openPanel: () => { opened += 1; } },
    );
    waiverCta.click();
    expect(window.location.href).toBe('/waiver');
    expect(opened).toBe(1);
  });

  it('TMI18n resolves fallback language codes and keeps switcher controls in sync', async () => {
    let changeHandler = null;
    const select = {
      value: 'en',
      addEventListener(type, handler) {
        if (type === 'change') changeHandler = handler;
      },
    };
    const navLabel = {
      textContent: 'About',
      getAttribute(name) { return name === 'data-i18n' ? 'nav.about' : null; },
    };
    const status = { textContent: '' };
    const form = { addEventListener() {} };
    const { context, window, document } = createBrowserContext({
      __TM_I18N__: {
        defaultLanguage: 'en',
        storageKey: 'tm_language',
        languages: [
          { code: 'en', htmlLang: 'en', label: 'English', nativeLabel: 'English', shortLabel: 'EN' },
          { code: 'es', htmlLang: 'es', label: 'Spanish', nativeLabel: 'Espanol', shortLabel: 'ES' },
        ],
        translations: {
          en: {
            'language.label': 'Language',
            'language.changed': 'Language set to {language}',
            'nav.about': 'About',
          },
          es: {
            'language.label': 'Idioma',
            'language.changed': 'Idioma cambiado a {language}',
            'nav.about': 'Acerca de',
          },
        },
      },
    });
    document.documentElement = { lang: 'en', dataset: {} };
    document.querySelectorAll = (selector) => {
      if (selector === '[data-language-switcher]') return [form];
      if (selector === '[data-language-select]') return [select];
      if (selector === '[data-i18n]') return [navLabel];
      if (selector === '[data-language-status]') return [status];
      return [];
    };

    const seen = [];
    document.addEventListener('tm:language-changed', (event) => seen.push(event.detail.language));
    runScript('js/language-switcher.js', context);
    await window.TMI18n.ready;

    select.value = 'es';
    changeHandler();

    expect(window.TMI18n.getLanguage()).toBe('es');
    expect(window.TMI18n.getLanguageView().nativeLabel).toBe('Espanol');
    expect(window.TMI18n.getLanguageView('nl')).toBeNull();
    expect(window.TMI18n.getSupportedLanguages().map((language) => language.code)).toEqual(['en', 'es']);
    expect(window.TMI18n.array('home.taglines', ['Fallback'])).toEqual(['Fallback']);
    expect(window.TMI18n.text('language.changed', 'Language set to {language}', { language: 'Espanol' }))
      .toBe('Idioma cambiado a Espanol');
    expect(document.documentElement.lang).toBe('es');
    expect(document.documentElement.dataset.tmLanguage).toBe('es');
    expect(navLabel.textContent).toBe('Acerca de');
    expect(status.textContent).toBe('Idioma cambiado a Espanol');
    expect(select.value).toBe('es');
    expect(window.localStorage.getItem('tm_language')).toBe('es');
    expect(seen).toContain('es');
  });
});
