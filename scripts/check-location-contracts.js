const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'data', 'locations.json');
const missionsPartialPath = path.join(root, 'src', 'partials', 'missions-main.frag.txt');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const locations = data.locations || [];
const visibleMissionIds = new Set(
  Array.from(fs.readFileSync(missionsPartialPath, 'utf8').matchAll(/data-mission-id="(\d{4})"/g), (match) => match[1])
);

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
  const entries = Object.entries(location.groupFormUrls);
  if (entries.length > 0 && !Object.prototype.hasOwnProperty.call(location.groupFormUrls, 'default')) {
    errors.push(`${id}: groupFormUrls.default is required for generic group CTAs`);
  }
  for (const [key, url] of entries) {
    if (!/^[a-z0-9-]+$/.test(key)) {
      errors.push(`${id}: groupFormUrls key ${key} must be kebab-case`);
    }
    assertSafeUrl(id, `groupFormUrls.${key}`, url);
  }
}

function validateHiddenMissionIds(location) {
  const id = location.id || '(unknown)';
  if (location.hiddenMissionIds == null) return;
  if (!Array.isArray(location.hiddenMissionIds)) {
    errors.push(`${id}: hiddenMissionIds must be an array when present`);
    return;
  }

  const seenMissionIds = new Set();
  for (const missionId of location.hiddenMissionIds) {
    if (typeof missionId !== 'string' || !/^\d{4}$/.test(missionId)) {
      errors.push(`${id}: hiddenMissionIds values must be 4-digit strings`);
      continue;
    }
    if (!visibleMissionIds.has(missionId)) {
      errors.push(`${id}: hiddenMissionIds ${missionId} does not match a rendered mission card`);
    }
    if (seenMissionIds.has(missionId)) {
      errors.push(`${id}: hiddenMissionIds must not include duplicate ${missionId}`);
    }
    seenMissionIds.add(missionId);
  }
}

function validateTeamSize(location) {
  const id = location.id || '(unknown)';
  if (location.teamSize == null) return;
  if (!location.teamSize || typeof location.teamSize !== 'object' || Array.isArray(location.teamSize)) {
    errors.push(`${id}: teamSize must be an object when present`);
    return;
  }

  const { min, max } = location.teamSize;
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) {
    errors.push(`${id}: teamSize must contain positive integer min/max values with max >= min`);
  }
}

function validateDonationUrl(location) {
  const id = location.id || '(unknown)';
  if (location.donationUrl == null) return;
  if (typeof location.donationUrl !== 'string' || location.donationUrl.trim() === '') {
    errors.push(`${id}: donationUrl must be a non-empty string when present`);
    return;
  }
  assertSafeUrl(id, 'donationUrl', location.donationUrl);
}

function validateFirstAccessUrl(location) {
  const id = location.id || '(unknown)';
  if (location.firstAccessUrl == null) return;
  if (location.status !== 'coming-soon') {
    errors.push(`${id}: firstAccessUrl is only supported for coming-soon locations`);
  }
  assertSafeUrl(id, 'firstAccessUrl', location.firstAccessUrl);
}

function isExternalSiteOnlyOpenLocation(location) {
  const externalUrl = typeof location.externalUrl === 'string' ? location.externalUrl.trim() : '';
  const bookingUrl = typeof location.bookingUrl === 'string' ? location.bookingUrl.trim() : '';
  return location.status === 'open' && externalUrl && bookingUrl === externalUrl;
}

function validateOpenLocation(location) {
  const id = location.id;
  requireString(location, 'bookingUrl', location.bookingUrl);
  if (location.bookingUrl && typeof location.bookingUrl === 'string') {
    assertSafeUrl(id, 'bookingUrl', location.bookingUrl, { allowMailtoBooking: true });
  }
  assertSafeUrl(id, 'mapUrl', location.mapUrl);
  if (isExternalSiteOnlyOpenLocation(location)) return;
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
  if (location.groupCheckoutUrl) {
    assertSafeUrl(id, 'groupCheckoutUrl', location.groupCheckoutUrl);
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
  if (location.groupCheckoutUrl && String(location.groupCheckoutUrl).trim() !== '') {
    assertSafeUrl(id, 'groupCheckoutUrl', location.groupCheckoutUrl);
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
  if (location.groupCheckoutUrl && String(location.groupCheckoutUrl).trim() !== '') {
    errors.push(`${id}: temporarily-closed location must not expose groupCheckoutUrl`);
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
  if (location.pagePath != null) {
    assertSafeUrl(location.id, 'pagePath', location.pagePath);
    if (location.pagePath !== `/${location.slug}`) {
      errors.push(`${location.id}: pagePath must match /${location.slug}`);
    }
  }

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
  validateHiddenMissionIds(location);
  validateTeamSize(location);
  validateDonationUrl(location);
  validateFirstAccessUrl(location);
  const hasValidGeo = validateGeo(location);

  if (Object.prototype.hasOwnProperty.call(location, 'localBusinessSchemaEligible')) {
    if (
      location.status === 'open'
      && location.localBusinessSchemaEligible !== true
      && !isExternalSiteOnlyOpenLocation(location)
    ) {
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

if (!visibleMissionIds.size) {
  errors.push('src/partials/missions-main.frag.txt does not define any mission cards with data-mission-id');
}

if (errors.length) {
  console.error('Location contract check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Location contract check passed for ${locations.length} locations.`);
