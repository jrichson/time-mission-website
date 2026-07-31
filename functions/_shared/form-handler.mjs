import { tmOpsGroupsRecipient } from '../../src/lib/contact-routing-policy.mjs';

const MAX_BODY_BYTES = 16 * 1024;
const MAX_FIELD_LENGTH = 2000;
const RATE_LIMIT_KEY_VERSION = 'v1';
const RATE_LIMIT_MEMORY_MAX_KEYS = 5000;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESEND_EMAIL_URL = 'https://api.resend.com/emails';
const KLAVIYO_SUBSCRIBE_URL = 'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/';
const KLAVIYO_REVISION = '2026-04-15';

const LOCAL_ALLOWED_ORIGINS = [
  'http://localhost:4321',
  'http://127.0.0.1:4321',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const memoryRateLimits = new Map();

const CONTACT_LOCATION_LABELS = {
  antwerp: 'Belgium - Antwerp',
  brussels: 'Belgium - Brussels',
  dallas: 'TX - Dallas',
  edison: 'NJ - Edison',
  eindhoven: 'Netherlands - Eindhoven',
  general: 'General Inquiry',
  houston: 'TX - Houston',
  lincoln: 'RI - Lincoln',
  manassas: 'VA - Manassas',
  'mount-prospect': 'IL - Mount Prospect',
  'orland-park': 'IL - Orland Park',
  philadelphia: 'PA - Philadelphia',
  'west-nyack': 'NY - West Nyack',
};

const CONTACT_SUBJECT_LABELS = {
  birthday: 'Birthday Parties',
  booking: 'Booking Question',
  corporate: 'Corporate Events',
  feedback: 'Feedback',
  general: 'General Inquiry',
  groups: 'Group Events',
  other: 'Other',
};

export class FormError extends Error {
  constructor(message, status = 400, publicMessage = message) {
    super(message);
    this.name = 'FormError';
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

function stringValue(value) {
  return typeof value === 'string' ? value : '';
}

function normalizeText(value, maxLength = MAX_FIELD_LENGTH) {
  return stringValue(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeMultiline(value, maxLength = MAX_FIELD_LENGTH) {
  return stringValue(value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
    .slice(0, maxLength);
}

function normalizeEmail(value) {
  return normalizeText(value, 320).toLowerCase();
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function humanizeSlug(value) {
  const normalized = normalizeText(value, 160).replace(/[-_]+/g, ' ');
  if (!normalized) return '';
  return normalized.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function contactLocationLabel(location) {
  return CONTACT_LOCATION_LABELS[location] || humanizeSlug(location);
}

function contactSubjectLabel(subject) {
  return CONTACT_SUBJECT_LABELS[subject] || humanizeSlug(subject);
}

function notificationRows(rows) {
  return rows
    .filter((row) => row.value)
    .map((row) => `
      <tr>
        <td style="padding: 0 0 12px;">
          <div style="padding: 14px 16px; border-radius: 8px; background-color: #1B1714; border: 1px solid #3A2B22;">
            <div style="font: 700 11px/1.2 Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #FFB47F;">${htmlEscape(row.label)}</div>
            <div style="margin-top: 6px; font: 700 16px/1.4 Arial, sans-serif; color: #FFF8EF;">${htmlEscape(row.value)}</div>
          </div>
        </td>
      </tr>
    `)
    .join('');
}

function notificationEmailHtml({
  intro,
  message,
  messageLabel = 'Message',
  preheader,
  rows,
  title,
}) {
  const messageHtml = message
    ? `
      <div style="margin-top: 24px;">
        <div style="font: 700 11px/1.2 Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #FFB47F;">${htmlEscape(messageLabel)}</div>
        <div style="margin-top: 8px; padding: 18px; border-radius: 8px; background-color: #1B1714; border: 1px solid #3A2B22; font: 16px/1.6 Arial, sans-serif; color: #FFF8EF;">${htmlEscape(message).replaceAll('\n', '<br>')}</div>
      </div>
    `
    : '';

  return `
    <!doctype html>
    <html>
      <head>
        <meta name="color-scheme" content="dark">
        <meta name="supported-color-schemes" content="dark">
        <style>
          :root {
            color-scheme: dark;
            supported-color-schemes: dark;
          }
          body {
            background-color: #0D0D0D !important;
            color: #FFF8EF !important;
          }
        </style>
      </head>
      <body bgcolor="#0D0D0D" style="margin: 0; padding: 0; background-color: #0D0D0D; color: #FFF8EF;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${htmlEscape(preheader)}</div>
        <div style="padding: 32px 14px; background-color: #0D0D0D;">
          <div style="max-width: 640px; margin: 0 auto; overflow: hidden; border-radius: 12px; background-color: #151515; border: 1px solid #3A2B22;">
            <div style="background-color: #151515; padding: 26px 28px 24px; border-bottom: 4px solid #FF6B2C;">
              <div style="font: 700 12px/1.2 Arial, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: #FFB47F;">Time Mission Website</div>
              <h1 style="margin: 10px 0 0; font: 700 28px/1.1 Arial, sans-serif; color: #FFF8EF;">${htmlEscape(title)}</h1>
              <p style="margin: 12px 0 0; font: 15px/1.6 Arial, sans-serif; color: #D8D1C6;">${htmlEscape(intro)}</p>
            </div>
            <div style="padding: 28px; background-color: #151515; color: #FFF8EF;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                <tbody>
                  ${notificationRows(rows)}
                </tbody>
              </table>
              ${messageHtml}
              <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #3A2B22; font: 13px/1.5 Arial, sans-serif; color: #B8ADA0;">
                Reply directly to this email to respond to the guest. This notification was sent by the Time Mission website form handler.
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function envList(value) {
  return stringValue(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitEmails(value) {
  return envList(value).filter((email) => EMAIL_RE.test(email));
}

function envKeySuffix(value) {
  return normalizeText(value, 120)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function locationSpecificEnv(env, prefix, location, fallbackKey) {
  const suffix = envKeySuffix(location);
  if (suffix && stringValue(env[`${prefix}_${suffix}`]).trim()) {
    return stringValue(env[`${prefix}_${suffix}`]).trim();
  }
  return stringValue(env[fallbackKey]).trim();
}

function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function rateLimitRules(env) {
  return {
    emailHour: readPositiveInteger(env.FORM_RATE_LIMIT_EMAIL_HOUR, 5),
    ipHour: readPositiveInteger(env.FORM_RATE_LIMIT_IP_HOUR, 60),
    ipTenMinutes: readPositiveInteger(env.FORM_RATE_LIMIT_IP_10M, 20),
  };
}

function rateLimitStorage(env) {
  const kv = env.FORM_RATE_LIMIT_KV || env.FORM_RATE_LIMIT;
  if (kv && typeof kv.get === 'function' && typeof kv.put === 'function') {
    return kv;
  }
  return null;
}

function clientIp(request) {
  const cfIp = normalizeText(request.headers.get('cf-connecting-ip'), 128);
  if (cfIp) return cfIp;

  const forwarded = normalizeText(request.headers.get('x-forwarded-for'), 512);
  return forwarded.split(',')[0]?.trim() || '';
}

async function hashRateLimitIdentifier(value) {
  const normalized = normalizeText(value, 512).toLowerCase();
  if (!normalized) return '';

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

function memoryRateLimitEntry(key) {
  const now = Date.now();
  const entry = memoryRateLimits.get(key);
  if (!entry || entry.expiresAt <= now) return null;
  return entry;
}

async function incrementRateLimit({ env, identifier, limit, scope, windowSeconds }) {
  if (!identifier || limit <= 0) return;

  const hashed = await hashRateLimitIdentifier(identifier);
  if (!hashed) return;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(nowSeconds / windowSeconds);
  const key = [
    'tm-forms',
    RATE_LIMIT_KEY_VERSION,
    scope,
    hashed,
    String(windowSeconds),
    String(bucket),
  ].join(':');
  const store = rateLimitStorage(env);

  if (store) {
    const raw = await store.get(key);
    const current = readPositiveInteger(raw, 0);
    if (current >= limit) {
      throw new FormError('Too many form submissions. Please try again later.', 429);
    }
    await store.put(key, String(current + 1), { expirationTtl: windowSeconds + 60 });
    return;
  }

  const entry = memoryRateLimitEntry(key);
  const current = entry ? entry.count : 0;
  if (current >= limit) {
    throw new FormError('Too many form submissions. Please try again later.', 429);
  }

  if (memoryRateLimits.size > RATE_LIMIT_MEMORY_MAX_KEYS) {
    const now = Date.now();
    for (const [entryKey, value] of memoryRateLimits.entries()) {
      if (value.expiresAt <= now) memoryRateLimits.delete(entryKey);
      if (memoryRateLimits.size <= RATE_LIMIT_MEMORY_MAX_KEYS) break;
    }
  }

  memoryRateLimits.set(key, {
    count: current + 1,
    expiresAt: Date.now() + (windowSeconds + 60) * 1000,
  });
}

async function assertIpRateLimit({ env, request }) {
  const ip = clientIp(request);
  if (!ip) return;

  const rules = rateLimitRules(env);
  await incrementRateLimit({
    env,
    identifier: ip,
    limit: rules.ipTenMinutes,
    scope: 'ip-10m',
    windowSeconds: 10 * 60,
  });
  await incrementRateLimit({
    env,
    identifier: ip,
    limit: rules.ipHour,
    scope: 'ip-hour',
    windowSeconds: 60 * 60,
  });
}

async function assertEmailRateLimit({ email, env, formType }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  await incrementRateLimit({
    env,
    identifier: `${formType}:${normalizedEmail}`,
    limit: rateLimitRules(env).emailHour,
    scope: 'email-hour',
    windowSeconds: 60 * 60,
  });
}

function wantsJSON(request) {
  const accept = request.headers.get('accept') || '';
  const requestedWith = request.headers.get('x-requested-with') || '';
  const contentType = request.headers.get('content-type') || '';
  return (
    accept.includes('application/json') ||
    requestedWith.toLowerCase() === 'fetch' ||
    contentType.includes('application/json')
  );
}

function requestOrigin(request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return '';
  }
}

export function isAllowedOrigin(request, env = {}) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  let normalizedOrigin;
  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    return false;
  }

  const profile = stringValue(env.TM_SITE_PROFILE).trim().toLowerCase();
  const regionalOrigins = profile === 'eu'
    ? ['https://timemission.eu', 'https://www.timemission.eu']
    : ['https://timemission.com', 'https://www.timemission.com'];
  const allowed = new Set([
    requestOrigin(request),
    ...regionalOrigins,
    ...LOCAL_ALLOWED_ORIGINS,
    ...envList(env.FORM_ALLOWED_ORIGINS),
  ].filter(Boolean));

  return allowed.has(normalizedOrigin);
}

async function parseUrlEncoded(request) {
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    throw new FormError('Form submission is too large.', 413);
  }
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries());
}

async function parseMultipart() {
  throw new FormError('Unsupported form submission type.', 415);
}

async function parseJSON(request) {
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    throw new FormError('Form submission is too large.', 413);
  }
  const parsed = JSON.parse(body || '{}');
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new FormError('Invalid form payload.');
  }
  return parsed;
}

export async function parseFormData(request) {
  const contentLength = Number.parseInt(request.headers.get('content-length') || '0', 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new FormError('Form submission is too large.', 413);
  }

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return parseJSON(request);
  if (contentType.includes('application/x-www-form-urlencoded')) return parseUrlEncoded(request);
  if (contentType.includes('multipart/form-data')) return parseMultipart(request);
  throw new FormError('Unsupported form submission type.', 415);
}

function assertEmail(email) {
  if (!EMAIL_RE.test(email)) throw new FormError('Enter a valid email address.');
}

function assertPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    throw new FormError('Enter a valid phone number.');
  }
}

function optInIsChecked(value) {
  const normalized = normalizeText(value, 20).toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

export function validateContactSubmission(raw) {
  const data = {
    email: normalizeEmail(raw.email),
    location: normalizeText(raw.location, 120),
    message: normalizeMultiline(raw.message, 4000),
    name: normalizeText(raw.name, 160),
    phone: normalizeText(raw.phone, 40),
    subject: normalizeText(raw.subject, 160),
  };

  if (!data.name) throw new FormError('Name is required.');
  assertEmail(data.email);
  if (!data.phone) throw new FormError('Phone number is required.');
  assertPhone(data.phone);
  if (!data.location) throw new FormError('Location is required.');
  if (!data.subject) throw new FormError('Subject is required.');
  if (!data.message) throw new FormError('Message is required.');

  return data;
}

export function validateNewsletterSubmission(raw) {
  const data = {
    email: normalizeEmail(raw.email),
    familyName: normalizeText(raw.family_name, 120),
    givenName: normalizeText(raw.given_name, 120),
    location: normalizeText(raw.location || raw.selected_location || 'general', 120) || 'general',
    marketingOptIn: optInIsChecked(raw.marketing_opt_in),
  };

  if (!data.givenName) throw new FormError('First name is required.');
  assertEmail(data.email);
  if (!data.marketingOptIn) throw new FormError('Marketing consent is required.');

  return data;
}

async function verifyTurnstile({ env, fetchImpl, request, token }) {
  const secret = stringValue(env.TURNSTILE_SECRET_KEY).trim();
  if (!secret) {
    throw new FormError(
      'Form protection is not configured.',
      500,
      'Form protection is temporarily unavailable. Please try again later.',
    );
  }
  if (!normalizeText(token, 4096)) {
    throw new FormError('Complete the form protection check.');
  }

  const body = new FormData();
  body.set('secret', secret);
  body.set('response', token);

  const remoteIp = request.headers.get('cf-connecting-ip');
  if (remoteIp) body.set('remoteip', remoteIp);

  const response = await fetchImpl(TURNSTILE_VERIFY_URL, {
    body,
    method: 'POST',
  });
  if (!response.ok) {
    throw new FormError('Form protection could not be verified.', 502);
  }

  const result = await response.json();
  if (!result.success) {
    throw new FormError('Form protection failed. Please try again.');
  }
}

function contactEmail(data) {
  const locationLabel = contactLocationLabel(data.location);
  const subjectLabel = contactSubjectLabel(data.subject);
  const text = [
    'New Time Mission contact form submission',
    '',
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Location: ${locationLabel}`,
    `Subject: ${subjectLabel}`,
    '',
    data.message,
  ].join('\n');

  const html = notificationEmailHtml({
    intro: 'A guest submitted the contact form. Reply to this email to continue the conversation.',
    message: data.message,
    preheader: `${locationLabel} contact inquiry from ${data.name}`,
    rows: [
      { label: 'Name', value: data.name },
      { label: 'Email', value: data.email },
      { label: 'Phone', value: data.phone },
      { label: 'Location', value: locationLabel },
      { label: 'Subject', value: subjectLabel },
    ],
    title: 'New contact inquiry',
  });

  return {
    html,
    replyTo: data.email,
    subject: `Time Mission contact: ${locationLabel} - ${subjectLabel}`,
    text,
  };
}

function newsletterEmail(data) {
  const fullName = [data.givenName, data.familyName].filter(Boolean).join(' ');
  const locationLabel = contactLocationLabel(data.location);
  const text = [
    'New Time Mission newsletter signup',
    '',
    `Name: ${fullName}`,
    `Email: ${data.email}`,
    `Location: ${locationLabel}`,
    'Marketing opt-in: yes',
  ].join('\n');

  const html = notificationEmailHtml({
    intro: 'A visitor opted in for Time Mission news and special offers.',
    preheader: `${fullName || data.email} joined the newsletter`,
    rows: [
      { label: 'Name', value: fullName || 'Not provided' },
      { label: 'Email', value: data.email },
      { label: 'Location', value: locationLabel },
      { label: 'Marketing opt-in', value: 'Yes' },
    ],
    title: 'New newsletter signup',
  });

  return {
    html,
    replyTo: data.email,
    subject: `Time Mission newsletter signup: ${fullName || data.email}`,
    text,
  };
}

async function sendResendEmail({ env, fetchImpl, formType, message }) {
  const apiKey = stringValue(env.FORM_EMAIL_API_KEY).trim();
  const from = stringValue(env.FORM_FROM_EMAIL).trim();
  const recipients = splitEmails(message.to || (
    formType === 'newsletter'
      ? env.NEWSLETTER_TO_EMAIL || env.CONTACT_TO_EMAIL
      : env.CONTACT_TO_EMAIL
  ));

  if (!apiKey) throw new FormError('Email delivery is not configured.', 500);
  if (!from || !EMAIL_RE.test(from.replace(/^.*<(.+)>$/, '$1'))) {
    throw new FormError('Form sender email is not configured.', 500);
  }
  if (recipients.length === 0) {
    throw new FormError('Form recipient email is not configured.', 500);
  }

  const response = await fetchImpl(RESEND_EMAIL_URL, {
    body: JSON.stringify({
      from,
      html: message.html,
      reply_to: message.replyTo,
      subject: message.subject,
      text: message.text,
      to: recipients,
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new FormError('Email delivery failed.', 502);
  }
}

function contactRecipientsFor(env, data) {
  const groupsRecipient = tmOpsGroupsRecipient(data.location, data.subject);
  if (groupsRecipient) return [groupsRecipient];
  const locationRecipients = locationSpecificEnv(env, 'CONTACT_TO_EMAIL', data.location, 'CONTACT_TO_EMAIL');
  return splitEmails(locationRecipients);
}

function archiveBinding(env) {
  const db = env.FORM_SUBMISSIONS_DB || env.FORM_ARCHIVE_DB;
  if (db && typeof db.prepare === 'function') return db;
  return null;
}

function formArchiveRequired(env) {
  return stringValue(env.FORM_ARCHIVE_REQUIRED).trim() !== '0';
}

function requestSourceUrl(request) {
  const referer = normalizeText(request.headers.get('referer'), 1000);
  return referer || request.url;
}

function userAgent(request) {
  return normalizeText(request.headers.get('user-agent'), 1000);
}

function payloadForArchive(formType, data) {
  if (formType === 'newsletter') {
    return {
      email: data.email,
      familyName: data.familyName,
      givenName: data.givenName,
      location: data.location,
      marketingOptIn: data.marketingOptIn,
    };
  }

  return {
    email: data.email,
    location: data.location,
    message: data.message,
    name: data.name,
    phone: data.phone,
    subject: data.subject,
  };
}

async function archiveFormSubmission({ data, env, formType, request }) {
  const db = archiveBinding(env);
  if (!db) {
    if (formArchiveRequired(env)) {
      throw new FormError('Form archive is not configured.', 500);
    }
    return;
  }

  const name = formType === 'newsletter'
    ? [data.givenName, data.familyName].filter(Boolean).join(' ')
    : data.name;
  const payload = payloadForArchive(formType, data);
  const ip = clientIp(request);
  const ipHash = ip ? await hashRateLimitIdentifier(ip) : '';

  await db.prepare(`
    INSERT INTO form_submissions (
      id,
      form_type,
      name,
      email,
      location,
      subject,
      message,
      marketing_opt_in,
      ip_hash,
      user_agent,
      source_url,
      payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    formType,
    name || null,
    data.email,
    data.location || null,
    formType === 'contact' ? data.subject : null,
    formType === 'contact' ? data.message : null,
    formType === 'newsletter' && data.marketingOptIn ? 1 : 0,
    ipHash || null,
    userAgent(request) || null,
    requestSourceUrl(request),
    JSON.stringify(payload),
  ).run();
}

function klaviyoListIdFor(env, data) {
  return locationSpecificEnv(env, 'KLAVIYO_LIST_ID', data.location, 'KLAVIYO_LIST_ID');
}

async function sendKlaviyoNewsletterSubscription({ data, env, fetchImpl }) {
  const apiKey = stringValue(env.KLAVIYO_API_KEY).trim();
  if (!apiKey) return;

  const listId = klaviyoListIdFor(env, data);
  const fullName = [data.givenName, data.familyName].filter(Boolean).join(' ');
  const profileAttributes = {
    email: data.email,
    subscriptions: {
      email: {
        marketing: {
          consent: 'SUBSCRIBED',
        },
      },
    },
    properties: {
      source: 'time-mission-website',
      location: data.location,
    },
  };

  if (data.givenName) profileAttributes.first_name = data.givenName;
  if (data.familyName) profileAttributes.last_name = data.familyName;
  if (fullName) profileAttributes.properties.full_name = fullName;

  const relationships = listId
    ? {
        list: {
          data: {
            id: listId,
            type: 'list',
          },
        },
      }
    : undefined;

  const payload = {
    data: {
      type: 'profile-subscription-bulk-create-job',
      attributes: {
        profiles: {
          data: [
            {
              type: 'profile',
              attributes: profileAttributes,
            },
          ],
        },
      },
      ...(relationships ? { relationships } : {}),
    },
  };

  const response = await fetchImpl(KLAVIYO_SUBSCRIBE_URL, {
    body: JSON.stringify(payload),
    headers: {
      authorization: `Klaviyo-API-Key ${apiKey}`,
      accept: 'application/vnd.api+json',
      'content-type': 'application/vnd.api+json',
      revision: stringValue(env.KLAVIYO_REVISION).trim() || KLAVIYO_REVISION,
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new FormError('Newsletter subscription failed.', 502);
  }
}

function successResponse(request, asJSON) {
  if (asJSON) {
    return Response.json({ ok: true });
  }
  return Response.redirect(new URL('/contact-thank-you', request.url), 303);
}

function errorResponse(error, asJSON) {
  const status = error instanceof FormError ? error.status : 500;
  const message = error instanceof FormError
    ? error.publicMessage
    : error instanceof Error
      ? error.message
      : 'Form submission failed.';

  if (asJSON) {
    return Response.json({ error: message, ok: false }, { status });
  }

  return new Response(message, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
    status,
  });
}

function validateSubmission(formType, raw) {
  return formType === 'newsletter'
    ? validateNewsletterSubmission(raw)
    : validateContactSubmission(raw);
}

function emailForSubmission(formType, data) {
  return formType === 'newsletter' ? newsletterEmail(data) : contactEmail(data);
}

function applySubmissionRecipients({ data, env, formType, message }) {
  if (formType !== 'contact') return message;
  const recipients = contactRecipientsFor(env, data);
  if (recipients.length > 0) message.to = recipients.join(',');
  return message;
}

async function archiveSubmission({ data, env, formType, request }) {
  await assertEmailRateLimit({ email: data.email, env, formType });
  await archiveFormSubmission({ data, env, formType, request });
}

async function deliverSubmission({ data, env, fetchImpl, formType, message }) {
  if (formType === 'newsletter') {
    await sendKlaviyoNewsletterSubscription({ data, env, fetchImpl });
  }
  await sendResendEmail({ env, fetchImpl, formType, message });
}

export async function handleFormRequest({
  env = {},
  fetchImpl = fetch,
  formType,
  request,
}) {
  const asJSON = wantsJSON(request);

  try {
    if (request.method !== 'POST') throw new FormError('Method not allowed.', 405);
    if (!isAllowedOrigin(request, env)) throw new FormError('Origin is not allowed.', 403);

    await assertIpRateLimit({ env, request });

    const raw = await parseFormData(request);
    if (normalizeText(raw['bot-field'])) {
      return successResponse(request, asJSON);
    }

    await verifyTurnstile({
      env,
      fetchImpl,
      request,
      token: raw['cf-turnstile-response'],
    });

    const data = validateSubmission(formType, raw);
    await archiveSubmission({ data, env, formType, request });

    const message = applySubmissionRecipients({
      data,
      env,
      formType,
      message: emailForSubmission(formType, data),
    });
    await deliverSubmission({ data, env, fetchImpl, formType, message });
    return successResponse(request, asJSON);
  } catch (error) {
    return errorResponse(error, asJSON);
  }
}
