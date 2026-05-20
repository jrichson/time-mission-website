const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { fingerprintAnalyticsLabels } = require('../../scripts/lib/analytics-labels-fingerprint.cjs');
const i18nCatalog = require('../../src/data/site/i18n.json');
const formsLinksAudit = require('../fixtures/forms-links-audit.json');

require('tsx/cjs/api').register();
const { locationsFingerprintFromRecords } = require('../../src/lib/locations-fingerprint.ts');

const REPO_ROOT = path.resolve(__dirname, '../..');
const VIDEO_MEDIA_RE = /\.(mp4|webm)(?:\?.*)?$/i;

test.beforeEach(async ({ page }) => {
  await page.route(VIDEO_MEDIA_RE, (route) => route.abort());
});

async function gotoHome(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1, name: /Time Mission/i }).waitFor({
    state: 'visible',
    timeout: 15000,
  });
}

async function stubBriqWidgetScript(page) {
  const briqScript = { requests: 0 };
  await page.route('https://widgetcdn.briqbookings.com/widget/widget.js', async (route) => {
    briqScript.requests += 1;
    await route.fulfill({
      contentType: 'application/javascript',
      body: `
        (function () {
          function widgetStateIsOpen(state) {
            return String(state || '').indexOf('o|is|true') !== -1;
          }

          function openWidget(host) {
            var root = host.shadowRoot;
            if (!root) return;
            var main = root.querySelector('.bw-widget-main');
            if (!main) return;
            main.classList.remove('bw-closed');
            main.classList.add('bw-open');
            window.__briqBookingOpened = (window.__briqBookingOpened || 0) + 1;
          }

          function closeWidget(host) {
            var root = host.shadowRoot;
            if (!root) return;
            var main = root.querySelector('.bw-widget-main');
            if (!main) return;
            main.classList.remove('bw-open');
            main.classList.add('bw-closed');
          }

          function mountBriqWidgets() {
            document.querySelectorAll('.bw-widget').forEach(function (widget) {
              if (widget.shadowRoot) return;
              var root = widget.attachShadow({ mode: 'open' });
              var main = document.createElement('main');
              main.className = 'bw-widget-main bw-closed';
              main.setAttribute('data-briq-stub-main', '');
              if (!String(widget.getAttribute('data-features') || '').includes('hideMainButton')) {
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'widget-button';
                button.setAttribute('data-briq-stub-button', '');
                button.textContent = widget.getAttribute('data-button-text') || 'BOOK NOW';
                button.addEventListener('click', function () {
                  openWidget(widget);
                });
                main.appendChild(button);
              }
              root.appendChild(main);
            });
            document.querySelectorAll('.bw-widget-toggle').forEach(function (toggle) {
              if (toggle.__briqStubBound) return;
              toggle.__briqStubBound = true;
              toggle.addEventListener('click', function () {
                var host = document.querySelector('.bw-widget');
                if (!host) return;
                if (widgetStateIsOpen(toggle.getAttribute('data-widget-state'))) openWidget(host);
                else closeWidget(host);
              });
            });
          }
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', mountBriqWidgets);
          } else {
            mountBriqWidgets();
          }
        })();
      `,
    });
  });
  return briqScript;
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
  expect(heroMedia.backgroundImage).toContain('hero-poster.jpg');
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

  await page.locator('#ticketLocation').selectOption('antwerp');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute(
    'href',
    'https://timemission.eu/antwerp'
  );
  await expect(page.locator('#ticketBookBtn')).not.toHaveAttribute('data-tm-booking-url');
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
  await page.goto('/philadelphia?book=1');
  await page.waitForFunction(() => window.__rollerCheckoutShown === true);
  await expect(page).toHaveURL(/\/philadelphia$/);
});

