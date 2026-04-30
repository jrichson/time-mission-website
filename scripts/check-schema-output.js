const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

/** keep in sync with scripts/sync-static-to-public.mjs — schema-checked subset (no JSON-LD on thank-you page). */
const SCHEMA_CHECK_OUTPUT_FILES = new Set([
  'index.html',
  'about.html',
  'faq.html',
  'contact.html',
  'privacy.html',
  'locations.html',
  'groups/corporate.html',
  'philadelphia.html',
  'houston.html',
]);

const routesData = loadJson('src/data/routes.json');
const locationsDoc = loadJson('data/locations.json');
const orgSeed = loadJson('src/data/site/seo-organization.json');
const faqsDoc = loadJson('src/data/site/faqs.json');

const faqItemCount = faqsDoc.sections.flatMap((s) => s.items).length;

const distDir = path.join(root, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('dist/ missing — run npm run build:astro first');
  process.exit(1);
}

function extractLdScripts(html) {
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  return [...html.matchAll(re)].map((m) => m[1].trim());
}

function typesInGraph(graph) {
  const types = [];
  if (!graph || graph['@context'] !== 'https://schema.org' || !Array.isArray(graph['@graph'])) {
    return { ok: false, types: [] };
  }
  for (const node of graph['@graph']) {
    if (node && node['@type']) types.push(node['@type']);
  }
  return { ok: true, types };
}

function findOne(nodes, t) {
  return nodes['@graph'].filter((n) => n['@type'] === t);
}

function assertOrg(graph) {
  const orgs = findOne(graph, 'Organization');
  if (orgs.length !== 1) {
    errors.push('expected exactly one Organization');
    return null;
  }
  const o = orgs[0];
  if (o['@id'] !== orgSeed['@id']) {
    errors.push(`Organization @id mismatch: ${o['@id']}`);
  }
  return o;
}

const schemaRoutes = routesData.routes.filter((r) =>
  SCHEMA_CHECK_OUTPUT_FILES.has(r.outputFile.replace(/^\//, '')),
);

for (const route of schemaRoutes) {
  const cp = route.canonicalPath;
  const outFile = route.outputFile.replace(/^\//, '');
  const html = fs.readFileSync(path.join(distDir, outFile), 'utf8');
  const blocks = extractLdScripts(html);
  if (blocks.length === 0) {
    errors.push(`${outFile}: no application/ld+json blocks`);
    continue;
  }
  const graphBlock = blocks.find((b) => b.includes('"@graph"')) || blocks[0];
  let graph;
  try {
    graph = JSON.parse(graphBlock);
  } catch (e) {
    errors.push(`${outFile}: JSON.parse failed — ${e.message}`);
    continue;
  }

  const { ok, types } = typesInGraph(graph);
  if (!ok) {
    errors.push(`${outFile}: invalid @graph shape`);
    continue;
  }

  assertOrg(graph);
  const has = (t) => types.includes(t);

  if (cp === '/' || cp === '/about') {
    if (has('BreadcrumbList')) errors.push(`${outFile}: home/about should not emit BreadcrumbList`);
    if (has('FAQPage')) errors.push(`${outFile}: unexpected FAQPage`);
    if (has('EntertainmentBusiness')) errors.push(`${outFile}: unexpected EntertainmentBusiness`);
    if (types.filter((t) => t === 'Organization').length !== 1) errors.push(`${outFile}: expected Organization only`);
  }

  if (['/contact', '/locations', '/privacy', '/groups/corporate'].includes(cp)) {
    if (!has('BreadcrumbList')) errors.push(`${outFile}: missing BreadcrumbList`);
    if (has('FAQPage')) errors.push(`${outFile}: unexpected FAQPage`);
    if (has('EntertainmentBusiness')) errors.push(`${outFile}: unexpected EntertainmentBusiness`);
  }

  if (cp === '/faq') {
    if (!has('FAQPage')) errors.push(`${outFile}: missing FAQPage`);
    const faqNodes = findOne(graph, 'FAQPage');
    const mainLen = faqNodes[0]?.mainEntity?.length;
    if (mainLen !== faqItemCount) {
      errors.push(`${outFile}: FAQPage mainEntity length ${mainLen}, expected ${faqItemCount}`);
    }
    if (has('EntertainmentBusiness')) errors.push(`${outFile}: unexpected EntertainmentBusiness`);
  }

  if (cp === '/philadelphia') {
    const loc = locationsDoc.locations.find((l) => l.slug === 'philadelphia');
    if (!loc) errors.push('philadelphia missing from data/locations.json');
    if (!has('BreadcrumbList')) errors.push(`${outFile}: missing BreadcrumbList`);
    const biz = findOne(graph, 'EntertainmentBusiness');
    if (biz.length !== 1) {
      errors.push(`${outFile}: expected one EntertainmentBusiness`);
    } else {
      const b = biz[0];
      const expectStreet = [loc.address.line1, loc.address.line2].filter(Boolean).join(', ');
      if (b.address?.streetAddress !== expectStreet) errors.push(`${outFile}: streetAddress mismatch`);
      if (b.address?.addressLocality !== loc.address.city) errors.push(`${outFile}: city mismatch`);
      if (b.address?.postalCode !== loc.address.zip) errors.push(`${outFile}: zip mismatch`);
      const hours = b.openingHoursSpecification;
      if (!Array.isArray(hours) || hours.length !== 7) {
        errors.push(`${outFile}: expected 7 openingHoursSpecification entries`);
      }
    }
  }

  if (cp === '/houston') {
    if (findOne(graph, 'EntertainmentBusiness').length) {
      errors.push(`${outFile}: houston must not emit EntertainmentBusiness`);
    }
    const raw = graphBlock;
    if (raw.includes('openingHoursSpecification')) {
      errors.push(`${outFile}: houston must not contain openingHoursSpecification`);
    }
  }
}

if (errors.length) {
  console.error('Schema output check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`Schema output check passed for ${schemaRoutes.length} Astro-rendered routes.`);
