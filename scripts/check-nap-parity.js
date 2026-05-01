const fs = require('node:fs');
const path = require('node:path');
const { loadAstroRenderedOutputFilesSet } = require('./lib/load-astro-rendered-output-files.cjs');

const root = path.resolve(__dirname, '..');
const errors = [];

const ASTRO_RENDERED_OUTPUT_FILES = loadAstroRenderedOutputFilesSet(root);

const locationsDoc = JSON.parse(fs.readFileSync(path.join(root, 'data/locations.json'), 'utf8'));
const routesData = JSON.parse(fs.readFileSync(path.join(root, 'src/data/routes.json'), 'utf8'));
const baseUrl = routesData.baseUrl;

const dayOfWeekMap = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const distDir = path.join(root, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('NAP parity check failed:');
  console.error('- dist/ missing — run npm run build:astro first');
  process.exit(1);
}

function extractLdScripts(html) {
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  return [...html.matchAll(re)].map((m) => m[1].trim());
}

function findEntertainmentBusinessNodes(html) {
  const out = [];
  for (const block of extractLdScripts(html)) {
    if (!block.includes('EntertainmentBusiness')) continue;
    let data;
    try {
      data = JSON.parse(block);
    } catch {
      continue;
    }
    if (data['@graph'] && Array.isArray(data['@graph'])) {
      for (const n of data['@graph']) {
        if (n && n['@type'] === 'EntertainmentBusiness') out.push(n);
      }
    } else if (data['@type'] === 'EntertainmentBusiness') {
      out.push(data);
    }
  }
  return out;
}

function expectedHours(loc) {
  return Object.entries(loc.hours || {})
    .filter(([, h]) => h && typeof h.open === 'string' && typeof h.close === 'string')
    .map(([day, h]) => ({
      dayOfWeek: dayOfWeekMap[day] ?? day,
      opens: h.open,
      closes: h.close,
    }));
}

function assertNap(slug, loc, biz, outFile) {
  const prefix = `${slug} (${outFile})`;
  if (biz.name !== loc.name) errors.push(`${prefix}: name mismatch (schema "${biz.name}" vs source "${loc.name}")`);
  const expectUrl = `${baseUrl}/${slug}`;
  if (biz.url !== expectUrl) errors.push(`${prefix}: url mismatch`);
  const expectStreet = [loc.address.line1, loc.address.line2].filter(Boolean).join(', ');
  if (biz.address?.streetAddress !== expectStreet) {
    errors.push(`${prefix}: streetAddress mismatch`);
  }
  if (biz.address?.addressLocality !== loc.address.city) {
    errors.push(`${prefix}: addressLocality mismatch`);
  }
  if (biz.address?.postalCode !== loc.address.zip) {
    errors.push(`${prefix}: postalCode mismatch`);
  }
  const expectCountry = loc.countryCode ?? loc.address.country;
  if (biz.address?.addressCountry !== expectCountry) {
    errors.push(`${prefix}: addressCountry mismatch`);
  }
  if (loc.address.state && String(loc.address.state).trim()) {
    if (biz.address?.addressRegion !== loc.address.state) {
      errors.push(`${prefix}: addressRegion mismatch`);
    }
  }
  const expectPhone = loc.phoneE164 ?? loc.contact?.phone ?? '';
  if ((biz.telephone ?? '') !== expectPhone) {
    errors.push(`${prefix}: telephone mismatch`);
  }
  const expectEmail = loc.contact?.email ?? '';
  if ((biz.email ?? '') !== expectEmail) {
    errors.push(`${prefix}: email mismatch`);
  }
  const expHours = expectedHours(loc);
  const got = biz.openingHoursSpecification;
  if (!Array.isArray(got) || got.length !== expHours.length) {
    errors.push(`${prefix}: openingHoursSpecification length ${got?.length}, expected ${expHours.length}`);
    return;
  }
  for (let i = 0; i < expHours.length; i++) {
    const e = expHours[i];
    const g = got[i];
    if (g.dayOfWeek !== e.dayOfWeek) errors.push(`${prefix}: hours[${i}] dayOfWeek mismatch`);
    if (g.opens !== e.opens) errors.push(`${prefix}: hours[${i}] opens mismatch`);
    if (g.closes !== e.closes) errors.push(`${prefix}: hours[${i}] closes mismatch`);
  }
}

const locationSlugSet = new Set(locationsDoc.locations.map((l) => l.slug));
const locationRoutes = routesData.routes.filter((r) => {
  const out = r.outputFile.replace(/^\//, '');
  const slug = r.canonicalPath.replace(/^\//, '');
  return ASTRO_RENDERED_OUTPUT_FILES.has(out) && locationSlugSet.has(slug);
});

let count = 0;
for (const route of locationRoutes) {
  const slug = route.canonicalPath.replace(/^\//, '');
  const outFile = route.outputFile.replace(/^\//, '');
  const htmlPath = path.join(distDir, outFile);
  if (!fs.existsSync(htmlPath)) {
    errors.push(`Missing dist file ${outFile}`);
    continue;
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const loc = locationsDoc.locations.find((l) => l.slug === slug);
  if (!loc) {
    errors.push(`No location row for slug ${slug}`);
    continue;
  }
  const nodes = findEntertainmentBusinessNodes(html);
  const expectBiz =
    loc.status === 'open' && loc.localBusinessSchemaEligible === true;

  if (expectBiz) {
    if (nodes.length !== 1) {
      errors.push(`${slug}: expected exactly one EntertainmentBusiness, found ${nodes.length}`);
    } else {
      assertNap(slug, loc, nodes[0], outFile);
    }
  } else {
    if (nodes.length !== 0) {
      errors.push(`${slug}: must not emit EntertainmentBusiness (coming-soon or ineligible), found ${nodes.length}`);
    }
  }
  count += 1;
}

if (errors.length) {
  console.error('NAP parity check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`NAP parity check passed for ${count} Astro-rendered locations.`);
