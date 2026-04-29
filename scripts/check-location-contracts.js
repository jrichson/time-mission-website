const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'data', 'locations.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const locations = data.locations || [];

const errors = [];
const seen = new Set();

function requireString(location, field, value) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${location.id || '(unknown)'} is missing ${field}`);
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

  if (location.status === 'open') {
    const hasBooking = typeof location.bookingUrl === 'string' && location.bookingUrl.trim() !== '';
    if (!hasBooking) {
      errors.push(`${location.id} is open but has no bookingUrl`);
    }
  }

  if (location.status === 'coming-soon' && location.bookingUrl) {
    errors.push(`${location.id} is coming soon but has a bookingUrl`);
  }

  if (location.rollerCheckoutUrl && !/^https:\/\//.test(location.rollerCheckoutUrl)) {
    errors.push(`${location.id} rollerCheckoutUrl must be HTTPS`);
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
