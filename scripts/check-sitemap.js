const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sitemapPath = path.join(root, 'sitemap.xml');
const sitemap = fs.readFileSync(sitemapPath, 'utf8');

const baseUrl = 'https://timemission.com/';
const excluded = new Set(['404.html', 'contact-thank-you.html']);
const expectedPaths = [];

for (const entry of fs.readdirSync(root)) {
  if (!entry.endsWith('.html') || excluded.has(entry)) continue;
  expectedPaths.push(entry === 'index.html' ? '' : entry);
}

const groupsDir = path.join(root, 'groups');
for (const entry of fs.readdirSync(groupsDir)) {
  if (entry.endsWith('.html')) expectedPaths.push(`groups/${entry}`);
}

expectedPaths.push('locations/');

const errors = [];
for (const pagePath of expectedPaths.sort()) {
  const url = `${baseUrl}${pagePath}`;
  if (!sitemap.includes(`<loc>${url}</loc>`)) {
    errors.push(`Missing sitemap URL: ${url}`);
  }
}

if (sitemap.includes('experiences.html')) {
  errors.push('Sitemap still references experiences.html; canonical page is missions.html');
}

if (errors.length) {
  console.error('Sitemap check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Sitemap check passed for ${expectedPaths.length} expected URLs.`);
