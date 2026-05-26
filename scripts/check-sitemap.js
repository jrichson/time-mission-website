const path = require('node:path');
const {
  loadRouteRegistry,
  compileRouteContract,
  verifySitemapLocs,
} = require('./lib/route-artifacts');
const { runCheck } = require('./lib/validation-core');

const root = path.resolve(__dirname, '..');
const registry = loadRouteRegistry(root);
const contract = compileRouteContract(registry);

runCheck({
  title: 'Sitemap source contract check',
  run(errors) {
    errors.push(...verifySitemapLocs(contract.sitemapUrls, contract, {
      requireBaseUrl: true,
    }).errors);
  },
  onSuccess() {
    return `Sitemap source contract check passed for ${contract.sitemapUrls.length} expected URLs.`;
  },
});
