const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { prepareSiteSmoke, REPO_ROOT } = require('./site-helpers');

test.skip(process.env.TM_SITE_PROFILE !== 'eu', 'EU artifact smoke coverage');

test.beforeEach(async ({ page }) => {
  await prepareSiteSmoke(page);
});

test('EU artifact exposes its identity and isolated location data', async ({ page }) => {
  const markerResponse = await page.request.get('/data/site-profile.json');
  expect(markerResponse.ok()).toBe(true);
  expect(await markerResponse.json()).toMatchObject({
    profile: 'eu',
    origin: 'https://www.timemission.eu',
    pagesProject: 'time-mission-website-eu',
    locales: ['en', 'nl', 'fr', 'es'],
    deploymentReady: expect.any(Boolean),
  });

  const locationsResponse = await page.request.get('/data/locations.json');
  const locations = (await locationsResponse.json()).locations;
  const houston = locations.find((location) => location.slug === 'houston');
  const antwerp = locations.find((location) => location.slug === 'antwerp');

  expect(houston).toMatchObject({
    externalUrl: 'https://www.timemission.com/houston',
    bookingUrl: '',
  });
  expect(houston.pagePath).toBeUndefined();
  expect(houston.groupFormUrls).toBeUndefined();
  expect(antwerp.pagePath).toBe('/antwerp');
  expect(antwerp.externalUrl).toBeUndefined();
});

test('Dutch venue route is server localized with reciprocal SEO metadata', async ({ page }) => {
  await page.goto('/nl/antwerp');

  await expect(page.locator('html')).toHaveAttribute('lang', 'nl-BE');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://www.timemission.eu/nl/antwerp',
  );
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
    'href',
    'https://www.timemission.eu/antwerp',
  );
  await expect(page.locator('link[rel="alternate"][hreflang="fr-BE"]')).toHaveAttribute(
    'href',
    'https://www.timemission.eu/fr/antwerp',
  );
  await expect(page.locator('[data-i18n="nav.about"]').first()).toHaveText('Over ons');
  await expect(page.locator('[data-i18n="nav.bookNow"]').first()).toContainText('Boek nu');
});

