#!/usr/bin/env node
/**
 * RFC #9 cutover orchestrator — single executable flow for npm run verify.
 * Keep this ordered list authoritative when adding dist/post-build gates.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const {
  VERIFY_STEPS,
  VERIFY_SUCCESS_MESSAGE,
  resolveNpmStep,
} = require('./lib/verify-pipeline.cjs');

/**
 * @param {string} script npm script name from package.json
 * @param {string[]} forwarded extra argv after script name (e.g. `--`, `--dist`)
 */
function runNpm(script, forwarded = []) {
  const { command, args } = resolveNpmStep([script, forwarded], process.platform);
  const result = spawnSync(command, args, {
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

for (const [name, extra] of VERIFY_STEPS) {
  const code = runNpm(name, extra);
  if (code !== 0) process.exit(code);
}

console.log('');
console.log(VERIFY_SUCCESS_MESSAGE);
process.exit(0);
