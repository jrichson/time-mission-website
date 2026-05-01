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
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

const compileArtifacts = path.join(__dirname, 'compile-route-artifacts.mjs');
const compileRes = spawnSync(process.execPath, [compileArtifacts], { cwd: root, stdio: 'inherit' });
if (compileRes.status !== 0) {
  process.exit(compileRes.status ?? 1);
}

// sitemap.xml is now emitted by src/pages/sitemap.xml.ts at build time (Phase 7 D-04).
// llms.txt is emitted by src/pages/llms.txt.ts.
// Do NOT add either back to mandatoryFiles — that would shadow the Astro endpoints.
const mandatoryFiles = [
  '_headers',
  '_redirects',
  'robots.txt',
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

// Remove stale copy so src/pages/sitemap.xml.ts is not shadowed (legacy sync used to copy root sitemap).
const stalePublicSitemap = path.join(publicDir, 'sitemap.xml');
if (fs.existsSync(stalePublicSitemap)) {
  fs.unlinkSync(stalePublicSitemap);
}

for (const d of mandatoryDirs) {
    const src = path.join(root, d);
    const dest = path.join(publicDir, d);
    fs.cpSync(src, dest, { recursive: true });
}

const analyticsLabelsSrc = path.join(root, 'src', 'data', 'site', 'analytics-labels.json');
const analyticsLabelsPublic = path.join(publicDir, 'data', 'analytics-labels.json');
if (fs.existsSync(analyticsLabelsSrc)) {
    fs.mkdirSync(path.dirname(analyticsLabelsPublic), { recursive: true });
    fs.copyFileSync(analyticsLabelsSrc, analyticsLabelsPublic);
    fs.copyFileSync(analyticsLabelsSrc, path.join(root, 'data', 'analytics-labels.json'));
}

const routesPath = path.join(root, 'src', 'data', 'routes.json');
const routesJson = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
const routes = routesJson.routes || [];

const astroManifestPath = path.join(root, 'src', 'data', 'site', 'astro-rendered-output-files.json');
const astroManifest = JSON.parse(fs.readFileSync(astroManifestPath, 'utf8'));

/** Routes whose HTML is produced by Astro `src/pages/*.astro` — from `src/data/site/astro-rendered-output-files.json`. */
const ASTRO_RENDERED_OUTPUT_FILES = new Set(astroManifest.outputFiles || []);
if (ASTRO_RENDERED_OUTPUT_FILES.size === 0) {
  console.error('- astro-rendered-output-files.json: missing or empty outputFiles');
  process.exit(1);
}

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
