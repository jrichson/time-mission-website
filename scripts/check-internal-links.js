const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];
const ignoredSchemes = /^(https?:|mailto:|tel:|sms:|javascript:)/i;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

function stripQueryAndHash(href) {
  return href.split('#')[0].split('?')[0];
}

const pages = walk(root).filter((filePath) => {
  const relative = path.relative(root, filePath);
  return !relative.startsWith('assets/')
    && !relative.startsWith('ads/')
    && !relative.startsWith('components/')
    && !relative.startsWith('dist/')
    && !relative.startsWith('public/');
});

for (const filePath of pages) {
  const relative = path.relative(root, filePath);
  const html = fs.readFileSync(filePath, 'utf8');
  const attrs = html.matchAll(/\s(?:href|src)=["']([^"']+)["']/g);

  for (const match of attrs) {
    const raw = match[1].trim();
    if (!raw || raw.startsWith('#') || ignoredSchemes.test(raw) || raw.startsWith('//') || raw.startsWith('data:')) {
      continue;
    }

    const clean = stripQueryAndHash(raw);
    if (!clean || clean === '/') continue;

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

console.log(`Internal link check passed for ${pages.length} pages.`);
