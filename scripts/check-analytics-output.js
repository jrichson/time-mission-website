'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { runCheck } = require('./lib/validation-core');
const { resolveSiteProfile } = require('../config/site-profiles.mjs');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const profile = resolveSiteProfile(process.env);

runCheck({
  title: 'Analytics output check',
  run(errors) {
    const homePath = path.join(distDir, 'index.html');
    if (!fs.existsSync(homePath)) {
      errors.push('dist/index.html missing');
      return;
    }

    const home = fs.readFileSync(homePath, 'utf8');
    const head = home.split('</head>')[0] || '';
    const gtmIndex = head.indexOf('https://www.googletagmanager.com/gtm.js?id=');
    const titleIndex = head.indexOf('<title>');

    if (gtmIndex === -1) errors.push('index.html: missing rendered GTM head script');
    if (head.includes('https://www.googletagmanager.com/ns.html')) {
      errors.push('index.html: GTM noscript iframe must not render in <head>');
    }
    if (gtmIndex !== -1 && titleIndex !== -1 && gtmIndex > titleIndex) {
      errors.push('index.html: GTM head script must render before <title>');
    }
    const hasGtmNoscript = /<body[^>]*>\s*<!-- Google Tag Manager \(noscript\) -->\s*<noscript>/i.test(home);
    if (profile.consentProfile === 'us_open' && !hasGtmNoscript) {
      errors.push('index.html: GTM noscript must be the first rendered body child');
    }
    if (profile.consentProfile !== 'us_open' && hasGtmNoscript) {
      errors.push('index.html: strict-consent profiles must not render the unconditional GTM noscript iframe');
    }
  },
});
