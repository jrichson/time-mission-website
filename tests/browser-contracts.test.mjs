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
    navigator: window.navigator,
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
    expect(byId.get('antwerp')?.externalUrl).toBe('https://timemission.eu/antwerp');
    expect(byId.get('brussels')?.externalUrl).toBe('https://timemission.eu/brussels');
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
            bookingUrl: 'https://checkout.example/houston',
            rollerCheckoutUrl: 'https://checkout.example/houston',
            giftCardUrl: 'https://gift.example/houston',
            groupFormUrls: {},
          },
          {
            id: 'antwerp',
            slug: 'antwerp',
            status: 'open',
            externalUrl: 'https://timemission.eu/antwerp',
            bookingUrl: 'https://experience.example/antwerp',
            groupFormUrls: {
              corporate: 'https://experience.example/antwerp-corporate',
            },
          },
          {
            id: 'dallas',
            slug: 'dallas',
            status: 'coming-soon',
            bookingUrl: '',
            groupFormUrls: {},
          },
        ],
      },
    });

    runScript('js/booking-journey.js', context);
    runScript('js/location-catalog-view.js', context);
    runScript('js/locations.js', context);
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
    expect(window.TMBooking.getDestination({ kind: 'gift-cards', locationId: 'manassas' }))
      .toBe('https://gift.example/manassas');
    expect(window.TMBooking.getDestination({
      kind: 'groups',
      groupType: 'corporate',
      locationId: 'manassas',
    })).toBe('https://forms.example/manassas-corporate');
    expect(window.TMBooking.getDestination({
      kind: 'groups',
      groupType: 'birthdays',
      locationId: 'manassas',
    }))
      .toBe('https://forms.example/manassas-birthdays');
    expect(window.TMBooking.getDestination({ kind: 'waiver', locationId: 'manassas' }))
      .toBe('https://waiver.example/manassas');
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'houston' }))
      .toBe('https://checkout.example/houston');
    expect(window.TMBooking.getDestination({ kind: 'groups', locationId: 'houston' }))
      .toBe('https://checkout.example/houston');
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'antwerp' }))
      .toBe('https://timemission.eu/antwerp');
    expect(window.TMBooking.resolveIntent({ kind: 'tickets', locationId: 'antwerp' }))
      .toMatchObject({
        href: 'https://timemission.eu/antwerp',
        presentation: 'external-site',
        externalLocationSite: true,
      });
    expect(window.TMBooking.getDestination({
      kind: 'groups',
      groupType: 'corporate',
      locationId: 'antwerp',
    }))
      .toBe('https://timemission.eu/antwerp');
    expect(window.LocationContext.getOverlayView('antwerp').cta)
      .toMatchObject({
        href: 'https://timemission.eu/antwerp',
        bookingUrl: '',
        trigger: false,
        externalLocation: true,
      });
    expect(window.TMBooking.getDestination({ kind: 'tickets', locationId: 'dallas' }))
      .toBe('/dallas#newsletter');
    expect(window.LocationContext.getOverlayView('dallas').cta)
      .toMatchObject({
        href: '/dallas#newsletter',
        bookingUrl: '',
        trigger: false,
      });
    expect(window.LocationContext.getLocationView('dallas'))
      .toMatchObject({
        bookUrl: '/dallas#newsletter',
        bookLabel: 'Sign Up',
        comingSoon: true,
      });
    expect(window.TMBooking.getDestination({
      kind: 'tickets',
      locationId: 'manassas',
      preferLocationPageFlow: true,
    })).toBe('/manassas?book=1');
  });

  it('booking click handler prompts for tickets without a selected location but still navigates non-ticket links', async () => {
    const { context, window } = createBrowserContext();
    runScript('js/booking-journey.js', context);
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
