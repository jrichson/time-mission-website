const fs = require('node:fs');
const path = require('node:path');

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

/** keep in sync with scripts/sync-static-to-public.mjs ASTRO_RENDERED_OUTPUT_FILES */
const ASTRO_RENDERED_OUTPUT_FILES = new Set([
  'index.html',
  'about.html',
  'faq.html',
  'contact.html',
  'contact-thank-you.html',
  'privacy.html',
  'locations.html',
  'groups/corporate.html',
  'philadelphia.html',
  'houston.html',
]);

const routesData = loadJson('src/data/routes.json');
const seoRoutes = loadJson('src/data/site/seo-routes.json');
const robotsTable = loadJson('src/data/site/seo-robots.json');
const baseUrl = routesData.baseUrl || 'https://timemission.com';

function toAbsolutePath(canonicalPath) {
  return canonicalPath === '/' ? `${baseUrl}/` : `${baseUrl}${canonicalPath}`;
}

function toAbsoluteAsset(rootRelative) {
  if (/^https?:\/\//.test(rootRelative)) return rootRelative;
  return `${baseUrl}${rootRelative}`;
}

function decodeBasicEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractFirst(html, re) {
  const m = html.match(re);
  return m ? decodeBasicEntities(m[1].trim()) : null;
}

const distDir = path.join(root, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('dist/ missing — run npm run build:astro first');
  process.exit(1);
}

const astroRoutes = routesData.routes.filter((r) =>
  ASTRO_RENDERED_OUTPUT_FILES.has(r.outputFile.replace(/^\//, '')),
);

for (const route of astroRoutes) {
  const cp = route.canonicalPath;
  const outFile = route.outputFile.replace(/^\//, '');
  const absHtml = path.join(distDir, outFile);
  if (!fs.existsSync(absHtml)) {
    errors.push(`missing dist file: ${outFile}`);
    continue;
  }
  const html = fs.readFileSync(absHtml, 'utf8');
  const entry = seoRoutes[cp];
  if (!entry) {
    errors.push(`no seo-routes entry for ${cp}`);
    continue;
  }

  const title = extractFirst(html, /<title>([^<]*)<\/title>/i);
  const description = extractFirst(
    html,
    /<meta\s+name="description"\s+content="([^"]*)"/i,
  );
  const canonical = extractFirst(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i);
  const ogUrl = extractFirst(html, /<meta\s+property="og:url"\s+content="([^"]+)"/i);
  const ogImage = extractFirst(html, /<meta\s+property="og:image"\s+content="([^"]+)"/i);
  const twImage = extractFirst(html, /<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
  const robots = extractFirst(html, /<meta\s+name="robots"\s+content="([^"]+)"/i);

  const expectCanon = toAbsolutePath(cp);
  const expectOg = toAbsoluteAsset(entry.ogImage);
  const expectTw = toAbsoluteAsset(entry.twitterImage || entry.ogImage);
  const expectRB = resolveRobotsForRoute(cp, robotsTable);

  if (title !== entry.title) errors.push(`${outFile}: title mismatch`);
  if (description !== entry.description) errors.push(`${outFile}: description mismatch`);
  if (canonical !== expectCanon) errors.push(`${outFile}: canonical mismatch (got ${canonical}, expected ${expectCanon})`);
  if (ogUrl !== expectCanon) errors.push(`${outFile}: og:url mismatch`);
  if (ogImage !== expectOg) errors.push(`${outFile}: og:image mismatch`);
  if (twImage !== expectTw) errors.push(`${outFile}: twitter:image mismatch`);
  if (robots !== expectRB) errors.push(`${outFile}: robots mismatch (got ${robots}, expected ${expectRB})`);
}

if (errors.length) {
  console.error('SEO output check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`SEO output check passed for ${astroRoutes.length} Astro-rendered routes.`);
