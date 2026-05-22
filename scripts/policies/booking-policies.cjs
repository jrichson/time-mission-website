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
    id: 'ticket-panel-uses-tm-booking',
    files: ['js/ticket-panel.js'],
    type: 'required_substring',
    needle: 'window.TMBooking',
    message: 'js/ticket-panel.js must reference window.TMBooking gateway for booking decisions',
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
    file: 'src/lib/public-runtime-contract.ts',
    type: 'marker_order',
    chain: [
      {
        after: '/js/booking-journey.js',
        before: '/js/booking-frame.js',
        message: 'public runtime contract must load booking-journey.js before booking-frame.js',
      },
      {
        after: '/js/booking-journey.js',
        before: '/js/booking-provider-briq.js',
        message: 'public runtime contract must load booking-journey.js before booking-provider-briq.js',
      },
      {
        after: '/js/booking-frame.js',
        before: '/js/booking-controller.js',
        message: 'public runtime contract must load booking-frame.js before booking-controller.js',
      },
      {
        after: '/js/booking-provider-briq.js',
        before: '/js/booking-controller.js',
        message: 'public runtime contract must load booking-provider-briq.js before booking-controller.js',
      },
      {
        after: '/js/booking-journey.js',
        before: '/js/locations.js',
        message: 'public runtime contract must load booking-journey.js before locations.js',
      },
      {
        after: '/js/location-catalog-view.js',
        before: '/js/locations.js',
        message: 'public runtime contract must load location-catalog-view.js before locations.js',
      },
      {
        after: '/js/booking-journey.js',
        before: '/js/booking-controller.js',
        message: 'public runtime contract must load booking-journey.js before booking-controller.js',
      },
      {
        after: '/js/locations.js',
        before: '/js/nav.js',
        message: 'public runtime contract must load nav.js after locations.js so location overlay previews have LocationContext',
      },
      {
        after: '/js/locations.js',
        before: '/js/booking-controller.js',
        message: 'public runtime contract must load booking-controller.js after locations.js',
      },
      {
        after: '/js/booking-controller.js',
        before: '/js/ticket-panel.js',
        message: 'public runtime contract must load booking-controller.js before ticket-panel.js',
      },
      {
        after: '/js/locations.js',
        before: '/js/ticket-panel.js',
        message: 'public runtime contract must load locations.js before ticket-panel.js',
      },
    ],
  },
];
