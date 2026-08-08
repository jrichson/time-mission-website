#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveSiteProfile } from '../config/site-profiles.mjs';
import { translationReviewEnvironment } from './lib/deployment-environment.mjs';
import { mergeTmDotEnvFromDisk } from './tm-dotenv.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile = String(process.argv[2] || '').trim().toLowerCase();
const production = process.argv.includes('--production');
const previewDeployment = process.argv.includes('--preview-deploy');
if (!['us', 'eu'].includes(profile)) {
  console.error('Usage: node scripts/build-profile.mjs <us|eu>');
  process.exit(1);
}
if (production && previewDeployment) {
  console.error('--production and --preview-deploy cannot be used together.');
  process.exit(1);
}

const definition = resolveSiteProfile({ TM_SITE_PROFILE: profile });
const buildEnv = {
  ...process.env,
  TM_SITE_PROFILE: profile,
  PUBLIC_SITE_ORIGIN: definition.origin,
  TM_DEPLOYMENT_BUILD: production ? 'true' : 'false',
  ...translationReviewEnvironment(profile),
};

if (profile === 'eu') {
  const diskEnv = mergeTmDotEnvFromDisk(root);
  const euTurnstileSiteKey = String(
    process.env[definition.turnstileSiteKeyEnv]
      || diskEnv[definition.turnstileSiteKeyEnv]
      || '',
  ).trim();
  const euGtmContainerId = String(
    process.env[definition.gtmContainerIdEnv]
      || diskEnv[definition.gtmContainerIdEnv]
      || '',
  ).trim();
  const euSgtmContainerUrl = String(
    process.env.EU_SGTM_CONTAINER_URL || diskEnv.EU_SGTM_CONTAINER_URL || '',
  ).trim();
  const euSgtmCollectPath = String(
    process.env.EU_SGTM_COLLECT_PATH || diskEnv.EU_SGTM_COLLECT_PATH || '',
  ).trim();
  delete buildEnv.PUBLIC_TURNSTILE_SITE_KEY;
  delete buildEnv.PUBLIC_GTM_CONTAINER_ID;
  delete buildEnv.PUBLIC_SGTM_CONTAINER_URL;
  delete buildEnv.PUBLIC_SGTM_COLLECT_PATH;
  if (euTurnstileSiteKey) buildEnv.PUBLIC_TURNSTILE_SITE_KEY = euTurnstileSiteKey;
  if (euGtmContainerId) buildEnv.PUBLIC_GTM_CONTAINER_ID = euGtmContainerId;
  if (euSgtmContainerUrl) buildEnv.PUBLIC_SGTM_CONTAINER_URL = euSgtmContainerUrl;
  if (euSgtmCollectPath) buildEnv.PUBLIC_SGTM_COLLECT_PATH = euSgtmCollectPath;
  if ((production || previewDeployment) && !euTurnstileSiteKey) {
    console.error(
      `${definition.turnstileSiteKeyEnv} is required for an EU `
        + `${previewDeployment ? 'preview deployment' : 'production'} build.`,
    );
    process.exit(1);
  }
  if ((production || previewDeployment) && !euGtmContainerId) {
    console.error(
      `${definition.gtmContainerIdEnv} is required for an EU `
        + `${previewDeployment ? 'preview deployment' : 'production'} build.`,
    );
    process.exit(1);
  }
}

const result = spawnSync(process.execPath, ['scripts/build-site-output.mjs'], {
  cwd: root,
  env: buildEnv,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
