const { test, expect } = require('@playwright/test');
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

function waiverUrl(locationId) {
  return locationById.get(locationId)?.waiverUrl || '';
}

test.beforeEach(async ({ page }) => {
  await prepareSmokePage(page);
});

async function gotoHome(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1, name: /Time Mission/i }).waitFor({
    state: 'visible',
    timeout: 15000,
  });
}

/** Wait for GTM bootstrap push, then read `consent_profile` from `tm_tagging_config`. */
async function readTaggingConsentProfile(page) {
  await page.waitForFunction(() => Array.isArray(window.dataLayer) && window.dataLayer.length > 0);
  return page.evaluate(() => {
    return window.dataLayer.find((entry) => entry && entry.event === 'tm_tagging_config')?.consent_profile || '';
  });
}

test('homepage loads core navigation and booking panel', async ({ page }) => {
  test.slow();

  await gotoHome(page);

  await expect(page).toHaveTitle(/Time Mission/i);
  // Post-Astro hero H1 contract:
  // - .hero-h1-seo carries the screen-reader H1 text (visually-hidden)
  // - .line-1 is the decorative "STEP INTO THE" eyebrow (visible, aria-hidden)
  // - .line-2 renders "TIME MISSION" via SVG mask (visible, aria-hidden, no text node)
  const heroContract = await page
    .waitForFunction(
      () => {
        const hero = document.querySelector('.hero-title');
        if (!hero) return null;
        const line1 = hero.querySelector('.line-1');
        const line2 = hero.querySelector('.line-2');
        const seo = hero.querySelector('.hero-h1-seo');

        return {
          seoText: seo?.textContent || '',
          line1Text: line1?.textContent || '',
          line1Visible: !!line1 && getComputedStyle(line1).visibility !== 'hidden',
          line2Visible: !!line2 && getComputedStyle(line2).visibility !== 'hidden',
        };
      },
      undefined,
      { timeout: 15000 }
    )
    .then((handle) => handle.jsonValue());

  expect(heroContract.seoText).toMatch(/Time Mission.*Interactive Mission Rooms/i);
  expect(heroContract.line1Text).toMatch(/STEP INTO THE/);
  expect(heroContract.line1Visible).toBe(true);
  expect(heroContract.line2Visible).toBe(true);

  const heroMedia = await page.locator('.hero-video-container').evaluate((el) => {
    const video = el.querySelector('video');
    return {
      backgroundImage: getComputedStyle(el).backgroundImage,
      videoOpacity: video ? getComputedStyle(video).opacity : '',
      videoReady: el.classList.contains('is-video-ready'),
    };
  });
  expect(heroMedia.backgroundImage).toMatch(/hero-poster(?:-960\.webp|\.jpg)/);
  expect(heroMedia.videoReady).toBe(false);
  expect(heroMedia.videoOpacity).toBe('0');

  await page.locator('.hero-cta .btn-tickets').click();
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);
  await expect(page.locator('#ticketLocation')).toBeVisible();
  await expect(page.locator('#ticketLocation')).toHaveValue('');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#ticketClose')).toHaveAccessibleName(/close ticket panel/i);
});

test('homepage testimonial ratings stay visible after carousel hydration', async ({ page }) => {
  await gotoHome(page);

  const rating = page.locator('#reviews .testimonial-rating').first();
  await expect(rating).toBeVisible();

  const ratingState = await page.evaluate(() => {
    const ratingEl = document.querySelector('#reviews .testimonial-rating');
    const track = document.querySelector('#reviews .testimonials-track');
    if (!ratingEl || !track) return null;

    const ratingStyle = getComputedStyle(ratingEl);
    const fillColor = ratingStyle.webkitTextFillColor || ratingStyle.color;
    const transparentFill = fillColor === 'transparent' || fillColor === 'rgba(0, 0, 0, 0)';
    const ratingRect = ratingEl.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();

    return {
      text: ratingEl.textContent || '',
      ratingHeight: ratingRect.height,
      ratingWidth: ratingRect.width,
      trackWidth: trackRect.width,
      hasPaintBackground: ratingStyle.backgroundImage !== 'none',
      transparentFill,
    };
  });

  expect(ratingState).toBeTruthy();
  expect(ratingState.text.trim().length).toBeGreaterThan(0);
  expect(ratingState.ratingHeight).toBeGreaterThan(0);
  expect(ratingState.ratingWidth).toBeGreaterThan(0);
  expect(ratingState.trackWidth).toBeGreaterThan(0);
  expect(ratingState.transparentFill && !ratingState.hasPaintBackground).toBe(false);
});

