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
function walkSourceMarkupFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSourceMarkupFiles(fullPath, files);
    } else if (entry.name.endsWith('.astro') || entry.name.endsWith('.frag.txt')) {
      files.push(fullPath);
    }
  }
  return files;
}

const pages = useDist
  ? allHtml.filter((filePath) => {
      const relative = path.relative(deployRoot, filePath);
      return relative.endsWith('.html')
        && !relative.startsWith('assets/')
        && !relative.startsWith('_astro/');
    })
  : [
      ...walkSourceMarkupFiles(path.join(root, 'src', 'pages')),
      ...walkSourceMarkupFiles(path.join(root, 'src', 'components')),
      ...walkSourceMarkupFiles(path.join(root, 'src', 'partials')),
    ];

if (!pages.length) {
  errors.push(`No ${useDist ? 'dist HTML' : 'source markup'} files found for internal link checking`);
}

for (const filePath of pages) {
  const relative = path.relative(deployRoot, filePath);
  const html = fs.readFileSync(filePath, 'utf8');
  const attrs = html.matchAll(/\s(?:href|src)=["']([^"']+)["']/g);

  for (const match of attrs) {
    const raw = match[1].trim();
    if (!raw || raw.startsWith('#') || ignoredSchemes.test(raw) || raw.startsWith('//') || raw.startsWith('data:')) {
      continue;
    }
    // Skip build-time template placeholders like {{TM_MEDIA_BASE}}/...
    // These are substituted in scripts/sync-static-to-public.mjs and Astro at build time.
    // They are not real internal references in the source HTML.
    if (raw.startsWith('{{') || raw.includes('{{')) {
      continue;
    }
    if (/^\/contact\?/i.test(raw)) {
      errors.push(`${relative} links to crawlable contact parameter URL: ${raw}. Use /contact#location=... for contact prefill links.`);
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

    const target = !useDist && /^(assets|css|js|data|fonts)\//.test(clean)
      ? path.join(root, clean)
      : path.resolve(path.dirname(filePath), clean);
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
  `Internal link check passed for ${pages.length} ${useDist ? 'dist pages' : 'source markup files'}.`,
);
