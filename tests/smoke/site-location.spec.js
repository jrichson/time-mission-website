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
  waitForLanguageRuntime,
  waiverUrl,
} = require('./site-helpers');

test.beforeEach(async ({ page }) => {
  await prepareSiteSmoke(page);
});

test('homepage omits the retired Orland Park announcement ticker', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.ticker-bar')).toHaveCount(0);
  await expect(page.locator('#nav')).toHaveClass(/nav--no-ticker/);
  await expect(page.locator('body')).not.toContainText('ORLAND PARK NOW OPEN');
});

test('desktop location selection keeps the current page context', async ({ page, isMobile }) => {
  // Desktop-only: this flow uses the desktop `#locationBtn` in the nav.
  // Mobile location selection lives inside the hamburger menu and is covered
  // by the dedicated mobile location selector block below.
  test.skip(isMobile, 'desktop-only flow (mobile path covered separately)');

  await page.goto('/groups/corporate?utm_source=test#details');

  await page.locator('#locationBtn').click();
  await expect(page.locator('#locationDropdown a[data-city="Philadelphia"]')).toHaveAttribute(
    'href',
    '/philadelphia/groups/corporate?utm_source=test#details'
  );
  await page.locator('#locationDropdown a[data-city="Philadelphia"]').click();

  await expect(page).toHaveURL(/\/philadelphia\/groups\/corporate\?utm_source=test#details$/);
  await expect(page.locator('#locationText')).toContainText('Philadelphia');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBeNull();
});

test('desktop location selector previews Europe venues', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only overlay path');

  await page.goto('/?utm_source=paid&utm_campaign=eu');
  await page.locator('#locationBtn').click();

  const antwerp = page.locator('#locationDropdown a[data-tm-location-slug="antwerp"]').first();
  const brussels = page.locator('#locationDropdown a[data-tm-location-slug="brussels"]').first();
  const houston = page.locator('#locationDropdown a[data-tm-location-slug="houston"]').first();
  const orlandPark = page.locator('#locationDropdown a[data-tm-location-slug="orland-park"]').first();

  await expect(antwerp).toHaveAttribute('data-tm-external-location', 'true');
  await expect(antwerp).toHaveAttribute('data-city', 'Antwerp');
  await expect(antwerp).toHaveAttribute('href', 'https://www.timemission.eu/antwerp?utm_source=paid&utm_campaign=eu');
  await antwerp.hover();
  await expect(page.locator('#locationInfo .location-info-name')).toContainText('Antwerp');
  await expect(page.locator('#locationInfo .location-info-book')).toContainText('Visit EU Site');
  await expect(page.locator('#locationInfo .location-info-book')).toHaveAttribute('href', 'https://www.timemission.eu/antwerp?utm_source=paid&utm_campaign=eu');

  await expect(brussels).toHaveAttribute('data-tm-external-location', 'true');
  await expect(brussels).toHaveAttribute('data-city', 'Brussels');
  await expect(brussels).toHaveAttribute('href', 'https://www.timemission.eu/brussels?utm_source=paid&utm_campaign=eu');
  await expect(brussels).toContainText('Belgium – Brussels');
  await expect(brussels.locator('.coming-soon-tag')).toHaveCount(0);
  await expect(houston).toContainText('TX – Houston');
  await expect(houston.locator('.coming-soon-tag')).toHaveCount(0);
  await expect(orlandPark).toContainText('IL – Orland Park');
  await expect(orlandPark.locator('.coming-soon-tag')).toHaveCount(0);
  await brussels.hover();
  await expect(page.locator('#locationInfo .location-info-name')).toContainText('Brussels');
  await expect(page.locator('#locationInfo .location-info-book')).toContainText('Visit EU Site');
  await expect(page.locator('#locationInfo .location-info-book')).toHaveAttribute('href', 'https://www.timemission.eu/brussels?utm_source=paid&utm_campaign=eu');
});

test('US location selector shows only the Eindhoven opening callout', async ({ page }) => {
  await page.goto('/');

  const badgeSlugs = await page.locator('#locationDropdown a:has(.coming-soon-tag)')
    .evaluateAll((links) => links.map((link) => link.getAttribute('data-tm-location-slug')));

  expect(badgeSlugs).toEqual(['eindhoven']);
});

