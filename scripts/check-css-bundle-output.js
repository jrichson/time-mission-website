'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { walkDeployFiles } = require('./lib/cloudflare-artifact-contract.cjs');
const { stylesheetLinks } = require('./lib/html-link-parser.cjs');
const { runCheck } = require('./lib/validation-core');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');

runCheck({
  title: 'CSS bundle output check',
  run(errors) {
    if (!fs.existsSync(distDir)) {
      errors.push('dist/ missing; run npm run build:astro first');
      return;
    }

    const htmlFiles = walkDeployFiles(distDir, {
      baseDir: distDir,
      includeFile: (file) => file.endsWith('.html'),
    });

    for (const htmlFile of htmlFiles) {
      const rel = path.relative(distDir, htmlFile).split(path.sep).join('/');
      const localCss = stylesheetLinks(fs.readFileSync(htmlFile, 'utf8'))
        .filter((link) => link.pathname.startsWith('/css/'));

      if (localCss.length > 2) {
        errors.push(`${rel}: expected at most 2 local stylesheet links, found ${localCss.length}`);
      }
      if (!localCss.some((link) => /^\/css\/bundles\/site-core\.[a-f0-9]{10}\.css$/.test(link.pathname))) {
        errors.push(`${rel}: missing site-core CSS bundle`);
      }
      for (const link of localCss) {
        if (!link.pathname.startsWith('/css/bundles/')) {
          errors.push(`${rel}: unbundled stylesheet link remains (${link.href})`);
        }
      }
    }
  },
});
