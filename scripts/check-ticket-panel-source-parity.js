/**
 * Compares TicketPanel Astro output against components/ticket-panel.html modulo options list and whitespace/SVG quirks.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const distFile = path.join(root, 'dist', 'about.html');
const legacyFile = path.join(root, 'components', 'ticket-panel.html');

function extractPanel(html) {
  const marker = '<!-- Ticket Popup Panel -->';
  const m = html.indexOf(marker);
  if (m < 0) return null;
  const tail = html.slice(m);
  const endEarly = tail.indexOf('<script defer src="/js/nav.js');
  if (endEarly !== -1) return tail.slice(0, endEarly);
  return null;
}

function normalize(s) {
  return s
    .trim()
    .replace(/<option\b[^>]*>[\s\S]*?<\/option>/gi, '<option/>')
    .replace(/-->\s+</g, '--><')
    .replace(/\s+/g, ' ')
    .trim();
}

if (!fs.existsSync(distFile)) {
  console.error('Ticket panel source-parity check failed:');
  console.error('- dist/about.html missing (run npm run build:astro first; this gate runs after build)');
  process.exit(1);
}

if (!fs.existsSync(legacyFile)) {
  console.error('Ticket panel source-parity check failed:');
  console.error('- components/ticket-panel.html missing');
  process.exit(1);
}

const distHtml = fs.readFileSync(distFile, 'utf8');
const legacyHtml = fs.readFileSync(legacyFile, 'utf8');

const distPanel = extractPanel(distHtml);
const errors = [];

if (!distPanel) errors.push('could not extract ticket panel slice from dist/about.html');
else {
  const distNorm = normalize(distPanel);
  const legacyNorm = normalize(legacyHtml.trim());
  if (distNorm !== legacyNorm) {
    errors.push('Astro-rendered ticket panel diverges from components/ticket-panel.html (modulo <option> list and normalization)');
    errors.push(`  dist (head 200 chars): ${distNorm.slice(0, 200)}`);
    errors.push(`  legacy (head 200 chars): ${legacyNorm.slice(0, 200)}`);
  }
}

if (errors.length) {
  console.error('Ticket panel source-parity check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Ticket panel source-parity check passed.');
