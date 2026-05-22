/**
 * Location storage architecture guard.
 * Asserts that ONLY js/locations.js writes the canonical or legacy location
 * storage keys. If any other file in js/, src/, or root *.html contains a
 * matching localStorage.setItem(...) call, fail.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const allowed = path.join('js', 'locations.js');
const writePattern = /localStorage\s*\.\s*setItem\s*\(\s*['"](tm_location|timeMissionLocation)['"]/;

function walk(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (/\.(js|astro|html|ts|mjs|cjs)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const candidates = [
  ...walk(path.join(root, 'js'), []),
  ...walk(path.join(root, 'src'), []),
  ...fs.readdirSync(root)
    .filter((f) => f.endsWith('.html'))
    .map((f) => path.join(root, f)),
];

const errors = [];
for (const file of candidates) {
  const rel = path.relative(root, file);
  if (rel === allowed) continue;
  let src;
  try { src = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  const lines = src.split('\n');
  lines.forEach((line, idx) => {
    if (writePattern.test(line)) {
      errors.push(`${rel}:${idx + 1} writes a reserved location storage key — only js/locations.js may do this`);
    }
  });
}

if (errors.length) {
  console.error('Locations architecture check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`Locations architecture check passed. Single writer: ${allowed}`);