test('desktop location selection opens the selected venue page', async ({ page, isMobile }) => {
  // Desktop-only: this flow uses the desktop `#locationBtn` in the nav.
  // Mobile location selection lives inside the hamburger menu and is covered
  // by the dedicated `Mobile location selector (P0-7a)` describe block below.
  test.skip(isMobile, 'desktop-only flow (mobile path covered by P0-7a tests)');

  await page.goto('/');

  await page.locator('#locationBtn').click();
  await page.locator('#locationDropdown a[data-city="Philadelphia"]').click();

  await expect(page).toHaveURL(/\/philadelphia$/);
  await expect(page.locator('#locationText')).toContainText('Philadelphia');
  await expect(page.locator('#locationDropdown')).not.toHaveClass(/open/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBe('philadelphia');
});

test('desktop location hover renders address map preview before selection', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only preview path');

  await page.goto('/');
  await page.locator('.language-switcher--desktop [data-language-select]').selectOption('es');
  await page.locator('#locationBtn').click();
  await expect(page.locator('#locationDropdown')).toHaveClass(/open/);
  await expect(page.locator('#locationDropdown .location-dropdown-title')).toHaveText(i18nCatalog.translations.es['location.title']);

  await page.locator('#locationDropdown a[data-city="Philadelphia"]').hover();
  const className = await page.locator('#locationDropdown').evaluate((el) => el.className || '');
  expect(className).toContain('open');
  expect(className).not.toContain('navigating');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#locationInfo .location-info-name')).toContainText('Philadelphia');
  await expect(page.locator('#locationInfo .location-info-address')).toContainText('1530 Chestnut Street');
  await expect(page.locator('#locationInfo .location-info-directions')).toContainText(i18nCatalog.translations.es['location.getDirections']);
  await expect(page.locator('#locationInfo .location-info-hours')).toContainText(`${i18nCatalog.translations.es['location.day.mon']}:`);
  await expect(page.locator('#locationInfo .location-info-book')).toContainText(i18nCatalog.translations.es['nav.bookNow']);
  await expect(page.locator('#locationMap iframe')).toHaveAttribute('src', /google\.com\/maps/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBeNull();
});

test('location page drives nav state and ticket panel default location', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.goto('/philadelphia');
  await expect(page.locator('#locationText')).toContainText('Philadelphia');
  await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBe('philadelphia');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBe('philadelphia');
  await expect(page.locator('.nav-right .btn-tickets')).toHaveAttribute(
    'href',
    '#'
  );
  await expect(page.locator('.nav-right .btn-tickets')).toHaveAttribute(
    'data-tm-booking-url',
    'https://book.philadelphia.timemission.com/timemissionphiladelphiapa/onlinecheckout/en-us/home'
  );
  await expect(page.locator('.nav-right .btn-tickets')).toHaveAttribute('data-tm-location', 'philadelphia');

  await page.evaluate(() => window.TMBooking.open({ kind: 'tickets' }));
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);
  await expect(page.locator('#ticketLocation')).toHaveValue('philadelphia');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute(
    'href',
    '#'
  );
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute(
    'data-tm-booking-url',
    'https://book.philadelphia.timemission.com/timemissionphiladelphiapa/onlinecheckout/en-us/home'
  );
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

test('group CTAs resolve to audit-provided form URLs for the selected location', async ({ page }) => {
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

test('legacy groups cards open the selected location event form as a direct link', async ({ page }) => {
  await page.route('https://webforms.pipedrive.com/**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Group inquiry</title><main>Group inquiry</main>',
    });
  });

  await page.goto('/groups.html');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);
  await page.evaluate(() => window.TM.select('mount-prospect'));

  const expectedHref = formsLinksAudit.groups['mount-prospect'].corporate;
  await page
    .locator('.event-type-actions [data-tm-booking-kind="groups"][data-tm-group-type="corporate"]')
    .first()
    .click();

  await expect(page).toHaveURL(expectedHref);
});

test('Houston and Orland Park group CTAs resolve to audit-approved forms', async ({ page }) => {
  await page.goto('/groups/corporate');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);

  const houstonCorporate = await page.evaluate(() => window.TMBooking.getDestination({
    kind: 'groups',
    groupType: 'corporate',
    locationId: 'houston',
  }));
  expect(houstonCorporate).toBe(formsLinksAudit.groups.houston.corporate);

  const orlandPrivateEvents = await page.evaluate(() => window.TMBooking.getDestination({
    kind: 'groups',
    groupType: 'private-events',
    locationId: 'orland-park',
  }));
  expect(orlandPrivateEvents).toBe(formsLinksAudit.groups['orland-park']['private-events']);
});

