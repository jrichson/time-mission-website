const fs = require('node:fs');
const path = require('node:path');
const { listDeployableHtmlPages, runCheck } = require('./lib/validation-core');

const root = path.resolve(__dirname, '..');
const runtimePages = listDeployableHtmlPages(root).filter(
  (filePath) => path.relative(root, filePath) !== '404.html'
);

runCheck({
  title: 'Component drift check',
  run(errors) {
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
  },
  onSuccess() {
    return `Component drift check passed for ${runtimePages.length} runtime pages.`;
  },
});
