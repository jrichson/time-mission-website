import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  handleFormRequest,
  validateKlaviyoSignupSubmission,
} from '../functions/_shared/form-handler.mjs';
import { KLAVIYO_FORMS } from '../functions/_shared/klaviyo-forms.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function mockD1() {
  const statements = [];
  return {
    statements,
    prepare(sql) {
      return {
        params: [],
        sql,
        bind(...params) {
          this.params = params;
          return this;
        },
        async run() {
          statements.push({ params: this.params, sql: this.sql });
          return { success: true };
        },
      };
    },
  };
}

function baseEnv(extra = {}) {
  return {
    FORM_SUBMISSIONS_DB: mockD1(),
    FORM_EMAIL_API_KEY: 'test-key',
    FORM_FROM_EMAIL: 'Time Mission <forms@timemission.com>',
    NEWSLETTER_TO_EMAIL: 'newsletter@timemission.com',
    TURNSTILE_SECRET_KEY: 'turnstile-secret',
    ...extra,
  };
}

function recordingFetch(calls) {
  return (url, init) => {
    calls.push({ init, url: String(url) });
    if (String(url).includes('turnstile')) return Promise.resolve(Response.json({ success: true }));
    return Promise.resolve(Response.json({ ok: true }, { status: 202 }));
  };
}

function signupRequest(body) {
  return new Request('https://www.timemission.com/api/klaviyo-signup', {
    body: new URLSearchParams({ 'cf-turnstile-response': 'token', ...body }),
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
      origin: 'https://www.timemission.com',
    },
    method: 'POST',
  });
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

