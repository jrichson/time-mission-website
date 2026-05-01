/**
 * Ensures Astro pages adopt SiteLayout and SiteLayout retains required chrome imports.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else if (entry.name.endsWith('.astro')) files.push(fullPath);
  }
  return files;
}

const pagesDir = path.join(root, 'src', 'pages');
const pageFiles = walk(pagesDir);
if (!pageFiles.length) errors.push('no src/pages/**/*.astro files found');

const importLayoutRe = /import\s+SiteLayout\s+from\s+['"][^'"]+SiteLayout\.astro['"]/;
const definePageImportRe = /import\s+\{\s*definePage\s*\}\s+from\s+['"][^'"]*\/lib\/define-page['"]/;
const definePageCallRe = /\bdefinePage\s*\(\s*\{/;

/** Canonical path wiring must flow through definePage(...) → page.canonicalPath. */
function hasCanonicalSpread(text) {
  return text.includes('canonicalPath={page.canonicalPath}');
}

/** Pages that intentionally omit SiteLayout (minimal HTML shell). RFC: still use definePage. */
const standalonePageRels = new Set(['src/pages/contact-thank-you.astro']);

for (const file of pageFiles) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const text = fs.readFileSync(file, 'utf8');

  if (!definePageImportRe.test(text)) {
    errors.push(
      `${rel}: missing import { definePage } from ".../lib/define-page" (relative path depth varies by folder)`,
    );
  }
  if (!definePageCallRe.test(text)) {
    errors.push(`${rel}: must call definePage({ canonicalPath: '…' }) in frontmatter`);
  }

  if (standalonePageRels.has(rel)) {
    if (!/import\s+SiteHead\s+from\s+['"][^'"]+SiteHead\.astro['"]/.test(text)) {
      errors.push(`${rel}: standalone page must import SiteHead`);
    }
    if (!text.includes('<SiteHead canonicalPath={page.canonicalPath}')) {
      errors.push(`${rel}: SiteHead must use canonicalPath={page.canonicalPath}`);
    }
    continue;
  }

  if (!importLayoutRe.test(text)) {
    errors.push(`${rel}: missing \`import SiteLayout from "...SiteLayout.astro"\``);
  }
  if (!hasCanonicalSpread(text)) {
    errors.push(`${rel}: SiteLayout must set canonicalPath={page.canonicalPath} (RFC definePage spine)`);
  }
}

const layoutFile = path.join(root, 'src', 'layouts', 'SiteLayout.astro');
if (!fs.existsSync(layoutFile)) {
  errors.push('src/layouts/SiteLayout.astro missing');
} else {
  const layout = fs.readFileSync(layoutFile, 'utf8');
  const requiredImports = ['SiteHead', 'SiteScripts', 'TicketPanel', 'SiteNav', 'MobileMenu', 'LocationOverlay', 'SiteFooter'];
  for (const name of requiredImports) {
    const re = new RegExp(`import\\s+${name}\\s+from\\s+['"][^'"]+/${name}\\.astro['"]`);
    if (!re.test(layout)) {
      errors.push(`SiteLayout.astro: missing \`import ${name} from \".../${name}.astro\"\``);
    }
  }
}

if (errors.length) {
  console.error('Component usage check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`Component usage check passed for ${pageFiles.length} pages.`);