test('Dallas group CTAs stay disabled when the audit has blank group rows', async ({ page }) => {
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

test('gift card page disables locations with blank gift-card audit rows', async ({ page }) => {
  await page.goto('/gift-cards');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);

  for (const locationId of ['antwerp', 'houston', 'dallas']) {
    await page.evaluate((id) => window.TM.select(id), locationId);
    await expect(page.locator('#giftCardBuyBtn')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('#giftCardLocationHint')).toContainText('not available');
  }
});

test('waiver panel disables Houston and Orland Park without waiver fallbacks', async ({ page }) => {
  await page.goto('/waiver');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);

  await page.evaluate(() => window.TMBooking.open({ kind: 'waiver' }));
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);

  for (const locationId of ['houston', 'orland-park']) {
    await page.locator('#ticketLocation').selectOption(locationId);
    await expect(page.locator('#ticketPanelTitle')).toContainText('Waiver Unavailable');
    await expect(page.locator('#ticketBookBtn')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('#ticketBookBtn')).toHaveAttribute('data-tm-location', locationId);
    await expect(page.locator('#ticketBookBtn')).not.toHaveAttribute('data-tm-booking-url', /./);
    await page.locator('#ticketBookBtn').evaluate((button) => button.click());
    await expect(page.locator('.booking-frame-overlay.active')).toHaveCount(0);
  }
});

test('West Nyack routes generic booking to the venue page with tracking params', async ({ page }) => {
  const briqScript = await stubBriqWidgetScript(page);

  await page.goto('/?utm_source=paid&utm_campaign=spring&fbclid=fb123');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);
  expect(briqScript.requests).toBe(0);

  await page.evaluate(() => {
    window.TM.select('west-nyack');
    window.TMBooking.open({ kind: 'tickets' });
  });

  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('href', '/west-nyack?book=1&utm_source=paid&utm_campaign=spring&fbclid=fb123');
  await expect(page.locator('#ticketBookBtn')).not.toHaveAttribute('data-tm-booking-url', /./);

  await page.locator('#ticketBookBtn').click();
  await expect(page).toHaveURL(/\/west-nyack\?utm_source=paid&utm_campaign=spring&fbclid=fb123$/);
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);
  await expect(page.locator('#ticketPanel')).toHaveClass(/ticket-panel--briq/);
  await expect(page.locator('#ticketOverlay')).toHaveClass(/active/);
  await expect(page.locator('#ticketPanel [data-ticket-panel-standard]')).not.toBeVisible();
  await expect(page.locator('#briq-widget-container')).toBeVisible();
  await expect(page.locator('#briq-widget-container')).toHaveClass(/briq-panel-widget/);
  await expect(page.locator('#briq-widget')).toHaveAttribute('data-domain', 'timemission-palisades');
  await expect(page.locator('#briq-widget')).toHaveAttribute('data-button-text', 'BOOK NOW');
  await expect(page.locator('#briq-widget')).toHaveAttribute('data-features', 'hideMainButton');
  await expect(page.locator('#briq-widget')).toHaveAttribute('data-request-on-open', 'PeopleAndDate');
  await expect.poll(() => page.evaluate(() => window.__briqBookingOpened || 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => {
    const host = document.getElementById('briq-widget');
    return host?.shadowRoot?.querySelector('.bw-widget-main')?.className || '';
  })).toContain('bw-open');
  expect(await page.evaluate(() => {
    const host = document.getElementById('briq-widget');
    return !!host?.shadowRoot?.querySelector('[data-briq-stub-button]');
  })).toBe(false);
  await expect(page.locator('.booking-frame-overlay.active')).toHaveCount(0);
  expect(briqScript.requests).toBeGreaterThan(0);
});

