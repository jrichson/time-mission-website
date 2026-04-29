/**
 * Copies legacy static-host and public assets from the repo root into `public/`
 * before `astro build`, so Cloudflare-style `_headers`, `_redirects`, JS/CSS/data,
 * etc. appear under Astro output without migrating pages yet.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

const mandatoryFiles = [
  '_headers',
  '_redirects',
  'robots.txt',
  'sitemap.xml',
  '404.html',
];

const mandatoryDirs = ['assets', 'css', 'js', 'data'];

const errors = [];

function ensureExists(relPath, label) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) {
    errors.push(`Missing mandatory ${label}: ${relPath}`);
  }
}

for (const f of mandatoryFiles) ensureExists(f, 'file');
for (const d of mandatoryDirs) ensureExists(d, 'directory');
ensureExists(path.join('data', 'locations.json'), 'file');

if (errors.length) {
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });

for (const f of mandatoryFiles) {
  const src = path.join(root, f);
  const dest = path.join(publicDir, f);
  fs.copyFileSync(src, dest);
}

for (const d of mandatoryDirs) {
  const src = path.join(root, d);
  const dest = path.join(publicDir, d);
  fs.cpSync(src, dest, { recursive: true });
}

console.log('Synced root static assets to public/ for Astro build.');