describe('Klaviyo backup forms', () => {
  it('validates fields from the registry and normalizes phone numbers', () => {
    expect(validateKlaviyoSignupSubmission({
      klaviyo_form_id: 'QYqsMS',
      email: 'GUEST@EXAMPLE.COM',
      given_name: ' Ana ',
      phone: '(214) 555-0100',
    })).toMatchObject({
      email: 'guest@example.com',
      formId: 'QYqsMS',
      givenName: 'Ana',
      listId: 'TqyU2B',
      location: 'dallas',
      phone: '+12145550100',
      smsConsent: true,
    });

    expect(validateKlaviyoSignupSubmission({
      klaviyo_form_id: 'QYqsMS',
      email: 'guest@example.com',
    })).toMatchObject({ phone: '', smsConsent: false });

    expect(() => validateKlaviyoSignupSubmission({ klaviyo_form_id: 'NOPE', email: 'a@b.co' }))
      .toThrow('This signup form is not available.');
    expect(() => validateKlaviyoSignupSubmission({ klaviyo_form_id: 'QYqsMS', email: 'nope' }))
      .toThrow('Enter a valid email address.');
    expect(() => validateKlaviyoSignupSubmission({ klaviyo_form_id: 'QYqsMS', email: 'a@b.co', phone: '12' }))
      .toThrow('Enter a valid phone number.');
  });

  it('requires the educator school email and keeps custom answers as profile properties', () => {
    expect(() => validateKlaviyoSignupSubmission({ klaviyo_form_id: 'YsG3eB', email: 'a@b.co' }))
      .toThrow('School Email (edu email) is required.');

    const data = validateKlaviyoSignupSubmission({
      klaviyo_form_id: 'YsG3eB',
      email: 'teacher@example.com',
      family_name: 'Lee',
      given_name: 'Sam',
      grade_subject: '5th grade',
      school_district: 'Houston ISD',
      school_email: 'slee@houstonisd.org',
    });
    expect(data).toMatchObject({
      familyName: 'Lee',
      givenName: 'Sam',
      listId: 'XvvXfj',
      properties: {
        'School Email': 'slee@houstonisd.org',
        'grade level or subject': '5th grade',
        'school or district': 'Houston ISD',
      },
      smsConsent: false,
    });
  });

  it('imports the profile, subscribes to the registry list, and still emails the team', async () => {
    const calls = [];
    const env = baseEnv({ KLAVIYO_API_KEY: 'klaviyo-private-key' });
    const response = await handleFormRequest({
      env,
      fetchImpl: recordingFetch(calls),
      formType: 'klaviyo-signup',
      request: signupRequest({
        klaviyo_form_id: 'QYqsMS',
        email: 'guest@example.com',
        given_name: 'Ana',
        list_id: 'ATTACKER_LIST',
        phone: '214-555-0100',
      }),
    });

    expect(response.status).toBe(200);
    expect(calls.map((call) => call.url)).toEqual([
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      'https://a.klaviyo.com/api/profile-import/',
      'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/',
      'https://api.resend.com/emails',
    ]);
    expect(JSON.parse(calls[1].init.body).data.attributes).toMatchObject({
      email: 'guest@example.com',
      first_name: 'Ana',
      phone_number: '+12145550100',
      properties: { klaviyo_backup_form_id: 'QYqsMS', location: 'dallas' },
    });
    const subscribe = JSON.parse(calls[2].init.body).data;
    expect(subscribe.relationships.list.data.id).toBe('TqyU2B');
    expect(subscribe.attributes.profiles.data[0].attributes).toEqual({
      email: 'guest@example.com',
      phone_number: '+12145550100',
      subscriptions: {
        email: { marketing: { consent: 'SUBSCRIBED' } },
        sms: { marketing: { consent: 'SUBSCRIBED' } },
      },
    });
    const email = JSON.parse(calls[3].init.body);
    expect(email.to).toEqual(['newsletter@timemission.com']);
    expect(email.subject).toContain('Dallas free ticket sign-up');

    const archived = env.FORM_SUBMISSIONS_DB.statements[0].params;
    expect(archived[1]).toBe('newsletter');
    expect(JSON.parse(archived.at(-1))).toMatchObject({ formId: 'QYqsMS', source: 'klaviyo-backup-form' });
  });

  it('never subscribes educator phone numbers to SMS', async () => {
    const calls = [];
    await handleFormRequest({
      env: baseEnv({ KLAVIYO_API_KEY: 'klaviyo-private-key' }),
      fetchImpl: recordingFetch(calls),
      formType: 'klaviyo-signup',
      request: signupRequest({
        klaviyo_form_id: 'WC5BHF',
        email: 'teacher@example.com',
        phone: '615-555-0100',
        school_email: 'teacher@school.org',
      }),
    });
    const subscriber = JSON.parse(calls[2].init.body).data.attributes.profiles.data[0].attributes;
    expect(subscriber).toEqual({
      email: 'teacher@example.com',
      subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } },
    });
  });

  it('rejects a form that belongs to the other site\'s Klaviyo account', async () => {
    expect(() => validateKlaviyoSignupSubmission(
      { klaviyo_form_id: 'QYqsMS', email: 'guest@example.com' },
      { TM_SITE_PROFILE: 'eu' },
    )).toThrow('This signup form is not available.');

    const calls = [];
    const response = await handleFormRequest({
      env: baseEnv({ KLAVIYO_API_KEY: 'eu-account-key', TM_SITE_PROFILE: 'eu' }),
      fetchImpl: recordingFetch(calls),
      formType: 'klaviyo-signup',
      request: signupRequest({ klaviyo_form_id: 'QYqsMS', email: 'guest@example.com' }),
    });
    expect(response.status).toBe(400);
    expect(calls.some((call) => call.url.includes('klaviyo.com'))).toBe(false);
  });

  it('archives and emails signups when no Klaviyo key is configured', async () => {
    const calls = [];
    const response = await handleFormRequest({
      env: baseEnv(),
      fetchImpl: recordingFetch(calls),
      formType: 'klaviyo-signup',
      request: signupRequest({ klaviyo_form_id: 'QYqsMS', email: 'guest@example.com' }),
    });
    expect(response.status).toBe(200);
    expect(calls.map((call) => call.url)).toEqual([
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      'https://api.resend.com/emails',
    ]);
  });

  it('gives every Klaviyo form on the site a backup entry', () => {
    const referenced = new Set();
    for (const file of walk(path.join(root, 'src'))) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/formId\s*[=:]\s*\{?\s*["']([A-Za-z0-9]{6})["']/g)) referenced.add(match[1]);
      if (!file.endsWith('KlaviyoEmbedForm.astro')) {
        expect(source, `${path.relative(root, file)} must render Klaviyo embeds through KlaviyoEmbedForm`)
          .not.toMatch(/data-klaviyo-form-embed/);
      }
    }
    const locations = JSON.parse(fs.readFileSync(path.join(root, 'data/locations.json'), 'utf8')).locations;
    for (const loc of locations) {
      if (String(loc.signupFormId || '').trim()) referenced.add(loc.signupFormId.trim());
    }
    expect([...referenced].sort()).toEqual(
      expect.arrayContaining(['QYqsMS', 'SmY6Us', 'TwcrHA', 'TzbcnW', 'WC5BHF', 'XmbdNb', 'YAhjX2', 'YsG3eB']),
    );
    for (const formId of referenced) {
      expect(KLAVIYO_FORMS, `Klaviyo form ${formId} needs a backup entry`).toHaveProperty(formId);
    }
    for (const config of Object.values(KLAVIYO_FORMS)) {
      expect(['us', 'eu']).toContain(config.site);
      expect(config.listId).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(config.fields.some((field) => field.klaviyo === 'email' && field.required)).toBe(true);
    }
  });
});
