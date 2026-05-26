/** Renders CSP hash placeholders in root and dist _headers files. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { walkDeployFiles } from './lib/cloudflare-artifact-policy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { collectInlineCspHashes } = require('./lib/csp-hashes.cjs');
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const tmplPath = path.join(root, '_headers.tmpl');
const rootHeadersPath = path.join(root, '_headers');
const distHeadersPath = path.join(distDir, '_headers');

if (!fs.existsSync(tmplPath)) {
  console.error('inject-csp-hashes: _headers.tmpl not found — cannot inject hashes.');
  process.exit(1);
}

const tmpl = fs.readFileSync(tmplPath, 'utf8');

if (tmpl.includes("'unsafe-inline'")) {
  console.error("inject-csp-hashes: Template contains 'unsafe-inline' — remove before proceeding.");
  process.exit(1);
}

const htmlFiles = walkDeployFiles(distDir, {
  baseDir: distDir,
  includeFile: (file) => file.endsWith('.html'),
});

const scriptHashes = new Set();
const styleHashes = new Set();

for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const hashes = collectInlineCspHashes(html);
  for (const hash of hashes.scriptHashes) scriptHashes.add(hash);
  for (const hash of hashes.styleHashes) styleHashes.add(hash);
}

const sortedScriptHashes = Array.from(scriptHashes).sort().join(' ');
const sortedStyleHashes = Array.from(styleHashes).sort().join(' ');

const rendered = tmpl
  .replace(/\{\{SCRIPT_HASHES\}\}/g, sortedScriptHashes)
  .replace(/\{\{STYLE_HASHES\}\}/g, sortedStyleHashes);

if (rendered.includes("'unsafe-inline'")) {
  console.error(
    "inject-csp-hashes: Rendered output still contains 'unsafe-inline' — " +
      "template substitution incomplete. Check _headers.tmpl."
  );
  process.exit(1);
}

fs.writeFileSync(rootHeadersPath, rendered, 'utf8');
fs.writeFileSync(distHeadersPath, rendered, 'utf8');

console.log(
  `CSP hashes injected: ${scriptHashes.size} script hash(es), ${styleHashes.size} style hash(es).`
);