test('West Nyack location page opens Briq inside the booking panel instead of an iframe', async ({ page }) => {
  const briqScript = await stubBriqWidgetScript(page);

  await page.goto('/west-nyack');
  await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBe('west-nyack');
  expect(briqScript.requests).toBeGreaterThan(0);

  await page.locator('.nav-right .btn-tickets').click();
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);
  await expect(page.locator('#ticketPanel')).toHaveClass(/ticket-panel--briq/);
  await expect(page.locator('#ticketOverlay')).toHaveClass(/active/);
  await expect(page.locator('#ticketPanel [data-ticket-panel-standard]')).not.toBeVisible();
  await expect(page.locator('#briq-widget-container')).toBeVisible();
  await expect(page.locator('#briq-widget-container')).toHaveClass(/briq-panel-widget/);
  await expect(page.locator('#briq-widget')).toHaveAttribute('data-domain', 'timemission-palisades');
  await expect(page.locator('#briq-widget')).toHaveAttribute('data-color-1-base', '#FFBA00');
  await expect(page.locator('#briq-widget')).toHaveAttribute('data-features', 'hideMainButton');
  await expect(page.locator('#briq-widget')).toHaveAttribute('data-positioning', /\[\{'x-align':'right'/);
  await expect.poll(() => page.evaluate(() => window.__briqBookingOpened || 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => {
    const host = document.getElementById('briq-widget');
    return host?.shadowRoot?.querySelector('.bw-widget-main')?.className || '';
  })).toContain('bw-open');
  expect(await page.evaluate(() => {
    const host = document.getElementById('briq-widget');
    return !!host?.shadowRoot?.querySelector('[data-briq-stub-button]');
  })).toBe(false);
  const briqPanelStyle = await page.locator('#ticketPanel').evaluate((panel) => {
    const style = getComputedStyle(panel);
    return {
      width: style.width,
      position: style.position,
      right: style.right,
      overflow: style.overflow,
    };
  });
  expect(briqPanelStyle.position).toBe('fixed');
  expect(parseFloat(briqPanelStyle.right)).toBe(0);
  expect(briqPanelStyle.overflow).toBe('hidden');
  expect(parseFloat(briqPanelStyle.width)).toBeGreaterThanOrEqual(360);
  await expect(page.locator('.booking-frame-overlay.active')).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(page.locator('#ticketPanel')).not.toHaveClass(/active/);

  await page.evaluate(() => {
    window.__briqBookingOpened = 0;
  });
  await page.locator('main .btn-tickets[data-tm-location="west-nyack"]').first().click();
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);
  await expect(page.locator('#ticketPanel')).toHaveClass(/ticket-panel--briq/);
  await expect.poll(() => page.evaluate(() => window.__briqBookingOpened || 0)).toBeGreaterThan(0);
});

test('faq accordion exposes keyboard accessible controls', async ({ page }) => {
  await page.goto('/faq');

  const firstQuestion = page.locator('.faq-question').first();
  await expect(firstQuestion).toHaveAttribute('role', 'button');
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');

  await firstQuestion.press('Enter');
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
});

test('contact form uses configured submission endpoint', async ({ page }) => {
  await page.goto('/contact');

  const form = page.locator('form.contact-form');
  await expect(form).toHaveAttribute('method', /post/i);
  await expect(form).toHaveAttribute('action', /\/api\/contact$/i);
  await expect(form).toHaveAttribute('data-tm-form', 'contact');
  await expect(form.locator('[data-tm-turnstile]')).toHaveCount(1);
});

