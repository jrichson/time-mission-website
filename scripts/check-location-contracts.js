const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'data', 'locations.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const locations = data.locations || [];

const errors = [];
const seen = new Set();

const INTERNAL_PATH = /^\/[a-z0-9\-\/]*$/;

function assertSafeUrl(locationId, field, value, options) {
  const opts = options || {};
  const allowMailto = !!opts.allowMailto;
  const allowMailtoBooking = !!opts.allowMailtoBooking;
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${locationId}: ${field} must be a non-empty string`);
    return;
  }
  const v = value.trim();
  const lower = v.toLowerCase();
  if (lower.indexOf('javascript:') === 0 || lower.indexOf('data:') === 0) {
    errors.push(`${locationId}: ${field} must not use unsafe URL scheme`);
    return;
  }
  if (INTERNAL_PATH.test(v)) return;
  if (v.indexOf('https://') === 0) return;
  if (allowMailto && v.indexOf('mailto:') === 0) return;
  if (allowMailtoBooking && v.indexOf('mailto:') === 0) return;
  errors.push(`${locationId}: ${field} must be https URL, mailto (when allowed), or internal path`);
}

function requireString(location, field, value) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${location.id || '(unknown)'} is missing ${field}`);
  }
}

function validateIntlFields(location) {
  const id = location.id || '(unknown)';
  const simpleNullable = ['countryCode', 'locale', 'timeZone', 'currency', 'phoneE164'];
  for (const k of simpleNullable) {
    if (location[k] == null) continue;
    if (typeof location[k] !== 'string') {
      errors.push(`${id}: ${k} must be string or null`);
    }
  }
  if (location.hreflang == null) return;
  if (!Array.isArray(location.hreflang)) {
    errors.push(`${id}: hreflang must be array or null`);
    return;
  }
  for (const entry of location.hreflang) {
    if (!entry || typeof entry !== 'object') {
      errors.push(`${id}: hreflang entries must be objects`);
      continue;
    }
    if (typeof entry.lang !== 'string' || typeof entry.url !== 'string') {
      errors.push(`${id}: hreflang item needs string lang and url`);
      continue;
    }
    const u = entry.url.trim();
    if (u.indexOf('https://') === 0) continue;
    if (INTERNAL_PATH.test(u) && !u.endsWith('.html')) continue;
    errors.push(`${id}: hreflang url must be https or clean internal path without .html`);
  }
}

function validateOpenLocation(location) {
  const id = location.id;
  requireString(location, 'bookingUrl', location.bookingUrl);
  if (location.bookingUrl && typeof location.bookingUrl === 'string') {
    assertSafeUrl(id, 'bookingUrl', location.bookingUrl, { allowMailtoBooking: true });
  }
  assertSafeUrl(id, 'mapUrl', location.mapUrl);
  requireString(location, 'contact.phone', location.contact && location.contact.phone);
  requireString(location, 'contact.email', location.contact && location.contact.email);
  requireString(location, 'giftCardUrl', location.giftCardUrl);
  if (location.giftCardUrl) {
    assertSafeUrl(id, 'giftCardUrl', location.giftCardUrl, { allowMailto: true });
  }
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  if (!location.hours || typeof location.hours !== 'object') {
    errors.push(`${id} is open but has no hours object`);
    return;
  }
  for (const day of days) {
    const h = location.hours[day];
    if (!h || typeof h.label !== 'string' || h.label.trim() === '') {
      errors.push(`${id} is missing hours.${day}.label`);
    }
  }
  if (location.rollerCheckoutUrl) {
    if (!/^https:\/\//.test(location.rollerCheckoutUrl)) {
      errors.push(`${id} rollerCheckoutUrl must be HTTPS`);
    }
  }
}

function validateComingSoonLocation(location) {
  const id = location.id;
  if (location.bookingUrl && String(location.bookingUrl).trim() !== '') {
    errors.push(`${id} is coming soon but has bookingUrl`);
  }
  if (location.mapUrl && String(location.mapUrl).trim() !== '') {
    assertSafeUrl(id, 'mapUrl', location.mapUrl, { allowMailto: false });
  }
  if (location.giftCardUrl && String(location.giftCardUrl).trim() !== '') {
    assertSafeUrl(id, 'giftCardUrl', location.giftCardUrl, { allowMailto: true });
  }
  if (location.rollerCheckoutUrl && String(location.rollerCheckoutUrl).trim() !== '') {
    if (!/^https:\/\//.test(location.rollerCheckoutUrl)) {
      errors.push(`${id} rollerCheckoutUrl must be HTTPS`);
    }
  }
}

for (const location of locations) {
  requireString(location, 'id', location.id);
  requireString(location, 'slug', location.slug);
  requireString(location, 'shortName', location.shortName);
  requireString(location, 'name', location.name);
  requireString(location, 'navLabel', location.navLabel);

  if (seen.has(location.id)) {
    errors.push(`Duplicate location id: ${location.id}`);
  }
  seen.add(location.id);

  if (location.id !== location.slug) {
    errors.push(`${location.id} has mismatched id/slug (${location.slug})`);
  }

  const pagePath = path.join(root, `${location.slug}.html`);
  if (!fs.existsSync(pagePath)) {
    errors.push(`${location.id} points to missing page ${location.slug}.html`);
  }

  validateIntlFields(location);

  if (Object.prototype.hasOwnProperty.call(location, 'localBusinessSchemaEligible')) {
    if (location.status === 'open' && location.localBusinessSchemaEligible !== true) {
      errors.push(`${location.id}: open location must have localBusinessSchemaEligible true`);
    }
    if (location.status === 'coming-soon' && location.localBusinessSchemaEligible !== false) {
      errors.push(`${location.id}: coming-soon location must have localBusinessSchemaEligible false`);
    }
  }

  if (location.status === 'open') {
    validateOpenLocation(location);
  } else if (location.status === 'coming-soon') {
    validateComingSoonLocation(location);
  }
}

if (!locations.length) {
  errors.push('data/locations.json does not define any locations');
}

if (errors.length) {
  console.error('Location contract check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Location contract check passed for ${locations.length} locations.`);
