const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];

const registryPath = path.join(root, 'src/data/routes.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const distPath = path.join(root, 'dist', 'sitemap.xml');
if (!fs.existsSync(distPath)) {
    console.error('Sitemap output check failed:');
    console.error(`- Missing ${path.relative(root, distPath)} — run npm run build:astro first`);
    process.exit(1);
}

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
const xml = fs.readFileSync(distPath, 'utf8');

if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('dist/sitemap.xml must start with <?xml version="1.0" encoding="UTF-8"?>');
}
if (!xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
    errors.push('dist/sitemap.xml must declare sitemap 0.9 xmlns');
}

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
    if (!loc.startsWith(registry.baseUrl)) {
        errors.push(`Sitemap loc must use base URL ${registry.baseUrl}: ${loc}`);
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
    console.error('Sitemap output check failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
}

console.log(`Sitemap output check passed for ${expectedUrls.length} URLs.`);
