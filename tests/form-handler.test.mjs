import { describe, expect, it } from 'vitest';

import {
  handleFormRequest,
  isAllowedOrigin,
  validateContactSubmission,
  validateNewsletterSubmission,
} from '../functions/_shared/form-handler.mjs';

const env = {
  CONTACT_TO_EMAIL: 'ops@timemission.com',
  FORM_SUBMISSIONS_DB: mockD1(),
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

function mockKv() {
  const values = new Map();
  return {
    get: async (key) => values.get(key) ?? null,
    put: async (key, value) => {
      values.set(key, value);
    },
  };
}

function mockD1() {
  const statements = [];
  return {
    statements,
    prepare(sql) {
      const statement = {
        params: [],
        sql,
        bind(...params) {
          this.params = params;
          return this;
        },
        async run() {
          statements.push({
            params: this.params,
            sql: this.sql,
          });
          return { success: true };
        },
      };
      return statement;
    },
  };
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
      location: 'west-nyack',
      marketing_opt_in: 'yes',
    })).toMatchObject({
      email: 'person@example.com',
      givenName: 'Ada',
      location: 'west-nyack',
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
    expect(env.FORM_SUBMISSIONS_DB.statements.at(-1).params).toEqual(expect.arrayContaining([
      'contact',
      'Guest',
      'guest@example.com',
      'houston',
      'groups',
      'Question about groups',
    ]));
    expect(calls.map((call) => call.url)).toEqual([
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      'https://api.resend.com/emails',
    ]);

    const emailPayload = JSON.parse(calls.at(-1).init.body);
    expect(emailPayload).toMatchObject({
      reply_to: 'guest@example.com',
      subject: 'Time Mission contact: TX - Houston - Group Events',
      text: expect.stringContaining('Location: TX - Houston'),
      to: ['ops@timemission.com'],
    });
    expect(emailPayload.html).toContain('New contact inquiry');
    expect(emailPayload.html).toContain('TX - Houston');
    expect(emailPayload.html).toContain('Question about groups');
    expect(emailPayload.html).toContain('supported-color-schemes');
    expect(emailPayload.html).toContain('background-color: #1B1714');
    expect(emailPayload.html).toContain('color: #FFF8EF;">Guest</div>');
  });

  it('requires a Cloudflare D1 form archive unless explicitly disabled', async () => {
    const response = await handleFormRequest({
      env: {
        ...env,
        FORM_SUBMISSIONS_DB: undefined,
      },
      fetchImpl: fetchOk,
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

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      error: 'Form archive is not configured.',
      ok: false,
    });
  });

  it('keeps Turnstile strict without exposing backend configuration details', async () => {
    const response = await handleFormRequest({
      env: {
        ...env,
        TURNSTILE_SECRET_KEY: '',
      },
      fetchImpl: fetchOk,
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

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toMatchObject({
      error: 'Form protection is temporarily unavailable. Please try again later.',
      ok: false,
    });
    expect(body.error).not.toMatch(/not configured/i);
  });

  it('can bypass the archive for local emergency testing only', async () => {
    const response = await handleFormRequest({
      env: {
        ...env,
        FORM_ARCHIVE_REQUIRED: '0',
        FORM_SUBMISSIONS_DB: undefined,
      },
      fetchImpl: fetchOk,
      formType: 'newsletter',
      request: formRequest('/api/newsletter', {
        'cf-turnstile-response': 'token',
        email: 'guest@example.com',
        given_name: 'Guest',
        marketing_opt_in: 'yes',
      }),
    });

    expect(response.status).toBe(200);
  });

  it('routes contact submissions to a location-specific recipient when configured', async () => {
    const calls = [];
    const fetchImpl = (url, init) => {
      calls.push({
        body: typeof init.body === 'string' ? JSON.parse(init.body) : null,
        url: String(url),
      });
      return fetchOk(url);
    };

    const response = await handleFormRequest({
      env: {
        ...env,
        CONTACT_TO_EMAIL_WEST_NYACK: 'palisades@timemission.com',
      },
      fetchImpl,
      formType: 'contact',
      request: formRequest('/api/contact', {
        'cf-turnstile-response': 'token',
        email: 'guest@example.com',
        location: 'west-nyack',
        message: 'Question about groups',
        name: 'Guest',
        subject: 'groups',
      }),
    });

    expect(response.status).toBe(200);
    const emailCall = calls.at(-1);
    expect(emailCall.url).toBe('https://api.resend.com/emails');
    expect(emailCall.body).toMatchObject({
      subject: 'Time Mission contact: NY - West Nyack - Group Events',
      to: ['palisades@timemission.com'],
    });
    expect(emailCall.body.html).toContain('NY - West Nyack');
  });

  it('subscribes newsletter opt-ins to Klaviyo before sending fallback email', async () => {
    const calls = [];
    const fetchImpl = (url, init) => {
      calls.push({ init, url: String(url) });
      return fetchOk(url);
    };

    const response = await handleFormRequest({
      env: {
        ...env,
        KLAVIYO_API_KEY: 'klaviyo-private-key',
        KLAVIYO_LIST_ID_WEST_NYACK: 'LIST_WNY',
      },
      fetchImpl,
      formType: 'newsletter',
      request: formRequest('/api/newsletter', {
        'cf-turnstile-response': 'token',
        email: 'guest@example.com',
        family_name: 'Example',
        given_name: 'Guest',
        location: 'west-nyack',
        marketing_opt_in: 'yes',
      }),
    });

    expect(response.status).toBe(200);
    expect(calls.map((call) => call.url)).toEqual([
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/',
      'https://api.resend.com/emails',
    ]);

    const klaviyoCall = calls[1];
    expect(klaviyoCall.init.headers.authorization).toBe('Klaviyo-API-Key klaviyo-private-key');
    expect(klaviyoCall.init.headers.revision).toBe('2026-04-15');
    expect(JSON.parse(klaviyoCall.init.body)).toMatchObject({
      data: {
        relationships: {
          list: {
            data: {
              id: 'LIST_WNY',
              type: 'list',
            },
          },
        },
      },
    });

    const newsletterPayload = JSON.parse(calls.at(-1).init.body);
    expect(newsletterPayload).toMatchObject({
      subject: 'Time Mission newsletter signup: Guest Example',
      text: expect.stringContaining('Location: NY - West Nyack'),
      to: ['newsletter@timemission.com'],
    });
    expect(newsletterPayload.html).toContain('New newsletter signup');
    expect(newsletterPayload.html).toContain('NY - West Nyack');
  });

  it('rate limits repeated submissions before paid email delivery', async () => {
    const calls = [];
    const fetchImpl = (url, init) => {
      calls.push({ init, url: String(url) });
      return fetchOk(url);
    };
    const rateLimitedEnv = {
      ...env,
      FORM_RATE_LIMIT_IP_10M: '1',
      FORM_RATE_LIMIT_IP_HOUR: '100',
      FORM_RATE_LIMIT_EMAIL_HOUR: '100',
      FORM_RATE_LIMIT_KV: mockKv(),
    };
    const headers = { 'cf-connecting-ip': '203.0.113.42' };
    const body = {
      'cf-turnstile-response': 'token',
      email: 'guest@example.com',
      location: 'houston',
      message: 'Question about groups',
      name: 'Guest',
      subject: 'groups',
    };

    const first = await handleFormRequest({
      env: rateLimitedEnv,
      fetchImpl,
      formType: 'contact',
      request: formRequest('/api/contact', body, headers),
    });
    const second = await handleFormRequest({
      env: rateLimitedEnv,
      fetchImpl,
      formType: 'contact',
      request: formRequest('/api/contact', body, headers),
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(await second.json()).toMatchObject({ ok: false });
    expect(calls.map((call) => call.url)).toEqual([
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      'https://api.resend.com/emails',
    ]);
  });

  it('rejects multipart submissions without parsing them', async () => {
    const response = await handleFormRequest({
      env,
      fetchImpl: fetchOk,
      formType: 'contact',
      request: new Request('https://timemission.com/api/contact', {
        body: new FormData(),
        headers: {
          accept: 'application/json',
          origin: 'https://timemission.com',
        },
        method: 'POST',
      }),
    });

    expect(response.status).toBe(415);
    expect(await response.json()).toMatchObject({ ok: false });
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