test('language switcher changes visible navigation text', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop language switcher path; mobile menu uses same runtime');

  await gotoHome(page);
  await expect.poll(() => page.evaluate(() => Boolean(window.__TM_I18N__?.translations?.es))).toBe(true);

  await page.locator('.language-switcher--desktop [data-language-select]').selectOption('es');
  await expect(page.locator('.nav-links a[href="/about"]')).toHaveText('Acerca de');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('es');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_language'))).toBe('es');

  await page.locator('.hero-cta .btn-tickets').click();
  const es = i18nCatalog.translations.es;
  await expect(page.locator('#ticketPanelTitle')).toHaveText('Elige tu ubicación');
  await expect(page.locator('label[for="ticketLocation"]')).toHaveText(es['booking.locationLabel']);
  await expect(page.locator('#ticketLocation option').first()).toHaveText(es['booking.locationPlaceholder']);
  await expect(page.locator('#ticketBookBtnText')).toHaveText(es['booking.chooseLocation.cta']);
});

test('language switcher keeps the current route', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop language switcher path; mobile menu uses same runtime');

  await page.goto('/groups/corporate');
  await expect.poll(() => page.evaluate(() => Boolean(window.__TM_I18N__?.translations?.es))).toBe(true);

  await page.locator('.language-switcher--desktop [data-language-select]').selectOption('es');
  await expect(page).toHaveURL(/\/groups\/corporate$/);
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('es');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_language'))).toBe('es');
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
  await expect(page.locator('#ticketLocation option[value="brussels"]')).toHaveText('Belgium – Brussels (Opening June 18, 2026)');
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
  await page.locator('#ticketLocation').selectOption('antwerp');
  await expect(page).toHaveURL('https://www.experience-factory.com/antwerp/online-booking/?utm_source=paid&utm_campaign=eu#your-group=groups-of-friends&your-favorite-experience=time-mission');

  await page.goto('/?utm_source=paid&utm_campaign=eu');
  await page.locator('.hero-cta .btn-tickets').click();

  await page.locator('#ticketLocation').selectOption('brussels');
  await expect(page).toHaveURL('https://timemission.eu/brussels?utm_source=paid&utm_campaign=eu');
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

  await expect(antwerp).toHaveAttribute('data-tm-external-location', 'true');
  await expect(antwerp).toHaveAttribute('data-city', 'Antwerp');
  await expect(antwerp).toHaveAttribute('href', 'https://timemission.eu/antwerp?utm_source=paid&utm_campaign=eu');
  await antwerp.hover();
  await expect(page.locator('#locationInfo .location-info-name')).toContainText('Antwerp');
  await expect(page.locator('#locationInfo .location-info-book')).toContainText('Visit EU Site');
  await expect(page.locator('#locationInfo .location-info-book')).toHaveAttribute('href', 'https://timemission.eu/antwerp?utm_source=paid&utm_campaign=eu');

  await expect(brussels).toHaveAttribute('data-tm-external-location', 'true');
  await expect(brussels).toHaveAttribute('data-city', 'Brussels');
  await expect(brussels).toHaveAttribute('href', 'https://timemission.eu/brussels?utm_source=paid&utm_campaign=eu');
  await expect(brussels).toContainText('Belgium – Brussels');
  await expect(brussels).toContainText('Opening June 18, 2026');
  await brussels.hover();
  await expect(page.locator('#locationInfo .location-info-name')).toContainText('Brussels');
  await expect(page.locator('#locationInfo .location-info-book')).toContainText('Visit EU Site');
  await expect(page.locator('#locationInfo .location-info-book')).toHaveAttribute('href', 'https://timemission.eu/brussels?utm_source=paid&utm_campaign=eu');
});

test('desktop location selector selects Brussels without leaving the page', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only overlay path');

  await page.goto('/?utm_source=paid&utm_campaign=eu');
  await page.locator('#locationBtn').click();

  const brussels = page.locator('#locationDropdown a[data-tm-location-slug="brussels"]').first();

  await brussels.click();
  await expect(page).toHaveURL(/\/\?utm_source=paid&utm_campaign=eu$/);
  await expect(page.locator('#locationText')).toContainText('Brussels');
  await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBe('brussels');
  await expect(page.locator('nav .btn-tickets')).toHaveAttribute('href', 'https://timemission.eu/brussels?utm_source=paid&utm_campaign=eu');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBeNull();
});

