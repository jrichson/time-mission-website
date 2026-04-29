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

const runtimePages = walk(root).filter((filePath) => {
  const relative = path.relative(root, filePath);
  return !relative.startsWith('assets/')
    && !relative.startsWith('ads/')
    && !relative.startsWith('components/')
    && !relative.startsWith('dist/')
    && !relative.startsWith('public/')
    && relative !== '404.html';
});

for (const filePath of runtimePages) {
  const relative = path.relative(root, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const usesTicketPanel = content.includes('js/ticket-panel.js') || content.includes('<!-- Ticket Popup Panel -->');

  if (usesTicketPanel && !content.includes('id="ticketPanel"')) {
    errors.push(`${relative} is missing #ticketPanel`);
  }

  if (content.includes('id="ticketClose"') && !content.includes('id="ticketClose" aria-label="Close ticket panel"')) {
    errors.push(`${relative} has an unlabeled ticket panel close button`);
  }

  if (content.includes('js/ticket-panel.js') && !content.includes('<!-- Ticket Popup Panel -->')) {
    errors.push(`${relative} loads ticket-panel.js without the ticket panel marker`);
  }
}

if (errors.length) {
  console.error('Component drift check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Component drift check passed for ${runtimePages.length} runtime pages.`);
