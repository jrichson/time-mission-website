const { test, expect } = require('@playwright/test');
const {
  REPO_ROOT,
  fingerprintAnalyticsLabels,
  gotoHome,
  groupCheckoutUrl,
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

  await page.locator('#ticketBookBtn').click();
  await expect(page).toHaveURL(new RegExp(`${expectedHref}$`));
  await expect(page.getByRole('heading', { level: 1 })).toContainText('corporate event');
});

test('Philadelphia group inquiries use the shared Roller form link', async ({ page }) => {
  const expectedHref =
    'https://forms.roller.app/#/timemissionphiladelphiapa/1446ba8be6094ad/form';

  await page.goto('/groups/corporate');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);

  await page.evaluate(() => window.TMBooking.open({ kind: 'groups', groupType: 'corporate' }));
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);
  await page.locator('#ticketLocation').selectOption('philadelphia');

  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('href', expectedHref);
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('target', '_blank');
  await expect(page.locator('#ticketBookBtn')).not.toHaveAttribute('data-tm-booking-url', /./);
});

test('group cards open the selected location event form as a direct link', async ({ page }) => {
  await page.goto('/groups.html');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);
  await page.evaluate(() => window.TM.select('mount-prospect'));

  const expectedHref = groupFormUrl('mount-prospect', 'corporate');
  await page
    .locator('.event-type-actions [data-tm-booking-kind="groups"][data-tm-group-type="corporate"]')
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`${expectedHref}$`));
  await expect(page.getByRole('heading', { level: 1 })).toContainText('corporate event');
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
    const actionKinds = Array.from(card.querySelectorAll('.event-type-actions a'))
      .map((action) => action.getAttribute('data-tm-booking-kind') || '');
    return {
      actionKinds,
      ticketIsTrigger: ticket?.hasAttribute('data-tm-booking-trigger') || false,
      ticketKind: ticket?.getAttribute('data-tm-booking-kind') || '',
      inquiryIsTrigger: inquiry?.hasAttribute('data-tm-booking-trigger') || false,
      inquiryKind: inquiry?.getAttribute('data-tm-booking-kind') || '',
      groupType: inquiry?.getAttribute('data-tm-group-type') || '',
    };
  }));

  expect(cards.map((card) => card.groupType)).toEqual(expectedGroupTypes);
  for (const card of cards) {
    expect(card.actionKinds).toEqual(['groups', 'group-tickets']);
    expect(card.ticketIsTrigger).toBe(true);
    expect(card.ticketKind).toBe('group-tickets');
    expect(card.inquiryIsTrigger).toBe(true);
    expect(card.inquiryKind).toBe('groups');
  }

  const customEventCta = page.locator('.event-info-body .btn-link[data-tm-booking-kind="groups"]');
  await expect(customEventCta).toContainText('Plan Your Event');
  await expect(customEventCta).not.toHaveAttribute('data-tm-group-type', /./);
});

test('group event card Book Now uses group checkout when available', async ({ page }) => {
  await page.route('https://cdn.rollerdigital.com/scripts/widget/checkout_iframe.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: 'window.RollerCheckout = { show: function () { window.__rollerCheckoutShown = true; } };',
    });
  });

  await page.goto('/groups.html');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);
  await page.evaluate(() => window.TM.select('manassas'));

  const expectedHref = groupCheckoutUrl('manassas');
  await page.locator('.event-type-actions .btn-tickets[data-tm-booking-kind="group-tickets"]').first().click();
  await page.waitForFunction(() => window.__rollerCheckoutShown === true);
  await expect(page.locator('#roller-checkout')).toHaveAttribute('data-checkout', expectedHref);
  await expect(page).toHaveURL(/\/groups\.html$/);
});

test('group page Book Now CTAs use group checkout when available', async ({ page }) => {
  await page.route('https://cdn.rollerdigital.com/scripts/widget/checkout_iframe.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: 'window.RollerCheckout = { show: function () { window.__rollerCheckoutShown = true; } };',
    });
  });

  await page.goto('/groups/corporate');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);
  await page.evaluate(() => window.TM.select('manassas'));

  const expectedHref = groupCheckoutUrl('manassas');
  await page.locator('main .btn-primary.btn-tickets[data-tm-booking-kind="group-tickets"]').first().click();
  await page.waitForFunction(() => window.__rollerCheckoutShown === true);
  await expect(page.locator('#roller-checkout')).toHaveAttribute('data-checkout', expectedHref);
  await expect(page).toHaveURL(/\/groups\/corporate$/);
});