test('Europe location fallback links preserve tracking params', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only overlay path');

  await page.goto('/groups/corporate?utm_source=paid&utm_campaign=spring&book=1');
  await page.locator('#locationBtn').click();

  await expect(page.locator('#locationDropdown a[data-tm-external-location="true"]').first())
    .toHaveAttribute('href', 'https://timemission.eu/antwerp?utm_source=paid&utm_campaign=spring');
  await expect(page.locator('#locationDropdown a[data-tm-external-location="true"]').nth(1))
    .toHaveAttribute('href', 'https://timemission.eu/brussels?utm_source=paid&utm_campaign=spring');
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
  await page.locator('#locationBtn').click();
  await expect(page.locator('#locationDropdown')).toHaveClass(/open/);
  await expect(page.locator('#locationDropdown .location-dropdown-title')).toHaveText(i18nCatalog.translations.es['location.title']);

  await page.locator('#locationDropdown a[data-city="Mount Prospect"]').hover();
  const className = await page.locator('#locationDropdown').evaluate((el) => el.className || '');
  expect(className).toContain('open');
  expect(className).not.toContain('navigating');
  await expect(page).toHaveURL(/\/$/);
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

test('Philadelphia page makes closure state visible and disables ticket booking CTAs', async ({ page }) => {
  const closure = locationById.get('philadelphia')?.temporaryClosure || {};

  await page.goto('/philadelphia');

  await expect(page.locator('.tm-closure-strip')).toBeVisible();
  await expect(page.locator('.tm-closure-strip')).toContainText(closure.label);
  await expect(page.locator('.tm-closure-strip')).toContainText(closure.detail);
  await expect(page.locator('.hero-cta .btn-tickets')).toHaveAttribute('href', '/contact#location=philadelphia&type=closure');
  await expect(page.locator('.hero-cta .btn-tickets')).not.toHaveAttribute('data-tm-booking-trigger', '');
  await expect(page.locator('.nav-right .btn-tickets')).toHaveAttribute('href', '/contact#location=philadelphia&type=closure');
  await expect(page.locator('.nav-right .btn-tickets')).not.toHaveAttribute('data-tm-booking-trigger', '');
  await expect(page.locator('#temporaryClosureModal .tm-closure-button--primary')).toHaveAttribute('href', '/contact#location=philadelphia&type=closure');
  await expect(page.locator('.tm-closure-strip .tm-closure-button--primary')).toHaveAttribute('href', '/contact#location=philadelphia&type=closure');
  await expect(page.locator('#temporaryClosureModal')).toHaveClass(/is-active/);
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
  await expect(footer.locator('.footer-loc-phone')).toHaveAttribute('href', 'tel:8472509560');
  await expect(footer.getByRole('button', { name: 'Change Location' })).toBeVisible();

  const hours = footer.locator('.footer-loc-hours-details');
  await expect(hours.locator('.footer-loc-hours-summary')).toContainText('Hours');
  await expect(hours).not.toHaveAttribute('open', '');
  await hours.locator('.footer-loc-hours-summary').click();
  await expect(hours).toHaveAttribute('open', '');
  await expect(hours.locator('.footer-hours-row')).toHaveCount(7);
  await expect(hours.locator('.footer-hours-row').first()).toContainText('Monday');
});

test('coming-soon location pages render footer contact fallback hours', async ({ page }) => {
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
  await expect(hours.locator('.footer-hours-row--note')).toContainText('Opening June 5, 2026');
});

test('selected location updates shared footer contact panel', async ({ page }) => {
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
  await expect(hours.locator('.footer-hours-row--note')).toContainText('Opening June 5, 2026');

  await page.evaluate(() => window.TM.select('mount-prospect'));
  await expect(footer.locator('.footer-locations-title')).toHaveText('Mount Prospect');
  await expect(hours).not.toHaveAttribute('open', '');

  await page.evaluate(() => window.TM.clear());
  await expect(footer.locator('.footer-location-info')).toBeHidden();
  await expect(footer.locator('.footer-locations-dropdown')).toBeVisible();
  await expect(footer.locator('.footer-locations-title')).toHaveText('LOCATIONS');
});

test('non-Roller external ticket booking leaves through the provider URL', async ({ page }) => {
  await page.route('https://bookings.clubspeed.com/**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>ClubSpeed booking</title><main>Booking</main>',
    });
  });

  await page.goto('/lincoln');
  await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBe('lincoln');

  await page.locator('.nav-right .btn-tickets').click();
  await expect(page).toHaveURL(/https:\/\/bookings\.clubspeed\.com\/R1\/R1LINCOLN/);
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
  const expectedHref = 'https://webforms.pipedrive.com/f/64NrjaZAs4GrLYSqpDDV0mzG46uGMN5cXrzEoAIjKKghJOzCRVmfw4mWkghflYR3Qn';

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
  await expect(page).toHaveURL(expectedHref);
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
  await page
    .locator('.event-type-actions [data-tm-booking-kind="groups"][data-tm-group-type="corporate"]')
    .first()
    .click();

  await expect(page).toHaveURL(expectedHref);
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

