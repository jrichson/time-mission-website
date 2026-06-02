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

test('group CTAs resolve to location-data form URLs for the selected location', async ({ page }) => {
  await page.route('https://webforms.pipedrive.com/**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Group inquiry</title><main>Group inquiry</main>',
    });
  });

  await page.goto('/groups/corporate');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);
  const expectedHref = groupFormUrl('manassas', 'corporate');

  const href = await page.evaluate(() => {
    return window.TMBooking.getDestination({
      kind: 'groups',
      groupType: 'corporate',
      locationId: 'manassas',
    });
  });

  expect(href).toBe(expectedHref);

  await page.locator('[data-tm-booking-kind="groups"][data-tm-group-type="corporate"]').first().click();
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);
  await expect(page.locator('#ticketLocation')).toHaveValue('');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('aria-disabled', 'true');

  await page.locator('#ticketLocation').selectOption('manassas');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('href', expectedHref);
  await expect(page.locator('#ticketBookBtn')).not.toHaveAttribute('data-tm-booking-url', /./);

  await expectPopupUrl(page, () => page.locator('#ticketBookBtn').click(), expectedHref);
  await expect(page).toHaveURL(/\/groups\/corporate$/);
});

test('group cards open the selected location event form as a direct link', async ({ page }) => {
  await page.route('https://webforms.pipedrive.com/**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Group inquiry</title><main>Group inquiry</main>',
    });
  });

  await page.goto('/groups.html');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);
  await page.evaluate(() => window.TM.select('mount-prospect'));

  const expectedHref = groupFormUrl('mount-prospect', 'corporate');
  await expectPopupUrl(
    page,
    () => page
      .locator('.event-type-actions [data-tm-booking-kind="groups"][data-tm-group-type="corporate"]')
      .first()
      .click(),
    expectedHref
  );
  await expect(page).toHaveURL(/\/groups\.html$/);
});

test('group event cards expose ticket booking and group inquiry triggers', async ({ page }) => {
  await page.goto('/groups.html');

  const expectedGroupTypes = [
    'birthdays',
    'corporate',
    'bachelor-ette',
    'field-trips',
    'private-events',
    'holidays',
  ];
  const cards = await page.locator('.event-type-card').evaluateAll((nodes) => nodes.map((card) => {
    const ticket = card.querySelector('.event-type-actions .btn-tickets');
    const inquiry = card.querySelector('.event-type-actions .ghost');
    return {
      ticketIsTrigger: ticket?.hasAttribute('data-tm-booking-trigger') || false,
      ticketKind: ticket?.getAttribute('data-tm-booking-kind') || '',
      inquiryIsTrigger: inquiry?.hasAttribute('data-tm-booking-trigger') || false,
      inquiryKind: inquiry?.getAttribute('data-tm-booking-kind') || '',
      groupType: inquiry?.getAttribute('data-tm-group-type') || '',
    };
  }));

  expect(cards.map((card) => card.groupType)).toEqual(expectedGroupTypes);
  for (const card of cards) {
    expect(card.ticketIsTrigger).toBe(true);
    expect(card.ticketKind).toBe('tickets');
    expect(card.inquiryIsTrigger).toBe(true);
    expect(card.inquiryKind).toBe('groups');
  }

  await expect(page.locator('.event-info-body [data-tm-booking-kind="groups"][data-tm-group-type="private-events"]')).toContainText('Plan Your Event');
});

test('group event card Book Now keeps the standard ticket booking flow', async ({ page }) => {
  await page.route('https://cdn.rollerdigital.com/scripts/widget/checkout_iframe.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: 'window.RollerCheckout = { show: function () { window.__rollerCheckoutShown = true; } };',
    });
  });

  await page.goto('/groups.html');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);
  await page.evaluate(() => window.TM.select('manassas'));

  await page.locator('.event-type-actions .btn-tickets[data-tm-booking-kind="tickets"]').first().click();
  await page.waitForFunction(() => window.__rollerCheckoutShown === true);
  await expect(page).toHaveURL(/\/groups\.html$/);
});

test('group page Book Now CTAs keep the standard ticket booking flow', async ({ page }) => {
  await page.route('https://cdn.rollerdigital.com/scripts/widget/checkout_iframe.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: 'window.RollerCheckout = { show: function () { window.__rollerCheckoutShown = true; } };',
    });
  });

  await page.goto('/groups/corporate');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);
  await page.evaluate(() => window.TM.select('manassas'));

  await page.locator('main .btn-primary.btn-tickets[data-tm-booking-kind="tickets"]').first().click();
  await page.waitForFunction(() => window.__rollerCheckoutShown === true);
  await expect(page).toHaveURL(/\/groups\/corporate$/);
});

