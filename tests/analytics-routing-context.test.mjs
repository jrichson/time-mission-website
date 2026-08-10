import { describe, expect, it } from 'vitest';
import { createHash, webcrypto } from 'node:crypto';
import {
  createAnchor,
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

function createGroupThankYouCarrier({
  locationSlug = 'orland-park',
  locationName = 'Orland Park',
  region = 'us',
  formSubject = 'corporate',
  contextSource = '',
  provider = '',
  formName = '',
} = {}) {
  return {
    dataset: {
      locationSlug,
      locationName,
      region,
      formSubject,
      contextSource,
      provider,
      formName,
    },
  };
}

function createNewsletterForm({
  emailValue = 'ada@example.com',
  firstName = 'Ada',
  lastName = 'Lovelace',
  location = 'houston',
} = {}) {
  const attrs = new Map([
    ['action', '/api/newsletter'],
    ['data-tm-form', 'newsletter'],
    ['method', 'POST'],
    ['name', 'newsletter'],
  ]);
  const listeners = new Map();
  const fields = {
    email: { value: emailValue },
    given_name: { value: firstName },
    family_name: { value: lastName },
    location: { value: location },
    marketing_opt_in: { value: 'yes' },
  };

  return {
    attrs,
    fields,
    checkValidity() {
      return true;
    },
    getAttribute(name) {
      return attrs.get(name) || null;
    },
    setAttribute(name, value) {
      attrs.set(name, String(value));
    },
    removeAttribute(name) {
      attrs.delete(name);
    },
    addEventListener(type, listener) {
      const bucket = listeners.get(type) || [];
      bucket.push(listener);
      listeners.set(type, bucket);
    },
    dispatchSubmit() {
      const event = { preventDefault() { this.defaultPrevented = true; } };
      return Promise.all((listeners.get('submit') || []).map((listener) => listener(event)));
    },
  };
}

class FakeFormData {
  constructor(form) {
    this.fields = form.fields;
  }

  get(name) {
    return this.fields[name] ? this.fields[name].value : '';
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
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
    delete window.TM_DATA;
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

  it('tracks Pipedrive group thank-you pages by location and form type', () => {
    const sessionStorage = createStorage();
    const carrier = createGroupThankYouCarrier();
    const { context, window, document } = createBrowserContext(grantedConsentWindow({ sessionStorage }));
    window.location.pathname = '/group-form-thank-you/orland-park/corporate';
    document.querySelector = (selector) => {
      if (selector === '[data-tm-group-form-thank-you]') return carrier;
      return null;
    };
    runScript('js/analytics.js', context);
    runScript('js/group-form-thank-you.js', context);
    runScript('js/group-form-thank-you.js', context);

    const successes = window.dataLayer.filter((entry) => entry && entry.event_name === 'GROUP_FORM_SUBMIT_SUCCESS');
    expect(successes).toHaveLength(1);
    expect(successes[0].parameters).toMatchObject({
      PROVIDER: 'pipedrive',
      FORM_NAME: 'pipedrive_group',
      FORM_SUBJECT: 'corporate',
      LOCATION_SLUG: 'orland-park',
      LOCATION_NAME: 'Orland Park',
      REGION: 'us',
    });
    expect(successes[0].parameters).not.toHaveProperty('EMAIL');
    expect(successes[0].parameters).not.toHaveProperty('PHONE');
    expect(successes[0].parameters).not.toHaveProperty('MESSAGE');
  });

  it('tracks Jotform group completions from the non-PII redirect context', () => {
    const sessionStorage = createStorage();
    const carrier = createGroupThankYouCarrier({ contextSource: 'query' });
    const { context, window, document } = createBrowserContext(grantedConsentWindow({ sessionStorage }));
    window.location.origin = 'https://www.timemission.com';
    window.location.pathname = '/group-form-thank-you/jotform';
    window.location.search = '?location=Mt%20Prospect&source=https%3A%2F%2Fwww.timemission.com%2Fgroups%2Finquire%2Fmount-prospect%2Fcorporate';
    document.querySelector = (selector) => {
      if (selector === '[data-tm-group-form-thank-you]') return carrier;
      return null;
    };

    runScript('js/analytics.js', context);
    runScript('js/group-form-thank-you.js', context);
    runScript('js/group-form-thank-you.js', context);

    const successes = window.dataLayer.filter((entry) => entry && entry.event_name === 'GROUP_FORM_SUBMIT_SUCCESS');
    expect(successes).toHaveLength(1);
    expect(successes[0].parameters).toMatchObject({
      PROVIDER: 'jotform',
      FORM_NAME: 'jotform_group',
      FORM_SUBJECT: 'corporate',
      LOCATION_SLUG: 'mount-prospect',
      LOCATION_NAME: 'Mount Prospect',
      REGION: 'us',
    });
    expect(successes[0].parameters).not.toHaveProperty('EMAIL');
    expect(successes[0].parameters).not.toHaveProperty('PHONE');
    expect(successes[0].parameters).not.toHaveProperty('MESSAGE');
  });

  it.each([
    ['Houston', 'houston'],
    ['Philadelphia', 'philadelphia'],
  ])('accepts the new franchise Jotform redirect context for %s', (locationName, locationSlug) => {
    const sessionStorage = createStorage();
    const carrier = createGroupThankYouCarrier({ contextSource: 'query' });
    const { context, window, document } = createBrowserContext(grantedConsentWindow({ sessionStorage }));
    window.location.origin = 'https://www.timemission.com';
    window.location.pathname = '/group-form-thank-you/jotform';
    window.location.search = `?location=${encodeURIComponent(locationName)}&source=${encodeURIComponent(`https://www.timemission.com/groups/inquire/${locationSlug}/corporate`)}`;
    document.querySelector = (selector) => {
      if (selector === '[data-tm-group-form-thank-you]') return carrier;
      return null;
    };
    runScript('js/analytics.js', context);
    runScript('js/group-form-thank-you.js', context);
    runScript('js/group-form-thank-you.js', context);

    const success = window.dataLayer.find((entry) => entry && entry.event_name === 'GROUP_FORM_SUBMIT_SUCCESS');
    expect(success.parameters).toMatchObject({
      PROVIDER: 'jotform',
      FORM_SUBJECT: 'corporate',
      LOCATION_SLUG: locationSlug,
      LOCATION_NAME: locationName,
    });
  });

  it('distinguishes the group-form telephone link from other phone clicks', () => {
    const { context, window, document } = createBrowserContext(grantedConsentWindow());
    document.body.dataset.location = 'manassas';
    const anchor = createAnchor('tel:+18137735250', {
      attrs: { 'data-tm-analytics-cta': 'group_form_phone' },
    });

    runScript('js/analytics.js', context);
    document.dispatchEvent({
      type: 'click',
      target: {
        closest(selector) {
          return selector === 'a[href]' ? anchor : null;
        },
      },
    });

    const phoneClick = window.dataLayer.find((entry) => entry && entry.event_name === 'PHONE_CLICK');
    expect(phoneClick.parameters).toMatchObject({
      CTA_ID: 'group_form_phone',
      LINK_PATH: 'tel',
      LOCATION_SLUG: 'manassas',
    });
  });

  it('pushes newsletter registrations to GTM with hashed user data after accepted submission', async () => {
    const form = createNewsletterForm();
    const redirects = [];
    const fetchCalls = [];
    const { context, window, document } = createBrowserContext(grantedConsentWindow({
      crypto: webcrypto,
      FormData: FakeFormData,
      fetch(url, init) {
        fetchCalls.push({ init, url });
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true }),
        });
      },
      setTimeout(callback) {
        callback();
        return 1;
      },
    }));
    window.location.pathname = '/groups/birthdays';
    window.location.assign = (url) => redirects.push(url);
    document.querySelectorAll = (selector) => (selector === 'form[data-tm-form="newsletter"]' ? [form] : []);
    context.FormData = FakeFormData;
    context.TextEncoder = TextEncoder;
    context.fetch = window.fetch;

    runScript('js/form-registration-tracking.js', context);
    await form.dispatchSubmit();

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe('/api/newsletter');
    expect(fetchCalls[0].init.headers).toMatchObject({ accept: 'application/json' });
    expect(redirects).toEqual(['/contact-thank-you']);

    const event = window.dataLayer.find((entry) => entry && entry.event_name === 'COMPLETE_REGISTRATION');
    expect(event).toMatchObject({
      event: 'COMPLETE_REGISTRATION',
      conversion_source: 'site_form',
      form_name: 'newsletter',
      ga4_event_name: 'complete_registration',
      standard_event_name: 'CompleteRegistration',
    });
    expect(event.parameters).toMatchObject({
      FORM_NAME: 'newsletter',
      LOCATION_SLUG: 'houston',
      PAGE_PATH: '/groups/birthdays',
    });
    expect(event.user_data).toMatchObject({
      sha256_email_address: sha256('ada@example.com'),
      sha256_first_name: sha256('ada'),
      sha256_last_name: sha256('lovelace'),
    });
    expect(JSON.stringify(event)).not.toContain('ada@example.com');
    expect(JSON.stringify(event)).not.toContain('Lovelace');
  });
});
