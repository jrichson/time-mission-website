const { expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { fingerprintAnalyticsLabels } = require('../../scripts/lib/analytics-labels-fingerprint.cjs');
const i18nCatalog = require('../../src/data/site/i18n.json');
const { prepareSmokePage } = require('./network');

require('tsx/cjs/api').register();
const { locationsFingerprintFromRecords } = require('../../src/lib/locations-fingerprint.ts');

const REPO_ROOT = path.resolve(__dirname, '../..');
const locationRecords = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data', 'locations.json'), 'utf8')).locations || [];
const locationById = new Map(locationRecords.map((loc) => [loc.id, loc]));
function groupFormUrl(locationId, groupType) {
  return locationById.get(locationId)?.groupFormUrls?.[groupType] || '';
}

function groupCheckoutUrl(locationId, groupType = '') {
  const location = locationById.get(locationId);
  return location?.groupCheckoutUrls?.[groupType] || location?.groupCheckoutUrl || '';
}

function waiverUrl(locationId) {
  return locationById.get(locationId)?.waiverUrl || '';
}

async function prepareSiteSmoke(page) {
  await prepareSmokePage(page);
}

async function gotoHome(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1, name: /Time Mission/i }).waitFor({
    state: 'visible',
    timeout: 15000,
  });
}

async function waitForLanguageRuntime(page, includeLocation = false) {
  await page.waitForFunction(
    (locationRequired) => Boolean(window.TMI18n?.ready && (!locationRequired || window.TM?.ready)),
    includeLocation,
  );
  await page.evaluate(async (locationRequired) => {
    await window.TMI18n.ready;
    if (locationRequired) await window.TM.ready;
  }, includeLocation);
}

function expectUrlToMatch(actualUrl, expectedUrl) {
  if (expectedUrl instanceof RegExp) {
    expect(actualUrl).toMatch(expectedUrl);
    return;
  }
  expect(actualUrl).toBe(expectedUrl);
}

async function expectPopupUrl(page, action, expectedUrl) {
  await page.evaluate(() => {
    if (!window.__tmOpenSpyInstalled) {
      window.__tmNativeWindowOpen = window.open.bind(window);
      window.__tmOpenCalls = [];
      window.open = function tmOpenSpy(url, target, features) {
        window.__tmOpenCalls.push({
          features: features || '',
          target: target || '',
          url: String(url || ''),
        });
        return window.__tmNativeWindowOpen(url, target, features);
      };
      window.__tmOpenSpyInstalled = true;
    }
    window.__tmOpenCalls = [];
  });

  const popupPromise = page.waitForEvent('popup', { timeout: 2000 }).catch(() => null);
  await action();
  const popup = await popupPromise;
  if (popup) {
    await expect(popup).toHaveURL(expectedUrl);
    await popup.close();
    return;
  }

  const openedUrlHandle = await page.waitForFunction(() => {
    const calls = window.__tmOpenCalls || [];
    return calls.length > 0 ? calls[calls.length - 1].url : '';
  }, null, { timeout: 5000 });
  const openedUrl = await openedUrlHandle.jsonValue();
  expectUrlToMatch(openedUrl, expectedUrl);
}

/** Wait for GTM bootstrap push, then read `consent_profile` from `tm_tagging_config`. */
async function readTaggingConsentProfile(page) {
  await page.waitForFunction(() => Array.isArray(window.dataLayer) && window.dataLayer.length > 0);
  return page.evaluate(() => {
    return window.dataLayer.find((entry) => entry && entry.event === 'tm_tagging_config')?.consent_profile || '';
  });
}

module.exports = {
  REPO_ROOT,
  expectPopupUrl,
  fingerprintAnalyticsLabels,
  fs,
  gotoHome,
  groupCheckoutUrl,
  groupFormUrl,
  i18nCatalog,
  locationById,
  locationRecords,
  locationsFingerprintFromRecords,
  path,
  prepareSiteSmoke,
  readTaggingConsentProfile,
  waitForLanguageRuntime,
  waiverUrl,
};
