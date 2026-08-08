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
      phone: ' +1 (215) 867-5309 ',
      subject: 'booking',
    })).toMatchObject({
      email: 'ari@example.com',
      location: 'philadelphia',
      message: 'Hello\nthere',
      name: 'Ari',
      phone: '+1 (215) 867-5309',
      subject: 'booking',
    });
  });

  it('requires a valid phone number for contact submissions', () => {
    const submission = {
      email: 'person@example.com',
      location: 'philadelphia',
      message: 'Question about a booking',
      name: 'Ada',
      subject: 'booking',
    };

    expect(() => validateContactSubmission(submission)).toThrow(/phone number is required/i);
    expect(() => validateContactSubmission({ ...submission, phone: '123' })).toThrow(/valid phone number/i);
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

  it('keeps EU form origins isolated from the US site', () => {
    const euEnv = { ...env, TM_SITE_PROFILE: 'eu' };
    const euRequest = (origin) => new Request('https://www.timemission.eu/api/contact', {
      headers: { origin },
      method: 'POST',
    });

    expect(isAllowedOrigin(euRequest('https://timemission.eu'), euEnv)).toBe(true);
    expect(isAllowedOrigin(euRequest('https://www.timemission.eu'), euEnv)).toBe(true);
    expect(isAllowedOrigin(euRequest('https://www.timemission.com'), euEnv)).toBe(false);
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
        phone: '+1 (713) 555-0123',
        subject: 'groups',
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    const archiveParams = env.FORM_SUBMISSIONS_DB.statements.at(-1).params;
    expect(archiveParams).toEqual(expect.arrayContaining([
      'contact',
      'Guest',
      'guest@example.com',
      'houston',
      'groups',
      'Question about groups',
    ]));
    expect(JSON.parse(archiveParams.at(-1))).toMatchObject({
      email: 'guest@example.com',
      phone: '+1 (713) 555-0123',
    });
    expect(calls.map((call) => call.url)).toEqual([
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      'https://api.resend.com/emails',
    ]);

    const emailPayload = JSON.parse(calls.at(-1).init.body);
    expect(emailPayload).toMatchObject({
      reply_to: 'guest@example.com',
      subject: 'Time Mission contact: TX - Houston - Group Events',
      text: expect.stringContaining('Phone: +1 (713) 555-0123'),
      to: ['ops@timemission.com'],
    });
    expect(emailPayload.html).toContain('New contact inquiry');
    expect(emailPayload.html).toContain('TX - Houston');
    expect(emailPayload.html).toContain('Question about groups');
    expect(emailPayload.html).toContain('+1 (713) 555-0123');
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
        phone: '+1 (713) 555-0123',
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
        phone: '+1 (713) 555-0123',
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
        phone: '+1 (845) 555-0123',
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

  it('routes EU contact submissions to each configured location inbox', async () => {
    const calls = [];
    const fetchImpl = (url, init) => {
      calls.push({
        body: typeof init.body === 'string' ? JSON.parse(init.body) : null,
        url: String(url),
      });
      return fetchOk(url);
    };
    const recipients = {
      antwerp: 'antwerp@experience-factory.com',
      brussels: 'brussels@timemission.com',
      eindhoven: 'eindhoven@timemission.nl',
    };
    const labels = {
      antwerp: 'Belgium - Antwerp',
      brussels: 'Belgium - Brussels',
      eindhoven: 'Netherlands - Eindhoven',
    };

    for (const [location, recipient] of Object.entries(recipients)) {
      const response = await handleFormRequest({
        env: {
          ...env,
          CONTACT_TO_EMAIL_ANTWERP: recipients.antwerp,
          CONTACT_TO_EMAIL_BRUSSELS: recipients.brussels,
          CONTACT_TO_EMAIL_EINDHOVEN: recipients.eindhoven,
          FORM_RATE_LIMIT_EMAIL_HOUR: '100',
          TM_SITE_PROFILE: 'eu',
        },
        fetchImpl,
        formType: 'contact',
        request: formRequest('/api/contact', {
          'cf-turnstile-response': 'token',
          email: 'guest@example.com',
          location,
          message: 'Question about this location',
          name: 'Guest',
          phone: '+32 470 12 34 56',
          subject: 'general',
        }, { origin: 'https://www.timemission.eu' }),
      });

      expect(response.status).toBe(200);
      expect(calls.at(-1).body).toMatchObject({
        subject: `Time Mission contact: ${labels[location]} - General Inquiry`,
        to: [recipient],
      });
    }
  });

  it('routes TM Ops group subjects to the shared groups inbox', async () => {
    const calls = [];
    const fetchImpl = (url, init) => {
      calls.push({
        body: typeof init.body === 'string' ? JSON.parse(init.body) : null,
        url: String(url),
      });
      return fetchOk(url);
    };
    const tmOpsLocations = ['manassas', 'orland-park', 'mount-prospect'];
    const groupSubjects = ['groups', 'birthday', 'corporate'];

    for (const location of tmOpsLocations) {
      for (const subject of groupSubjects) {
        const response = await handleFormRequest({
          env: {
            ...env,
            CONTACT_TO_EMAIL_MANASSAS: 'manassas@timemission.com',
            CONTACT_TO_EMAIL_MOUNT_PROSPECT: 'mtprospect@timemission.com',
            CONTACT_TO_EMAIL_ORLAND_PARK: 'orlandpark@timemission.com',
            FORM_RATE_LIMIT_EMAIL_HOUR: '100',
          },
          fetchImpl,
          formType: 'contact',
          request: formRequest('/api/contact', {
            'cf-turnstile-response': 'token',
            email: 'guest@example.com',
            location,
            message: 'Question about a group event',
            name: 'Guest',
            phone: '+1 (813) 555-0123',
            subject,
          }),
        });

        expect(response.status).toBe(200);
      }
    }

    const emailCalls = calls.filter((call) => call.url === 'https://api.resend.com/emails');
    expect(emailCalls).toHaveLength(tmOpsLocations.length * groupSubjects.length);
    expect(emailCalls.every((call) => call.body.to?.[0] === 'Groups@TM-Ops.com')).toBe(true);
  });

  it('keeps non-group TM Ops subjects on the location recipient', async () => {
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
        CONTACT_TO_EMAIL_MANASSAS: 'manassas@timemission.com',
        FORM_RATE_LIMIT_EMAIL_HOUR: '100',
      },
      fetchImpl,
      formType: 'contact',
      request: formRequest('/api/contact', {
        'cf-turnstile-response': 'token',
        email: 'guest@example.com',
        location: 'manassas',
        message: 'Question about an existing booking',
        name: 'Guest',
        phone: '+1 (703) 555-0123',
        subject: 'booking',
      }),
    });

    expect(response.status).toBe(200);
    expect(calls.at(-1).body).toMatchObject({
      to: ['manassas@timemission.com'],
    });
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
      phone: '+1 (713) 555-0123',
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
