const fs = require('node:fs');
const path = require('node:path');
const { extractHeadMetadata, readDistRouteHtml } = require('./lib/rendered-page-contract');
const {
  isInternalLocation,
  resolveSiteProfile,
} = require('../config/site-profiles.mjs');

const root = path.resolve(__dirname, '..');
const errors = [];

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

/** keep in sync with src/lib/seo/route-patterns.ts */
function resolveRobotsForRoute(canonicalPath, table) {
  for (const rule of table.rules) {
    if (rule.match === 'exact' && rule.path === canonicalPath) return rule.robots;
    if (rule.match === 'prefix' && rule.path && canonicalPath.startsWith(rule.path)) return rule.robots;
    if (rule.match === 'default') return rule.robots;
  }
  return 'index,follow';
}

const routesData = loadJson('src/data/routes.json');
const seoRoutes = loadJson('src/data/site/seo-routes.json');
const robotsTable = loadJson('src/data/site/seo-robots.json');
const locationsDocument = loadJson('data/locations.json');
const locations = Array.isArray(locationsDocument.locations) ? locationsDocument.locations : [];
const profile = resolveSiteProfile(process.env);
const baseUrl = profile.origin;
const siteCredits = {
  author: 'Ari Simon',
  designer: 'Jefferson Richardson',
  developer: 'Converge Digital',
};

function toAbsolutePath(canonicalPath) {
  return canonicalPath === '/' ? `${baseUrl}/` : `${baseUrl}${canonicalPath}`;
}

function toAbsoluteAsset(rootRelative) {
  if (/^https?:\/\//.test(rootRelative)) return rootRelative;
  return `${baseUrl}${rootRelative}`;
}

const distDir = path.join(root, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('dist/ missing — run npm run build:astro first');
  process.exit(1);
}

let validated = 0;
for (const route of routesData.routes) {
  const cp = route.canonicalPath;
  const location = locations.find(({ slug, id }) => {
    const locationPath = `/${slug || id}`;
    return cp === locationPath || cp.startsWith(`${locationPath}/`);
  });
  if (location && !isInternalLocation(location, profile)) continue;

  const { outFile, exists, html } = readDistRouteHtml(root, route);
  if (!exists) {
    errors.push(`missing dist file: ${outFile}`);
    continue;
  }
  const entry = seoRoutes[cp];
  if (!entry) {
    errors.push(`no seo-routes entry for ${cp}`);
    continue;
  }

  const meta = extractHeadMetadata(html);

  const expectCanon = toAbsolutePath(cp);
  const expectOg = toAbsoluteAsset(entry.ogImage);
  const expectTw = toAbsoluteAsset(entry.twitterImage || entry.ogImage);
  const expectRB = resolveRobotsForRoute(cp, robotsTable);

  if (meta.title !== entry.title) errors.push(`${outFile}: title mismatch`);
  if (meta.description !== entry.description) errors.push(`${outFile}: description mismatch`);
  if (meta.author !== siteCredits.author) errors.push(`${outFile}: author metadata mismatch`);
  if (meta.designer !== siteCredits.designer) errors.push(`${outFile}: designer metadata mismatch`);
  if (meta.developer !== siteCredits.developer) errors.push(`${outFile}: developer metadata mismatch`);
  if (meta.canonical !== expectCanon) errors.push(`${outFile}: canonical mismatch (got ${meta.canonical}, expected ${expectCanon})`);
  if (meta.ogUrl !== expectCanon) errors.push(`${outFile}: og:url mismatch`);
  if (meta.ogImage !== expectOg) errors.push(`${outFile}: og:image mismatch`);
  if (meta.twitterImage !== expectTw) errors.push(`${outFile}: twitter:image mismatch`);
  if (meta.robots !== expectRB) errors.push(`${outFile}: robots mismatch (got ${meta.robots}, expected ${expectRB})`);
  validated += 1;
}

if (errors.length) {
  console.error('SEO output check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`SEO output check passed for ${validated} ${profile.id} public routes.`);
