import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pruneExcludedArtifacts } from './lib/cloudflare-artifact-policy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const allowedRoots = new Set(['dist', 'public']);
const targetRoots = process.argv.slice(2);

if (targetRoots.length === 0) {
  console.error('Usage: node scripts/prune-excluded-artifacts.mjs <dist|public> [...]');
  process.exit(1);
}

let totalRemoved = 0;

for (const target of targetRoots) {
  if (!allowedRoots.has(target)) {
    console.error(`Refusing to prune unsupported artifact root: ${target}`);
    process.exit(1);
  }
  const baseDir = path.join(root, target);
  const removed = fs.existsSync(baseDir) ? pruneExcludedArtifacts(baseDir, { baseDir }) : [];
  totalRemoved += removed.length;
  if (removed.length) {
    console.log(`Pruned ${removed.length} excluded artifact(s) from ${target}/.`);
  }
}

if (totalRemoved === 0) {
  console.log('No excluded artifacts found.');
}
