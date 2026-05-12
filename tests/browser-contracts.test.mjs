import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

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
    history: { replaceState() {} },
    matchMedia() { return { matches: false }; },
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
  };
  return { context, window, document };
}

function runScript(rel, context) {
  vm.runInNewContext(readScript(rel), context, { filename: rel });
}

describe('browser architecture contracts', () => {
  it('real location data includes audit-provided booking, group form, widget, and waiver links', () => {
    const doc = JSON.parse(fs.readFileSync(path.join(root, 'data', 'locations.json'), 'utf8'));
    const byId = new Map((doc.locations || []).map((loc) => [loc.id, loc]));

    expect(byId.get('manassas')?.groupFormUrls?.corporate)
      .toBe('https://webforms.pipedrive.com/f/64NrjaZAs4GrLYSqpDDV0mzG46uGMN5cXrzEoAIjKKghJOzCRVmfw4mWkghflYR3Qn');
    expect(byId.get('mount-prospect')?.groupFormUrls?.birthdays)
      .toBe('https://webforms.pipedrive.com/f/6xKWqqzjoNTaJIqvmk5k2tRDTavPGnfToLuCSJCsKNa5PmDkPpfEWTYgx2MiTMmQjp');
    expect(byId.get('philadelphia')?.groupFormUrls?.['private-events'])
      .toBe('https://forms.roller.app/#/timemissionphiladelphiapa/1446ba8be6094ad/form');
    expect(byId.get('west-nyack')?.briqWidget?.domain).toBe('timemission-palisades');
    expect(byId.get('lincoln')?.groupFormUrls?.holidays)
      .toBe('https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959');
    expect(byId.get('antwerp')?.groupFormUrls?.['field-trips'])
      .toBe('https://www.experience-factory.com/antwerp/online-booking/#your-group=groups-of-friends&your-favorite-experience=time-mission');
    expect(byId.get('manassas')?.waiverUrl).toBe('https://waiver.roller.app/TimeMissionManassasMall');
    expect(byId.get('philadelphia')?.waiverUrl).toBe('https://waiver.roller.app/TimeMissionPhiladelphiaPA');
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
            status: 'coming-soon',
            bookingUrl: 'https://fallback.example/houston',
            giftCardUrl: 'https://gift.example/houston',
            groupFormUrls: {},
          },
        ],
      },
    });

    runScript('js/locations.js', context);
    runScript('js/booking-controller.js', context);
    await Promise.resolve();
    await Promise.resolve();

    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'manassas' }))
      .toBe('https://checkout.example/manassas');
    expect(window.LocationContext.resolveBookingUrl('tickets', 'manassas'))
      .toBe('https://checkout.example/manassas');
    expect(window.LocationContext.resolveBookingUrl('gift-cards', 'manassas'))
      .toBe('https://gift.example/manassas');
    expect(window.TMBooking.getDestination({
      kind: 'groups',
      groupType: 'corporate',
      locationId: 'manassas',
    })).toBe('https://forms.example/manassas-corporate');
    expect(window.LocationContext.resolveBookingUrl('groups', 'manassas', { groupType: 'birthdays' }))
      .toBe('https://forms.example/manassas-birthdays');
    expect(window.TMBooking.getDestination({ kind: 'waiver', locationId: 'manassas' }))
      .toBe('https://waiver.example/manassas');
    expect(window.LocationContext.resolveBookingUrl('tickets', 'houston'))
      .toBe('/houston');
    expect(window.TMBooking.getDestination({
      kind: 'tickets',
      locationId: 'manassas',
      preferLocationPageFlow: true,
    })).toBe('/manassas?book=1');
  });
});
