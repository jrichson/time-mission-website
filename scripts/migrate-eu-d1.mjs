#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  createCloudflareDeploymentArtifact,
  localWranglerBin,
} from './lib/cloudflare-deployment-artifact.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let artifact;
let result;

try {
  artifact = createCloudflareDeploymentArtifact(root, 'eu', process.env, { kind: 'd1' });
  result = spawnSync(
    localWranglerBin(root),
    [
      'd1',
      'migrations',
      'apply',
      artifact.profile.d1DatabaseName,
      '--remote',
    ],
    { cwd: artifact.workspaceDir, env: process.env, stdio: 'inherit' },
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  artifact?.cleanup();
}

if (result?.error) {
  console.error(result.error.message);
  process.exit(1);
}
if (result) process.exit(result.status ?? 1);
