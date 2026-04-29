const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];

const ticketPanel = fs.readFileSync(path.join(root, 'js', 'ticket-panel.js'), 'utf8');
const rollerCheckout = fs.readFileSync(path.join(root, 'js', 'roller-checkout.js'), 'utf8');

if (/var\s+bookingUrls\s*=|const\s+bookingUrls\s*=|let\s+bookingUrls\s*=/.test(ticketPanel)) {
  errors.push('js/ticket-panel.js must not define a bookingUrls map; use data/locations.json via window.TM');
}

if (/var\s+locationPages\s*=|const\s+locationPages\s*=|let\s+locationPages\s*=/.test(ticketPanel)) {
  errors.push('js/ticket-panel.js must not define a locationPages map; derive pages from location slugs');
}

if (/rollerCheckouts\s*=/.test(rollerCheckout)) {
  errors.push('js/roller-checkout.js must not define rollerCheckouts; use location.rollerCheckoutUrl');
}

if (!ticketPanel.includes('window.TM.ready')) {
  errors.push('js/ticket-panel.js should wait for window.TM.ready before hydrating location-driven options');
}

if (!rollerCheckout.includes('loc.rollerCheckoutUrl')) {
  errors.push('js/roller-checkout.js should resolve Roller URLs from location.rollerCheckoutUrl');
}

if (errors.length) {
  console.error('Booking architecture check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Booking architecture check passed.');
