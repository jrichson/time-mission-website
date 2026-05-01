'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { runCheck } = require('./lib/validation-core');
const { runPolicies } = require('./lib/policy-runner');
const bookingPolicies = require('./policies/booking-policies.cjs');

const root = path.resolve(__dirname, '..');

const siteScriptsPath = path.join(root, 'src', 'components', 'SiteScripts.astro');

runCheck({
  title: 'Booking architecture check',
  run(errors) {
    if (!fs.existsSync(siteScriptsPath)) {
      errors.push('src/components/SiteScripts.astro is required for Astro script order contract');
      return;
    }
    const siteScripts = fs.readFileSync(siteScriptsPath, 'utf8');
    if (!siteScripts.includes('booking-controller.js')) {
      errors.push('SiteScripts.astro must load js/booking-controller.js for window.TMBooking');
    }
    runPolicies(root, bookingPolicies, errors);
  },
  onSuccess() {
    return 'Booking architecture check passed.';
  },
});