test('Houston and Orland Park group CTAs resolve to location-data forms', async ({ page }) => {
  await page.goto('/groups/corporate');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);

  for (const locationId of ['manassas', 'mount-prospect', 'orland-park']) {
    const href = await page.evaluate((id) => window.TMBooking.getDestination({
      kind: 'group-tickets',
      locationId: id,
    }), locationId);
    expect(href).toBe(groupCheckoutUrl(locationId));
  }

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

test('main groups page inquiry CTAs use the default location form', async ({ page }) => {
  await page.goto('/groups.html');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);
  await page.evaluate(() => window.TM.select('manassas'));

  const expectedHref = groupFormUrl('manassas', 'default');
  await page.locator('.hero-cta [data-tm-booking-kind="groups"]').click();
  await expect(page).toHaveURL(new RegExp(`${expectedHref}$`));
  await expect(page.getByRole('heading', { level: 1 })).toContainText('group event');
  await expect(page.locator('[name="q20_dealTitle"]')).toHaveValue(/\/ general-group-inquiry \/ FormDate:/);
});

test('on-site group inquiry carries Jotform attribution and tracks the call option', async ({ page }) => {
  const expectedPath = groupFormUrl('manassas', 'corporate');
  await page.goto(expectedPath);

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('body')).toHaveAttribute('data-location', 'manassas');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('corporate event');

  const form = page.locator('[data-tm-group-inquiry-form]');
  await expect(form).toHaveAttribute('action', 'https://submit.jotform.com/submit/261936424348059');
  await expect(form.locator('[name="q21_location"]')).toHaveValue('Manassas');
  await expect(form.locator('[name="q23_typeA"]')).toHaveValue(new RegExp(`${expectedPath}$`));

  const callLink = page.locator('[data-tm-analytics-cta="group_form_phone"]');
  await expect(callLink).toHaveAttribute('href', 'tel:+18137735250');
  await callLink.dispatchEvent('click');

  const phoneEvent = await page.evaluate(() => window.dataLayer.find(
    (entry) => entry && entry.event_name === 'PHONE_CLICK' && entry.parameters?.CTA_ID === 'group_form_phone',
  ));
  expect(phoneEvent).toBeTruthy();
  expect(phoneEvent.page_path).toBe(expectedPath);
  expect(phoneEvent.parameters.LINK_PATH).toBe('tel');
});

test('Mount Prospect submits the exact Pipedrive location option', async ({ page }) => {
  await page.goto(groupFormUrl('mount-prospect', 'corporate'));
  await expect(page.locator('[name="q21_location"]')).toHaveValue('Mt Prospect');
});

test('group inquiry deal titles use each CRM code and prefer organization over submitter', async ({ page }) => {
  const locationCodes = {
    manassas: 'MAN',
    'mount-prospect': 'MTP',
    'orland-park': 'OPK',
  };

  for (const [locationId, code] of Object.entries(locationCodes)) {
    await page.goto(groupFormUrl(locationId, 'corporate'));
    const form = page.locator('[data-tm-group-inquiry-form]');
    const dealTitle = form.locator('[name="q20_dealTitle"]');

    await form.locator('[name="q8_firstampamp"]').fill('Alex Morgan');
    await form.evaluate((node) => node.dispatchEvent(new Event('submit', {
      bubbles: true,
      cancelable: true,
    })));
    await expect(dealTitle).toHaveValue(new RegExp(`^${code}: Alex Morgan / corporate / FormDate:`));

    await form.locator('[name="q10_organization"]').fill('Acme Events');
    await form.evaluate((node) => node.dispatchEvent(new Event('submit', {
      bubbles: true,
      cancelable: true,
    })));
    await expect(dealTitle).toHaveValue(new RegExp(`^${code}: Acme Events / corporate / FormDate:`));
  }
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
  await expect(page.locator('#giftCardLocationHint')).toContainText('not available');
  await expect(redemptionAnswer).toContainText('Gift cards are not available for Philadelphia yet');

  expect(await page.evaluate(() => window.TMBooking.getDestination({
    kind: 'gift-cards',
    locationId: 'antwerp',
  }))).toBe('https://www.timemission.eu/antwerp');

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
