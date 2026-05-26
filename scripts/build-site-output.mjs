#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

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

function runStep({ label, command, args }) {
  console.log(`\n[build:astro] ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
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
  { label: 'Sync static assets', ...nodeStep('scripts/sync-static-to-public.mjs') },
  { label: 'Build Astro output', command: localBin('astro'), args: ['build'] },
  { label: 'Prune excluded artifacts', ...nodeStep('scripts/prune-excluded-artifacts.mjs', ['dist', 'public']) },
  { label: 'Minify copied CSS and JS', ...nodeStep('scripts/minify-dist-assets.mjs') },
  { label: 'Bundle route CSS', ...nodeStep('scripts/bundle-dist-css.mjs') },
  { label: 'Inject CSP hashes', ...nodeStep('scripts/inject-csp-hashes.mjs') },
];

for (const step of steps) {
  const code = runStep(step);
  if (code !== 0) process.exit(code);
}
