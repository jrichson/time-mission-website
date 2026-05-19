'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { runCheck } = require('./lib/validation-core');
const { runPolicies } = require('./lib/policy-runner');
const bookingPolicies = require('./policies/booking-policies.cjs');

const root = path.resolve(__dirname, '..');

const siteScriptsPath = path.join(root, 'src', 'components', 'SiteScripts.astro');
const runtimeContractPath = path.join(root, 'src', 'lib', 'public-runtime-contract.ts');

runCheck({
  title: 'Booking architecture check',
  run(errors) {
    if (!fs.existsSync(siteScriptsPath) || !fs.existsSync(runtimeContractPath)) {
      errors.push('src/components/SiteScripts.astro and src/lib/public-runtime-contract.ts are required for the runtime script order contract');
      return;
    }
    const siteScripts = fs.readFileSync(siteScriptsPath, 'utf8');
    if (!siteScripts.includes('publicRuntimeScripts')) {
      errors.push('SiteScripts.astro must render publicRuntimeScripts from the public runtime contract');
    }
    runPolicies(root, bookingPolicies, errors);
  },
  onSuccess() {
    return 'Booking architecture check passed.';
  },
});
