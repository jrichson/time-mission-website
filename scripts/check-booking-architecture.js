const fs = require('node:fs');
const path = require('node:path');
const { runCheck } = require('./lib/validation-core');

const root = path.resolve(__dirname, '..');

const ticketPanel = fs.readFileSync(path.join(root, 'js', 'ticket-panel.js'), 'utf8');
const rollerCheckout = fs.readFileSync(path.join(root, 'js', 'roller-checkout.js'), 'utf8');
const bookingController = fs.readFileSync(path.join(root, 'js', 'booking-controller.js'), 'utf8');

runCheck({
  title: 'Booking architecture check',
  run(errors) {
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

    if (!ticketPanel.includes('window.TMBooking') && !ticketPanel.includes('getTMBooking')) {
      errors.push('js/ticket-panel.js must use TMBooking gateway for booking decisions');
    }

    if (!bookingController.includes('window.TMBooking')) {
      errors.push('js/booking-controller.js must expose window.TMBooking gateway');
    }

    if (!bookingController.includes('getDestination')) {
      errors.push('window.TMBooking must provide getDestination');
    }

    if (!bookingController.includes('navigate')) {
      errors.push('window.TMBooking must provide navigate');
    }

    if (!ticketPanel.includes('[data-tm-booking-trigger]')) {
      errors.push('js/ticket-panel.js must bind booking handlers via explicit [data-tm-booking-trigger] selectors');
    }

    if (
      ticketPanel.includes('.btn-tickets, .btn-book-now')
      || ticketPanel.includes('btn-primary[href*="roller"]')
      || ticketPanel.includes('btn-primary[href*="tickets.timemission"]')
    ) {
      errors.push('js/ticket-panel.js must not use heuristic booking selectors; use [data-tm-booking-trigger]');
    }

    if (
      bookingController.includes('.btn-tickets, .btn-book-now')
      || bookingController.includes('btn-primary[href*="roller"]')
      || bookingController.includes('btn-primary[href*="tickets.timemission"]')
    ) {
      errors.push('js/booking-controller.js must not use heuristic booking selectors; use [data-tm-booking-trigger]');
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
  },
  onSuccess() {
    return 'Booking architecture check passed.';
  },
});