test('Scottsdale is coming soon and location lists mark upcoming venues', async ({ page }) => {
  await page.goto('/locations');

  const scottsdale = page.locator('.loc-row[href="/scottsdale"]');
  await expect(scottsdale.locator('.loc-name')).toHaveText('AZ – Scottsdale*');
  await expect(scottsdale.locator('.loc-status')).toHaveText('Coming Soon');
  await expect(scottsdale.locator('.loc-address')).toContainText('15745 Hayden Rd, Scottsdale, AZ 85260');

  const upcomingNames = await page.locator('.loc-row.is-coming-soon .loc-name').allTextContents();
  expect(upcomingNames.every((name) => name.trim().endsWith('*'))).toBe(true);
  const openNames = await page.locator('.loc-row:not(.is-coming-soon) .loc-name').allTextContents();
  expect(openNames.every((name) => !name.includes('*'))).toBe(true);
  await expect(page.locator('#locationDropdown a[data-tm-location-slug="scottsdale"]')).toContainText('AZ – Scottsdale*');
  await expect(page.locator('.footer-location-list a[href="/scottsdale"]')).toContainText('AZ – Scottsdale*');

  await scottsdale.click();
  await expect(page).toHaveURL(/\/scottsdale$/);
  await expect(page).toHaveTitle('Time Mission Scottsdale | Coming Soon');
  await expect(page.locator('.hero')).toContainText('Coming Soon');
  await expect(page.locator('.footer-loc-address')).toContainText('15745 Hayden Rd');
  await expect(page.locator('.footer-loc-address')).toContainText('Scottsdale, AZ 85260');
  await expect(page.locator('.hero .btn-location-lead')).toHaveAttribute('href', /contact#location=scottsdale&type=updates$/);

  await page.goto('/es/locations');
  await page.evaluate(async () => { await window.TM.ready; });
  await expect(page.locator('#locationDropdown a[data-tm-location-slug="scottsdale"]')).toContainText('Scottsdale*');
  await expect(page.locator('#locationDropdown a[data-tm-location-slug="eindhoven"]')).toContainText('Eindhoven*');
});

test('Edison has a local location page whose action links lead to Supercharged NJ', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only overlay path');

  await page.goto('/?utm_source=paid&utm_campaign=edison');
  await page.locator('#locationBtn').click();

  const edison = page.locator('#locationDropdown a[data-tm-location-slug="edison"]').first();
  await expect(edison).toContainText('NJ – Edison');
  await expect(edison.locator('.coming-soon-tag')).toHaveCount(0);
  await expect(edison).not.toHaveAttribute('data-tm-external-location', 'true');
  await expect(edison).toHaveAttribute('href', '/edison?utm_source=paid&utm_campaign=edison');

  await edison.hover();
  await expect(page.locator('#locationInfo .location-info-name')).toContainText('Edison');
  await expect(page.locator('#locationInfo .location-info-book')).toContainText('Visit Location Site');
  await expect(page.locator('#locationInfo .location-info-book')).toHaveAttribute(
    'href',
    'https://www.superchargednj.com/book-time-mission/?utm_source=paid&utm_campaign=edison',
  );

  await edison.click();
  await expect(page).toHaveURL(/\/edison\?utm_source=paid&utm_campaign=edison$/);
  await expect(page).toHaveTitle('Time Mission Edison | Now Open');
  await expect(page.locator('.ticker-bar')).toHaveCount(0);
  await expect(page.locator('.hero .btn-location-book')).toHaveAttribute(
    'href',
    'https://www.superchargednj.com/book-time-mission/',
  );
  await expect(page.locator('.final-cta .btn-location-book')).toHaveAttribute(
    'href',
    'https://www.superchargednj.com/book-time-mission/',
  );
  await expect(page.locator('nav .btn-tickets')).toHaveAttribute(
    'href',
    'https://www.superchargednj.com/book-time-mission/?utm_source=paid&utm_campaign=edison',
  );

  await page.goto('/locations');
  const locationRow = page.locator('.loc-row[href="/edison"]');
  await expect(locationRow).toContainText('NJ – Edison');
  await expect(locationRow).toContainText('Now Open');
  await expect(locationRow).toContainText('987 US-1, Edison, NJ 08817');
  await expect(locationRow).not.toHaveAttribute('target', '_blank');
});

test('US locations omit tickers after runtime initialization and schedule refresh', async ({ page }) => {
  for (const slug of ['houston', 'philadelphia', 'edison', 'boston', 'mount-prospect', 'orland-park', 'manassas']) {
    await page.goto('/' + slug);
    await page.evaluate(async () => {
      await window.TM.ready;
      window.TMTickerSchedule?.refresh(new Date('2027-01-01T00:00:00Z'));
    });
    await expect(page.locator('.ticker-bar')).toHaveCount(0);
    await expect(page.locator('#nav')).toHaveClass(/nav--no-ticker/);
  }
});

