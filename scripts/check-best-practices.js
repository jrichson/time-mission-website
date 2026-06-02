'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { runCheck } = require('./lib/validation-core');

const root = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const includeDist = args.has('--dist');

const SKIP_DIRS = new Set([
  '.git',
  '.claude',
  '.codex',
  '.agents',
  'node_modules',
  'playwright-report',
  'test-results',
]);

const TEXT_EXTENSIONS = new Set([
  '.astro',
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
]);

const DIST_SCAN_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.map',
  '.txt',
  '.xml',
]);

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function walk(relDir, files = [], options = {}) {
  const abs = path.join(root, relDir);
  if (!fs.existsSync(abs)) return files;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('static_analysis_codeql_')) continue;
    const rel = path.join(relDir, entry.name);
    if (entry.isDirectory()) {
      walk(rel, files, options);
      continue;
    }
    if (options.extensions && !options.extensions.has(path.extname(rel))) continue;
    files.push(rel);
  }
  return files;
}

function textFiles(relDir) {
  return walk(relDir).filter((rel) => TEXT_EXTENSIONS.has(path.extname(rel)));
}

function requireIncludes(errors, content, label, needles) {
  for (const needle of needles) {
    if (!content.includes(needle)) errors.push(`${label}: missing ${needle}`);
  }
}

function checkHeaders(errors, rel) {
  const headers = read(rel);
  requireIncludes(errors, headers, rel, [
    'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options: nosniff',
    'X-Frame-Options: SAMEORIGIN',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'Permissions-Policy: camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy:',
    "default-src 'self'",
    "script-src 'self'",
    "script-src-attr 'none'",
    "style-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
  ]);
}

function checkNoDeprecatedSourcePatterns(errors) {
  for (const rel of [
    ...textFiles('js'),
    ...textFiles('src'),
    ...textFiles('functions'),
  ]) {
    const content = read(rel);
    if (/document\.write\s*\(/.test(content)) {
      errors.push(`${rel}: avoid document.write; use dynamic DOM APIs`);
    }
    if (/sourceMappingURL=/.test(content)) {
      errors.push(`${rel}: source map reference must not ship in source-controlled runtime assets`);
    }
  }
}

function checkDistOutput(errors) {
  const distDir = path.join(root, 'dist');
  if (!fs.existsSync(distDir)) {
    errors.push('dist/: missing built output; run npm run build:astro before --dist checks');
    return;
  }

  checkHeaders(errors, 'dist/_headers');
  const distHeaders = read('dist/_headers');
  if (distHeaders.includes("'unsafe-inline'")) {
    errors.push('dist/_headers: CSP hash injection left unsafe-inline in built headers');
  }

  for (const rel of walk('dist', [], { extensions: DIST_SCAN_EXTENSIONS })) {
    if (rel.endsWith('.map')) {
      errors.push(`${rel}: source map files must not be exposed in production output`);
      continue;
    }
    if (!TEXT_EXTENSIONS.has(path.extname(rel))) continue;
    const content = read(rel);
    if (/sourceMappingURL=/.test(content)) {
      errors.push(`${rel}: source map reference must not be exposed in production output`);
    }
    if (rel.endsWith('.html')) {
      const mixedAttr = content.match(/\b(?:action|data-src|href|poster|src)=["']http:\/\/[^"']+/i);
      if (mixedAttr) {
        errors.push(`${rel}: possible mixed-content URL in HTML attribute: ${mixedAttr[0]}`);
      }
    }
  }
}

runCheck({
  title: includeDist ? 'Best practices dist contract' : 'Best practices source contract',
  run(errors) {
    checkHeaders(errors, '_headers.tmpl');
    checkNoDeprecatedSourcePatterns(errors);
    if (includeDist) checkDistOutput(errors);
  },
  onSuccess() {
    return includeDist
      ? 'Best practices dist contract passed.'
      : 'Best practices source contract passed.';
  },
});
