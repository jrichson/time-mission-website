'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];

const locationsRaw = fs.readFileSync(path.join(root, 'data', 'locations.json'), 'utf8');
const { locations } = JSON.parse(locationsRaw);

const manifestRaw = fs.readFileSync(
  path.join(root, 'src', 'data', 'site', 'astro-rendered-output-files.json'),
  'utf8',
);
const { outputFiles } = JSON.parse(manifestRaw);

const distDir = path.join(root, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('check-hreflang-cluster failed:');
  console.error('- dist/ does not exist — run `npm run build:astro` first');
  process.exit(1);
}

const locationSlugByFile = new Map();
for (const loc of locations) {
  const expected = typeof loc.hreflang === 'string' && loc.hreflang.length > 0 ? loc.hreflang : 'en';
  locationSlugByFile.set(`${loc.slug}.html`, { slug: loc.slug, expected });
}

let validated = 0;

for (const relPath of outputFiles) {
  const distPath = path.join(distDir, relPath);
  if (!fs.existsSync(distPath)) {
    errors.push(`${relPath}: file missing from dist/ — manifest claims it should be Astro-rendered`);
    continue;
  }
  const html = fs.readFileSync(distPath, 'utf8');

  // Per-route <html lang> assertion
  const langMatch = html.match(/<html\s[^>]*\blang\s*=\s*"([^"]+)"/i);
  const actualLang = langMatch ? langMatch[1] : null;

  let expectedLang;
  if (locationSlugByFile.has(relPath)) {
    expectedLang = locationSlugByFile.get(relPath).expected;
  } else {
    expectedLang = 'en';
  }

  if (actualLang !== expectedLang) {
    errors.push(
      `${relPath}: expected <html lang="${expectedLang}"> but found ${actualLang ? `lang="${actualLang}"` : 'no lang attribute'}`,
    );
  }

  // D-02 (locked): no cross-cluster <link rel="alternate" hreflang> tags allowed.
  // Different cities are not language alternates per Google docs — emitting these is incorrect SEO.
  const linkAlternateRegex = /<link\s+[^>]*rel\s*=\s*"alternate"[^>]*hreflang\s*=/gi;
  if (linkAlternateRegex.test(html)) {
    errors.push(
      `${relPath}: emits <link rel="alternate" hreflang> tag (forbidden per locked decision D-02 — different cities are not language alternates per Google docs)`,
    );
  }

  validated += 1;
}

if (errors.length > 0) {
  console.error('check-hreflang-cluster failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`check-hreflang-cluster passed: ${validated} files validated, 0 cross-cluster hreflang violations.`);
