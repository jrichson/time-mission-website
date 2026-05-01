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

try {
  const astroRendered = loadAstroRenderedOutputFilesSet(root);
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
