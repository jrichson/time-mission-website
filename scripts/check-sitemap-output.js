const fs = require('node:fs');
const path = require('node:path');
const { loadRouteRegistry, compileRouteContract, verifySitemapXml } = require('./lib/route-artifacts');
const { printCheckErrors } = require('./lib/validation-core');

const root = path.resolve(__dirname, '..');
const errors = [];

const registry = loadRouteRegistry(root);
const contract = compileRouteContract(registry);

const distPath = path.join(root, 'dist', 'sitemap.xml');
if (!fs.existsSync(distPath)) {
    console.error('Sitemap output check failed:');
    console.error(`- Missing ${path.relative(root, distPath)} — run npm run build:astro first`);
    process.exit(1);
}

const xml = fs.readFileSync(distPath, 'utf8');
errors.push(...verifySitemapXml(xml, contract, {
    requireXmlHeader: true,
    requireXmlns: true,
    requireBaseUrl: true,
}).errors);

if (errors.length) {
    printCheckErrors('Sitemap output check', errors);
    process.exit(1);
}

console.log(`Sitemap output check passed for ${contract.sitemapUrls.length} URLs.`);
