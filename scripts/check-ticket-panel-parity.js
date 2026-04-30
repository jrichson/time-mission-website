/**
 * Ensures dist HTML that loads ticket-panel.js includes ticket panel contract markup.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const errors = [];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else if (entry.name.endsWith('.html')) files.push(fullPath);
  }
  return files;
}

if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) {
  console.error('Ticket panel parity check failed:');
  console.error('- dist/ directory missing (run npm run build:astro first)');
  process.exit(1);
}

const REQUIRED_SUBSTRINGS = [
  ['<!-- Ticket Popup Panel -->', 'marker comment'],
  ['id="ticketOverlay"', '#ticketOverlay'],
  ['id="ticketPanel"', '#ticketPanel'],
  ['id="ticketClose" aria-label="Close ticket panel"', 'labeled close button (#ticketClose)'],
  ['id="ticketLocation"', '#ticketLocation select'],
  ['id="ticketBookBtn"', '#ticketBookBtn anchor'],
];

const allHtml = walk(distDir);
let scanned = 0;
for (const file of allHtml) {
  const rel = path.relative(distDir, file);
  if (rel === '404.html') continue;
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('/js/ticket-panel.js')) continue;
  scanned += 1;
  for (const [needle, label] of REQUIRED_SUBSTRINGS) {
    if (!html.includes(needle)) errors.push(`${rel}: missing ${label}`);
  }
  if (/\/_astro\/[^"]*ticket-panel[^"]*\.js/.test(html)) {
    errors.push(`${rel}: ticket-panel.js was bundled by Astro (use is:inline)`);
  }
}

if (scanned === 0) {
  console.error('Ticket panel parity check failed:');
  console.error('- no dist/*.html pages reference js/ticket-panel.js (did Astro emit any pages?)');
  process.exit(1);
}

if (errors.length) {
  console.error('Ticket panel parity check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`Ticket panel parity check passed for ${scanned} dist pages.`);
