/**
 * Astro dist manifest — verifies Cloudflare-critical host files and representative
 * assets exist under dist/ after `npm run build:astro`.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');

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

mustFile('_headers');
mustFile('_redirects');
mustFile('robots.txt');
mustFile('sitemap.xml');
mustFile('404.html');
mustFile('data/locations.json');
mustFile('css/base.css');
mustFile('js/locations.js');
mustDirHasFiles('assets/fonts');

mustFile('about.html');
mustFile('index.html');
mustFile('faq.html');
mustFile('contact.html');
mustFile('privacy.html');
mustFile('houston.html');
mustFile('missions.html');
mustFile('groups/corporate.html');
mustFile('locations.html');
mustFile('philadelphia.html');
mustFile('contact-thank-you.html');

if (errors.length) {
  console.error('Astro dist manifest check failed:');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log('Astro dist manifest check passed.');
