import { describe, expect, it } from 'vitest';
import {
  createBrowserContext,
  groupTypes,
  locationRecords,
  runScript,
} from './browser-contract-helpers.mjs';

describe('browser data, consent, and i18n contracts', () => {
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

    const correctedGroupForms = {
      manassas: {
        default: 'https://webforms.pipedrive.com/f/6WfZe3FsT5CpyAGlGQNeSnD8PZnbw9PpoyBG6Q1lAtqvD4ribAKRsWWceRYG0npA79',
        'private-events': 'https://webforms.pipedrive.com/f/6rClhKJC878Zy4wEQE4nx3rxHFl2oN1XCAwr5J647D5e6JZyz2dBibV21rAvu5pkn9',
      },
      'mount-prospect': {
        default: 'https://webforms.pipedrive.com/f/bXEQpsMHJsOtiIdTnIOIuMINAj2jCuMpbJftCRoKl6naQBGsW8F6S0WOShrlXluKB55',
        'private-events': 'https://webforms.pipedrive.com/f/6GXSuNhFZD5Ep1YKjgbkzhtyyHT3rtD5bFu3SenbU7WtdMBlNK2ii0rTXXxlXLV5o7',
      },
      'orland-park': {
        default: 'https://webforms.pipedrive.com/f/6qn4HwjvjuHH9aTSI0opXZlY9S6zSaww1No8AKIHefxbmVVTrc2EWOy4D4SWAztcVJ',
        'private-events': 'https://webforms.pipedrive.com/f/czCBoZIYCV9RLnYgcPalyzr4UrH8eF7EV2LwETaisfp3lEkkuVtnZ6UqTjiZ9w9pSz',
      },
    };
    for (const [locationId, forms] of Object.entries(correctedGroupForms)) {
      expect(byId.get(locationId)?.groupFormUrls).toMatchObject(forms);
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
