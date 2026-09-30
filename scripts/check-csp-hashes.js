/** Verifies static HTML enforces CSP and only explicit APIs invoke Workers. */
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

for (const line of headersContent.split('\n')) {
  if (!line.startsWith('#') && line.length > 2000) errors.push('dist/_headers: line exceeds Cloudflare limit of 2,000 characters');
}
const policyPath = path.join(distDir, 'data/content-security-policy.json');
const cspValue = fs.existsSync(policyPath) ? JSON.parse(fs.readFileSync(policyPath, 'utf8')).policy : '';
if (!cspValue) errors.push('dist: no generated Content-Security-Policy');
const routes = JSON.parse(fs.readFileSync(path.join(distDir, '_routes.json'), 'utf8'));
const apiRoutes = new Set(['/api/contact', '/api/newsletter', '/api/monitor-status']);
if (routes.version !== 1 || !Array.isArray(routes.include) || routes.include.length !== apiRoutes.size || new Set(routes.include).size !== apiRoutes.size || routes.include.some(route => !apiRoutes.has(route)) || !Array.isArray(routes.exclude) || routes.exclude.length) {
  errors.push('dist/_routes.json: only explicit API endpoints may invoke Workers');
}

const directives = cspValue.split(';').map((d) => d.trim());
const frameAncestors = directives.find(d => d.startsWith('frame-ancestors '));
if (!frameAncestors || !headersContent.includes('Content-Security-Policy: ' + frameAncestors)) {
  errors.push('dist/_headers: frame-ancestors must remain enforced by a static response header');
}
if (/Content-Security-Policy-Report-Only:|Reporting-Endpoints:|report-uri|report-to/i.test(headersContent + cspValue)) {
  errors.push('Static pages must not upload visitor CSP reports to Workers');
}


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

// The published GTM container needs dynamic script elements and Custom JS.
// Keep those explicit exceptions from widening into arbitrary external scripts.
for (const required of ["script-src-attr 'none'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'"]) {
  if (!directives.includes(required)) errors.push('Missing CSP boundary: ' + required);
}
const scriptElements = directives.find(d => d.startsWith('script-src-elem ')) || '';
if (!scriptElements.includes("'unsafe-inline'") || /'sha(?:256|384|512)-|'nonce-/.test(scriptElements)) {
  errors.push('Dynamic provider scripts require an effective script-src-elem inline exception');
}
if (!scriptSrcDirective?.includes("'unsafe-eval'")) errors.push('Published GTM Custom JavaScript requires unsafe-eval');
for (const directive of [scriptSrcDirective, scriptElements]) {
  if (/(?:^|\s)(?:\*|https:|http:|data:|blob:)(?:\s|$)/.test(directive || '')) {
    errors.push('External scripts must remain restricted to reviewed provider hosts');
  }
}

// Meta and Google tags load through GTM after consent. Dropping these hosts, or
// sending a stricter CSP header (browsers enforce header AND meta policies),
// silently blocks every pixel and conversion event, as on 2026-09-25.
const directiveTokens = name => (directives.find(d => d.startsWith(name + ' ')) || '').split(/\s+/).slice(1);
const trackingHosts = {
  'script-src-elem': ['https://www.googletagmanager.com', 'https://connect.facebook.net'],
  'connect-src': ['https://www.googletagmanager.com', 'https://www.google-analytics.com', 'https://www.facebook.com', 'https://connect.facebook.net'],
};
for (const [directive, hosts] of Object.entries(trackingHosts)) {
  for (const host of hosts) {
    if (!directiveTokens(directive).includes(host)) errors.push(`Tracking blocked: ${directive} must allow ${host}`);
  }
}
for (const line of headersContent.split('\n')) {
  const header = line.match(/^\s*Content-Security-Policy:\s*(.*)$/i);
  if (header && header[1].split(';').some(d => d.trim() && !d.trim().startsWith('frame-ancestors '))) {
    errors.push('dist/_headers: only frame-ancestors may be sent as a CSP header; the full policy belongs in the HTML meta tag');
  }
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
  const meta = html.match(/<meta id="tm-static-csp" http-equiv="Content-Security-Policy" content="([^"]*)">/);
  const expectedPolicy = cspValue.split(';').map(value => value.trim()).filter(value => value && !value.startsWith('frame-ancestors ')).join('; ');
  const firstScript = html.search(/<script\b/i);
  if (!meta || meta[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&') !== expectedPolicy || (firstScript >= 0 && html.indexOf(meta[0]) > firstScript)) {
    errors.push(`Missing or late static CSP: ${relPath}`);
  }
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
