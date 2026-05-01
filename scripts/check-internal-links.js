'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  stripQueryAndHash,
  normalizeCanonicalPath,
  walkHtmlFiles,
} = require('./lib/validation-core');
const {
  loadRouteRegistry,
  resolveInternalDeployTarget,
} = require('./lib/route-artifacts');

const root = path.resolve(__dirname, '..');
const errors = [];
const ignoredSchemes = /^(https?:|mailto:|tel:|sms:|javascript:)/i;
const useDist = process.argv.includes('--dist');
const deployRoot = useDist ? path.join(root, 'dist') : root;

let registry = null;
try {
  registry = loadRouteRegistry(root);
} catch (err) {
  errors.push(`Failed to load routes.json: ${err.message}`);
}

if (useDist && !fs.existsSync(deployRoot)) {
  console.error('Internal link check (--dist): dist/ missing; run astro build first');
  process.exit(1);
}

const allHtml = walkHtmlFiles(deployRoot);
const pages = allHtml.filter((filePath) => {
  const relative = path.relative(deployRoot, filePath);
  if (useDist) {
    return relative.endsWith('.html')
      && !relative.startsWith('assets/')
      && !relative.startsWith('_astro/');
  }
  return !relative.startsWith('assets/')
    && !relative.startsWith('ads/')
    && !relative.startsWith('components/')
    && !relative.startsWith('dist/')
    && !relative.startsWith('public/');
});

for (const filePath of pages) {
  const relative = path.relative(deployRoot, filePath);
  const html = fs.readFileSync(filePath, 'utf8');
  const attrs = html.matchAll(/\s(?:href|src)=["']([^"']+)["']/g);

  for (const match of attrs) {
    const raw = match[1].trim();
    if (!raw || raw.startsWith('#') || ignoredSchemes.test(raw) || raw.startsWith('//') || raw.startsWith('data:')) {
      continue;
    }

    const clean = stripQueryAndHash(raw);
    if (!clean || clean === '/') continue;

    if (clean.startsWith('/')) {
      const key = normalizeCanonicalPath(clean);
      const resolved = resolveInternalDeployTarget(deployRoot, registry, key);
      if (!resolved) {
        errors.push(`${relative} references missing internal asset/page: ${raw}`);
      }
      continue;
    }

    const target = path.resolve(path.dirname(filePath), clean);
    const exists = fs.existsSync(target) || fs.existsSync(path.join(target, 'index.html'));
    if (!exists) {
      errors.push(`${relative} references missing internal asset/page: ${raw}`);
    }
  }
}

if (errors.length) {
  console.error('Internal link check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Internal link check passed for ${pages.length} pages (${useDist ? 'dist output' : 'repo root'}).`,
);
