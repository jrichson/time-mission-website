#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  CMS_PRODUCTION,
  EU_D1_DATABASE_NAME,
  EU_PUBLIC_BUILD_DEFAULTS,
} from '../config/deployment-targets.mjs';
import {
  createCloudflareDeploymentArtifact,
  localWranglerBin,
} from './lib/cloudflare-deployment-artifact.mjs';
import {
  sourceCheckEnvironment,
  translationReviewEnvironment,
} from './lib/deployment-environment.mjs';
import { d1DatabaseId } from './lib/release-guard.mjs';
import { mergeTmPublicBuildEnvFromDisk } from './tm-dotenv.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestedProfile = String(process.argv[2] || '').trim().toLowerCase();
const buildBeforeDeploy = process.argv.includes('--build');
const preview = process.argv.includes('--preview');
const allowUnreleased = process.argv.includes('--allow-unreleased');
const releaseCommit = String(process.env.TM_RELEASE_COMMIT || '').trim();
const previewBranch = 'eu-preview';
if (!['us', 'eu'].includes(requestedProfile)) {
  console.error('Usage: node scripts/deploy-pages-profile.mjs <us|eu>');
  process.exit(1);
}
if (preview && requestedProfile !== 'eu') {
  console.error('The preview deployment interface currently supports only the EU profile.');
  process.exit(1);
}
if (!preview && !releaseCommit && !allowUnreleased) {
  console.error([
    'Production deploys run through `npm run release`, which builds the pushed commit',
    'from a clean checkout, deploys the CMS first, and verifies the live sites afterwards.',
    'For an emergency, rerun with --allow-unreleased and record what was deployed.',
  ].join('\n'));
  process.exit(1);
}
const translationReviewEnv = translationReviewEnvironment(requestedProfile);

// Deploy builds always read the production CMS and fail rather than silently
// shipping without CMS pages, banners, and SEO.
const cmsBuildEnv = {
  PAYLOAD_CMS_ORIGIN: String(process.env.PAYLOAD_CMS_ORIGIN || '').trim() || CMS_PRODUCTION.origin,
  PAYLOAD_CMS_ALLOWED_HOSTS: String(process.env.PAYLOAD_CMS_ALLOWED_HOSTS || '').trim() || CMS_PRODUCTION.allowedHosts,
  PAYLOAD_CMS_BUILD_STRICT: 'true',
};

function applyEuDeploymentDefaults() {
  for (const [key, value] of Object.entries(EU_PUBLIC_BUILD_DEFAULTS)) {
    if (!String(process.env[key] || '').trim()) process.env[key] = value;
  }
  if (String(process.env.EU_D1_DATABASE_ID || '').trim()) return;
  const list = spawnSync(localWranglerBin(root), ['d1', 'list', '--json'], { cwd: root, encoding: 'utf8' });
  const id = d1DatabaseId(list.stdout, EU_D1_DATABASE_NAME, 'eu');
  if (!id) {
    throw new Error(`Set EU_D1_DATABASE_ID; could not find the ${EU_D1_DATABASE_NAME} database with wrangler d1 list.`);
  }
  process.env.EU_D1_DATABASE_ID = id;
}

function run(command, args, options = {}) {
  const env = {
    ...(options.baseEnv || process.env),
    TM_SITE_PROFILE: requestedProfile,
    ...(options.env || {}),
  };
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = new Error(`${path.basename(command)} exited with status ${result.status ?? 1}`);
    error.exitCode = result.status ?? 1;
    throw error;
  }
  return result;
}

let artifact;
try {
  if (requestedProfile === 'eu') applyEuDeploymentDefaults();
  if (buildBeforeDeploy) {
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'check'], {
      baseEnv: sourceCheckEnvironment(process.env),
      env: { TM_SITE_PROFILE: 'us' },
    });
    run(
      process.execPath,
      [
        'scripts/build-profile.mjs',
        requestedProfile,
        ...(preview ? ['--preview-deploy'] : ['--production']),
      ],
      { env: { ...cmsBuildEnv, ...translationReviewEnv } },
    );
    const publicBuildEnv = mergeTmPublicBuildEnvFromDisk(root, {
      ...process.env,
      TM_SITE_PROFILE: requestedProfile,
    });
    run(process.execPath, [
      'scripts/verify-site-output.mjs',
      '--artifact-only',
      ...(preview ? ['--preview-stamp'] : []),
    ], {
      env: {
        ...publicBuildEnv,
        ...cmsBuildEnv,
        TM_DEPLOYMENT_BUILD: preview ? 'false' : 'true',
        ...translationReviewEnv,
      },
    });
  }

  artifact = createCloudflareDeploymentArtifact(root, requestedProfile, process.env, {
    deploymentMode: preview ? 'preview' : 'production',
  });
  const deployArgs = [
    'pages',
    'deploy',
    'dist',
    '--project-name',
    artifact.profile.pagesProject,
    ...(preview ? ['--branch', previewBranch] : []),
    ...(releaseCommit
      ? [
          '--commit-hash', releaseCommit,
          '--commit-message', String(process.env.TM_RELEASE_MESSAGE || `Release ${releaseCommit.slice(0, 7)}`),
          '--commit-dirty=false',
        ]
      : []),
  ];
  run(
    localWranglerBin(root),
    deployArgs,
    { cwd: artifact.workspaceDir },
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = Number.isInteger(error?.exitCode) ? error.exitCode : 1;
} finally {
  artifact?.cleanup();
}