test('localized EU routes translate their announcement and footer chrome', async ({ page }) => {
  const routes = [
    {
      path: '/nl/antwerp',
      tickerKey: 'ticker.location.antwerp',
      ticker: 'ZOMERAVONTUREN BIJ TIME MISSION ANTWERPEN',
      city: 'ANTWERPEN',
      tagline: 'Een sociaal game-avontuur waarin teams het tegen elkaar opnemen in meeslepende uitdagingen door tijd en ruimte.',
      experience: 'BELEVING',
      address: 'Adres',
      hours: 'Openingstijden',
      directions: 'Routebeschrijving ↗',
      changeLocation: 'Locatie wijzigen',
      rights: 'Alle rechten voorbehouden.',
      cookiePreferences: 'Cookievoorkeuren',
      firstDay: 'Maandag',
    },
    {
      path: '/fr/brussels',
      tickerKey: 'ticker.location.brussels',
      ticker: 'BRUXELLES EST OUVERT',
      city: 'BRUXELLES',
      tagline: "Une aventure de jeu social où les équipes s'affrontent dans des défis immersifs à travers le temps et l'espace.",
      experience: 'EXPÉRIENCE',
      address: 'Adresse',
      hours: 'Horaires',
      directions: 'Itinéraire ↗',
      changeLocation: 'Changer de site',
      rights: 'Tous droits réservés.',
      cookiePreferences: 'Préférences relatives aux cookies',
      firstDay: 'Lundi',
    },
    {
      path: '/es/eindhoven',
      tickerKey: 'ticker.location.eindhoven',
      ticker: 'PRIMERA UBICACIÓN EN LOS PAÍSES BAJOS, PRÓXIMAMENTE',
      city: 'EINDHOVEN',
      tagline: 'Una aventura de juego social en la que los equipos compiten en desafíos inmersivos a través del tiempo y el espacio.',
      experience: 'EXPERIENCIA',
      address: 'Dirección',
      hours: 'Horarios',
      directions: 'Cómo llegar ↗',
      changeLocation: 'Cambiar ubicación',
      rights: 'Todos los derechos reservados.',
      cookiePreferences: 'Preferencias de cookies',
      status: 'Muy pronto',
    },
  ];

  for (const route of routes) {
    await page.goto(route.path);

    await expect(page.locator(`[data-i18n="${route.tickerKey}"]`).first()).toHaveText(route.ticker);
    await expect(page.locator('.footer-locations-title')).toHaveText(route.city);
    await expect(page.locator('.footer-brand p')).toHaveText(route.tagline);
    await expect(page.locator('.footer-title').first()).toHaveText(route.experience);
    await expect(page.locator('.footer-loc-label').first()).toHaveText(route.address);
    await expect(page.locator('.footer-loc-hours-summary')).toContainText(route.hours);
    await expect(page.locator('.footer-loc-map')).toHaveText(route.directions);
    await expect(page.locator('.footer-loc-change')).toHaveText(route.changeLocation);
    await expect(page.locator('.footer-copyright [data-i18n="footer.rights"]')).toHaveText(route.rights);
    await expect(page.locator('[data-cc="show-preferencesModal"]')).toHaveText(route.cookiePreferences);
    if (route.firstDay) {
      await expect(page.locator('.footer-hours-row').first().locator('span').first()).toHaveText(route.firstDay);
    }
    if (route.status) {
      await expect(page.locator('.footer-hours-row--note span').last()).toHaveText(route.status);
    }

    const layout = await page.locator('.footer').evaluate((footer) => ({
      clientWidth: footer.clientWidth,
      scrollWidth: footer.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(layout.clientWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  }
});

test('browser language produces a suggestion instead of a forced redirect', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'nl-NL' });
    Object.defineProperty(navigator, 'languages', { configurable: true, get: () => ['nl-NL', 'en'] });
  });

  await page.goto('/antwerp');

  await expect(page).toHaveURL(/\/antwerp$/);
  const suggestion = page.locator('[data-language-suggestion]');
  await expect(suggestion).toBeVisible();
  await expect(suggestion).toHaveAttribute('lang', 'nl');
  await expect(suggestion.locator('[data-language-suggestion-copy]'))
    .toHaveText('Deze site in het Nederlands bekijken?');
  const action = suggestion.locator('[data-language-suggestion-link]');
  await expect(action).toHaveText('Bekijk in het Nederlands');
  await expect(action).toHaveAttribute('href', /\/nl\/antwerp$/);

  const layout = await suggestion.evaluate((element) => {
    const card = element.getBoundingClientRect();
    const copy = element.querySelector('[data-language-suggestion-copy]').getBoundingClientRect();
    const link = element.querySelector('[data-language-suggestion-link]').getBoundingClientRect();
    return {
      card: { bottom: card.bottom, left: card.left, right: card.right, top: card.top },
      copyBottom: copy.bottom,
      linkTop: link.top,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  });
  expect(layout.card.left).toBeGreaterThanOrEqual(0);
  expect(layout.card.right).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.card.top).toBeGreaterThanOrEqual(0);
  expect(layout.card.bottom).toBeLessThanOrEqual(layout.viewportHeight);
  if (layout.viewportWidth <= 480) {
    expect(layout.linkTop).toBeGreaterThanOrEqual(layout.copyBottom - 1);
  }
});

