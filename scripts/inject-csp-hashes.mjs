/** Renders CSP hash placeholders in root and dist _headers files. */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { walkDeployFiles } from './lib/cloudflare-artifact-policy.mjs';
import { resolveSiteProfile } from '../config/site-profiles.mjs';
import * as routeManifest from '../functions/_shared/location-route-manifest.mjs';
import { applyStaticSecurity, materializeLocationPages } from './lib/static-pages-output.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { collectInlineCspHashes } = require('./lib/csp-hashes.cjs');
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const tmplPath = path.join(root, '_headers.tmpl');
const rootHeadersPath = path.join(root, '_headers');
const distHeadersPath = path.join(distDir, '_headers');
const siteProfile = resolveSiteProfile(process.env);

if (!fs.existsSync(tmplPath)) {
  console.error('inject-csp-hashes: _headers.tmpl not found — cannot inject hashes.');
  process.exit(1);
}

const tmpl = fs.readFileSync(tmplPath, 'utf8');

// The reviewed compatibility policy permits dynamic GTM script elements and
// provider styles. Inline event handlers remain prohibited separately.
function assertInlineStyleExceptions(policyText) {
  for (const directive of policyText.split(/[;\n]/)) {
    if (!directive.includes("'unsafe-inline'")) continue;
    if (!/^\s*(?:script-src-elem|style-src-(?:elem|attr))\s/.test(directive)) {
      throw new Error("Inline exceptions are limited to script elements and provider styles");
    }
  }
}
assertInlineStyleExceptions(tmpl);

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
  .replace(/\{\{SITE_ORIGIN\}\}/g, siteProfile.origin)
  .replace(/\{\{SCRIPT_HASHES\}\}/g, sortedScriptHashes)
  .replace(/\{\{STYLE_HASHES\}\}/g, sortedStyleHashes);

assertInlineStyleExceptions(rendered);

// Pages drops individual _headers lines longer than 2,000 characters.
// Keep the full policy in static HTML; only frame-ancestors needs a response header.
const cspLines = rendered.split('\n').filter((line) => line.trim().startsWith('Content-Security-Policy:'));
if (cspLines.length !== 1) throw new Error('Expected exactly one global CSP in _headers.tmpl');
const policy = cspLines[0].trim().slice('Content-Security-Policy:'.length).trim();
// A policy-only release must change HTML ETags too: cached documents can retain
// the previous CSP after a 304 response even when middleware serves a new policy.
const policyVersion = createHash('sha256').update(policy).digest('hex').slice(0, 16);
for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(htmlFile, 'utf8').replace(/\n?<!-- tm-csp-version:[a-f0-9]+ -->\n?$/, '');
  fs.writeFileSync(htmlFile, html + '\n<!-- tm-csp-version:' + policyVersion + ' -->\n');
}
const staticHeaders = rendered.split('\n').filter((line) => !line.trim().startsWith('Content-Security-Policy:')).join('\n');
for (const line of staticHeaders.split('\n')) {
  if (!line.startsWith('#') && line.length > 2000) throw new Error('Generated _headers line exceeds 2,000 characters');
}
fs.mkdirSync(path.join(distDir, 'data'), { recursive: true });
fs.writeFileSync(path.join(distDir, 'data/content-security-policy.json'), JSON.stringify({ policy }) + '\n');
fs.writeFileSync(rootHeadersPath, staticHeaders, 'utf8');
fs.writeFileSync(distHeadersPath, staticHeaders, 'utf8');
applyStaticSecurity(distDir, policy);
const staticLocationPages = materializeLocationPages(distDir, routeManifest);
fs.copyFileSync(distHeadersPath, rootHeadersPath);
console.log(`Materialized ${staticLocationPages} location-prefixed pages without Worker routing.`);

console.log(
  `CSP hashes injected: ${scriptHashes.size} script hash(es), ${styleHashes.size} style hash(es).`
);
