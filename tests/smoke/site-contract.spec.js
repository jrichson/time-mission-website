const { test, expect } = require('@playwright/test');
const {
  REPO_ROOT,
  expectPopupUrl,
  fingerprintAnalyticsLabels,
  fs,
  gotoHome,
  groupFormUrl,
  i18nCatalog,
  locationById,
  locationsFingerprintFromRecords,
  path,
  prepareSiteSmoke,
  readTaggingConsentProfile,
  waiverUrl,
} = require('./site-helpers');

test.beforeEach(async ({ page }) => {
  await prepareSiteSmoke(page);
});

test('embedded site contract analytics slice matches analytics-labels.json', async ({ page }) => {
  const labelsPath = path.join(REPO_ROOT, 'src', 'data', 'site', 'analytics-labels.json');
  const labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
  const expectedFp = fingerprintAnalyticsLabels(labels);
  const expectedEventNames = Object.keys(labels.eventNames).length;
  const expectedParams = Object.keys(labels.parameters).length;

  await page.goto('/');
  const got = await page.evaluate(() => {
    const c = window.__TM_SITE_CONTRACT__;
    return c && c.analytics ? c.analytics : null;
  });
  expect(got).toBeTruthy();
  expect(got.fingerprint).toBe(expectedFp);
  expect(got.eventNameCount).toBe(expectedEventNames);
  expect(got.parameterCount).toBe(expectedParams);
});

test('embedded site contract locationsFingerprint matches data/locations.json roster', async ({ page }) => {
  const locDoc = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data', 'locations.json'), 'utf8'));
  const expected = locationsFingerprintFromRecords(locDoc.locations || []);

  await page.goto('/');
  const got = await page.evaluate(() =>
    window.__TM_SITE_CONTRACT__ ? window.__TM_SITE_CONTRACT__.locationsFingerprint : null
  );
  expect(got).toBe(expected);
  expect(typeof got).toBe('string');
  expect(got.length).toBe(8);
});
