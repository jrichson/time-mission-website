/**
 * Copies legacy static-host and public assets from the repo root into `public/`
 * before `astro build`, so Cloudflare-style `_headers`, `_redirects`, JS/CSS/data,
 * etc. appear under Astro output without migrating pages yet.
 *
 * Registered HTML routes from `src/data/routes.json` are copied to `public/{outputFile}`
 * so clean URLs resolve to file-style artifacts under `dist/` after build.
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

const routesPath = path.join(root, 'src', 'data', 'routes.json');
const routesJson = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
const routes = routesJson.routes || [];

/** Routes whose HTML is produced by Astro `src/pages/*.astro` (Phase 4+). Skip copying legacy stubs into `public/`. */
const ASTRO_RENDERED_OUTPUT_FILES = new Set([
  'index.html',
  'about.html',
  'faq.html',
  'contact.html',
  'privacy.html',
  'locations.html',
  'groups/corporate.html',
  'philadelphia.html',
  'houston.html',
]);

/** Remove stale `public/` HTML from prior syncs so Astro output is not shadowed */
for (const rel of ASTRO_RENDERED_OUTPUT_FILES) {
  const abs = path.join(publicDir, rel);
  try {
    if (fs.existsSync(abs)) fs.rmSync(abs, { force: true });
  } catch {
    /* noop */
  }
}

function resolveHtmlSource(route) {
  const outRel = route.outputFile.replace(/^\//, '');
  const primary = path.join(root, outRel);
  if (fs.existsSync(primary)) return primary;
  for (const leg of route.legacySources || []) {
    const rel = leg.replace(/^\//, '');
    if (!rel.endsWith('.html')) continue;
    const candidate = path.join(root, rel);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

let copiedHtml = 0;
for (const route of routes) {
  if (route.canonicalPath === '/') continue;
  const destRel = route.outputFile.replace(/^\//, '');
  if (ASTRO_RENDERED_OUTPUT_FILES.has(destRel)) continue;
  const dest = path.join(publicDir, destRel);
  const src = resolveHtmlSource(route);
  if (!src) {
    errors.push(
      `No source HTML for route ${route.canonicalPath} (outputFile: ${route.outputFile})`,
    );
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  copiedHtml += 1;
}

if (errors.length) {
  console.error('Static sync failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

const skippedHtml = routes.filter((r) =>
  ASTRO_RENDERED_OUTPUT_FILES.has(r.outputFile.replace(/^\//, '')),
).length;

console.log(
  `Synced root static assets and ${copiedHtml} registered HTML routes from routes.json to public/ (skipped ${skippedHtml} Astro-rendered routes).`,
);
