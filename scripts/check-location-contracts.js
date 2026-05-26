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
  if (location.countryCode != null && !/^[A-Z]{2}$/.test(location.countryCode)) {
    errors.push(`${id}: countryCode must be an ISO 3166-1 alpha-2 code`);
  }
  if (location.phoneE164 != null && !/^\+[1-9]\d{6,14}$/.test(location.phoneE164)) {
    errors.push(`${id}: phoneE164 must be E.164 formatted`);
  }
  // hreflang is stored as a language attribute only; cross-city alternate
  // clusters are intentionally not emitted.
  if (location.hreflang == null) return;
  if (typeof location.hreflang !== 'string') {
    errors.push(`${id}: hreflang must be BCP-47 language tag string or null`);
    return;
  }
  if (!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(location.hreflang)) {
    errors.push(`${id}: hreflang must match BCP-47 pattern (e.g. "en", "nl-BE")`);
  }
}

function validateGeo(location) {
  const id = location.id || '(unknown)';
  if (!Object.prototype.hasOwnProperty.call(location, 'geo') || location.geo == null) {
    return false;
  }
  if (!location.geo || typeof location.geo !== 'object' || Array.isArray(location.geo)) {
    errors.push(`${id}: geo must be an object when present`);
    return false;
  }
  const { latitude, longitude } = location.geo;
  let ok = true;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.push(`${id}: geo.latitude must be a finite number between -90 and 90`);
    ok = false;
  }
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.push(`${id}: geo.longitude must be a finite number between -180 and 180`);
    ok = false;
  }
  return ok;
}

function validateLocationTicker(location) {
  const id = location.id || '(unknown)';
  if (typeof location.ticker !== 'string' || location.ticker.trim() === '') {
    errors.push(`${id}: ticker must be a non-empty string`);
    return;
  }

  const ticker = location.ticker.toLowerCase();
  for (const other of locations) {
    if (!other || other.id === location.id || !other.shortName) continue;
    if (ticker.includes(String(other.shortName).toLowerCase())) {
      errors.push(`${id}: ticker must not mention ${other.shortName}`);
    }
  }
}

