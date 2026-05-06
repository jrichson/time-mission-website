/**
 * inject-csp-hashes.mjs — runs after astro build + minify-dist-assets.mjs.
 *
 * Walks dist html files, extracts every inline <script> (no src=) and <style> block,
 * computes SHA256-base64 hashes, substitutes them into _headers.tmpl placeholders,
 * writes both _headers (repo root, generated convenience copy) and dist/_headers.
 *
 * Source-of-truth model: _headers.tmpl is canonical. _headers and dist/_headers are outputs.
 *
 * Placeholders in _headers.tmpl:
 *   {{SCRIPT_HASHES}} space-separated 'sha256-...' tokens for all inline <script> bodies
 *   {{STYLE_HASHES}}  space-separated 'sha256-...' tokens for all inline <style> bodies
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const tmplPath = path.join(root, '_headers.tmpl');
const rootHeadersPath = path.join(root, '_headers');
const distHeadersPath = path.join(distDir, '_headers');

// Step 1: Read and validate template
if (!fs.existsSync(tmplPath)) {
    console.error('inject-csp-hashes: _headers.tmpl not found — cannot inject hashes.');
    process.exit(1);
}

const tmpl = fs.readFileSync(tmplPath, 'utf8');

if (tmpl.includes("'unsafe-inline'")) {
    console.error(
        "inject-csp-hashes: Template contains 'unsafe-inline' — remove before proceeding."
    );
    process.exit(1);
}

// Step 2: Walk dist HTML files
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

// Steps 3-4: Extract inline blocks and compute hashes
const scriptHashes = new Set();
const styleHashes = new Set();

const INLINE_SCRIPT_RE = /<script([^>]*)>([\s\S]*?)<\/script>/g;
const INLINE_STYLE_RE = /<style[^>]*>([\s\S]*?)<\/style>/g;

function sha256b64(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('base64');
}

for (const htmlFile of htmlFiles) {
    const html = fs.readFileSync(htmlFile, 'utf8');

    // Inline scripts: skip if attrs has src= or type="application/ld+json"
    let m;
    INLINE_SCRIPT_RE.lastIndex = 0;
    while ((m = INLINE_SCRIPT_RE.exec(html)) !== null) {
        const attrs = m[1];
        const body = m[2];
        if (attrs.includes('src=')) continue;
        if (attrs.includes('application/ld+json')) continue;
        const hash = `'sha256-${sha256b64(body)}'`;
        scriptHashes.add(hash);
    }

    // Inline styles — regex has one capture group: body = m[1]
    INLINE_STYLE_RE.lastIndex = 0;
    while ((m = INLINE_STYLE_RE.exec(html)) !== null) {
        const body = m[1];
        const hash = `'sha256-${sha256b64(body)}'`;
        styleHashes.add(hash);
    }
}

// Step 6: Sort for deterministic output
const sortedScriptHashes = Array.from(scriptHashes).sort().join(' ');
const sortedStyleHashes = Array.from(styleHashes).sort().join(' ');

// Step 8: Substitute and validate
let rendered = tmpl
    .replace(/\{\{SCRIPT_HASHES\}\}/g, sortedScriptHashes)
    .replace(/\{\{STYLE_HASHES\}\}/g, sortedStyleHashes);

if (rendered.includes("'unsafe-inline'")) {
    console.error(
        "inject-csp-hashes: Rendered output still contains 'unsafe-inline' — " +
        "template substitution incomplete. Check _headers.tmpl."
    );
    process.exit(1);
}

// Step 9: Write both outputs
fs.writeFileSync(rootHeadersPath, rendered, 'utf8');
fs.writeFileSync(distHeadersPath, rendered, 'utf8');

// Step 10: Print summary
console.log(
    `CSP hashes injected: ${scriptHashes.size} script hash(es), ${styleHashes.size} style hash(es).`
);
console.log('Script hashes:');
for (const h of Array.from(scriptHashes).sort()) {
    console.log(`  ${h}`);
}
console.log('Style hashes:');
for (const h of Array.from(styleHashes).sort()) {
    console.log(`  ${h}`);
}
