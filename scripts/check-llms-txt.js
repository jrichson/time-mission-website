const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];

const registryPath = path.join(root, 'src/data/routes.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const distPath = path.join(root, 'dist', 'llms.txt');
if (!fs.existsSync(distPath)) {
    console.error('llms.txt check failed:');
    console.error(`- Missing ${path.relative(root, distPath)} — run npm run build:astro first`);
    process.exit(1);
}

const body = fs.readFileSync(distPath, 'utf8');

const allowlist = new Set();
for (const route of registry.routes) {
    if (!route.sitemap) continue;
    const url =
        route.canonicalPath === '/'
            ? `${registry.baseUrl}/`
            : `${registry.baseUrl}${route.canonicalPath}`;
    allowlist.add(url);
}

const nonEmptyLines = body.split(/\r?\n/).filter((l) => l.trim().length > 0);
if (nonEmptyLines.length === 0 || !nonEmptyLines[0].startsWith('# Time Mission')) {
    errors.push('llms.txt first non-empty line must be H1 # Time Mission');
}

const firstSix = body.split(/\r?\n/).slice(0, 6);
const hasBlurb = firstSix.some((l) => l.startsWith('> '));
if (!hasBlurb) {
    errors.push('llms.txt must include a blockquote line starting with "> " in the first 6 lines');
}
if (!/##\s/.test(body)) {
    errors.push('llms.txt must contain at least one ## heading');
}
if (body.includes('?book=')) errors.push('llms.txt must not contain ?book=');
if (body.includes('/contact-thank-you')) errors.push('llms.txt must not include /contact-thank-you');
if (body.includes('/_archive/')) errors.push('llms.txt must not include /_archive/');
if (/\.html\b/i.test(body)) errors.push('llms.txt must not reference .html URLs');

const urlRe = /https:\/\/timemission\.com[^\s\)`'"]+/g;
const found = [...body.matchAll(urlRe)].map((m) => m[0]);
for (const u of found) {
    if (!allowlist.has(u)) {
        errors.push(`URL not in canonical sitemap-eligible set: ${u}`);
    }
}

if (errors.length) {
    console.error('llms.txt check failed:');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
}

console.log(`llms.txt check passed for ${found.length} URLs.`);
