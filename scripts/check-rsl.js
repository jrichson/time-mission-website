'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];

const LICENSE_URL = 'https://timemission.com/license.xml';
const LINK_HEADER = `<${LICENSE_URL}>; rel="license"; type="application/rsl+xml"`;

function read(relPath) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) {
    errors.push(`Missing ${relPath}`);
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}

function includesAll(label, body, expected) {
  for (const item of expected) {
    if (!body.includes(item)) errors.push(`${label}: missing ${item}`);
  }
}

function checkLicense(relPath) {
  const body = read(relPath);
  if (!body) return;
  includesAll(relPath, body, [
    '<rsl xmlns="https://rslstandard.org/rsl">',
    '<content url="/">',
    '<permits type="usage">search ai-index ai-input</permits>',
    '<prohibits type="usage">ai-train</prohibits>',
    '<payment type="attribution"/>',
  ]);
}

checkLicense('license.xml');
checkLicense('dist/license.xml');

for (const relPath of ['robots.txt', 'dist/robots.txt']) {
  const body = read(relPath);
  if (body && !body.includes(`License: ${LICENSE_URL}`)) {
    errors.push(`${relPath}: missing RSL License directive`);
  }
}

const headersTmpl = read('_headers.tmpl');
if (headersTmpl) {
  if (!headersTmpl.includes(`Link: ${LINK_HEADER}`)) {
    errors.push('_headers.tmpl: missing RSL Link header');
  }
  if (!headersTmpl.includes('Content-Type: application/rsl+xml; charset=utf-8')) {
    errors.push('_headers.tmpl: missing /license.xml application/rsl+xml content type');
  }
}

const distHeaders = read('dist/_headers');
if (distHeaders) {
  if (!distHeaders.includes(`Link: ${LINK_HEADER}`)) {
    errors.push('dist/_headers: missing RSL Link header');
  }
  if (!distHeaders.includes('Content-Type: application/rsl+xml; charset=utf-8')) {
    errors.push('dist/_headers: missing /license.xml application/rsl+xml content type');
  }
}

if (errors.length) {
  console.error('RSL check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('RSL check passed.');