test('desktop location selector hands Brussels off to the EU site', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only overlay path');

  await page.goto('/?utm_source=paid&utm_campaign=eu');
  await page.locator('#locationBtn').click();

  const brussels = page.locator('#locationDropdown a[data-tm-location-slug="brussels"]').first();

  await page.route('https://www.timemission.eu/**', async (route) => {
    await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Time Mission EU</title>' });
  });
  await expectPopupUrl(
    page,
    () => brussels.click(),
    'https://www.timemission.eu/brussels?utm_source=paid&utm_campaign=eu',
  );
  await expect(page).toHaveURL(/\/\?utm_source=paid&utm_campaign=eu$/);
  await expect(page.locator('#locationText')).toContainText('Select Location');
  await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBeNull();
});

test('Europe location fallback links preserve tracking params', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only overlay path');

  await page.goto('/groups/corporate?utm_source=paid&utm_campaign=spring&book=1');
  await page.locator('#locationBtn').click();

  await expect(page.locator('#locationDropdown a[data-tm-location-slug="antwerp"]'))
    .toHaveAttribute('href', 'https://www.timemission.eu/antwerp?utm_source=paid&utm_campaign=spring');
  await expect(page.locator('#locationDropdown a[data-tm-location-slug="brussels"]'))
    .toHaveAttribute('href', 'https://www.timemission.eu/brussels?utm_source=paid&utm_campaign=spring');
  await expect(page.locator('#locationDropdown a[data-tm-location-slug="eindhoven"]'))
    .toHaveAttribute(
      'href',
      'https://www.timemission.eu/eindhoven?utm_source=paid&utm_campaign=spring',
    );
});

test('hard refresh on shared pages clears stale saved location', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tm_location', 'philadelphia');
    localStorage.setItem('timeMissionLocation', 'Philadelphia');
  });

  await page.goto('/groups');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);

  await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('timeMissionLocation'))).toBeNull();
  await expect(page.locator('#locationText')).toContainText('Select Location');
});

test('desktop location hover renders address map preview before selection', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only preview path');

  await page.goto('/');
  await page.locator('.language-switcher--desktop [data-language-select]').selectOption('es');
  await expect(page).toHaveURL(/\/es\/?$/);
  await waitForLanguageRuntime(page, true);
  await page.locator('#locationBtn').click();
  await expect(page.locator('#locationDropdown')).toHaveClass(/open/);
  await expect(page.locator('#locationDropdown .location-dropdown-title')).toHaveText(i18nCatalog.translations.es['location.title']);

  await page.locator('#locationDropdown a[data-city="Mount Prospect"]').hover();
  const className = await page.locator('#locationDropdown').evaluate((el) => el.className || '');
  expect(className).toContain('open');
  expect(className).not.toContain('navigating');
  await expect(page).toHaveURL(/\/es$/);
  await expect(page.locator('#locationInfo .location-info-name')).toContainText('Mount Prospect');
  await expect(page.locator('#locationInfo .location-info-address')).toContainText('132 Randhurst Village Drive');
  await expect(page.locator('#locationInfo .location-info-directions')).toContainText(i18nCatalog.translations.es['location.getDirections']);
  await expect(page.locator('#locationInfo .location-info-hours')).toContainText(`${i18nCatalog.translations.es['location.day.mon']}:`);
  await expect(page.locator('#locationInfo .location-info-book')).toContainText(i18nCatalog.translations.es['nav.bookNow']);
  await expect(page.locator('#locationInfo .location-info-contact')).toHaveCount(0);
  await expect(page.locator('#locationMap iframe')).toHaveAttribute('src', /google\.com\/maps/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBeNull();
});

