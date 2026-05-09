import { describe, expect, it } from 'vitest';

import {
  handleFormRequest,
  isAllowedOrigin,
  validateContactSubmission,
  validateNewsletterSubmission,
} from '../functions/_shared/form-handler.mjs';

const env = {
  CONTACT_TO_EMAIL: 'ops@timemission.com',
  FORM_EMAIL_API_KEY: 'test-key',
  FORM_FROM_EMAIL: 'Time Mission <forms@timemission.com>',
  NEWSLETTER_TO_EMAIL: 'newsletter@timemission.com',
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
};

function fetchOk(url) {
  if (String(url).includes('turnstile')) {
    return Promise.resolve(Response.json({ success: true }));
  }
  return Promise.resolve(Response.json({ id: 'email-1' }));
}

function formRequest(path, body, headers = {}) {
  return new Request(`https://timemission.com${path}`, {
    body: new URLSearchParams(body),
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
      origin: 'https://timemission.com',
      ...headers,
    },
    method: 'POST',
  });
}

describe('Cloudflare form handler', () => {
  it('validates contact submissions without leaking free-form fields into analytics code', () => {
    expect(validateContactSubmission({
      email: 'ARI@EXAMPLE.COM',
      location: 'philadelphia',
      message: '  Hello\nthere  ',
      name: ' Ari ',
      subject: 'booking',
    })).toMatchObject({
      email: 'ari@example.com',
      location: 'philadelphia',
      message: 'Hello\nthere',
      name: 'Ari',
      subject: 'booking',
    });
  });

  it('requires newsletter opt-in and a valid email', () => {
    expect(validateNewsletterSubmission({
      email: 'person@example.com',
      given_name: 'Ada',
      marketing_opt_in: 'yes',
    })).toMatchObject({
      email: 'person@example.com',
      givenName: 'Ada',
      marketingOptIn: true,
    });

    expect(() => validateNewsletterSubmission({
      email: 'person@example.com',
      given_name: 'Ada',
      marketing_opt_in: '',
    })).toThrow(/Marketing consent/);
  });

  it('allows same-origin and configured production origins only', () => {
    expect(isAllowedOrigin(formRequest('/api/contact', {}), env)).toBe(true);
    expect(isAllowedOrigin(formRequest('/api/contact', {}, {
      origin: 'https://www.timemission.com',
    }), env)).toBe(true);
    expect(isAllowedOrigin(formRequest('/api/contact', {}, {
      origin: 'https://evil.example',
    }), env)).toBe(false);
  });

  it('sends contact submissions after Turnstile verification', async () => {
    const calls = [];
    const fetchImpl = (url, init) => {
      calls.push({ init, url: String(url) });
      return fetchOk(url);
    };

    const response = await handleFormRequest({
      env,
      fetchImpl,
      formType: 'contact',
      request: formRequest('/api/contact', {
        'cf-turnstile-response': 'token',
        email: 'guest@example.com',
        location: 'houston',
        message: 'Question about groups',
        name: 'Guest',
        subject: 'groups',
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(calls.map((call) => call.url)).toEqual([
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      'https://api.resend.com/emails',
    ]);
  });

  it('fails closed when Turnstile is not configured', async () => {
    const response = await handleFormRequest({
      env: { ...env, TURNSTILE_SECRET_KEY: '' },
      fetchImpl: fetchOk,
      formType: 'newsletter',
      request: formRequest('/api/newsletter', {
        email: 'guest@example.com',
        given_name: 'Guest',
        marketing_opt_in: 'yes',
      }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ ok: false });
  });
});
