const fs = require('node:fs');
const path = require('node:path');
const { loadAstroRenderedOutputFilesSet } = require('./lib/load-astro-rendered-output-files.cjs');
const {
  extractLdScripts,
  findNodesByType,
  typesInGraph,
} = require('./lib/rendered-page-contract');
const {
  isInternalLocation,
  resolveSiteProfile,
} = require('../config/site-profiles.mjs');

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
const locationsDoc = loadJson(fs.existsSync(path.join(root, 'public/data/locations.json')) ? 'public/data/locations.json' : 'data/locations.json');
const orgSeed = loadJson('src/data/site/seo-organization.json');
const profile = resolveSiteProfile(process.env);

const distDir = path.join(root, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('dist/ missing — run npm run build:astro first');
  process.exit(1);
}

function hasTimezoneQualifiedDatetime(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
}

function assertOrg(graph) {
  const orgs = findNodesByType(graph, 'Organization');
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

function assertProfileUrl(outFile, label, value) {
  if (typeof value !== 'string' || !value.startsWith(profile.origin)) {
    errors.push(`${outFile}: ${label} must use ${profile.origin}`);
  }
}

function schemaClockTime(time) {
  return time === '00:00' ? '23:59' : time;
}

function assertGeoMatches(outFile, label, emitted, sourceGeo) {
  if (!sourceGeo) {
    errors.push(`${outFile}: source geo missing for ${label}`);
    return;
  }
  if (emitted?.['@type'] !== 'GeoCoordinates') {
    errors.push(`${outFile}: missing GeoCoordinates for ${label}`);
    return;
  }
  if (emitted.latitude !== sourceGeo.latitude) {
    errors.push(`${outFile}: geo.latitude mismatch for ${label}`);
  }
  if (emitted.longitude !== sourceGeo.longitude) {
    errors.push(`${outFile}: geo.longitude mismatch for ${label}`);
  }
}

const schemaRoutes = routesData.routes.filter((route) => {
  if (!SCHEMA_CHECK_OUTPUT_FILES.has(route.outputFile.replace(/^\//, ''))) return false;
  const location = (locationsDoc.locations || []).find(({ slug, id }) => {
    const locationPath = `/${slug || id}`;
    return route.canonicalPath === locationPath
      || route.canonicalPath.startsWith(`${locationPath}/`);
  });
  return !location || isInternalLocation(location, profile);
});

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

  for (const breadcrumb of findNodesByType(graph, 'BreadcrumbList')) {
    for (const item of breadcrumb.itemListElement || []) {
      assertProfileUrl(outFile, 'BreadcrumbList item', item.item);
    }
  }
  for (const business of findNodesByType(graph, 'EntertainmentBusiness')) {
    assertProfileUrl(outFile, 'EntertainmentBusiness @id', business['@id']);
    assertProfileUrl(outFile, 'EntertainmentBusiness url', business.url);
  }
  for (const service of findNodesByType(graph, 'Service')) {
    assertProfileUrl(outFile, 'Service @id', service['@id']);
    assertProfileUrl(outFile, 'Service url', service.url);
  }
  for (const website of findNodesByType(graph, 'WebSite')) {
    assertProfileUrl(outFile, 'WebSite @id', website['@id']);
    assertProfileUrl(outFile, 'WebSite url', website.url);
  }
  for (const image of findNodesByType(graph, 'ImageObject')) {
    assertProfileUrl(outFile, 'ImageObject @id', image['@id']);
  }
  for (const video of findNodesByType(graph, 'VideoObject')) {
    assertProfileUrl(outFile, 'VideoObject @id', video['@id']);
  }

  if (has('FAQPage')) {
    errors.push(`${outFile}: FAQPage schema is intentionally disabled for current Google rich-result eligibility`);
  }

  if (cp === '/' || cp === '/about') {
    if (has('BreadcrumbList')) errors.push(`${outFile}: home/about should not emit BreadcrumbList`);
    if (has('EntertainmentBusiness')) errors.push(`${outFile}: unexpected EntertainmentBusiness`);
    if (types.filter((t) => t === 'Organization').length !== 1) errors.push(`${outFile}: expected Organization only`);
  }
  if (cp === '/') {
    if (!has('ImageObject')) errors.push(`${outFile}: missing ImageObject for primary hero media`);
    for (const video of findNodesByType(graph, 'VideoObject')) {
      if (typeof video.uploadDate !== 'string' || !video.uploadDate.trim()) {
        errors.push(`${outFile}: VideoObject missing uploadDate`);
      } else if (!hasTimezoneQualifiedDatetime(video.uploadDate)) {
        errors.push(`${outFile}: VideoObject uploadDate must include full datetime and timezone`);
      }
    }
  }
  if (cp === '/about') {
    if (has('ImageObject') || has('VideoObject')) {
      errors.push(`${outFile}: about page should not emit homepage media schema`);
    }
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
    if (has('EntertainmentBusiness')) errors.push(`${outFile}: unexpected EntertainmentBusiness`);
  }

  /**
   * Group event landing pages (/groups/<type>) carry Service schema on top
   * of Organization + BreadcrumbList. Visible FAQs stay on-page, but FAQPage
   * JSON-LD is intentionally omitted because Google restricts FAQ rich results.
   */
  const GROUP_EVENT_PATHS = new Set([
    '/groups/birthdays',
    '/groups/corporate',
    '/groups/private-events',
    '/groups/holidays',
    '/groups/field-trips',
    '/groups/bachelor-ette',
  ]);
  if (GROUP_EVENT_PATHS.has(cp)) {
    if (!has('BreadcrumbList')) errors.push(`${outFile}: missing BreadcrumbList`);
    if (!has('Service')) errors.push(`${outFile}: missing Service node`);
    if (has('EntertainmentBusiness')) errors.push(`${outFile}: unexpected EntertainmentBusiness on group page`);
  }

  if (cp === '/faq') {
    if (has('EntertainmentBusiness')) errors.push(`${outFile}: unexpected EntertainmentBusiness`);
  }

  if (cp === '/philadelphia') {
    const loc = locationsDoc.locations.find((l) => l.slug === 'philadelphia');
    if (!loc) errors.push('philadelphia missing from data/locations.json');
    if (!has('BreadcrumbList')) errors.push(`${outFile}: missing BreadcrumbList`);
    const biz = findNodesByType(graph, 'EntertainmentBusiness');
    const expectBiz = loc.status === 'open' && loc.localBusinessSchemaEligible === true;
    if (!expectBiz) {
      if (biz.length !== 0) errors.push(`${outFile}: unexpected EntertainmentBusiness`);
    } else if (biz.length !== 1) {
      errors.push(`${outFile}: expected one EntertainmentBusiness`);
    } else {
      const b = biz[0];
      const expectStreet = [loc.address.line1, loc.address.line2].filter(Boolean).join(', ');
      if (b.address?.streetAddress !== expectStreet) errors.push(`${outFile}: streetAddress mismatch`);
      if (b.address?.addressLocality !== loc.address.city) errors.push(`${outFile}: city mismatch`);
      if (b.address?.postalCode !== loc.address.zip) errors.push(`${outFile}: zip mismatch`);
      if (b.address?.addressCountry !== loc.countryCode) errors.push(`${outFile}: country code mismatch`);
      if (b.telephone !== loc.phoneE164) errors.push(`${outFile}: telephone should use E.164 phoneE164`);
      if (b.hasMap !== loc.mapUrl) errors.push(`${outFile}: hasMap should match mapUrl`);
      assertGeoMatches(outFile, 'philadelphia', b.geo, loc.geo);
      if (b.parentOrganization?.['@id'] !== orgSeed['@id']) errors.push(`${outFile}: parentOrganization should point to Organization`);
      const hours = b.openingHoursSpecification;
      if (!Array.isArray(hours) || hours.length !== 7) {
        errors.push(`${outFile}: expected 7 openingHoursSpecification entries`);
      } else if (hours.some((h) => h.opens === '00:00' || h.closes === '00:00')) {
        errors.push(`${outFile}: openingHoursSpecification should normalize 00:00 to 23:59`);
      }
    }
  }

  // Open schema-eligible locations must preserve brand naming and optional alternate names.
  const openLocationSlugs = locationsDoc.locations
    .filter((l) => l.status === 'open' && l.localBusinessSchemaEligible === true)
    .map((l) => l.slug);
  const slugFromCp = cp.replace(/^\//, '');
  if (openLocationSlugs.includes(slugFromCp)) {
    const sourceLoc = locationsDoc.locations.find((l) => l.slug === slugFromCp);
    const biz = findNodesByType(graph, 'EntertainmentBusiness');
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
      if (sourceLoc && typeof sourceLoc.alternateName === 'string' && sourceLoc.alternateName.trim()) {
        if (b.alternateName !== sourceLoc.alternateName) {
          errors.push(`${outFile}: alternateName drift — emitted='${b.alternateName}' source='${sourceLoc.alternateName}' (slug=${slugFromCp})`);
        }
      }
      if (sourceLoc?.countryCode && b.address?.addressCountry !== sourceLoc.countryCode) {
        errors.push(`${outFile}: addressCountry should use ISO countryCode for ${slugFromCp}`);
      }
      if (sourceLoc?.phoneE164 && b.telephone !== sourceLoc.phoneE164) {
        errors.push(`${outFile}: telephone should use phoneE164 for ${slugFromCp}`);
      }
      if (sourceLoc?.mapUrl && b.hasMap !== sourceLoc.mapUrl) {
        errors.push(`${outFile}: hasMap should match mapUrl for ${slugFromCp}`);
      }
      assertGeoMatches(outFile, slugFromCp, b.geo, sourceLoc?.geo);
      if (b.parentOrganization?.['@id'] !== orgSeed['@id']) {
        errors.push(`${outFile}: parentOrganization should point to Organization for ${slugFromCp}`);
      }
      const expectedHours = Object.entries(sourceLoc.hours || {}).filter(
        ([, h]) => h && typeof h.open === 'string' && typeof h.close === 'string',
      );
      const gotHours = Array.isArray(b.openingHoursSpecification) ? b.openingHoursSpecification : [];
      for (let i = 0; i < expectedHours.length; i += 1) {
        const [, sourceHours] = expectedHours[i];
        const emitted = gotHours[i];
        if (emitted?.opens !== schemaClockTime(sourceHours.open) || emitted?.closes !== schemaClockTime(sourceHours.close)) {
          errors.push(`${outFile}: normalized hours mismatch at index ${i} for ${slugFromCp}`);
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
