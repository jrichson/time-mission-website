/**
 * Ensures dist HTML that loads ticket-panel.js includes ticket panel contract markup.
 */
const fs = require('node:fs');
const path = require('node:path');
const { loadAstroRenderedOutputFilesSet } = require('./lib/load-astro-rendered-output-files.cjs');

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

/** From `src/data/site/astro-rendered-output-files.json` — Astro pages use SiteScripts + site contract. */
const ASTRO_RENDERED_DIST_HTML = loadAstroRenderedOutputFilesSet(root);

function isAstroRenderedDistHtml(rel) {
  const norm = rel.split(path.sep).join('/');
  return ASTRO_RENDERED_DIST_HTML.has(norm);
}

const REQUIRED_SUBSTRINGS = [
  ['<!-- Ticket Popup Panel -->', 'marker comment'],
  ['id="ticketOverlay"', '#ticketOverlay'],
  ['id="ticketPanel"', '#ticketPanel'],
  ['id="ticketClose" aria-label="Close ticket panel"', 'labeled close button (#ticketClose)'],
  ['id="ticketLocation"', '#ticketLocation select'],
  ['id="ticketBookBtn"', '#ticketBookBtn anchor'],
];

const ASTRO_CONTRACT_SUBSTRINGS = [
  ['window.__TM_SITE_CONTRACT__', 'compiled site contract bootstrap'],
];

const allHtml = walk(distDir);
let scanned = 0;
for (const file of allHtml) {
  const rel = path.relative(distDir, file);
  if (rel === '404.html') continue;
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('/js/ticket-panel.js')) continue;
  scanned += 1;
  const checkSets = REQUIRED_SUBSTRINGS.concat(
    isAstroRenderedDistHtml(rel) ? ASTRO_CONTRACT_SUBSTRINGS : []
  );
  for (const [needle, label] of checkSets) {
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
