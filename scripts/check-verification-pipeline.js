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
    const deployWorkflow = fs.readFileSync(
      path.join(root, '.github', 'workflows', 'cms-wrangler-deploy.yml'),
      'utf8',
    );

    if (pkg.scripts.verify !== 'node scripts/verify-site-output.mjs') {
      errors.push('package.json script "verify" must run scripts/verify-site-output.mjs');
    }
    if (pkg.scripts['build:astro'] !== 'node scripts/build-site-output.mjs') {
      errors.push('package.json script "build:astro" must run scripts/build-site-output.mjs');
    }
    if (pkg.scripts['deploy:pages'] !== 'node scripts/deploy-pages-profile.mjs us --build') {
      errors.push('package.json script "deploy:pages" must use the verified US deployment interface');
    }
    if (pkg.scripts['deploy:pages:eu'] !== 'node scripts/deploy-pages-profile.mjs eu --build') {
      errors.push('package.json script "deploy:pages:eu" must use the verified EU deployment interface');
    }
    if (pkg.scripts['deploy:pages:eu:preview'] !== 'node scripts/deploy-pages-profile.mjs eu --build --preview') {
      errors.push('package.json script "deploy:pages:eu:preview" must use the verified EU preview interface');
    }
    if (pkg.scripts['verify:artifact'] !== 'node scripts/verify-site-output.mjs --artifact-only') {
      errors.push('package.json script "verify:artifact" must run the artifact-only verification gate');
    }
    const cmsInstallCount = deployWorkflow.split('run: npm ci --prefix cms').length - 1;
    if (cmsInstallCount !== 3) {
      errors.push('CMS Wrangler deploy jobs must install the nested CMS test dependencies');
    }
    if (!deployWorkflow.includes('cms/package-lock.json')) {
      errors.push('CMS Wrangler deploy dependency cache must include cms/package-lock.json');
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
