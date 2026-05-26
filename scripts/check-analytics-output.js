'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { runCheck } = require('./lib/validation-core');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');

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
    if (!/<body[^>]*>\s*<!-- Google Tag Manager \(noscript\) -->\s*<noscript>/i.test(home)) {
      errors.push('index.html: GTM noscript must be the first rendered body child');
    }
  },
});
