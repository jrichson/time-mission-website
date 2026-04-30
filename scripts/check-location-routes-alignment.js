const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const locationsPath = path.join(root, 'data', 'locations.json');
const routesPath = path.join(root, 'src', 'data', 'routes.json');

const errors = [];

const locData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
const routeData = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
const paths = new Set((routeData.routes || []).map((r) => r.canonicalPath));

for (const loc of locData.locations || []) {
  if (loc.status !== 'open' && loc.status !== 'coming-soon') continue;
  const expected = '/' + loc.slug;
  if (!paths.has(expected)) {
    errors.push(`Missing route for location ${loc.id}: canonicalPath must be ${expected}`);
  }
}

if (errors.length) {
  console.error('Location route alignment failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Location route alignment passed.');
