const fs = require('node:fs');
const path = require('node:path');
const { loadRouteRegistry, compileRouteContract, verifySitemapXml } = require('./lib/route-artifacts');
const { runCheck } = require('./lib/validation-core');
const {
    isInternalLocation,
    localizedPath,
    resolveSiteProfile,
} = require('../config/site-profiles.mjs');

const root = path.resolve(__dirname, '..');
const registry = loadRouteRegistry(root);
const contract = compileRouteContract(registry);
const locationsDocument = JSON.parse(
    fs.readFileSync(path.join(root, 'data', 'locations.json'), 'utf8'),
);
const locations = Array.isArray(locationsDocument.locations) ? locationsDocument.locations : [];
const profile = resolveSiteProfile(process.env);

contract.baseUrl = profile.origin;
contract.rootHome = `${profile.origin}/`;
contract.registry = { ...registry, baseUrl: profile.origin };
contract.sitemapUrls = [];
for (const route of registry.routes || []) {
    const location = locations.find(({ slug, id }) => {
        const locationPath = `/${slug || id}`;
        return route.canonicalPath === locationPath
            || route.canonicalPath.startsWith(`${locationPath}/`);
    });
    const shouldInclude = location
        ? isInternalLocation(location, profile)
        : route.sitemap === true;
    if (!shouldInclude) continue;
    for (const locale of profile.locales) {
        contract.sitemapUrls.push(
            `${profile.origin}${localizedPath(route.canonicalPath, locale, profile)}`,
        );
    }
}
contract.sitemapUrls = [...new Set(contract.sitemapUrls)];
contract.sitemapUrlSet = new Set(contract.sitemapUrls);

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
