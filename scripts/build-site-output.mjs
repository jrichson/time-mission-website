#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyTmDotEnvToProcess } from './tm-dotenv.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

applyTmDotEnvToProcess(root);

function localBin(name) {
  const ext = process.platform === 'win32' ? '.cmd' : '';
  const candidate = path.join(root, 'node_modules', '.bin', `${name}${ext}`);
  return fs.existsSync(candidate) ? candidate : name;
}

function nodeStep(script, args = []) {
  return {
    command: process.execPath,
    args: [script, ...args],
  };
}

function runStep({ label, command, args, env }) {
  console.log(`\n[build:astro] ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...(env || {}) },
  });
  if (result.error) {
    console.error(result.error.message);
    return 1;
  }
  if (result.signal) {
    console.error(`${label} aborted (${result.signal})`);
    return 1;
  }
  return result.status === null ? 1 : result.status;
}

const steps = [
  { label: 'Clean build output', ...nodeStep('scripts/clean-build-output.mjs') },
  { label: 'Check translation readiness', ...nodeStep('scripts/check-i18n-readiness.mjs') },
  { label: 'Sync static assets', ...nodeStep('scripts/sync-static-to-public.mjs') },
  {
    label: 'Build Astro output',
    command: localBin('astro'),
    args: ['build'],
    env: { TM_RESOLVED_LOCATIONS_PATH: path.join(root, 'public', 'data', 'locations.json') },
  },
  { label: 'Finalize regional and localized output', ...nodeStep('scripts/finalize-site-profile.mjs') },
  { label: 'Verify localized page-copy coverage', ...nodeStep('scripts/check-page-i18n-output.mjs') },
  { label: 'Verify built translation approval', ...nodeStep('scripts/check-i18n-artifact-approval.mjs') },
  { label: 'Verify regional artifact identity and isolation', ...nodeStep('scripts/check-site-profile-output.mjs') },
  { label: 'Prune excluded artifacts', ...nodeStep('scripts/prune-excluded-artifacts.mjs', ['dist', 'public']) },
  { label: 'Minify copied CSS and JS', ...nodeStep('scripts/minify-dist-assets.mjs') },
  { label: 'Bundle route CSS', ...nodeStep('scripts/bundle-dist-css.mjs') },
  { label: 'Inject CSP hashes', ...nodeStep('scripts/inject-csp-hashes.mjs') },
];

for (const step of steps) {
  const code = runStep(step);
  if (code !== 0) process.exit(code);
}
