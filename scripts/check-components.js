const fs = require('node:fs');
const path = require('node:path');
const { runCheck } = require('./lib/validation-core');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function walkAstroPages(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkAstroPages(fullPath, files);
    else if (entry.name.endsWith('.astro')) files.push(fullPath);
  }
  return files;
}

const pageFiles = walkAstroPages(path.join(root, 'src', 'pages'));

runCheck({
  title: 'Component drift check',
  run(errors) {
    if (!pageFiles.length) errors.push('no Astro page sources found');

    const layout = read('src/layouts/SiteLayout.astro');
    for (const required of ['<TicketPanel ', '<SiteScripts />', '<SiteNav', '<MobileMenu', '<LocationOverlay']) {
      if (!layout.includes(required)) {
        errors.push(`src/layouts/SiteLayout.astro must render ${required}`);
      }
    }

    const ticketPanel = read('src/components/TicketPanel.astro');
    for (const required of [
      '<!-- Ticket Popup Panel -->',
      'id="ticketPanel"',
      'id="ticketClose" aria-label="Close ticket panel"',
    ]) {
      if (!ticketPanel.includes(required)) {
        errors.push(`src/components/TicketPanel.astro is missing ${required}`);
      }
    }
  },
  onSuccess() {
    return `Component drift check passed for ${pageFiles.length} Astro page sources.`;
  },
});
