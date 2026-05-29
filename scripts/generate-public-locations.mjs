#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PAYLOAD_FETCH_TIMEOUT_MS, validatedCmsOriginBase } from './lib/payload-origin.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const baseLocationsPath = path.join(root, 'data', 'locations.json');
const publicLocationsPath = path.join(root, 'public', 'data', 'locations.json');

const LOCATION_HOUR_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TIME_24_HOUR_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanNullableString(value) {
  const cleaned = cleanString(value);
  return cleaned || undefined;
}

function cleanTime(value) {
  const cleaned = cleanString(value);
  return TIME_24_HOUR_PATTERN.test(cleaned) ? cleaned : undefined;
}

function cmsOriginFromEnv() {
  for (const key of ['PAYLOAD_CMS_ORIGIN', 'PAYLOAD_PUBLIC_CMS_ORIGIN']) {
    const value = cleanString(process.env[key]).replace(/\/+$/, '');
    if (value) return value;
  }
  return '';
}

function locationDetailsUrl(origin) {
  const url = new URL('/api/location-details', `${origin}/`);
  url.searchParams.set('limit', '250');
  url.searchParams.set('depth', '0');
  url.searchParams.sort();
  return url;
}

function readLocationsDocument() {
  return JSON.parse(fs.readFileSync(baseLocationsPath, 'utf8'));
}

function addressPatchForDoc(doc) {
  const address = doc?.address;
  if (!address) return null;

  const city = cleanString(address.city);
  const country = cleanString(address.country);
  if (!city || !country) return null;

  return {
    line1: cleanString(address.line1),
    line2: cleanNullableString(address.line2),
    city,
    state: cleanString(address.state),
    zip: cleanString(address.zip),
    country,
  };
}

function mapUrlForAddress(address) {
  const query = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.zip,
    address.country,
  ]
    .map(cleanString)
    .filter(Boolean)
    .join(' ');

  return query ? `https://maps.google.com/?q=${encodeURIComponent(query)}` : '';
}

function hoursPatchForDoc(doc) {
  const hours = doc?.hours;
  if (!hours) return null;

  const patch = {};
  for (const day of LOCATION_HOUR_DAY_KEYS) {
    const row = hours[day];
    const label = cleanString(row?.label);
    if (!label) continue;

    const open = cleanTime(row?.open);
    const close = cleanTime(row?.close);
    patch[day] = {
      label,
      ...(open ? { open } : {}),
      ...(close ? { close } : {}),
    };
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

function patchForDoc(doc) {
  if (!doc || doc.published !== true || !cleanString(doc.locationSlug)) return null;

  const address = addressPatchForDoc(doc);
  const hours = hoursPatchForDoc(doc);
  if (!address && !hours) return null;

  return {
    ...(address ? { address } : {}),
    ...(address ? { mapUrl: mapUrlForAddress(address) } : {}),
    ...(hours ? { hours } : {}),
  };
}

function applyLocationDetailsOverrides(locations, docs) {
  if (!Array.isArray(docs) || docs.length === 0) return { locations, appliedCount: 0 };

  const knownSlugs = new Set(locations.map((loc) => loc.slug).filter(Boolean));
  const patches = new Map();
  for (const doc of docs) {
    const slug = cleanString(doc?.locationSlug);
    if (!knownSlugs.has(slug)) continue;

    const patch = patchForDoc(doc);
    if (patch) patches.set(slug, patch);
  }

  if (patches.size === 0) return { locations, appliedCount: 0 };

  return {
    appliedCount: patches.size,
    locations: locations.map((loc) => {
      const patch = patches.get(loc.slug);
      if (!patch) return loc;

      return {
        ...loc,
        ...(patch.address ? { address: { ...loc.address, ...patch.address } } : {}),
        ...(patch.hours ? { hours: { ...(loc.hours || {}), ...patch.hours } } : {}),
        ...(patch.mapUrl ? { mapUrl: patch.mapUrl } : {}),
      };
    }),
  };
}

async function fetchLocationDetails(origin) {
  const raw = cleanString(origin).replace(/\/+$/, '');
  const base = validatedCmsOriginBase(raw);
  if (!base) {
    if (raw) console.warn('[locations] skipping optional CMS location details: invalid or disallowed PAYLOAD_CMS_ORIGIN');
    return [];
  }

  const url = locationDetailsUrl(base);
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(PAYLOAD_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[locations] optional CMS location details skipped: GET ${url} failed: ${res.status}`);
      return [];
    }

    const body = await res.json();
    return Array.isArray(body?.docs) ? body.docs : [];
  } catch (err) {
    console.warn(
      '[locations] optional CMS location details fetch failed:',
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

export async function generatePublicLocations({ origin = cmsOriginFromEnv(), outputPath = publicLocationsPath } = {}) {
  const baseDocument = readLocationsDocument();
  const baseLocations = Array.isArray(baseDocument.locations) ? baseDocument.locations : [];
  const docs = await fetchLocationDetails(origin);
  const { locations, appliedCount } = applyLocationDetailsOverrides(baseLocations, docs);
  const resolvedDocument = { ...baseDocument, locations };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(resolvedDocument, null, 2)}\n`);

  console.log(
    appliedCount > 0
      ? `[locations] wrote public data with ${appliedCount} CMS location detail override(s).`
      : '[locations] wrote public data from code-owned location fallback.',
  );

  return { appliedCount, outputPath };
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  generatePublicLocations().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
