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

if (!ticketPanel.includes('resolveOpenCheckoutUrl')) {
  errors.push('js/ticket-panel.js must define resolveOpenCheckoutUrl for Phase 5 checkout precedence');
}

if (!ticketPanel.match(/function resolveOpenCheckoutUrl[\s\S]*?rollerCheckoutUrl[\s\S]*?bookingUrl/)) {
  errors.push('resolveOpenCheckoutUrl must test rollerCheckoutUrl before bookingUrl');
}

// BOOK-03: roller-checkout.js is a loadable no-op stub; iframe CDN must not ship by default.
if (rollerCheckout.includes('checkout_iframe.js')) {
  errors.push('js/roller-checkout.js must not load Roller iframe CDN (BOOK-03)');
}

if (rollerCheckout.includes('RollerCheckout')) {
  errors.push('js/roller-checkout.js must not reference RollerCheckout (BOOK-03)');
}

if (rollerCheckout.includes('cdn.rollerdigital.com')) {
  errors.push('js/roller-checkout.js must not reference cdn.rollerdigital.com (BOOK-03)');
}

if (errors.length) {
  console.error('Booking architecture check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Booking architecture check passed.');