test('Houston and Orland Park group CTAs resolve to location-data forms', async ({ page }) => {
  await page.goto('/groups/corporate');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);

  const houstonCorporate = await page.evaluate(() => window.TMBooking.getDestination({
    kind: 'groups',
    groupType: 'corporate',
    locationId: 'houston',
  }));
  expect(houstonCorporate).toBe(groupFormUrl('houston', 'corporate'));

  const orlandPrivateEvents = await page.evaluate(() => window.TMBooking.getDestination({
    kind: 'groups',
    groupType: 'private-events',
    locationId: 'orland-park',
  }));
  expect(orlandPrivateEvents).toBe(groupFormUrl('orland-park', 'private-events'));
});

test('Dallas group CTAs stay disabled when location data has blank group rows', async ({ page }) => {
  await page.goto('/groups/corporate');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);

  await page.evaluate(() => window.TMBooking.open({ kind: 'groups', groupType: 'corporate' }));
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);
  await page.locator('#ticketLocation').selectOption('dallas');

  await expect(page.locator('#ticketPanelTitle')).toContainText('Group Requests Unavailable');
  await expect(page.locator('#ticketPanelIntro')).toContainText('Dallas');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('data-tm-location', 'dallas');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('data-tm-group-type', 'corporate');
  await expect(page.locator('#ticketBookBtn')).not.toHaveAttribute('data-tm-booking-url', /./);
  await page.locator('#ticketBookBtn').evaluate((button) => button.click());
  await expect(page.locator('.booking-frame-overlay.active')).toHaveCount(0);
});

test('gift card page reflects enabled, paused, and unavailable locations', async ({ page }) => {
  await page.goto('/gift-cards');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);
  const redemptionAnswer = page.locator('[data-gift-card-location-answer]');

  await page.evaluate(() => window.TM.select('manassas'));
  await expect(redemptionAnswer).toContainText('Gift cards purchased from this location are valid for Time Missions located in these states: AL, GA, FL, IL, IN, KS, MD, MN, MO, NC, TN, VA & WI.');

  await page.evaluate(() => window.TM.select('philadelphia'));
  await expect(page.locator('#giftCardBuyBtn')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#giftCardLocationHint')).toContainText('temporarily paused');
  await expect(redemptionAnswer).toContainText('Gift cards are temporarily paused for Philadelphia');

  await page.evaluate(() => window.TM.select('antwerp'));
  await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBe('antwerp');
  await expect(page.locator('#giftCardBuyBtn')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#giftCardLocationHint')).toContainText('not available');
  await expect(redemptionAnswer).toContainText('Gift cards are not available for Antwerp yet');

  await page.evaluate(() => window.TM.select('houston'));
  await expect(page.locator('#giftCardBuyBtn')).not.toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#giftCardBuyBtn')).toHaveAttribute('href', locationById.get('houston').giftCardUrl);
  await expect(page.locator('#giftCardLocationHint')).toContainText('Purchasing for Houston');
  await expect(redemptionAnswer).toContainText('Gift cards purchased through Houston');

  for (const locationId of ['dallas', 'west-nyack']) {
    await page.evaluate((id) => window.TM.select(id), locationId);
    await expect(page.locator('#giftCardBuyBtn')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('#giftCardLocationHint')).toContainText('not available');
  }
});

test('waiver panel routes Houston and Orland Park to location-data destinations', async ({ page }) => {
  await page.goto('/waiver');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);

  await page.evaluate(() => window.TMBooking.open({ kind: 'waiver' }));
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);

  for (const locationId of ['houston', 'orland-park']) {
    await page.locator('#ticketLocation').selectOption(locationId);
    await expect(page.locator('#ticketPanelTitle')).toContainText('Complete Your Waiver');
    await expect(page.locator('#ticketBookBtn')).not.toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('#ticketBookBtn')).toHaveAttribute('data-tm-location', locationId);
    await expect(page.locator('#ticketBookBtn')).toHaveAttribute('href', waiverUrl(locationId));
    await expect(page.locator('#ticketBookBtn')).not.toHaveAttribute('data-tm-booking-url', /./);
    await expect(page.locator('.booking-frame-overlay.active')).toHaveCount(0);
  }
});
