'use strict';

require('tsx/cjs/api').register();

/**
 * Verifies SSR ticket panel wiring and drift guards for the compiled site contract.
 */
const fs = require('node:fs');
const path = require('node:path');
const { loadTicketOptions } = require('./lib/derive-ticket-options-from-locations.ts');
const { getPublicSiteContract } = require('../src/lib/site-contract.ts');
const { locationsFingerprintFromRecords } = require('../src/lib/locations-fingerprint.ts');
const { ticketPanelSelectOptions } = require('../src/lib/ticket-options.ts');
const { fingerprintAnalyticsLabels } = require('./lib/analytics-labels-fingerprint.cjs');
const { loadAstroRenderedOutputFilesSet } = require('./lib/load-astro-rendered-output-files.cjs');

const root = path.resolve(__dirname, '..');
const errors = [];
let astroRendered = new Set();

function walkFiles(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, predicate, out);
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

try {
  astroRendered = loadAstroRenderedOutputFilesSet(root);
  if (astroRendered.size < 1) {
    errors.push('astro-rendered-output-files.json outputFiles array must not be empty');
  }
} catch (e) {
  errors.push(`Astro rendered manifest unreadable: ${e.message}`);
}

const analyticsPath = path.join(root, 'src', 'data', 'site', 'analytics-labels.json');

const locJsonPath = path.join(root, 'data', 'locations.json');
let locDoc;
try {
  locDoc = JSON.parse(fs.readFileSync(locJsonPath, 'utf8'));
} catch (e) {
  errors.push(`data/locations.json: ${e.message}`);
  locDoc = { locations: [] };
}

const fromCanonical = ticketPanelSelectOptions(locDoc.locations || []);
const fromLoader = loadTicketOptions(root);
if (JSON.stringify(fromCanonical) !== JSON.stringify(fromLoader)) {
  errors.push(
    'ticket options: canonical ticketPanelSelectOptions !== loadTicketOptions(data/locations.json)',
  );
}

const publicContract = getPublicSiteContract();
const fpFromJson = locationsFingerprintFromRecords(locDoc.locations || []);
if (publicContract.locationsFingerprint !== fpFromJson) {
  errors.push('locationsFingerprint must match data/locations.json roster (see locations-fingerprint.ts)');
}
const locationIds = (locDoc.locations || []).map((loc) => loc.id);
if (JSON.stringify(publicContract.locationIds) !== JSON.stringify(locationIds)) {
  errors.push('public site contract locationIds must match data/locations.json order');
}
const externalLocationIds = (locDoc.locations || []).filter((loc) => loc.externalUrl).map((loc) => loc.id);
if (JSON.stringify(publicContract.externalLocationIds) !== JSON.stringify(externalLocationIds)) {
  errors.push('public site contract externalLocationIds must match data/locations.json externalUrl rows');
}
const externalLocations = (locDoc.locations || []).filter((loc) => loc.externalUrl);
const sourceLinkFiles = [
  ...walkFiles(path.join(root, 'src', 'components'), (file) => file.endsWith('.astro')),
  ...walkFiles(path.join(root, 'src', 'pages'), (file) => file.endsWith('.astro') || file.endsWith('.ts')),
  ...walkFiles(path.join(root, 'src', 'partials'), (file) => file.endsWith('.frag.txt')),
];
for (const filePath of sourceLinkFiles) {
  const src = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(root, filePath);
  for (const loc of externalLocations) {
    const slug = loc.slug || loc.id;
    if (src.includes(`href="/${slug}"`)) {
      errors.push(`${relPath}: ${slug} UI link must point to ${loc.externalUrl}`);
    }
  }
}
if (!publicContract.booking || publicContract.booking.locationPromptRequired !== true) {
  errors.push('public site contract must mark booking.locationPromptRequired=true');
}
if (!publicContract.runtime || publicContract.runtime.locationChangeEvent !== 'tm:location-changed') {
  errors.push('public site contract must publish the location change event name');
}

const ticketPanelPath = path.join(root, 'src', 'components', 'TicketPanel.astro');
const ticketPanelSrc = fs.readFileSync(ticketPanelPath, 'utf8');

if (!ticketPanelSrc.includes("../lib/site-contract") && !ticketPanelSrc.includes('../lib/ticket-options')) {
  errors.push('TicketPanel.astro must import ticket options from site-contract or ticket-options');
}
if (!ticketPanelSrc.includes('ticketPanelSelectOptions')) {
  errors.push('TicketPanel.astro must call ticketPanelSelectOptions');
}
if (!ticketPanelSrc.includes('allLocations')) {
  errors.push('TicketPanel.astro must derive options from allLocations');
}

