const fs = require('node:fs');
const path = require('node:path');
const { loadRouteRegistry, compileRouteContract, verifySitemapXml } = require('./lib/route-artifacts');
const { printCheckErrors } = require('./lib/validation-core');

const root = path.resolve(__dirname, '..');
const errors = [];

const registry = loadRouteRegistry(root);
const contract = compileRouteContract(registry);

const sitemapPath = path.join(root, 'sitemap.xml');
const xml = fs.readFileSync(sitemapPath, 'utf8');
errors.push(...verifySitemapXml(xml, contract).errors);

if (errors.length) {
  printCheckErrors('Sitemap check', errors);
  process.exit(1);
}

console.log(`Sitemap check passed for ${contract.sitemapUrls.length} expected URLs.`);
