const MAX_BODY_BYTES = 16 * 1024;
const MAX_FIELD_LENGTH = 2000;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESEND_EMAIL_URL = 'https://api.resend.com/emails';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://timemission.com',
  'https://www.timemission.com',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class FormError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'FormError';
    this.status = status;
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

function envList(value) {
  return stringValue(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitEmails(value) {
  return envList(value).filter((email) => EMAIL_RE.test(email));
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

  const allowed = new Set([
    requestOrigin(request),
    ...DEFAULT_ALLOWED_ORIGINS,
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

async function parseMultipart(request) {
  const form = await request.formData();
  const data = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') data[key] = value;
  }
  return data;
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
    subject: normalizeText(raw.subject, 160),
  };

  if (!data.name) throw new FormError('Name is required.');
  assertEmail(data.email);
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
    throw new FormError('Form protection is not configured.', 500);
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
  const text = [
    'New Time Mission contact form submission',
    '',
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Location: ${data.location}`,
    `Subject: ${data.subject}`,
    '',
    data.message,
  ].join('\n');

  const html = `
    <h2>New Time Mission contact form submission</h2>
    <p><strong>Name:</strong> ${htmlEscape(data.name)}</p>
    <p><strong>Email:</strong> ${htmlEscape(data.email)}</p>
    <p><strong>Location:</strong> ${htmlEscape(data.location)}</p>
    <p><strong>Subject:</strong> ${htmlEscape(data.subject)}</p>
    <p><strong>Message:</strong></p>
    <p>${htmlEscape(data.message).replaceAll('\n', '<br>')}</p>
  `;

  return {
    html,
    replyTo: data.email,
    subject: `Time Mission contact: ${data.subject}`,
    text,
  };
}

function newsletterEmail(data) {
  const fullName = [data.givenName, data.familyName].filter(Boolean).join(' ');
  const text = [
    'New Time Mission newsletter signup',
    '',
    `Name: ${fullName}`,
    `Email: ${data.email}`,
    'Marketing opt-in: yes',
  ].join('\n');

  const html = `
    <h2>New Time Mission newsletter signup</h2>
    <p><strong>Name:</strong> ${htmlEscape(fullName)}</p>
    <p><strong>Email:</strong> ${htmlEscape(data.email)}</p>
    <p><strong>Marketing opt-in:</strong> yes</p>
  `;

  return {
    html,
    replyTo: data.email,
    subject: `Time Mission newsletter signup: ${data.email}`,
    text,
  };
}

async function sendResendEmail({ env, fetchImpl, formType, message }) {
  const apiKey = stringValue(env.FORM_EMAIL_API_KEY).trim();
  const from = stringValue(env.FORM_FROM_EMAIL).trim();
  const recipients = splitEmails(
    formType === 'newsletter'
      ? env.NEWSLETTER_TO_EMAIL || env.CONTACT_TO_EMAIL
      : env.CONTACT_TO_EMAIL,
  );

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

function successResponse(request, asJSON) {
  if (asJSON) {
    return Response.json({ ok: true });
  }
  return Response.redirect(new URL('/contact-thank-you', request.url), 303);
}

function errorResponse(error, asJSON) {
  const status = error instanceof FormError ? error.status : 500;
  const message = error instanceof Error ? error.message : 'Form submission failed.';

  if (asJSON) {
    return Response.json({ error: message, ok: false }, { status });
  }

  return new Response(message, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
    status,
  });
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

    const data = formType === 'newsletter'
      ? validateNewsletterSubmission(raw)
      : validateContactSubmission(raw);
    const message = formType === 'newsletter' ? newsletterEmail(data) : contactEmail(data);

    await sendResendEmail({ env, fetchImpl, formType, message });
    return successResponse(request, asJSON);
  } catch (error) {
    return errorResponse(error, asJSON);
  }
}
