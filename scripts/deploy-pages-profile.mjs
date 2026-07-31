#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  createCloudflareDeploymentArtifact,
  localWranglerBin,
} from './lib/cloudflare-deployment-artifact.mjs';
import { mergeTmPublicBuildEnvFromDisk } from './tm-dotenv.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestedProfile = String(process.argv[2] || '').trim().toLowerCase();
const buildBeforeDeploy = process.argv.includes('--build');
const preview = process.argv.includes('--preview');
const previewBranch = 'eu-preview';
if (!['us', 'eu'].includes(requestedProfile)) {
  console.error('Usage: node scripts/deploy-pages-profile.mjs <us|eu>');
  process.exit(1);
}
if (preview && requestedProfile !== 'eu') {
  console.error('The preview deployment interface currently supports only the EU profile.');
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    env: { ...process.env, TM_SITE_PROFILE: requestedProfile, ...(options.env || {}) },
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
  if (buildBeforeDeploy) {
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'check']);
    run(
      process.execPath,
      [
        'scripts/build-profile.mjs',
        requestedProfile,
        ...(preview ? ['--preview-deploy'] : ['--production']),
      ],
      preview ? { env: { TM_REQUIRE_TRANSLATION_APPROVAL: 'false' } } : {},
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
        TM_DEPLOYMENT_BUILD: preview ? 'false' : 'true',
        ...(preview ? { TM_REQUIRE_TRANSLATION_APPROVAL: 'false' } : {}),
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
