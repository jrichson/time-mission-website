'use strict';

/** @type {object[]} Declarative booking + site script policies (see scripts/lib/policy-runner.js). */
module.exports = [
  {
    id: 'no-ticket-panel-booking-urls-map',
    files: ['js/ticket-panel.js'],
    type: 'forbidden_regex',
    pattern: /var\s+bookingUrls\s*=|const\s+bookingUrls\s*=|let\s+bookingUrls\s*=/,
    message: 'js/ticket-panel.js must not define a bookingUrls map; use data/locations.json via window.TM',
  },
  {
    id: 'no-ticket-panel-location-pages-map',
    files: ['js/ticket-panel.js'],
    type: 'forbidden_regex',
    pattern: /var\s+locationPages\s*=|const\s+locationPages\s*=|let\s+locationPages\s*=/,
    message: 'js/ticket-panel.js must not define a locationPages map; derive pages from location slugs',
  },
  {
    id: 'no-roller-checkouts-map',
    files: ['js/roller-checkout.js'],
    type: 'forbidden_regex',
    pattern: /rollerCheckouts\s*=/,
    message: 'js/roller-checkout.js must not define rollerCheckouts; use location.rollerCheckoutUrl',
  },
  {
    id: 'ticket-panel-waits-tm-ready',
    files: ['js/ticket-panel.js'],
    type: 'required_substring',
    needle: 'window.TM.ready',
    message: 'js/ticket-panel.js should wait for window.TM.ready before hydrating location-driven options',
  },
  {
    id: 'ticket-panel-uses-tm-booking',
    files: ['js/ticket-panel.js'],
    type: 'required_substring',
    needle: 'getTMBooking',
    message: 'js/ticket-panel.js must use TMBooking gateway for booking decisions',
  },
  {
    id: 'booking-controller-exposes-tm-booking',
    files: ['js/booking-controller.js'],
    type: 'required_substring',
    needle: 'window.TMBooking',
    message: 'js/booking-controller.js must expose window.TMBooking gateway',
  },
  {
    id: 'booking-controller-get-destination',
    files: ['js/booking-controller.js'],
    type: 'required_substring',
    needle: 'getDestination',
    message: 'window.TMBooking must provide getDestination',
  },
  {
    id: 'booking-controller-navigate',
    files: ['js/booking-controller.js'],
    type: 'required_substring',
    needle: 'navigate',
    message: 'window.TMBooking must provide navigate',
  },
  {
    id: 'ticket-panel-booking-trigger-selector',
    files: ['js/ticket-panel.js'],
    type: 'required_substring',
    needle: '[data-tm-booking-trigger]',
    message: 'js/ticket-panel.js must bind booking handlers via explicit [data-tm-booking-trigger] selectors',
  },
  {
    id: 'no-heuristic-booking-selectors-ticket-panel',
    files: ['js/ticket-panel.js'],
    type: 'forbidden_regex',
    pattern:
      /\.btn-tickets,\s*\.btn-book-now|btn-primary\[href\*="roller"\]|btn-primary\[href\*="tickets\.timemission"\]/,
    message: 'js/ticket-panel.js must not use heuristic booking selectors; use [data-tm-booking-trigger]',
  },
  {
    id: 'no-heuristic-booking-selectors-booking-controller',
    files: ['js/booking-controller.js'],
    type: 'forbidden_regex',
    pattern:
      /\.btn-tickets,\s*\.btn-book-now|btn-primary\[href\*="roller"\]|btn-primary\[href\*="tickets\.timemission"\]/,
    message: 'js/booking-controller.js must not use heuristic booking selectors; use [data-tm-booking-trigger]',
  },
  {
    id: 'roller-no-iframe-cdn',
    files: ['js/roller-checkout.js'],
    type: 'forbidden_substring',
    needle: 'checkout_iframe.js',
    message: 'js/roller-checkout.js must not load Roller iframe CDN (BOOK-03)',
  },
  {
    id: 'roller-no-checkout-symbol',
    files: ['js/roller-checkout.js'],
    type: 'forbidden_substring',
    needle: 'RollerCheckout',
    message: 'js/roller-checkout.js must not reference RollerCheckout (BOOK-03)',
  },
  {
    id: 'roller-no-cdn-domain',
    files: ['js/roller-checkout.js'],
    type: 'forbidden_substring',
    needle: 'cdn.rollerdigital.com',
    message: 'js/roller-checkout.js must not reference cdn.rollerdigital.com (BOOK-03)',
  },
  {
    id: 'booking-controller-tm-facade',
    files: ['js/booking-controller.js'],
    type: 'required_substring',
    needle: 'window.TMFacade',
    message: 'js/booking-controller.js must assign window.TMFacade (see docs/tm-public-api.md)',
  },
  {
    id: 'site-scripts-tm-facade-doc',
    files: ['docs/tm-public-api.md'],
    type: 'required_substring',
    needle: 'TMFacade',
    message: 'docs/tm-public-api.md must document window.TMFacade (supported extension surface)',
  },
  {
    id: 'site-scripts-booking',
    file: 'src/components/SiteScripts.astro',
    type: 'marker_order',
    chain: [
      {
        after: '/js/locations.js',
        before: '/js/booking-controller.js',
        message: 'SiteScripts.astro must load booking-controller.js after locations.js',
      },
      {
        after: '/js/booking-controller.js',
        before: '/js/ticket-panel.js',
        message: 'SiteScripts.astro must load booking-controller.js before ticket-panel.js',
      },
      {
        after: '/js/locations.js',
        before: '/js/ticket-panel.js',
        message: 'SiteScripts.astro must load locations.js before ticket-panel.js',
      },
    ],
  },
];
