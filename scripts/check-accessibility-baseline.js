const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];

function walk(dir, predicate, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, predicate, files);
    } else if (predicate(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const pages = walk(path.join(root, 'src', 'pages'), (name) => name.endsWith('.astro'));
if (!pages.length) errors.push('no Astro page sources found');

const runtimeContract = fs.readFileSync(path.join(root, 'src', 'lib', 'public-runtime-contract.ts'), 'utf8');
if (!runtimeContract.includes("id: 'a11y'") || !runtimeContract.includes("src: '/js/a11y.js'")) {
  errors.push('src/lib/public-runtime-contract.ts must include js/a11y.js in publicRuntimeScripts');
}

const siteScripts = fs.readFileSync(path.join(root, 'src', 'components', 'SiteScripts.astro'), 'utf8');
if (!siteScripts.includes('publicRuntimeScripts') || !siteScripts.includes('versionedRuntimeSrc')) {
  errors.push('src/components/SiteScripts.astro must render publicRuntimeScripts through versionedRuntimeSrc');
}

const ticketPanelRel = 'src/components/TicketPanel.astro';
const ticketPanel = fs.readFileSync(path.join(root, ticketPanelRel), 'utf8');
for (const required of [
  'role="dialog"',
  'aria-modal="true"',
  'aria-labelledby="ticketPanelTitle"',
  'aria-describedby="ticketPanelIntro"',
  'aria-hidden="true"',
  'inert',
  '<h2 id="ticketPanelTitle"',
]) {
  if (!ticketPanel.includes(required)) {
    errors.push(`${ticketPanelRel} has ticket panel without ${required}`);
  }
}

const overlay = fs.readFileSync(path.join(root, 'src', 'components', 'LocationOverlay.astro'), 'utf8');
if (!overlay.includes('class="location-dropdown-close" aria-label="Close')) {
  errors.push('src/components/LocationOverlay.astro has location dialog without labeled close control');
}

if (errors.length) {
  console.error('Accessibility baseline check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Accessibility baseline check passed for ${pages.length} Astro page sources.`);
