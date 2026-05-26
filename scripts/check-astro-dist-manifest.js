/**
 * Astro dist manifest — verifies Cloudflare-critical host files and representative
 * assets exist under dist/ after `npm run build:astro`.
 */
const fs = require('node:fs');
const path = require('node:path');
const { walkDeployFiles } = require('./lib/cloudflare-artifact-contract.cjs');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const astroManifest = JSON.parse(fs.readFileSync(path.join(root, 'src/data/site/astro-rendered-output-files.json'), 'utf8'));
const astroRenderedHtml = new Set(astroManifest.outputFiles || []);

const errors = [];

if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) {
  console.error('Astro dist manifest check failed:');
  console.error('- dist/ directory missing (run npm run build:astro first)');
  process.exit(1);
}

function mustFile(rel) {
  const abs = path.join(distDir, rel);
  if (!fs.existsSync(abs)) errors.push(`Missing: ${rel}`);
}

function mustDirHasFiles(rel) {
  const abs = path.join(distDir, rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    errors.push(`Missing or not a directory: ${rel}`);
    return;
  }
  const entries = fs.readdirSync(abs);
  if (!entries.length) errors.push(`Directory empty: ${rel}`);
}

function htmlFiles() {
  return walkDeployFiles(distDir, {
    baseDir: distDir,
    onPruned(rel) {
      errors.push(`Unexpected stale/generated artifact in dist: ${rel}`);
    },
    includeFile: (file) => file.endsWith('.html'),
  });
}

mustFile('_headers');
mustFile('_redirects');
mustFile('robots.txt');
mustFile('sitemap.xml');
mustFile('llms.txt');
mustFile('llms-full.txt');
mustFile('ai-context.md');
mustFile('pricing.md');
mustFile('404.html');
mustFile('data/locations.json');
mustFile('css/base.css');
mustDirHasFiles('css/bundles');
mustFile('js/locations.js');
mustFile('assets/logo/TM_Logo_White.svg');
mustDirHasFiles('assets/fonts');

mustFile('about.html');
mustFile('index.html');
mustFile('faq.html');
mustFile('contact.html');
mustFile('privacy.html');
mustFile('houston.html');
mustFile('missions.html');
mustFile('groups/corporate.html');
mustFile('groups/birthdays.html');
mustFile('groups/field-trips.html');
mustFile('groups/holidays.html');
mustFile('groups/private-events.html');
mustFile('groups/bachelor-ette.html');
mustFile('locations.html');
mustFile('philadelphia.html');
mustFile('contact-thank-you.html');

for (const rel of astroRenderedHtml) {
  mustFile(rel);
}

for (const htmlFile of htmlFiles()) {
  const rel = path.relative(distDir, htmlFile).split(path.sep).join('/');
  if (!astroRenderedHtml.has(rel) && !rel.startsWith('c/')) {
    errors.push(`${rel}: unexpected HTML artifact in dist`);
  }
}

if (errors.length) {
  console.error('Astro dist manifest check failed:');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log('Astro dist manifest check passed.');
