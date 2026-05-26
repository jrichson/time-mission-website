'use strict';

const crypto = require('node:crypto');

const INLINE_SCRIPT_RE = /<script([^>]*)>([\s\S]*?)<\/script>/g;
const INLINE_STYLE_RE = /<style[^>]*>([\s\S]*?)<\/style>/g;

function sha256b64(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('base64');
}

function collectInlineCspHashes(html) {
  const scriptHashes = new Set();
  const styleHashes = new Set();
  const body = String(html || '');

  let match;
  INLINE_SCRIPT_RE.lastIndex = 0;
  while ((match = INLINE_SCRIPT_RE.exec(body)) !== null) {
    const attrs = match[1];
    const scriptBody = match[2];
    if (attrs.includes('src=')) continue;
    if (attrs.includes('application/ld+json')) continue;
    scriptHashes.add(`'sha256-${sha256b64(scriptBody)}'`);
  }

  INLINE_STYLE_RE.lastIndex = 0;
  while ((match = INLINE_STYLE_RE.exec(body)) !== null) {
    styleHashes.add(`'sha256-${sha256b64(match[1])}'`);
  }

  return { scriptHashes, styleHashes };
}

module.exports = {
  collectInlineCspHashes,
};
