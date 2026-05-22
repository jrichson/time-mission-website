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

const partialsDir = path.join(root, 'src', 'partials');
if (fs.existsSync(partialsDir)) {
  for (const name of fs.readdirSync(partialsDir)) {
    if (name.endsWith('-after.frag.txt')) {
      errors.push(`src/partials/${name}: after-fragments should move to page modules or SiteLayout slots`);
    }
  }
}

const importLayoutRe = /import\s+SiteLayout\s+from\s+['"][^'"]+SiteLayout\.astro['"]/;
const definePageImportRe = /import\s+\{\s*definePage\s*\}\s+from\s+['"][^'"]*\/lib\/define-page['"]/;
const definePageCallRe = /\bdefinePage\s*\(\s*\{/;
const locationPageShellImportRe = /import\s+\{[^}]*build(?:Open|ComingSoon)LocationPage[^}]*\}\s+from\s+['"][^'"]*\/lib\/location-page-shell['"]/;
const locationPageShellCallRe = /\bbuild(?:Open|ComingSoon)LocationPage\s*\(/;
const locationPageShellComponentRe = /<(?:Open|ComingSoon)LocationPageShell\b[^>]*\bcityPage=\{cityPage\}/;

function hasDefinePageSource(text) {
  return (definePageImportRe.test(text) && definePageCallRe.test(text))
    || (locationPageShellImportRe.test(text) && locationPageShellCallRe.test(text));
}

function hasCanonicalSpread(text) {
  return text.includes('canonicalPath={page.canonicalPath}')
    || text.includes('canonicalPath={cityPage.page.canonicalPath}');
}

function usesLocationPageShell(text) {
  return locationPageShellComponentRe.test(text);
}

/** Pages that intentionally omit SiteLayout but still declare page metadata. */
const standalonePageRels = new Set(['src/pages/contact-thank-you.astro']);

for (const file of pageFiles) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const text = fs.readFileSync(file, 'utf8');

  if (!hasDefinePageSource(text)) {
    errors.push(`${rel}: must use definePage directly or through location-page-shell`);
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

  const hasShellComponent = usesLocationPageShell(text);
  if (!importLayoutRe.test(text) && !hasShellComponent) {
    errors.push(`${rel}: missing \`import SiteLayout from "...SiteLayout.astro"\` or a location page shell component`);
  }
  if (!hasCanonicalSpread(text) && !hasShellComponent) {
    errors.push(`${rel}: SiteLayout or location page shell must set canonicalPath={page.canonicalPath}`);
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

for (const shellRel of [
  path.join('src', 'components', 'OpenLocationPageShell.astro'),
  path.join('src', 'components', 'ComingSoonLocationPageShell.astro'),
]) {
  const shellFile = path.join(root, shellRel);
  if (!fs.existsSync(shellFile)) {
    errors.push(`${shellRel}: missing location page shell component`);
    continue;
  }
  const shell = fs.readFileSync(shellFile, 'utf8');
  if (!importLayoutRe.test(shell)) {
    errors.push(`${shellRel}: missing \`import SiteLayout from "...SiteLayout.astro"\``);
  }
  if (!shell.includes('canonicalPath={cityPage.page.canonicalPath}')) {
    errors.push(`${shellRel}: SiteLayout must use canonicalPath={cityPage.page.canonicalPath}`);
  }
}

if (errors.length) {
  console.error('Component usage check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`Component usage check passed for ${pageFiles.length} pages.`);
