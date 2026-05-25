/**
 * Astro dist manifest — verifies Cloudflare-critical host files and representative
 * assets exist under dist/ after `npm run build:astro`.
 */
const fs = require('node:fs');
const path = require('node:path');
const { shouldExcludeArtifactPath } = require('./lib/cloudflare-artifact-contract.cjs');
const { stylesheetLinks } = require('./lib/html-link-parser.cjs');

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

function readDist(rel) {
  return fs.readFileSync(path.join(distDir, rel), 'utf8');
}

function walkFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(distDir, full).split(path.sep).join('/');
    if (shouldExcludeArtifactPath(rel)) {
      errors.push(`Unexpected stale/generated artifact in dist: ${rel}`);
    }
    if (entry.isDirectory()) {
      if (path.relative(distDir, full).startsWith(`assets${path.sep}extracted`)) continue;
      walkFiles(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

function htmlFiles() {
  return walkFiles(distDir).filter((file) => file.endsWith('.html'));
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

if (fs.existsSync(path.join(distDir, 'index.html'))) {
  const home = readDist('index.html');
  const head = home.split('</head>')[0] || '';
  const gtmIndex = head.indexOf('https://www.googletagmanager.com/gtm.js?id=');
  const titleIndex = head.indexOf('<title>');
  if (gtmIndex === -1) errors.push('index.html: missing rendered GTM head script');
  if (head.includes('https://www.googletagmanager.com/ns.html')) {
    errors.push('index.html: GTM noscript iframe must not render in <head>');
  }
  if (gtmIndex !== -1 && titleIndex !== -1 && gtmIndex > titleIndex) {
    errors.push('index.html: GTM head script must render before <title>');
  }
  if (!/<body[^>]*>\s*<!-- Google Tag Manager \(noscript\) -->\s*<noscript>/i.test(home)) {
    errors.push('index.html: GTM noscript must be the first rendered body child');
  }
}

for (const htmlFile of htmlFiles()) {
  const rel = path.relative(distDir, htmlFile).split(path.sep).join('/');
  if (!astroRenderedHtml.has(rel) && !rel.startsWith('c/')) {
    errors.push(`${rel}: unexpected HTML artifact in dist`);
  }
  const localCss = stylesheetLinks(fs.readFileSync(htmlFile, 'utf8'))
    .filter((link) => link.pathname.startsWith('/css/'));
  if (localCss.length > 2) {
    errors.push(`${rel}: expected bundled CSS output to use at most 2 local stylesheet links, found ${localCss.length}`);
  }
  if (!localCss.some((link) => /^\/css\/bundles\/site-core\.[a-f0-9]{10}\.css$/.test(link.pathname))) {
    errors.push(`${rel}: missing site-core CSS bundle`);
  }
  for (const link of localCss) {
    if (!link.pathname.startsWith('/css/bundles/')) {
      errors.push(`${rel}: unbundled stylesheet link remains (${link.href})`);
    }
  }
}

if (errors.length) {
  console.error('Astro dist manifest check failed:');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log('Astro dist manifest check passed.');
