'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { VERIFY_STEPS, formatNpmStep } = require('./lib/verify-pipeline.cjs');
const { runCheck } = require('./lib/validation-core');

const root = path.resolve(__dirname, '..');

runCheck({
  title: 'Verification pipeline contract check',
  run(errors) {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const docs = fs.readFileSync(path.join(root, 'docs', 'verification-pipeline.md'), 'utf8');

    if (pkg.scripts.verify !== 'node scripts/verify-site-output.mjs') {
      errors.push('package.json script "verify" must run scripts/verify-site-output.mjs');
    }

    for (const [scriptName] of VERIFY_STEPS) {
      if (!pkg.scripts[scriptName]) {
        errors.push(`package.json missing verify step script "${scriptName}"`);
      }
    }

    for (const step of VERIFY_STEPS) {
      const command = formatNpmStep(step);
      if (!docs.includes(command)) {
        errors.push(`docs/verification-pipeline.md missing pipeline command: ${command}`);
      }
    }
  },
});
