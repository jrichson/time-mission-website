import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { shouldExcludeArtifactPath } from './lib/cloudflare-artifact-policy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const allowedRoots = new Set(['dist', 'public']);
const targetRoots = process.argv.slice(2);

if (targetRoots.length === 0) {
  console.error('Usage: node scripts/prune-excluded-artifacts.mjs <dist|public> [...]');
  process.exit(1);
}

function prune(dir, baseDir, removed) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(baseDir, abs).split(path.sep).join('/');
    if (shouldExcludeArtifactPath(rel)) {
      fs.rmSync(abs, { recursive: true, force: true });
      removed.push(rel);
      continue;
    }
    if (entry.isDirectory()) prune(abs, baseDir, removed);
  }
}

let totalRemoved = 0;

for (const target of targetRoots) {
  if (!allowedRoots.has(target)) {
    console.error(`Refusing to prune unsupported artifact root: ${target}`);
    process.exit(1);
  }
  const baseDir = path.join(root, target);
  const removed = [];
  prune(baseDir, baseDir, removed);
  totalRemoved += removed.length;
  if (removed.length) {
    console.log(`Pruned ${removed.length} excluded artifact(s) from ${target}/.`);
  }
}

if (totalRemoved === 0) {
  console.log('No excluded artifacts found.');
}