test('missions Book Now CTAs open the standard ticket booking flow', async ({ page }) => {
  await page.goto('/missions');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);

  await page.locator('.portal-cta.btn-book-now[data-tm-booking-trigger]').first().click();
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);
  await expect(page.locator('#ticketLocation')).toBeVisible();
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('data-tm-booking-kind', 'tickets');
  await expect(page).toHaveURL(/\/missions$/);
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

test('gift card page disables locations with blank gift-card URLs', async ({ page }) => {
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

  for (const locationId of ['houston', 'dallas', 'west-nyack']) {
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

test('faq accordion exposes keyboard accessible controls', async ({ page }) => {
  await page.goto('/faq');

  const firstQuestion = page.locator('.faq-question').first();
  await expect(firstQuestion).toHaveAttribute('role', 'button');
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');

  await firstQuestion.press('Enter');
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
});

test('newsletter signup sections are hidden while acquisition is paused', async ({ page }) => {
  for (const route of ['/', '/contact', '/dallas']) {
    await page.goto(route);
    const sections = page.locator('.newsletter-section');
    await expect(sections.first()).toBeAttached();
    const visibleCount = await sections.evaluateAll((els) =>
      els.filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      }).length,
    );
    expect(visibleCount).toBe(0);
  }
});

test('startup tagging config exposes consent profile by route type', async ({ page }) => {
  await page.goto('/houston');
  await expect.poll(async () => readTaggingConsentProfile(page)).toBe('us_open');

  await page.goto('/faq');
  await expect.poll(async () => readTaggingConsentProfile(page)).toBe('global_strict');
});

test('strict profiles do not persist paid attribution before consent grant', async ({ page }) => {
  await page.goto('/faq?utm_source=google&utm_campaign=spring');
  await page.waitForFunction(() => typeof window.TMConsent === 'object');
  const raw = await page.evaluate(() => localStorage.getItem('tm_attribution_v1'));
  expect(raw).toBeNull();

  await page.evaluate(() => {
    window.TMConsent.update({ ad_storage: 'granted' });
  });
  await page.waitForTimeout(50);
  const afterGrant = await page.evaluate(() => localStorage.getItem('tm_attribution_v1'));
  expect(afterGrant).not.toBeNull();
});

test('analytics click delegation tracks phone and email clicks without PII', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => {
    const phone = document.createElement('a');
    phone.id = 'tm-test-phone-link';
    phone.href = 'tel:+12158675309';
    phone.textContent = 'Call Test';
    document.body.appendChild(phone);

    const email = document.createElement('a');
    email.id = 'tm-test-email-link';
    email.href = 'mailto:test@example.com';
    email.textContent = 'Email Test';
    document.body.appendChild(email);
  });

  await page.locator('#tm-test-phone-link').click();
  await page.locator('#tm-test-email-link').click();

  const result = await page.evaluate(() => {
    const phoneEvent = window.dataLayer.find((entry) => entry && entry.event_name === 'PHONE_CLICK');
    const emailEvent = window.dataLayer.find((entry) => entry && entry.event_name === 'EMAIL_CLICK');

    return {
      hasPhone: !!phoneEvent,
      hasEmail: !!emailEvent,
      phoneCtaId: phoneEvent?.parameters?.CTA_ID || '',
      emailCtaId: emailEvent?.parameters?.CTA_ID || '',
    };
  });

  expect(result.hasPhone).toBe(true);
  expect(result.hasEmail).toBe(true);
  expect(result.phoneCtaId).toBe('phone_link');
  expect(result.emailCtaId).toBe('email_link');
});

test('historical .html URLs are served or redirected (preview vs production redirects)', async ({ request }) => {
  // Cloudflare `_redirects` maps `/faq.html` -> `/faq` (301). `astro preview` may serve
  // the built HTML at `/faq.html` with 200. Either behavior keeps old inbound links working.
  const res = await request.get('/faq.html');
  expect(res.status()).toBeLessThan(400);
});
