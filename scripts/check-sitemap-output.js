const fs = require('node:fs');
const path = require('node:path');
const { loadRouteRegistry, compileRouteContract, verifySitemapXml } = require('./lib/route-artifacts');
const { runCheck } = require('./lib/validation-core');

const root = path.resolve(__dirname, '..');
const registry = loadRouteRegistry(root);
const contract = compileRouteContract(registry);

const distPath = path.join(root, 'dist', 'sitemap.xml');
if (!fs.existsSync(distPath)) {
    console.error('Sitemap output check failed:');
    console.error(`- Missing ${path.relative(root, distPath)} — run npm run build:astro first`);
    process.exit(1);
}

const xml = fs.readFileSync(distPath, 'utf8');
runCheck({
    title: 'Sitemap output check',
    run(errors) {
        errors.push(...verifySitemapXml(xml, contract, {
            requireXmlHeader: true,
            requireXmlns: true,
            requireBaseUrl: true,
        }).errors);
    },
    onSuccess() {
        return `Sitemap output check passed for ${contract.sitemapUrls.length} URLs.`;
    },
});
