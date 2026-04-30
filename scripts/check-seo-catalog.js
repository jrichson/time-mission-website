const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

function loadJson(rel) {
  const abs = path.join(root, rel);
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

const routes = loadJson('src/data/routes.json');
const seoRoutes = loadJson('src/data/site/seo-routes.json');
const org = loadJson('src/data/site/seo-organization.json');

const canonicalPaths = routes.routes.map((r) => r.canonicalPath).filter(Boolean);
const routeSet = new Set(canonicalPaths);
const seoKeys = Object.keys(seoRoutes).filter((k) => !k.startsWith('_'));

for (const p of canonicalPaths) {
  if (!(p in seoRoutes)) {
    errors.push(`seo-routes.json missing entry for canonicalPath: ${p}`);
  }
}

for (const k of seoKeys) {
  if (!routeSet.has(k)) {
    errors.push(`orphan seo-routes entry: ${k}`);
  }
}

const REQUIRED = ['title', 'description', 'ogImage', 'twitterImage'];

for (const p of canonicalPaths) {
  const e = seoRoutes[p];
  if (!e || typeof e !== 'object') continue;
  for (const field of REQUIRED) {
    if (typeof e[field] !== 'string' || !e[field].length) {
      errors.push(`${p}: missing or empty ${field}`);
    }
  }
  if (typeof e.title === 'string') {
    const tl = e.title.length;
    if (tl < 1 || tl > 90) errors.push(`${p}: title length must be 1–90 (got ${tl})`);
    else if (tl > 70) warnings.push(`${p}: title length ${tl} exceeds soft limit 70`);
  }
  if (typeof e.description === 'string') {
    const dl = e.description.length;
    if (dl < 1 || dl > 220) errors.push(`${p}: description length must be 1–220 (got ${dl})`);
    else if (dl > 200) warnings.push(`${p}: description length ${dl} exceeds soft limit 200`);
  }
  for (const field of ['title', 'description']) {
    const v = e[field];
    if (typeof v !== 'string') continue;
    if (v.includes('<') || v.includes('>') || v.includes('</script>') || v.includes('\u0000')) {
      errors.push(`${p}: ${field} contains forbidden characters`);
    }
  }
  for (const imgField of ['ogImage', 'twitterImage']) {
    const v = e[imgField];
    if (typeof v !== 'string') continue;
    if (
      v.includes('://') ||
      v.toLowerCase().includes('javascript:') ||
      v.toLowerCase().startsWith('data:') ||
      v.startsWith('..') ||
      !v.startsWith('/assets/')
    ) {
      errors.push(`${p}: ${imgField} must be root-relative /assets/ path without protocol (got ${v})`);
    }
  }
}

if (!org.name || typeof org.name !== 'string') {
  errors.push('seo-organization.json: missing name');
}
if (!org.url || typeof org.url !== 'string' || !org.url.startsWith('https://timemission.com')) {
  errors.push('seo-organization.json: url must start with https://timemission.com');
}
if (!org.logo || typeof org.logo !== 'string' || !org.logo.startsWith('https://timemission.com/')) {
  errors.push('seo-organization.json: logo must be https://timemission.com/...');
}
if (!Array.isArray(org.sameAs) || !org.sameAs.length) {
  errors.push('seo-organization.json: sameAs must be non-empty array');
} else {
  for (const s of org.sameAs) {
    if (typeof s !== 'string' || !s.startsWith('https://')) {
      errors.push(`seo-organization.json: sameAs entries must be https URLs`);
    }
  }
}

for (const w of warnings) console.warn(`WARNING: ${w}`);

if (errors.length) {
  console.error('SEO catalog check failed:');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log(`SEO catalog check passed for ${canonicalPaths.length} routes.`);
