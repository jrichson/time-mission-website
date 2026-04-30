const fs = require('node:fs');
const path = require('node:path');
const { loadRouteRegistry, compileRouteContract, verifySitemapXml } = require('./lib/route-artifacts');
const { runCheck } = require('./lib/validation-core');

const root = path.resolve(__dirname, '..');
const registry = loadRouteRegistry(root);
const contract = compileRouteContract(registry);

const sitemapPath = path.join(root, 'sitemap.xml');
const xml = fs.readFileSync(sitemapPath, 'utf8');

runCheck({
  title: 'Sitemap check',
  run(errors) {
    errors.push(...verifySitemapXml(xml, contract).errors);
  },
  onSuccess() {
    return `Sitemap check passed for ${contract.sitemapUrls.length} expected URLs.`;
  },
});
