/**
 * check-csp-hashes.js — CI gate that recomputes SHA256 hashes from dist HTML and
 * verifies every inline block's hash appears in dist/_headers CSP.
 *
 * Fails if:
 *   - dist/ is missing — exits 1 with message "dist/ not found — run npm run build:astro first"
 *   - dist/_headers contains 'unsafe-inline' in script-src or style-src
 *   - Any inline block hash is absent from the matching CSP directive
 *
 * Wire into: npm run verify (NOT npm run check — check is source-only, verify requires dist/)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const distHeaders = path.join(distDir, '_headers');

const errors = [];

// Step 1: Verify dist/ and dist/_headers exist
if (!fs.existsSync(distDir)) {
    console.error('dist/ not found — run npm run build:astro first');
    process.exit(1);
}

if (!fs.existsSync(distHeaders)) {
    console.error('dist/_headers not found — run npm run build:astro first');
    process.exit(1);
}

// Step 2: Read dist/_headers and parse CSP
const headersContent = fs.readFileSync(distHeaders, 'utf8');

const cspLine = headersContent.split('\n').find(l => l.trim().startsWith('Content-Security-Policy:'));
if (!cspLine) {
    errors.push('dist/_headers: no Content-Security-Policy header found');
}

const cspValue = cspLine ? cspLine.replace(/^\s*Content-Security-Policy:\s*/, '') : '';

// Check for unsafe-inline in script-src and style-src
const directives = cspValue.split(';').map(d => d.trim());

const scriptSrcDirective = directives.find(d => d.startsWith('script-src ') || d === 'script-src');
const styleSrcDirective = directives.find(d => d.startsWith('style-src ') || d === 'style-src');

if (scriptSrcDirective && scriptSrcDirective.includes("'unsafe-inline'")) {
    errors.push("dist/_headers CSP: script-src contains 'unsafe-inline' — must be replaced with sha256 hashes");
}
if (styleSrcDirective && styleSrcDirective.includes("'unsafe-inline'")) {
    errors.push("dist/_headers CSP: style-src contains 'unsafe-inline' — must be replaced with sha256 hashes");
}

// Step 3: Extract hash sets from dist/_headers
function extractHashes(directive) {
    if (!directive) return new Set();
    const tokens = directive.split(/\s+/);
    return new Set(tokens.filter(t => t.startsWith("'sha256-")));
}

const scriptHashesInHeader = extractHashes(scriptSrcDirective);
const styleHashesInHeader = extractHashes(styleSrcDirective);

// Step 4: Walk dist HTML (same filter as injector)
function walkHtml(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
        if (entry.isFile() && entry.name.endsWith('.html')) {
            results.push(path.join(entry.parentPath || entry.path, entry.name));
        }
    }
    return results;
}

const htmlFiles = walkHtml(distDir).filter(f => {
    const rel = path.relative(distDir, f);
    if (/ \d*\.html$/.test(path.basename(f))) return false;
    if (rel.startsWith('assets/extracted/')) return false;
    return true;
});

const INLINE_SCRIPT_RE = /<script([^>]*)>([\s\S]*?)<\/script>/g;
const INLINE_STYLE_RE = /<style[^>]*>([\s\S]*?)<\/style>/g;

function sha256b64(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('base64');
}

let scriptHashCount = 0;
let styleHashCount = 0;
const seenScriptHashes = new Set();
const seenStyleHashes = new Set();

for (const htmlFile of htmlFiles) {
    const relPath = path.relative(distDir, htmlFile);
    const html = fs.readFileSync(htmlFile, 'utf8');

    // Inline scripts
    let m;
    INLINE_SCRIPT_RE.lastIndex = 0;
    while ((m = INLINE_SCRIPT_RE.exec(html)) !== null) {
        const attrs = m[1];
        const body = m[2];
        if (attrs.includes('src=')) continue;
        if (attrs.includes('application/ld+json')) continue;
        const hash = `'sha256-${sha256b64(body)}'`;
        if (!seenScriptHashes.has(hash)) {
            seenScriptHashes.add(hash);
            scriptHashCount++;
            if (!scriptHashesInHeader.has(hash)) {
                errors.push(`Hash not in CSP script-src: ${hash} (from ${relPath})`);
            }
        }
    }

    // Inline styles
    INLINE_STYLE_RE.lastIndex = 0;
    while ((m = INLINE_STYLE_RE.exec(html)) !== null) {
        const body = m[1];
        const hash = `'sha256-${sha256b64(body)}'`;
        if (!seenStyleHashes.has(hash)) {
            seenStyleHashes.add(hash);
            styleHashCount++;
            if (!styleHashesInHeader.has(hash)) {
                errors.push(`Hash not in CSP style-src: ${hash} (from ${relPath})`);
            }
        }
    }
}

// Step 5: Report
if (errors.length) {
    console.error('CSP hash check FAILED:');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
}

console.log(
    `CSP hash check passed: ${scriptHashCount} script hash(es), ${styleHashCount} style hash(es) verified.`
);
