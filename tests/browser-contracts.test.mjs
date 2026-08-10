import { describe, expect, it } from 'vitest';
import {
  createBrowserContext,
  groupTypes,
  locationRecords,
  readScript,
  runScript,
} from './browser-contract-helpers.mjs';

describe('browser data, consent, and i18n contracts', () => {
  it('routes runtime-generated language surfaces through TMI18n', () => {
    const expectedKeys = {
      'js/a11y.js': ['a11y.skipToMain', 'a11y.selectLocationDialog', 'a11y.closeLocationSelector'],
      'js/page-gift-cards-after.js': ['gift.locationSpecific', 'gift.unavailableHint', 'gift.yourLocation'],
      'js/page-donation-after.js': ['donation.frameTitle', 'donation.comingSoon', 'donation.routedTo'],
      'js/group-inquiry-form.js': ['form.verifyHuman', 'form.sending'],
      'js/group-form-thank-you.js': ['groupThankYou.copy', 'groupThankYou.viewLocation'],
      'js/page-contact-after.js': ['contact.chooseLocationDirect', 'contact.unavailableDirect'],
      'js/booking-frame.js': ['booking.frame.bookLocation'],
      'js/booking-provider-briq.js': ['booking.briq.loading', 'booking.briq.delayed', 'booking.briq.open'],
      'js/locations.js': ['nav.selectLocation', 'location.name.'],
      'js/nav.js': ['a11y.map', 'location.name.'],
      'js/page-widgets.js': ['location.name.'],
      'js/page-widgets-tagline.js': ['location.name.'],
    };

    for (const [file, keys] of Object.entries(expectedKeys)) {
      const source = readScript(file);
      expect(source, file).toContain('window.TMI18n.text');
      for (const key of keys) expect(source, `${file}: ${key}`).toContain(`'${key}'`);
    }
  });

  it('real location data exposes required external routing facts', () => {
    const byId = new Map(locationRecords.map((loc) => [loc.id, loc]));
    const requireUrl = (locationId, field, value) => {
      expect(value, `${locationId}.${field}`).toMatch(/^https?:\/\//);
    };

    for (const locationId of [
      'west-nyack',
      'lincoln',
      'antwerp',
    ]) {
      const groupFormUrls = byId.get(locationId)?.groupFormUrls || {};
      for (const groupType of groupTypes) {
        requireUrl(locationId, `groupFormUrls.${groupType}`, groupFormUrls[groupType]);
      }
    }

    for (const locationId of ['manassas', 'mount-prospect', 'orland-park', 'houston', 'philadelphia']) {
      const forms = byId.get(locationId)?.groupFormUrls || {};
      expect(forms.default).toBe(`/groups/inquire/${locationId}/default`);
      expect(forms['private-events']).toBe(`/groups/inquire/${locationId}/private-events`);
      for (const groupType of groupTypes) {
        expect(forms[groupType]).toBe(`/groups/inquire/${locationId}/${groupType}`);
      }
    }

    const groupCheckoutUrls = {
      manassas: 'https://book.manassas.timemission.com/groupcheckout/en-us/products',
      'mount-prospect': 'https://book.mountprospect.timemission.com/groupcheckout/en-us/products',
      'orland-park': 'https://book.orlandpark.timemission.com/groupcheckout/en-us/products',
    };
    for (const [locationId, url] of Object.entries(groupCheckoutUrls)) {
      expect(byId.get(locationId)?.groupCheckoutUrl).toBe(url);
    }

    const donationForms = {
      manassas: 'https://forms.roller.app/#/timemissionmanassasmall/648879c4625849e/form',
      'mount-prospect': 'https://forms.roller.app/#/timemissionmountprospect/953cef02271145c/form',
      'orland-park': 'https://forms.roller.app/#/timemissionorlandpark/953cef02271145c/form',
    };
    expect(locationRecords.filter((loc) => loc.donationUrl).map((loc) => loc.id).sort())
      .toEqual(Object.keys(donationForms).sort());
    for (const [locationId, url] of Object.entries(donationForms)) {
      expect(byId.get(locationId)?.donationUrl).toBe(url);
    }

    for (const locationId of ['mount-prospect', 'lincoln', 'manassas', 'orland-park']) {
      requireUrl(locationId, 'giftCardUrl', byId.get(locationId)?.giftCardUrl);
    }

    for (const locationId of ['mount-prospect', 'manassas', 'houston', 'orland-park']) {
      requireUrl(locationId, 'waiverUrl', byId.get(locationId)?.waiverUrl);
    }

    expect(byId.get('philadelphia')?.status).toBe('open');
    expect(byId.get('philadelphia')?.openingLabel).toBeUndefined();
    expect(byId.get('philadelphia')?.ticker).toBe('PHILADELPHIA NOW OPEN');
    expect(byId.get('philadelphia')?.localBusinessSchemaEligible).toBe(true);
    expect(byId.get('philadelphia')?.bookingUrl)
      .toBe('https://book.philadelphia.timemission.com/timemissionphiladelphiapa/onlinecheckout/en-us/home');
    expect(byId.get('philadelphia')?.rollerCheckoutUrl)
      .toBe('https://book.philadelphia.timemission.com/timemissionphiladelphiapa/onlinecheckout/en-us/home');
    expect(byId.get('philadelphia')?.groupFormUrls).toEqual({
      default: '/groups/inquire/philadelphia/default',
      birthdays: '/groups/inquire/philadelphia/birthdays',
      corporate: '/groups/inquire/philadelphia/corporate',
      'field-trips': '/groups/inquire/philadelphia/field-trips',
      'bachelor-ette': '/groups/inquire/philadelphia/bachelor-ette',
      'private-events': '/groups/inquire/philadelphia/private-events',
      holidays: '/groups/inquire/philadelphia/holidays',
    });
    expect(byId.get('boston')).toMatchObject({
      status: 'coming-soon',
      navLabel: 'MA – Boston',
      bookingUrl: '',
      ticker: 'BOSTON COMING SOON',
      address: {
        line1: '200 State St',
        city: 'Boston',
        state: 'MA',
        zip: '02109',
        country: 'United States',
      },
    });
    expect(byId.get('edison')).toMatchObject({
      status: 'coming-soon',
      navLabel: 'NJ – Edison',
      bookingUrl: '',
      externalUrl: 'https://www.superchargednj.com/',
      pagePath: '/edison',
      ticker: 'EDISON COMING SOON',
      address: {
        line1: '987 US-1',
        city: 'Edison',
        state: 'NJ',
        zip: '08817',
        country: 'United States',
      },
    });
    expect(byId.get('west-nyack')?.briqWidget?.domain).toBe('timemission-palisades');
    expect(byId.get('antwerp')?.externalUrl).toBe('https://timemission.eu/antwerp');
    expect(byId.get('brussels')?.externalUrl).toBe('https://timemission.eu/brussels');
    expect(byId.get('brussels')?.navLabel).toBe('Belgium – Brussels');
    expect(byId.get('brussels')?.status).toBe('open');
    expect(byId.get('brussels')?.ticker).toBe('BRUSSELS NOW OPEN');
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
