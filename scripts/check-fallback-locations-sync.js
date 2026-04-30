/**
 * Ensures js/locations.js FALLBACK mirrors bookingUrl, giftCardUrl, mapUrl,
 * shortName, address lines, contact, and hour labels from data/locations.json
 * for every slug that appears in FALLBACK.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const jsPath = path.join(root, 'js', 'locations.js');
const dataPath = path.join(root, 'data', 'locations.json');

const src = fs.readFileSync(jsPath, 'utf8');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const start = src.indexOf('const FALLBACK = ');
if (start === -1) {
  console.error('Could not find FALLBACK in js/locations.js');
  process.exit(1);
}
let braceStart = src.indexOf('{', start);
let depth = 0;
let end = -1;
for (let i = braceStart; i < src.length; i++) {
  const c = src[i];
  if (c === '{') depth++;
  else if (c === '}') {
    depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}
if (end === -1) {
  console.error('Could not parse FALLBACK object');
  process.exit(1);
}

const fallbackExpr = src.slice(braceStart, end);
let fallback;
try {
  fallback = vm.runInNewContext('(' + fallbackExpr + ')', Object.freeze({}), { timeout: 500 });
} catch (e) {
  console.error('Failed to evaluate FALLBACK:', e.message);
  process.exit(1);
}

const errors = [];
const slugKeys = Object.keys(fallback);

function hoursLabelsFromJson(hours) {
  const out = {};
  if (!hours) return out;
  for (const day of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
    if (hours[day] && hours[day].label) out[day] = { label: hours[day].label };
  }
  return out;
}

function addressFromJson(addr) {
  if (!addr) return {};
  const o = {};
  if (addr.line1) o.line1 = addr.line1;
  if (addr.line2) o.line2 = addr.line2;
  if (addr.city) o.city = addr.city;
  if (addr.state != null) o.state = addr.state;
  if (addr.zip) o.zip = addr.zip;
  if (addr.country) o.country = addr.country;
  return o;
}

for (const slug of slugKeys) {
  const loc = (data.locations || []).find((l) => l.id === slug);
  if (!loc) {
    errors.push(`FALLBACK key ${slug} has no matching location in data`);
    continue;
  }
  const fb = fallback[slug];
  const fields = ['shortName', 'bookingUrl', 'giftCardUrl', 'mapUrl'];

  if (loc.status === 'open') {
    const expected = {
      name: loc.name,
      shortName: loc.shortName,
      address: addressFromJson(loc.address),
      contact: {
        phone: loc.contact.phone,
        email: loc.contact.email,
      },
      hours: hoursLabelsFromJson(loc.hours),
      mapUrl: loc.mapUrl,
      bookingUrl: loc.bookingUrl,
      giftCardUrl: loc.giftCardUrl,
    };
    for (const k of Object.keys(expected)) {
      if (JSON.stringify(expected[k]) !== JSON.stringify(fb[k])) {
        errors.push(`FALLBACK ${slug} mismatch on ${k}`);
      }
    }
  } else {
    for (const f of fields) {
      const got = fb[f] != null ? String(fb[f]) : '';
      const want = loc[f] != null ? String(loc[f]) : '';
      if (got !== want) {
        errors.push(`FALLBACK ${slug} ${f}: expected "${want}" got "${got}"`);
      }
    }
  }
}

if (errors.length) {
  console.error('FALLBACK sync check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('FALLBACK sync check passed.');