const siteScriptsPath = path.join(root, 'src', 'components', 'SiteScripts.astro');
const siteScriptsSrc = fs.readFileSync(siteScriptsPath, 'utf8');
if (!siteScriptsSrc.includes('getPublicSiteContract')) {
  errors.push('SiteScripts.astro must expose getPublicSiteContract (installSiteContract bootstrap)');
}
if (!siteScriptsSrc.includes('__TM_SITE_CONTRACT__')) {
  errors.push('SiteScripts.astro must set window.__TM_SITE_CONTRACT__');
}

const siteContractPath = path.join(root, 'src', 'lib', 'site-contract.ts');
const siteContractSrc = fs.readFileSync(siteContractPath, 'utf8');
if (!siteContractSrc.includes('locationsFingerprint')) {
  errors.push('site-contract.ts must embed locationsFingerprint in PublicSiteContract');
}

for (const relPath of ['gift-cards.html', 'groups.html', 'missions.html']) {
  if (!astroRendered.has(relPath)) {
    errors.push(`${relPath}: migrated route must be rendered by Astro`);
  }
}

for (const relPath of [
  'src/partials/gift-cards-main.frag.txt',
  'src/partials/groups-main.frag.txt',
  'src/partials/missions-main.frag.txt',
]) {
  const htmlPath = path.join(root, relPath);
  if (!fs.existsSync(htmlPath)) continue;
  const html = fs.readFileSync(htmlPath, 'utf8');
  const bySlug = new Map((locDoc.locations || []).map((loc) => [loc.slug || loc.id, loc]));
  for (const slug of ['antwerp', 'brussels']) {
    const loc = bySlug.get(slug);
    if (loc && loc.externalUrl && html.includes(`href="/${slug}"`)) {
      errors.push(`${relPath}: ${slug} link must point to ${loc.externalUrl}`);
    }
    if (loc && !loc.externalUrl && html.includes(`href="https://timemission.eu/${slug}"`)) {
      errors.push(`${relPath}: ${slug} link must stay local because no live externalUrl is configured`);
    }
  }
}

for (const relPath of ['src/partials/groups-main.frag.txt']) {
  const htmlPath = path.join(root, relPath);
  if (!fs.existsSync(htmlPath)) continue;
  const html = fs.readFileSync(htmlPath, 'utf8');
  for (const groupType of ['birthdays', 'corporate', 'field-trips', 'bachelor-ette', 'private-events', 'holidays']) {
    if (!html.includes(`data-tm-booking-kind="groups" data-tm-group-type="${groupType}"`)) {
      errors.push(`${relPath}: ${groupType} card CTAs must resolve through the selected location group form`);
    }
  }
  const eventCardTicketCtas = html.match(/class="event-type-cta btn-tickets" data-tm-booking-trigger data-tm-booking-kind="tickets"/g) || [];
  if (eventCardTicketCtas.length < 6) {
    errors.push(`${relPath}: group event card Book Now CTAs must resolve through the standard ticket booking flow`);
  }
  if (/formsubmit\.co|class="inquiry-form"|id="inquiry"/.test(html)) {
    errors.push(`${relPath}: embedded group inquiry form must not be rendered`);
  }
  if (/href="\/contact\?type=/.test(html)) {
    errors.push(`${relPath}: group CTAs must open the booking panel instead of bypassing location-aware group forms`);
  }
}

const analyticsJson = fs.readFileSync(analyticsPath, 'utf8');
let analyticsParsed;
try {
  analyticsParsed = JSON.parse(analyticsJson);
} catch (e) {
  errors.push('analytics-labels.json must be valid JSON: ' + e.message);
}

if (siteContractSrc && !siteContractSrc.includes('analytics-labels.json')) {
  errors.push('site-contract.ts must import analytics labels from analytics-labels.json');
}
if (siteContractSrc && !siteContractSrc.includes('fingerprintAnalyticsLabels')) {
  errors.push('site-contract.ts must call fingerprintAnalyticsLabels for public analytics fingerprint');
}
if (siteContractSrc && !siteContractSrc.includes('externalLocationIds')) {
  errors.push('site-contract.ts must publish externalLocationIds for booking/location runtime checks');
}

if (
  analyticsParsed &&
  typeof analyticsParsed.eventNames === 'object' &&
  typeof analyticsParsed.parameters === 'object'
) {
  const fp = fingerprintAnalyticsLabels(analyticsParsed);
  if (!/^[0-9a-f]{8}$/.test(fp)) {
    errors.push('analytics labels fingerprint produced unexpected shape');
  }
} else if (analyticsParsed) {
  errors.push('analytics-labels.json must define eventNames and parameters objects');
}

if (fromCanonical.length < 1) {
  errors.push('locations.json produced no ticket options');
}

if (errors.length) {
  console.error('Site contract check failed:');
  for (const e of errors) console.error('- ' + e);
  process.exit(1);
}

console.log(
  `Site contract check passed (${fromCanonical.length} ticket options; fingerprint + analytics ready).`,
);