test('EU navigation lists Europe before the United States', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.location-overlay-left .location-group').first())
    .toHaveAttribute('data-location-region', 'europe');
  await expect(page.locator('.footer-locations-dropdown .footer-location-group').first())
    .toHaveAttribute('data-location-region', 'europe');

  const overlayOrder = await page.locator('.location-overlay-left .location-group')
    .evaluateAll((groups) => groups.map((group) => group.getAttribute('data-location-region')));
  const footerOrder = await page.locator('.footer-locations-dropdown .footer-location-group')
    .evaluateAll((groups) => groups.map((group) => group.getAttribute('data-location-region')));
  expect(overlayOrder).toEqual(['europe', 'us']);
  expect(footerOrder).toEqual(['europe', 'us']);

  const europeGroup = page.locator('.location-overlay-left .location-group[data-location-region="europe"]');
  const usGroup = page.locator('.location-overlay-left .location-group[data-location-region="us"]');
  await expect(europeGroup.locator('a[data-tm-location-slug="brussels"] .coming-soon-tag'))
    .toHaveText('OPEN NOW!');
  await expect(europeGroup.locator('a[data-tm-location-slug="eindhoven"] .coming-soon-tag'))
    .toHaveCount(0);
  await expect(usGroup.locator('.coming-soon-tag')).toHaveCount(0);

  await page.goto('/locations');
  await expect(page.locator('.locations-list .loc-group').first())
    .toHaveAttribute('data-location-region', 'europe');
  await expect(page.locator('.loc-row[href="/eindhoven"] .loc-state')).toHaveText('NL');

  await page.goto('/contact');
  await expect(page.locator('#location optgroup').first()).toHaveAttribute('label', 'Europe');
  await expect(page.locator('.general-contact a[href^="mailto:"]')).toHaveText('info@timemission.eu');

  await page.goto('/');
  const ticketValues = await page.locator('#ticketLocation option:not([value=""])')
    .evaluateAll((options) => options.slice(0, 3).map((option) => option.value));
  expect(ticketValues).toEqual(['antwerp', 'brussels', 'eindhoven']);
  await expect(page.locator('.testimonial-card')).toHaveCount(0);
});

test('EU contact form lists only EU locations', async ({ page }) => {
  await page.goto('/contact');

  const contactLocationGroups = page.locator('#location optgroup');
  await expect(contactLocationGroups).toHaveCount(1);
  await expect(contactLocationGroups.first()).toHaveAttribute('label', 'Europe');
  const contactLocationValues = await page.locator('#location option:not([value=""])')
    .evaluateAll((options) => options.map((option) => option.value));
  expect(contactLocationValues).toEqual(['antwerp', 'brussels', 'eindhoven', 'general']);
});

test('EU consent starts denied and GTM is not requested before opt-in', async ({ page }) => {
  const gtmRequests = [];
  page.on('request', (request) => {
    if (request.url().includes('googletagmanager.com/gtm.js')) gtmRequests.push(request.url());
  });

  await page.goto('/');
  const consent = await page.evaluate(() => ({
    profile: window.__TM_TAGGING_CONFIG__?.consent_profile,
    state: window.__TM_CONSENT_STATE__,
  }));

  expect(consent.profile).toBe('eu_strict');
  expect(consent.state).toMatchObject({
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  expect(gtmRequests).toEqual([]);
});

test('EU attribution is not persisted until consent is granted', async ({ page }) => {
  await page.goto('/faq?utm_source=google&utm_campaign=spring');
  await page.waitForFunction(() => typeof window.TMConsent === 'object');
  expect(await page.evaluate(() => localStorage.getItem('tm_attribution_v1'))).toBeNull();

  await page.evaluate(() => {
    window.TMConsent.update({ ad_storage: 'granted' });
  });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_attribution_v1')))
    .not.toBeNull();
});

test('US venue HTML and form artifacts are absent from the EU package', async () => {
  const missingPaths = [
    'houston.html',
    'houston/spinandscore/rules.html',
    'nl/houston.html',
    'groups/inquire/manassas/default.html',
    'group-form-thank-you/manassas/default.html',
  ];
  for (const relPath of missingPaths) {
    expect(fs.existsSync(path.join(REPO_ROOT, 'dist', relPath)), relPath).toBe(false);
  }

  const redirects = fs.readFileSync(path.join(REPO_ROOT, 'dist', '_redirects'), 'utf8');
  expect(redirects).toContain(
    '/houston/spinandscore/rules https://www.timemission.com/houston/spinandscore/rules 301',
  );
  expect(redirects).toContain('/nl/houston https://www.timemission.com/houston 301');
});
