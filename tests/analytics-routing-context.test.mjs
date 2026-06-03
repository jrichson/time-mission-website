import { describe, expect, it } from 'vitest';
import {
  createBrowserContext,
  locationRecords,
  runScript,
} from './browser-contract-helpers.mjs';

function grantedConsentWindow(extra = {}) {
  return {
    __TM_TAGGING_CONFIG__: { consent_profile: 'us_open' },
    __TM_CONSENT_STATE__: {
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    },
    TM_DATA: { locations: locationRecords },
    ...extra,
  };
}

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function createContactForm({ location = 'houston', subject = 'booking' } = {}) {
  const attrs = new Map();
  const listeners = new Map();
  const fields = {
    location: { value: location },
    subject: { value: subject },
  };

  return {
    attrs,
    fields,
    getAttribute(name) {
      return attrs.get(name) || null;
    },
    setAttribute(name, value) {
      attrs.set(name, String(value));
    },
    querySelector(selector) {
      if (selector.includes('[name="location"]')) return fields.location;
      if (selector.includes('[name="subject"]')) return fields.subject;
      return null;
    },
    addEventListener(type, listener) {
      const bucket = listeners.get(type) || [];
      bucket.push(listener);
      listeners.set(type, bucket);
    },
    dispatch(type) {
      for (const listener of listeners.get(type) || []) listener();
    },
  };
}

describe('analytics routing context', () => {
  it('adds location routing context to generic site events from page location', () => {
    const { context, window, document } = createBrowserContext(grantedConsentWindow());
    window.location.pathname = '/houston';
    document.body.dataset.location = 'houston';

    runScript('js/analytics.js', context);
    window.TMAnalytics.track('cta_click', { cta_id: 'hero_cta' });

    const event = window.dataLayer.find((entry) => entry && entry.event_name === 'CTA_CLICK');
    expect(event.parameters).toMatchObject({
      CTA_ID: 'hero_cta',
      LOCATION_SLUG: 'houston',
      LOCATION_NAME: 'Houston',
      REGION: 'us',
    });
  });

  it('persists contact form routing context through the thank-you success event', () => {
    const sessionStorage = createStorage();
    const form = createContactForm({ location: 'houston', subject: 'booking' });
    const { context, window, document } = createBrowserContext(grantedConsentWindow({ sessionStorage }));
    window.location.pathname = '/contact';
    document.querySelector = (selector) => {
      if (selector === 'form.contact-form') return form;
      if (selector.includes('[name="location"]')) return form.fields.location;
      if (selector.includes('[name="subject"]')) return form.fields.subject;
      return null;
    };

    runScript('js/analytics.js', context);
    runScript('js/contact-form-analytics.js', context);
    form.dispatch('submit');

    const attempt = window.dataLayer.find((entry) => entry && entry.event_name === 'CONTACT_FORM_SUBMIT_ATTEMPT');
    expect(attempt.parameters).toMatchObject({
      FORM_NAME: 'contact',
      FORM_SUBJECT: 'booking',
      LOCATION_SLUG: 'houston',
      LOCATION_NAME: 'Houston',
      REGION: 'us',
    });
    expect(attempt.parameters).not.toHaveProperty('EMAIL');
    expect(attempt.parameters).not.toHaveProperty('MESSAGE');

    window.location.pathname = '/contact-thank-you';
    document.querySelector = () => null;
    runScript('js/contact-form-analytics.js', context);

    const success = window.dataLayer.find((entry) => entry && entry.event_name === 'CONTACT_FORM_SUBMIT_SUCCESS');
    expect(success.parameters).toMatchObject({
      FORM_NAME: 'contact',
      FORM_SUBJECT: 'booking',
      LOCATION_SLUG: 'houston',
      LOCATION_NAME: 'Houston',
      REGION: 'us',
    });
  });
});
