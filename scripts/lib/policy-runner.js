'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Declarative repo policy checks (architecture laws).
 * @param {string} root
 * @param {object[]} policies
 * @param {string[]} errors
 * @param {Record<string, string>|null} [vfs] when set, read synthetic file contents (tests)
 */
function runPolicies(root, policies, errors, vfs) {
  const cache = {};

  function read(rel) {
    if (cache[rel] !== undefined) return cache[rel];
    if (vfs && Object.prototype.hasOwnProperty.call(vfs, rel)) {
      cache[rel] = vfs[rel];
      return cache[rel];
    }
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      cache[rel] = null;
      return null;
    }
    cache[rel] = fs.readFileSync(abs, 'utf8');
    return cache[rel];
  }

  for (const p of policies) {
    if (p.type === 'marker_order') {
      const rel = p.file;
      if (!rel) continue;
      const text = read(rel);
      if (text === null) {
        errors.push(`Policy ${p.id}: missing file ${rel}`);
        continue;
      }
      for (const rule of p.chain || []) {
        const ia = text.indexOf(rule.after);
        const ib = text.indexOf(rule.before);
        if (ia === -1 || ib === -1 || !(ia < ib)) {
          errors.push(rule.message);
        }
      }
      continue;
    }

    const files = p.files || [];
    for (const rel of files) {
      const text = read(rel);
      if (text === null) {
        errors.push(`Policy ${p.id}: missing file ${rel}`);
        continue;
      }
      if (p.type === 'forbidden_regex' && p.pattern.test(text)) {
        errors.push(p.message);
      }
      if (p.type === 'required_substring' && !text.includes(p.needle)) {
        errors.push(p.message);
      }
      if (p.type === 'forbidden_substring' && text.includes(p.needle)) {
        errors.push(p.message);
      }
    }
  }
}

module.exports = { runPolicies };
