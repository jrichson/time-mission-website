/**
 * Compares TicketPanel Astro output against the shared component source modulo options list and whitespace/SVG quirks.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const distFile = path.join(root, 'dist', 'about.html');
const componentFile = path.join(root, 'components', 'ticket-panel.html');

function extractPanel(html) {
  const marker = '<!-- Ticket Popup Panel -->';
  const m = html.indexOf(marker);
  if (m < 0) return null;
  const tail = html.slice(m);
  const endEarly = tail.search(/<script\b/i);
  if (endEarly !== -1) return tail.slice(0, endEarly);
  return null;
}

function normalize(s) {
  return s
    .trim()
    .replace(/<select\b[^>]*>[\s\S]*?<\/select>/gi, '<select></select>')
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

if (!fs.existsSync(componentFile)) {
  console.error('Ticket panel source-parity check failed:');
  console.error('- components/ticket-panel.html missing');
  process.exit(1);
}

const distHtml = fs.readFileSync(distFile, 'utf8');
const componentHtml = fs.readFileSync(componentFile, 'utf8');

const distPanel = extractPanel(distHtml);
const errors = [];

if (!distPanel) errors.push('could not extract ticket panel slice from dist/about.html');
else {
  const distNorm = normalize(distPanel);
  const componentNorm = normalize(componentHtml.trim());
  if (distNorm !== componentNorm) {
    errors.push('Astro-rendered ticket panel diverges from components/ticket-panel.html (modulo <option> list and normalization)');
    errors.push(`  dist (head 200 chars): ${distNorm.slice(0, 200)}`);
    errors.push(`  component (head 200 chars): ${componentNorm.slice(0, 200)}`);
  }
}

if (errors.length) {
  console.error('Ticket panel source-parity check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Ticket panel source-parity check passed.');
