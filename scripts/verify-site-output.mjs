#!/usr/bin/env node
/** Verification orchestrator for npm run verify. */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { writeDeploymentVerification } from './lib/cloudflare-deployment-artifact.mjs';
import { applyTmDotEnvToProcess } from './tm-dotenv.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
applyTmDotEnvToProcess(root);
const require = createRequire(import.meta.url);
const {
  VERIFY_STEPS,
  VERIFY_ARTIFACT_STEPS,
  VERIFY_SUCCESS_MESSAGE,
  resolveNpmStep,
} = require('./lib/verify-pipeline.cjs');
const artifactOnly = process.argv.includes('--artifact-only');
const noStamp = process.argv.includes('--no-stamp');
const previewStamp = process.argv.includes('--preview-stamp');
const steps = artifactOnly ? VERIFY_ARTIFACT_STEPS : VERIFY_STEPS;

if (noStamp && previewStamp) {
  console.error('--no-stamp and --preview-stamp cannot be used together.');
  process.exit(1);
}
if (previewStamp && !artifactOnly) {
  console.error('--preview-stamp requires --artifact-only.');
  process.exit(1);
}

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

for (const [name, extra] of steps) {
  const code = runNpm(name, extra);
  if (code !== 0) process.exit(code);
}

if (artifactOnly && !noStamp) {
  const profile = String(process.env.TM_SITE_PROFILE || 'us').trim().toLowerCase();
  const verification = writeDeploymentVerification(root, profile, process.env, {
    deploymentMode: previewStamp ? 'preview' : 'production',
  });
  console.log(
    `${previewStamp ? 'Preview' : 'Production'} deployment verification stamped: `
      + verification.sourceDigest,
  );
}

console.log('');
console.log(VERIFY_SUCCESS_MESSAGE);
process.exit(0);
