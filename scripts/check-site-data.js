const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const siteDir = path.join(root, 'src', 'data', 'site');
const routesPath = path.join(root, 'src', 'data', 'routes.json');

const errors = [];

function loadJson(relPath) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) {
    errors.push(`Missing file: ${relPath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function collectHrefsNav(nav) {
  const hrefs = [];
  for (const arrName of ['primary', 'groups']) {
    const arr = nav[arrName];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (item && typeof item.href === 'string') hrefs.push(item.href);
    }
  }
  return hrefs;
}

function collectHrefsFooter(footer) {
  const hrefs = [];
  if (!footer.columns || !Array.isArray(footer.columns)) return hrefs;
  for (const col of footer.columns) {
    if (!col.links || !Array.isArray(col.links)) continue;
    for (const link of col.links) {
      if (link && typeof link.href === 'string') hrefs.push(link.href);
    }
  }
  return hrefs;
}

function assertLabelValues(obj, pathPrefix) {
  if (!obj || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== 'string') {
      errors.push(`${pathPrefix}.${k} must be string`);
      continue;
    }
    if (!/^[A-Z0-9_]+$/.test(v)) {
      errors.push(`${pathPrefix}.${k} must match /^[A-Z0-9_]+$/`);
    }
  }
}

const routesData = loadJson(path.relative(root, routesPath));
if (!routesData || errors.length) {
  console.error('Site data check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

const canonicalSet = new Set(
  (routesData.routes || []).map((r) => r.canonicalPath).filter(Boolean),
);
canonicalSet.add('/');

const nav = loadJson('src/data/site/navigation.json');
const footer = loadJson('src/data/site/footer.json');
const labels = loadJson('src/data/site/analytics-labels.json');

if (!nav || !footer || !labels) {
  console.error('Site data check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

for (const href of [...collectHrefsNav(nav), ...collectHrefsFooter(footer)]) {
  if (!href.startsWith('/')) {
    errors.push(`href must be internal path: ${href}`);
    continue;
  }
  if (href.indexOf('.html') !== -1) {
    errors.push(`href must not use .html: ${href}`);
  }
  if (!canonicalSet.has(href)) {
    errors.push(`href not in route registry: ${href}`);
  }
}

assertLabelValues(labels.eventNames, 'eventNames');
assertLabelValues(labels.parameters, 'parameters');

const groups = loadJson('src/data/site/groups.json');
const missions = loadJson('src/data/site/missions.json');
const faqs = loadJson('src/data/site/faqs.json');
const seo = loadJson('src/data/site/seo-defaults.json');

if (!groups || !missions || !faqs || !seo) {
  console.error('Site data check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

if (!groups.items || !Array.isArray(groups.items)) {
  errors.push('groups.json must have items array');
} else {
  for (const item of groups.items) {
    if (!item.id || !item.title || !item.blurb || !item.canonicalPath) {
      errors.push('groups item missing required field');
    }
    if (item.canonicalPath && !canonicalSet.has(item.canonicalPath)) {
      errors.push(`groups canonicalPath not in registry: ${item.canonicalPath}`);
    }
  }
}

if (!missions.missions || !Array.isArray(missions.missions)) {
  errors.push('missions.json must have missions array');
} else {
  for (const m of missions.missions) {
    if (!m.id || !m.title || !m.tagline || typeof m.order !== 'number') {
      errors.push('mission entry missing id, title, tagline, or order');
    }
  }
}

if (!faqs.sections || !Array.isArray(faqs.sections)) {
  errors.push('faqs.json must have sections array');
} else {
  function walkFaqText(s) {
    if (typeof s !== 'string') return;
    if (s.indexOf('<') !== -1 || s.indexOf('>') !== -1) {
      errors.push('FAQ text must not contain angle brackets');
    }
  }
  for (const sec of faqs.sections) {
    if (!sec.items || !Array.isArray(sec.items)) continue;
    for (const it of sec.items) {
      walkFaqText(it.q);
      walkFaqText(it.a);
    }
  }
}

if (!seo.siteName || !seo.defaultTitleTemplate || !seo.defaultDescription) {
  errors.push('seo-defaults.json missing siteName, defaultTitleTemplate, or defaultDescription');
}
if (seo.defaultTitleTemplate && seo.defaultTitleTemplate.indexOf('{{') === -1) {
  errors.push('defaultTitleTemplate must include placeholder syntax');
}

if (errors.length) {
  console.error('Site data check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Site data check passed.');