function validateGroupFormUrls(location) {
  const id = location.id || '(unknown)';
  if (location.groupFormUrls == null) return;
  if (!location.groupFormUrls || typeof location.groupFormUrls !== 'object' || Array.isArray(location.groupFormUrls)) {
    errors.push(`${id}: groupFormUrls must be an object when present`);
    return;
  }
  for (const [key, url] of Object.entries(location.groupFormUrls)) {
    if (!/^[a-z0-9-]+$/.test(key)) {
      errors.push(`${id}: groupFormUrls key ${key} must be kebab-case`);
    }
    assertSafeUrl(id, `groupFormUrls.${key}`, url);
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
  if (typeof location.giftCardUrl !== 'string') {
    errors.push(`${id}: giftCardUrl must be a string; use empty string when unavailable`);
  } else if (location.giftCardUrl.trim()) {
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
  validateGroupFormUrls(location);
  if (location.waiverUrl) {
    assertSafeUrl(id, 'waiverUrl', location.waiverUrl);
  }
  if (location.briqWidget != null) {
    const widget = location.briqWidget;
    if (!widget || typeof widget !== 'object' || Array.isArray(widget)) {
      errors.push(`${id}: briqWidget must be an object when present`);
    } else if (typeof widget.domain !== 'string' || !/^[a-z0-9-]+$/.test(widget.domain)) {
      errors.push(`${id}: briqWidget.domain must be a safe slug`);
    }
  }
}

function validateComingSoonLocation(location) {
  const id = location.id;
  if (location.bookingUrl && String(location.bookingUrl).trim() !== '') {
    assertSafeUrl(id, 'bookingUrl', location.bookingUrl, { allowMailtoBooking: true });
  }
  if (location.mapUrl && String(location.mapUrl).trim() !== '') {
    assertSafeUrl(id, 'mapUrl', location.mapUrl, { allowMailto: false });
  }
  if (location.giftCardUrl && String(location.giftCardUrl).trim() !== '') {
    assertSafeUrl(id, 'giftCardUrl', location.giftCardUrl, { allowMailto: true });
  }
  validateGroupFormUrls(location);
  if (location.rollerCheckoutUrl && String(location.rollerCheckoutUrl).trim() !== '') {
    if (!/^https:\/\//.test(location.rollerCheckoutUrl)) {
      errors.push(`${id} rollerCheckoutUrl must be HTTPS`);
    }
  }
}

function validateTemporaryClosure(location) {
  const id = location.id;
  if (!location.temporaryClosure || typeof location.temporaryClosure !== 'object' || Array.isArray(location.temporaryClosure)) {
    errors.push(`${id}: temporarily-closed location must define temporaryClosure copy`);
  } else {
    for (const field of ['label', 'title', 'summary', 'detail', 'ctaLabel', 'contactLabel']) {
      requireString(location, `temporaryClosure.${field}`, location.temporaryClosure[field]);
    }
  }
  if (location.bookingUrl && String(location.bookingUrl).trim() !== '') {
    errors.push(`${id}: temporarily-closed location must not expose bookingUrl`);
  }
  if (location.rollerCheckoutUrl && String(location.rollerCheckoutUrl).trim() !== '') {
    errors.push(`${id}: temporarily-closed location must not expose rollerCheckoutUrl`);
  }
  if (location.giftCardUrl && String(location.giftCardUrl).trim() !== '') {
    errors.push(`${id}: temporarily-closed location must not expose giftCardUrl`);
  }
  if (location.waiverUrl && String(location.waiverUrl).trim() !== '') {
    errors.push(`${id}: temporarily-closed location must not expose waiverUrl`);
  }
  validateGroupFormUrls(location);
  if (location.groupFormUrls && Object.keys(location.groupFormUrls).length > 0) {
    errors.push(`${id}: temporarily-closed location must not expose group form URLs`);
  }
  assertSafeUrl(id, 'mapUrl', location.mapUrl);
  requireString(location, 'contact.email', location.contact && location.contact.email);
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

  const pageCandidates = [
    path.join(root, 'src', 'pages', `${location.slug}.astro`),
    path.join(root, `${location.slug}.html`),
  ];
  if (!pageCandidates.some((candidate) => fs.existsSync(candidate))) {
    errors.push(`${location.id} points to missing page source src/pages/${location.slug}.astro`);
  }

  validateIntlFields(location);
  validateLocationTicker(location);
  const hasValidGeo = validateGeo(location);

  if (Object.prototype.hasOwnProperty.call(location, 'localBusinessSchemaEligible')) {
    if (location.status === 'open' && location.localBusinessSchemaEligible !== true) {
      errors.push(`${location.id}: open location must have localBusinessSchemaEligible true`);
    }
    if (location.status === 'coming-soon' && location.localBusinessSchemaEligible !== false) {
      errors.push(`${location.id}: coming-soon location must have localBusinessSchemaEligible false`);
    }
    if (location.status === 'temporarily-closed' && location.localBusinessSchemaEligible !== false) {
      errors.push(`${location.id}: temporarily-closed location must have localBusinessSchemaEligible false`);
    }
  }
  if (location.status === 'open' && location.localBusinessSchemaEligible === true && !hasValidGeo) {
    errors.push(`${location.id}: open schema-eligible location must define geo coordinates`);
  }

  if (location.status === 'open') {
    validateOpenLocation(location);
  } else if (location.status === 'coming-soon') {
    validateComingSoonLocation(location);
  } else if (location.status === 'temporarily-closed') {
    validateTemporaryClosure(location);
  } else {
    errors.push(`${location.id}: unsupported status ${location.status}`);
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
