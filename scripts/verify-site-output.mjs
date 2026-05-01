#!/usr/bin/env node
/**
 * RFC #9 cutover orchestrator — single executable flow for npm run verify.
 * Keep this ordered list authoritative when adding dist/post-build gates.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

/**
 * @param {string} script npm script name from package.json
 * @param {string[]} forwarded extra argv after script name (e.g. `--`, `--dist`)
 */
function runNpm(script, forwarded = []) {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'npm.cmd' : 'npm';
  const argv = ['run', script, ...forwarded];
  const result = spawnSync(cmd, argv, {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  });
  if (result.error) {
    console.error(result.error.message);
    return 1;
  }
  if (result.signal) {
    console.error(`aborted (${result.signal})`);
    return 1;
  }
  return result.status === null ? 1 : result.status;
}

const steps = [
  ['check', []],
  ['build:astro', []],
  ['check:routes', ['--', '--dist']],
  ['check:links', ['--', '--dist']],
  ['check:astro-dist', []],
  ['check:ticket-panel-parity', []],
  ['check:ticket-panel-source-parity', []],
  ['check:seo-output', []],
  ['check:schema-output', []],
  ['check:sitemap-output', []],
  ['check:robots-ai', []],
  ['check:llms-txt', []],
  ['check:nap-parity', []],
  ['test:smoke', []],
];

for (const [name, extra] of steps) {
  const code = runNpm(name, extra);
  if (code !== 0) process.exit(code);
}

console.log('');
console.log('verify-site-output.mjs: all steps passed.');
process.exit(0);
