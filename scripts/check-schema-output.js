const fs = require('node:fs');
const path = require('node:path');
const { loadAstroRenderedOutputFilesSet } = require('./lib/load-astro-rendered-output-files.cjs');

const root = path.resolve(__dirname, '..');
const errors = [];

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

/** Subset of Astro-rendered routes: excludes pages without mandatory JSON-LD (e.g. thank-you). */
const SCHEMA_CHECK_OUTPUT_FILES = new Set(
  [...loadAstroRenderedOutputFilesSet(root)].filter((f) => f !== 'contact-thank-you.html'),
);

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

  // Pages that must emit BreadcrumbList (legal pages + nav pages with breadcrumb schema)
  const BREADCRUMB_REQUIRED_PATHS = new Set([
    '/contact',
    '/locations',
    '/privacy',
    '/terms',
    '/code-of-conduct',
    '/licensing',
    '/cookies',
    '/accessibility',
    '/waiver',
  ]);
  if (BREADCRUMB_REQUIRED_PATHS.has(cp)) {
    if (!has('BreadcrumbList')) errors.push(`${outFile}: missing BreadcrumbList`);
    if (has('FAQPage')) errors.push(`${outFile}: unexpected FAQPage`);
    if (has('EntertainmentBusiness')) errors.push(`${outFile}: unexpected EntertainmentBusiness`);
  }

  /**
   * Group event landing pages (/groups/<type>) carry Service + per-page
   * FAQPage schema on top of Organization + BreadcrumbList. Each FAQPage
   * mainEntity should match the corresponding section in faqs.json.
   */
  const GROUP_EVENT_PATHS = new Map([
    ['/groups/birthdays', 'birthdays'],
    ['/groups/corporate', 'corporate'],
    ['/groups/private-events', 'private-events'],
    ['/groups/holidays', 'holidays'],
    ['/groups/field-trips', 'field-trips'],
    ['/groups/bachelor-ette', 'bachelor-ette'],
  ]);
  if (GROUP_EVENT_PATHS.has(cp)) {
    if (!has('BreadcrumbList')) errors.push(`${outFile}: missing BreadcrumbList`);
    if (!has('Service')) errors.push(`${outFile}: missing Service node`);
    if (!has('FAQPage')) errors.push(`${outFile}: missing FAQPage`);
    if (has('EntertainmentBusiness')) errors.push(`${outFile}: unexpected EntertainmentBusiness on group page`);
    const expectedFaqId = GROUP_EVENT_PATHS.get(cp);
    const expectedSection = faqsDoc.sections.find((s) => s.id === expectedFaqId);
    const faqNodes = findOne(graph, 'FAQPage');
    const mainLen = faqNodes[0]?.mainEntity?.length;
    if (expectedSection && mainLen !== expectedSection.items.length) {
      errors.push(`${outFile}: FAQPage mainEntity length ${mainLen}, expected ${expectedSection.items.length}`);
    }
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

  // Generalized open-location brand-name assertion: every open + schema-eligible
  // location must emit name starting with "Time Mission " and an optional
  // alternateName matching the source data when present (Phase 10 P0-5/P0-8).
  const openLocationSlugs = locationsDoc.locations
    .filter((l) => l.status === 'open' && l.localBusinessSchemaEligible === true)
    .map((l) => l.slug);
  const slugFromCp = cp.replace(/^\//, '');
  if (openLocationSlugs.includes(slugFromCp)) {
    const sourceLoc = locationsDoc.locations.find((l) => l.slug === slugFromCp);
    const biz = findOne(graph, 'EntertainmentBusiness');
    if (biz.length !== 1) {
      errors.push(`${outFile}: expected one EntertainmentBusiness for open location ${slugFromCp}`);
    } else {
      const b = biz[0];
      if (typeof b.name !== 'string' || !b.name.trim()) {
        errors.push(`${outFile}: EntertainmentBusiness.name missing or empty for ${slugFromCp}`);
      } else if (!b.name.startsWith('Time Mission ')) {
        errors.push(`${outFile}: EntertainmentBusiness.name '${b.name}' must start with 'Time Mission ' (slug=${slugFromCp})`);
      }
      if ('alternateName' in b) {
        if (typeof b.alternateName !== 'string' || !b.alternateName.trim()) {
          errors.push(`${outFile}: EntertainmentBusiness.alternateName present but not a non-empty string (slug=${slugFromCp})`);
        }
      }
      // Cross-check: if source data declares alternateName, emitted JSON-LD must match
      if (sourceLoc && typeof sourceLoc.alternateName === 'string' && sourceLoc.alternateName.trim()) {
        if (b.alternateName !== sourceLoc.alternateName) {
          errors.push(`${outFile}: alternateName drift — emitted='${b.alternateName}' source='${sourceLoc.alternateName}' (slug=${slugFromCp})`);
        }
      }
    }
  }
}

if (errors.length) {
  console.error('Schema output check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`Schema output check passed for ${schemaRoutes.length} Astro-rendered routes.`);