test('location page drives nav state and ticket panel default location', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.goto('/mount-prospect');
  await expect(page.locator('#locationText')).toContainText('Mount Prospect');
  await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBe('mount-prospect');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBeNull();
  await expect(page.locator('.nav-right .btn-tickets')).toHaveAttribute(
    'href',
    '#'
  );
  await expect(page.locator('.nav-right .btn-tickets')).toHaveAttribute(
    'data-tm-booking-url',
    'https://book.mountprospect.timemission.com/timemissionmountprospect/onlinecheckout/en-us/home'
  );
  await expect(page.locator('.nav-right .btn-tickets')).toHaveAttribute('data-tm-location', 'mount-prospect');

  await page.evaluate(() => window.TMBooking.open({ kind: 'tickets' }));
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);
  await expect(page.locator('#ticketLocation')).toHaveValue('mount-prospect');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute(
    'href',
    '#'
  );
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute(
    'data-tm-booking-url',
    'https://book.mountprospect.timemission.com/timemissionmountprospect/onlinecheckout/en-us/home'
  );
});

test('Lincoln publishes its 2-4 player limit across the location experience', async ({ page }) => {
  await page.goto('/lincoln');

  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /groups of 2–4/);
  await expect(page.locator('.hero-subtitle')).toContainText('Teams of 2-4');
  await expect(page.locator('.stat-card').filter({ hasText: 'Players Per Team' }).locator('.stat-number'))
    .toHaveText('2-4');
  await expect(page.locator('#ticketPlayersInfo')).toHaveText('Teams of 2-4 players per mission');

  await page.locator('#ticketLocation').selectOption('manassas', { force: true });
  await expect(page.locator('#ticketPlayersInfo')).toHaveText('Teams of 2-5 players per mission');
  await page.locator('#ticketLocation').selectOption('lincoln', { force: true });
  await expect(page.locator('#ticketPlayersInfo')).toHaveText('Teams of 2-4 players per mission');

  await page.evaluate(() => window.TMI18n.setLanguage('es'));
  await expect(page.locator('#ticketPlayersInfo')).toHaveText('Equipos de 2 a 4 jugadores por misión');
});

test('Philadelphia is now open across its banner, selector, and booking experience', async ({ page }) => {
  await page.goto('/philadelphia');

  const checkoutUrl = 'https://book.philadelphia.timemission.com/timemissionphiladelphiapa/onlinecheckout/en-us/home';
  const philadelphiaMenuLink = page.locator('#locationDropdown a[data-tm-location-slug="philadelphia"]').first();

  await expect(page).toHaveTitle('Time Mission Philadelphia – 25+ Interactive Mission Rooms');
  await expect(page.locator('.tm-closure-strip')).toHaveCount(0);
  await expect(page.locator('#temporaryClosureModal')).toHaveCount(0);
  await expect(page.locator('.ticker-bar')).toHaveCount(0);
  await expect(philadelphiaMenuLink.locator('.coming-soon-tag')).toHaveCount(0);
  await expect(page.locator('.hero-cta .btn-tickets')).toHaveAttribute('href', '#');
  await expect(page.locator('.hero-cta .btn-tickets')).toHaveAttribute('data-tm-booking-trigger', '');
  await expect(page.locator('.hero-cta .btn-tickets')).toHaveAttribute('data-tm-booking-url', checkoutUrl);
  await expect(page.locator('.nav-right .btn-tickets')).toHaveAttribute('href', '#');
  await expect(page.locator('.nav-right .btn-tickets')).toHaveAttribute('data-tm-booking-trigger', '');
});

test('Boston coming-soon page publishes the address and lead-only CTAs', async ({ page }) => {
  await page.goto('/boston');

  const bostonMenuLink = page.locator('#locationDropdown a[data-tm-location-slug="boston"]').first();
  const footer = page.locator('footer.footer');

  await expect(page).toHaveTitle('Time Mission Boston | Coming Soon');
  await expect(page.locator('.ticker-bar')).toHaveCount(0);
  await expect(bostonMenuLink.locator('.coming-soon-tag')).toHaveCount(0);
  await expect(page.locator('.nav-right .btn-tickets')).toHaveAttribute(
    'href',
    '/boston/contact#location=boston&type=updates'
  );
  await expect(page.locator('.nav-right .btn-tickets')).not.toHaveAttribute('data-tm-booking-trigger', '');
  await expect(footer.locator('.footer-locations-title')).toHaveText('Boston');
  await expect(footer.locator('.footer-loc-address')).toContainText('200 State St');
  await expect(footer.locator('.footer-loc-address')).toContainText('Boston, MA 02109');

  await page.goto('/locations');
  const bostonLocationRow = page.locator('.loc-row[href="/boston"]');
  await expect(bostonLocationRow).toContainText('Boston');
  await expect(bostonLocationRow).toContainText('Coming Soon');
  await expect(bostonLocationRow).toContainText('200 State St, Boston, MA 02109');
});

