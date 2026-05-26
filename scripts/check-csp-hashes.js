/** Verifies dist/_headers contains the CSP hashes required by built HTML. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { collectInlineCspHashes } = require('./lib/csp-hashes.cjs');
const { walkDeployFiles } = require('./lib/cloudflare-artifact-contract.cjs');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const distHeaders = path.join(distDir, '_headers');

const errors = [];

if (!fs.existsSync(distDir)) {
  console.error('dist/ not found — run npm run build:astro first');
  process.exit(1);
}

if (!fs.existsSync(distHeaders)) {
  console.error('dist/_headers not found — run npm run build:astro first');
  process.exit(1);
}

const headersContent = fs.readFileSync(distHeaders, 'utf8');

const cspLine = headersContent.split('\n').find((l) => l.trim().startsWith('Content-Security-Policy:'));
if (!cspLine) {
  errors.push('dist/_headers: no Content-Security-Policy header found');
}

const cspValue = cspLine ? cspLine.replace(/^\s*Content-Security-Policy:\s*/, '') : '';

const directives = cspValue.split(';').map((d) => d.trim());

const scriptSrcDirective = directives.find(d => d.startsWith('script-src ') || d === 'script-src');
const styleSrcDirective = directives.find(d => d.startsWith('style-src ') || d === 'style-src');

if (scriptSrcDirective && scriptSrcDirective.includes("'unsafe-inline'")) {
  errors.push("dist/_headers CSP: script-src contains 'unsafe-inline' — must be replaced with sha256 hashes");
}
if (styleSrcDirective && styleSrcDirective.includes("'unsafe-inline'")) {
  errors.push("dist/_headers CSP: style-src contains 'unsafe-inline' — must be replaced with sha256 hashes");
}

function extractHashes(directive) {
  if (!directive) return new Set();
  const tokens = directive.split(/\s+/);
  return new Set(tokens.filter((t) => t.startsWith("'sha256-")));
}

const scriptHashesInHeader = extractHashes(scriptSrcDirective);
const styleHashesInHeader = extractHashes(styleSrcDirective);

const htmlFiles = walkDeployFiles(distDir, {
  baseDir: distDir,
  includeFile: (file) => file.endsWith('.html'),
});

let scriptHashCount = 0;
let styleHashCount = 0;
const seenScriptHashes = new Set();
const seenStyleHashes = new Set();

for (const htmlFile of htmlFiles) {
  const relPath = path.relative(distDir, htmlFile);
  const html = fs.readFileSync(htmlFile, 'utf8');
  const { scriptHashes, styleHashes } = collectInlineCspHashes(html);

  for (const hash of scriptHashes) {
    if (!seenScriptHashes.has(hash)) {
      seenScriptHashes.add(hash);
      scriptHashCount++;
      if (!scriptHashesInHeader.has(hash)) {
        errors.push(`Hash not in CSP script-src: ${hash} (from ${relPath})`);
      }
    }
  }

  for (const hash of styleHashes) {
    if (!seenStyleHashes.has(hash)) {
      seenStyleHashes.add(hash);
      styleHashCount++;
      if (!styleHashesInHeader.has(hash)) {
        errors.push(`Hash not in CSP style-src: ${hash} (from ${relPath})`);
      }
    }
  }
}

if (errors.length) {
  console.error('CSP hash check FAILED:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(
  `CSP hash check passed: ${scriptHashCount} script hash(es), ${styleHashCount} style hash(es) verified.`
);
