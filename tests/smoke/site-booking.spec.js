const { test, expect } = require('@playwright/test');
const {
  REPO_ROOT,
  expectPopupUrl,
  fingerprintAnalyticsLabels,
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

test('ticket panel options hydrate from location data', async ({ page }) => {
  await page.goto('/');

  const expectedCount = await page.evaluate(() =>
    typeof window.__TM_SITE_CONTRACT__ === 'object' && window.__TM_SITE_CONTRACT__
      ? window.__TM_SITE_CONTRACT__.ticketOptionCount
      : 0
  );
  expect(expectedCount).toBeGreaterThan(0);

  await page.locator('.hero-cta .btn-tickets').click();

  const options = page.locator('#ticketLocation option');
  await expect(options).toHaveCount(expectedCount + 1);
  await expect(options.first()).toHaveText('Select a location');

  await page.locator('#ticketLocation').selectOption('orland-park');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute(
    'href',
    '#'
  );
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute(
    'data-tm-booking-url',
    'https://book.orlandpark.timemission.com/timemissionorlandpark/onlinecheckout/en-us/home'
  );

  await page.locator('#ticketLocation').selectOption('houston');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute(
    'href',
    '#'
  );
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute(
    'data-tm-booking-url',
    'https://book.houston.timemission.com/timemissionhouston/onlinecheckout/en-us/home'
  );

  await page.locator('#ticketLocation').selectOption('manassas');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute(
    'href',
    '#'
  );
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute(
    'data-tm-booking-url',
    'https://book.manassas.timemission.com/timemissionmanassasmall/onlinecheckout/en-us/home'
  );
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('data-tm-location', 'manassas');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBeNull();
  await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBe('manassas');
  await expect(page.locator('#locationText')).toContainText('Manassas');

  await expect(page.locator('#ticketLocation option[value="antwerp"]')).toHaveText('Belgium – Antwerp');
  await expect(page.locator('#ticketLocation option[value="brussels"]')).toHaveText('Belgium – Brussels');
});

test('ticket panel routes Europe selections to the right external destination with UTMs', async ({ page }) => {
  await page.route('https://www.experience-factory.com/**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Experience Factory booking</title><h1>Experience Factory booking</h1>',
    });
  });
  await page.route('https://timemission.eu/**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Time Mission EU</title><h1>Time Mission EU</h1>',
    });
  });

  await page.goto('/?utm_source=paid&utm_campaign=eu');
  await page.locator('.hero-cta .btn-tickets').click();
  await expectPopupUrl(
    page,
    () => page.locator('#ticketLocation').selectOption('antwerp'),
    'https://www.experience-factory.com/antwerp/online-booking/?utm_source=paid&utm_campaign=eu#your-group=groups-of-friends&your-favorite-experience=time-mission'
  );
  await expect(page).toHaveURL(/\/\?utm_source=paid&utm_campaign=eu$/);

  await page.goto('/?utm_source=paid&utm_campaign=eu');
  await page.locator('.hero-cta .btn-tickets').click();

  await expectPopupUrl(
    page,
    () => page.locator('#ticketLocation').selectOption('brussels'),
    'https://timemission.eu/brussels?utm_source=paid&utm_campaign=eu'
  );
  await expect(page).toHaveURL(/\/\?utm_source=paid&utm_campaign=eu$/);
});

test('ticket panel Continue to Booking opens Roller checkout without a location-page hop', async ({ page }) => {
  await page.route('https://cdn.rollerdigital.com/scripts/widget/checkout_iframe.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: 'window.RollerCheckout = { show: function () { window.__rollerCheckoutShown = true; } };',
    });
  });

  await gotoHome(page);

  await page.locator('.hero-cta .btn-tickets').click();
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);

  await page.locator('#ticketLocation').selectOption('manassas');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute(
    'href',
    '#'
  );
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute(
    'data-tm-booking-url',
    'https://book.manassas.timemission.com/timemissionmanassasmall/onlinecheckout/en-us/home'
  );

  await page.locator('#ticketBookBtn').click();
  await page.waitForFunction(() => window.__rollerCheckoutShown === true);
  await expect(page).toHaveURL(/\/$/);
});

test('open location ?book=1 opens embedded checkout without offsite navigation', async ({ page }) => {
  await page.route('https://cdn.rollerdigital.com/scripts/widget/checkout_iframe.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: 'window.RollerCheckout = { show: function () { window.__rollerCheckoutShown = true; } };',
    });
  });
  await page.goto('/mount-prospect?book=1');
  await page.waitForFunction(() => window.__rollerCheckoutShown === true);
  await expect(page).toHaveURL(/\/mount-prospect$/);
});

test('temporarily closed Philadelphia ?book=1 opens the closure notice instead of checkout', async ({ page }) => {
  await page.route('https://cdn.rollerdigital.com/scripts/widget/checkout_iframe.js', async (route) => {
    throw new Error(`Philadelphia closure must not load Roller checkout: ${route.request().url()}`);
  });

  await page.goto('/philadelphia?book=1');
  await expect(page).toHaveURL(/\/philadelphia$/);
  await expect(page.locator('#temporaryClosureModal')).toHaveClass(/is-active/);
  await expect(page.locator('#temporaryClosureModalTitle')).toHaveText('⚠️ Important Mission Update:');
  await expect(page.locator('#temporaryClosureModalCopy')).toContainText(
    'Time Mission Philadelphia is temporarily closed due to unexpected maintenance-related issues within our space.',
  );
  await expect(page.locator('#temporaryClosureModalCopy')).toContainText(
    'Existing ticket holders will be contacted by our customer support team shortly.',
  );
});

test('non-Roller external ticket booking renders direct provider links', async ({ page }) => {
  await page.goto('/lincoln');
  await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBe('lincoln');

  const ticketCtas = page.locator('.btn-tickets[href^="https://bookings.clubspeed.com/R1/R1LINCOLN"]');
  await expect.poll(() => ticketCtas.count()).toBeGreaterThanOrEqual(3);
  await expect(ticketCtas.first()).toHaveAttribute('target', '_blank');
  await expect(ticketCtas.first()).toHaveAttribute('rel', /noopener/);
});

test('missions Book Now CTAs open the standard ticket booking flow', async ({ page }) => {
  await page.goto('/missions');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);

  await page.locator('.portal-cta.btn-book-now[data-tm-booking-trigger]').first().click();
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);
  await expect(page.locator('#ticketLocation')).toBeVisible();
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('data-tm-booking-kind', 'tickets');
  await expect(page).toHaveURL(/\/missions$/);
});
