'use strict';

const fs = require('node:fs');
const path = require('node:path');

function loadJson(root, relPath) {
  const abs = path.join(root, relPath);
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function stripQueryAndHash(value) {
  return String(value || '').split('#')[0].split('?')[0];
}

function normalizeCanonicalPath(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let result = stripQueryAndHash(raw.trim());
  if (result.startsWith('https://timemission.com')) {
    result = result.slice('https://timemission.com'.length);
  } else if (result.startsWith('http://timemission.com')) {
    result = result.slice('http://timemission.com'.length);
  }
  if (!result.startsWith('/')) result = `/${result}`;
  if (result.length > 1 && result.endsWith('/')) result = result.slice(0, -1);
  return result;
}

function walkHtmlFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHtmlFiles(full, files);
    } else if (entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

function listDeployableHtmlPages(root) {
  return walkHtmlFiles(root).filter((filePath) => {
    const relative = path.relative(root, filePath);
    return !relative.startsWith('assets/')
      && !relative.startsWith('ads/')
      && !relative.startsWith('components/')
      && !relative.startsWith('dist/')
      && !relative.startsWith('public/');
  });
}

function printCheckErrors(title, errors) {
  if (!errors.length) return;
  console.error(`${title} failed:`);
  for (const error of errors) console.error(`- ${error}`);
}

function runCheck({ title, run, onSuccess }) {
  const errors = [];
  run(errors);
  if (errors.length) {
    printCheckErrors(title, errors);
    process.exit(1);
  }
  if (typeof onSuccess === 'function') {
    console.log(onSuccess());
    return;
  }
  console.log(`${title} passed.`);
}

module.exports = {
  loadJson,
  stripQueryAndHash,
  normalizeCanonicalPath,
  listDeployableHtmlPages,
  printCheckErrors,
  runCheck,
};
