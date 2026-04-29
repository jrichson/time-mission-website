const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];

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

  if (!html.includes('js/a11y.js')) {
    errors.push(`${relative} does not load js/a11y.js`);
  }

  if (html.includes('id="ticketPanel"') && !html.includes('id="ticketClose" aria-label="Close ticket panel"')) {
    errors.push(`${relative} has ticket panel without labeled close control`);
  }

  if (html.includes('id="locationDropdown"') && !html.includes('location-dropdown-close" aria-label="Close')) {
    errors.push(`${relative} has location dialog without labeled close control`);
  }
}

if (errors.length) {
  console.error('Accessibility baseline check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Accessibility baseline check passed for ${pages.length} pages.`);