test('contact page only shows direct info for the selected location', async ({ page }) => {
  await page.goto('/contact?location=houston&type=updates');

  await expect(page.locator('#location')).toHaveValue('houston');
  await expect(page.locator('[data-location-contact-card]')).toBeVisible();
  await expect(page.locator('[data-location-contact-name]')).toHaveText('Houston');
  await expect(page.locator('[data-location-contact-phone]')).toHaveText('(713) 588-1630');
  await expect(page.locator('[data-location-contact-email-row]')).toBeHidden();
  await expect(page.locator('[data-location-contact-card]')).not.toContainText('Philadelphia');
  await expect(page.locator('[data-location-contact-card]')).not.toContainText('Mount Prospect');

  await page.locator('#location').selectOption('orland-park');
  await expect(page.locator('[data-location-contact-card]')).toBeHidden();
  await expect(page.locator('[data-location-contact-empty]')).toBeVisible();
  await expect(page.locator('[data-location-contact-empty]')).toContainText('Orland Park');
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

test('contact form focus queues CONTACT_FORM_FOCUS in dataLayer (Phase 6)', async ({ page }) => {
  await page.goto('/contact');
  await page.locator('form.contact-form input#name').click();
  const found = await page.evaluate(() => {
    return (
      Array.isArray(window.dataLayer) &&
      window.dataLayer.some((entry) => entry && entry.event_name === 'CONTACT_FORM_FOCUS')
    );
  });
  expect(found).toBe(true);
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
    phone.href = 'tel:+15555555555';
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

test('legacy .html URLs are served or redirected (preview vs production redirects)', async ({ request }) => {
  // Cloudflare `_redirects` maps `/faq.html` -> `/faq` (301). `astro preview` may serve
  // the built HTML at `/faq.html` with 200. Either behavior keeps legacy links working.
  const res = await request.get('/faq.html');
  expect(res.status()).toBeLessThan(400);
});

test.describe('Mobile location selector (P0-7a)', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only test');

  test('tapping a location link opens the venue page without a second tap', async ({ page }) => {
    await page.goto('/');
    await page.locator('#locationBtn').first().click();
    await expect(page.locator('#locationDropdown')).toHaveClass(/open/);

    const philly = page.locator('#locationDropdown a[href*="philadelphia"]').first();
    await philly.tap();

    await expect(page).toHaveURL(/\/philadelphia$/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBe('philadelphia');
    await expect(page.locator('#locationDropdown')).not.toHaveClass(/open/);
  });
});

test.describe('small mobile (375x667)', () => {
  // Phase 11 RESP-01 — assert ≤480 CSS tier holds against built dist at iPhone-SE viewport.
  // Closes the Phase 10 UAT test 8 gap (severity major).
  test.use({ viewport: { width: 375, height: 667 } });

  const REPRESENTATIVE_PAGES = ['/', '/antwerp', '/faq', '/locations'];

  for (const url of REPRESENTATIVE_PAGES) {
    test(`no horizontal scroll on ${url}`, async ({ page }) => {
      await page.goto(url);
      await page.locator('.nav').first().waitFor({ state: 'visible' });
      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        };
      });
      // Allow 1px rounding tolerance — sub-pixel layout artifacts are not a regression.
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
    });
  }

  test('footer-legal row wraps at 375px', async ({ page }) => {
    await page.goto('/about');
    const footerLegal = page.locator('.footer-legal').first();
    await footerLegal.scrollIntoViewIfNeeded();
    await footerLegal.waitFor({ state: 'visible' });

    const wrapInfo = await footerLegal.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        flexWrap: cs.flexWrap,
        offsetHeight: el.offsetHeight,
        childCount: el.children.length,
      };
    });
    expect(wrapInfo.flexWrap).toBe('wrap');
    // With 4+ legal links wrapping to 2 lines at 375px, offsetHeight is > 30px.
    // If only 1 line fits (single short link), childCount being low is also acceptable.
    expect(wrapInfo.offsetHeight).toBeGreaterThan(20);
  });

  test('location button preserves 44x44 tap target', async ({ page }) => {
    await page.goto('/');
    const locBtn = page.locator('.location-btn').first();
    await locBtn.waitFor({ state: 'visible' });
    const box = await locBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test('book-now button preserves 48x44 tap target on small mobile', async ({ page }) => {
    await page.goto('/');
    // Scope to the always-visible nav-bar Book Now (page has 4+ .btn-tickets including
    // a hidden one inside the collapsed mobile menu drawer).
    const ticketsBtn = page.locator('.nav-right .btn-tickets').first();
    await ticketsBtn.waitFor({ state: 'visible' });
    const box = await ticketsBtn.boundingBox();
    expect(box).not.toBeNull();
    // .btn-tickets keeps min-height: 48px per D-A3, even on small mobile (375px viewport).
    expect(box.height).toBeGreaterThanOrEqual(48);
  });
});
