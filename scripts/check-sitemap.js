const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];

const registryPath = path.join(root, 'src/data/routes.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const expectedUrls = [];
for (const route of registry.routes) {
  if (!route.sitemap) continue;
  const url =
    route.canonicalPath === '/'
      ? `${registry.baseUrl}/`
      : `${registry.baseUrl}${route.canonicalPath}`;
  expectedUrls.push(url);
}

const expectedSet = new Set(expectedUrls);

const sitemapPath = path.join(root, 'sitemap.xml');
const xml = fs.readFileSync(sitemapPath, 'utf8');

const locRe = /<loc>([^<]+)<\/loc>/g;
const locs = [...xml.matchAll(locRe)].map((m) => m[1]);

for (const loc of locs) {
  if (loc.includes('.html')) {
    errors.push(`Sitemap contains legacy .html URL: ${loc}`);
  }
  const rootHome = `${registry.baseUrl}/`;
  if (loc.endsWith('/') && loc !== rootHome) {
    errors.push(`Sitemap loc must not end with trailing slash except root: ${loc}`);
  }
}

for (const url of expectedUrls) {
  if (!locs.includes(url)) {
    errors.push(`Missing sitemap URL: ${url}`);
  }
}

for (const loc of locs) {
  if (!expectedSet.has(loc)) {
    errors.push(`Unexpected sitemap URL: ${loc}`);
  }
}

if (errors.length) {
  console.error('Sitemap check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Sitemap check passed for ${expectedUrls.length} expected URLs.`);
