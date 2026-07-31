const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const locationsPath = path.join(root, 'data', 'locations.json');
const routesPath = path.join(root, 'src', 'data', 'routes.json');

const errors = [];

const locData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
const routeData = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
const routesByPath = new Map((routeData.routes || []).map((r) => [r.canonicalPath, r]));

for (const loc of locData.locations || []) {
  if (!['open', 'coming-soon', 'temporarily-closed'].includes(loc.status)) continue;
  const expected = '/' + loc.slug;
  const route = routesByPath.get(expected);
  if (!route) {
    errors.push(`Missing route for location ${loc.id}: canonicalPath must be ${expected}`);
    continue;
  }
  if (loc.externalUrl && !loc.pagePath) {
    if (route.externalUrl !== loc.externalUrl) {
      errors.push(`External location ${loc.id}: route.externalUrl must be ${loc.externalUrl}`);
    }
    if (route.sitemap !== false) {
      errors.push(`External location ${loc.id}: route.sitemap must be false because the public page redirects off-site`);
    }
  }
  if (loc.pagePath) {
    if (loc.pagePath !== expected) {
      errors.push(`Location ${loc.id}: pagePath must match its canonical route ${expected}`);
    }
    if (route.externalUrl) {
      errors.push(`Location ${loc.id}: route.externalUrl must be empty when pagePath is configured`);
    }
    if (route.sitemap !== true) {
      errors.push(`Location ${loc.id}: route.sitemap must be true when pagePath is configured`);
    }
  }
}

if (errors.length) {
  console.error('Location route alignment failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Location route alignment passed.');