test('location pages render footer contact details with accordion hours', async ({ page }) => {
  await page.goto('/mount-prospect');

  const footer = page.locator('footer.footer');
  await expect(page.locator('footer.footer')).toHaveCount(1);
  await expect(footer.locator('.footer-locations-title')).toHaveText('Mount Prospect');
  await expect(footer.locator('.footer-locations-dropdown')).toBeHidden();
  await expect(footer.locator('.footer-location-info')).toBeVisible();
  await expect(footer.locator('.footer-loc-address')).toContainText('132 Randhurst Village Drive');
  await expect(footer.locator('.footer-loc-address')).toContainText('Mount Prospect, IL 60056');
  await expect(footer.locator('.footer-loc-phone')).toHaveText('(847) 250-9560');
  await expect(footer.locator('.footer-loc-phone')).toHaveAttribute('href', 'tel:+18472509560');
  await expect(footer.getByRole('button', { name: 'Change Location' })).toBeVisible();

  const hours = footer.locator('.footer-loc-hours-details');
  await expect(hours.locator('.footer-loc-hours-summary')).toContainText('Hours');
  await expect(hours).not.toHaveAttribute('open', '');
  await hours.locator('.footer-loc-hours-summary').click();
  await expect(hours).toHaveAttribute('open', '');
  await expect(hours.locator('.footer-hours-row')).toHaveCount(7);
  await expect(hours.locator('.footer-hours-row').first()).toContainText('Monday');
});

test('Houston location page renders launch footer contact hours from location data', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-08-21T12:00:00.000Z'));
  await page.goto('/houston');

  const footer = page.locator('footer.footer');
  await expect(footer.locator('.footer-locations-title')).toHaveText('Houston');
  await expect(footer.locator('.footer-location-info')).toBeVisible();
  await expect(footer.locator('.footer-loc-address')).toContainText('7620 Katy Fwy');
  await expect(footer.locator('.footer-loc-phone')).toHaveText('(713) 588-1630');

  const hours = footer.locator('.footer-loc-hours-details');
  await expect(hours).not.toHaveAttribute('open', '');
  await hours.locator('.footer-loc-hours-summary').click();
  await expect(hours).toHaveAttribute('open', '');
  await expect(hours.locator('.footer-hours-row')).toHaveCount(8);
  await expect(hours.locator('.footer-hours-row').first()).toContainText('Labor Day');
  await expect(hours.locator('.footer-hours-row').first()).toContainText('10am - 10pm');
  await expect(hours.locator('.footer-hours-row').nth(1)).toContainText('Monday');
});

test('selected location updates shared footer contact panel', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-08-21T12:00:00.000Z'));
  await page.goto('/');

  const footer = page.locator('footer.footer');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);
  await page.evaluate(() => window.TM.clear());
  await expect(footer.locator('.footer-location-info')).toBeHidden();
  await expect(footer.locator('.footer-locations-dropdown')).toBeVisible();

  await page.evaluate(() => window.TM.select('houston'));
  await expect(footer.locator('.footer-locations-title')).toHaveText('Houston');
  await expect(footer.locator('.footer-locations-dropdown')).toBeHidden();
  await expect(footer.locator('.footer-location-info')).toBeVisible();
  await expect(footer.locator('.footer-loc-address')).toContainText('7620 Katy Fwy');
  await expect(footer.locator('.footer-loc-phone')).toHaveText('(713) 588-1630');

  const hours = footer.locator('.footer-loc-hours-details');
  await expect(hours).not.toHaveAttribute('open', '');
  await hours.locator('.footer-loc-hours-summary').click();
  await expect(hours.locator('.footer-hours-row')).toHaveCount(8);
  await expect(hours.locator('.footer-hours-row').first()).toContainText('Labor Day');
  await expect(hours.locator('.footer-hours-row').first()).toContainText('10am - 10pm');
  await expect(hours.locator('.footer-hours-row').nth(1)).toContainText('Monday');

  await page.evaluate(() => window.TM.select('mount-prospect'));
  await expect(footer.locator('.footer-locations-title')).toHaveText('Mount Prospect');
  await expect(hours).not.toHaveAttribute('open', '');

  await page.evaluate(() => window.TM.clear());
  await expect(footer.locator('.footer-location-info')).toBeHidden();
  await expect(footer.locator('.footer-locations-dropdown')).toBeVisible();
  await expect(footer.locator('.footer-locations-title')).toHaveText('Locations');
});
