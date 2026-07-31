/**
 * Copies static-host and public assets from the repo root into `public/`
 * before `astro build`, so Cloudflare-style `_headers`, `_redirects`, JS/CSS/data,
 * etc. appear under Astro output.
 *
 * HTML is rendered by Astro from `src/pages`. This script intentionally does not
 * copy repo-root `.html` files into `public/`.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'url';

import {
  TM_ENV_FILE_CHAIN,
  mergeTmDotEnvFromDisk,
  applyTmDotEnvToProcess,
  normalizedPublicTmMediaBase,
} from './tm-dotenv.mjs';
import {
  copyFilteredTree,
  planRequiredArtifacts,
  planVideoArtifacts,
  pruneExcludedArtifacts,
} from './lib/cloudflare-artifact-policy.mjs';
import { resolveSiteProfile } from '../config/site-profiles.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const siteProfile = resolveSiteProfile(process.env);

applyTmDotEnvToProcess(root);

const compileArtifacts = path.join(__dirname, 'compile-route-artifacts.mjs');
const compileRes = spawnSync(process.execPath, [compileArtifacts], { cwd: root, stdio: 'inherit' });
if (compileRes.status !== 0) {
  process.exit(compileRes.status ?? 1);
}

const requiredArtifacts = planRequiredArtifacts();
const mandatoryFiles = requiredArtifacts.rootFiles;
const mandatoryDirs = requiredArtifacts.assetDirs;

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
  if (f === '_headers.tmpl') continue;
  const src = path.join(root, f);
  const dest = path.join(publicDir, f);
  fs.copyFileSync(src, dest);
}

{
  const headersTmpl = fs.readFileSync(path.join(root, '_headers.tmpl'), 'utf8');
  const headersPreBuild = headersTmpl
    .replace(/\{\{SITE_ORIGIN\}\}/g, siteProfile.origin)
    .replace(/\{\{SCRIPT_HASHES\}\}/g, "'unsafe-inline'")
    .replace(/\{\{STYLE_HASHES\}\}/g, "'unsafe-inline'");
  fs.writeFileSync(path.join(publicDir, '_headers'), headersPreBuild);
}

const stalePublicSitemap = path.join(publicDir, 'sitemap.xml');
if (fs.existsSync(stalePublicSitemap)) {
  fs.unlinkSync(stalePublicSitemap);
}

pruneExcludedArtifacts(publicDir, { baseDir: publicDir });

for (const d of mandatoryDirs) {
  const src = path.join(root, d);
  const dest = path.join(publicDir, d);
  fs.rmSync(dest, { recursive: true, force: true });
  copyFilteredTree(src, dest, { baseDir: root });
}

const generatePublicLocations = path.join(__dirname, 'generate-public-locations.mjs');
const generatePublicLocationsRes = spawnSync(process.execPath, [generatePublicLocations], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
if (generatePublicLocationsRes.status !== 0) {
  process.exit(generatePublicLocationsRes.status ?? 1);
}

const videoDir = path.join(publicDir, 'assets', 'video');
const mediaBase = normalizedPublicTmMediaBase(root);

if (mediaBase) {
  const videoPlan = planVideoArtifacts({ mediaBase });
  for (const name of videoPlan.removeFromBundle) {
    const abs = path.join(videoDir, name);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  }
} else {
  const videoPlan = planVideoArtifacts({
    mediaBase: '',
    availableFiles: fs.existsSync(videoDir) ? fs.readdirSync(videoDir) : [],
  });
  const missingMp4 = videoPlan.missingFromBundle;
  if (missingMp4.length > 0) {
    const fromDiskPreview = mergeTmDotEnvFromDisk(root).PUBLIC_TM_MEDIA_BASE;
    const envFilesSeen = TM_ENV_FILE_CHAIN.filter((n) => fs.existsSync(path.join(root, n)));
    errors.push(
      `Missing hero/group MP4s (${missingMp4.join(', ')}) in the Pages bundle — PUBLIC_TM_MEDIA_BASE is not resolving. ` +
        'Add PUBLIC_TM_MEDIA_BASE=<your-public-r2-host> (no trailing slash, no `/assets/video` suffix) beside package.json `.env`. ' +
        'Cloudflare Pages: set the variable in project Environment variables.\n' +
        `       Project root: ${root}\n` +
        `       .env chain present: ${envFilesSeen.join(', ') || '(none)'}\n` +
        `       Parsed key in .env as: ${typeof fromDiskPreview === 'string' && fromDiskPreview.trim() ? JSON.stringify(fromDiskPreview.trim()) : '(missing or blank — check spelling PUBLIC_TM_MEDIA_BASE)'}`,
    );
  }
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

const ASTRO_RENDERED_OUTPUT_FILES = new Set(astroManifest.outputFiles || []);
if (ASTRO_RENDERED_OUTPUT_FILES.size === 0) {
  console.error('- astro-rendered-output-files.json: missing or empty outputFiles');
  process.exit(1);
}

const nonAstroRoutes = routes
  .map((route) => ({
    route,
    outputFile: route.outputFile.replace(/^\//, ''),
  }))
  .filter(({ outputFile }) => !ASTRO_RENDERED_OUTPUT_FILES.has(outputFile));

for (const { route, outputFile } of nonAstroRoutes) {
  errors.push(
    `Route ${route.canonicalPath} outputs ${outputFile}, but src/data/site/astro-rendered-output-files.json does not list it`,
  );
}

for (const rel of ASTRO_RENDERED_OUTPUT_FILES) {
  const abs = path.join(publicDir, rel);
  if (fs.existsSync(abs)) fs.rmSync(abs, { force: true });
}

if (errors.length) {
  console.error('Static sync failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(
  `Synced root static assets; ${routes.length - nonAstroRoutes.length} registered HTML routes are Astro-rendered.`,
);
