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
      videoFallback: el.classList.contains('is-video-fallback'),
      videoReady: el.classList.contains('is-video-ready'),
    };
  });
  expect(heroMedia.backgroundImage).toMatch(/hero-poster(?:-(?:960|1200)\.webp|\.jpg)/);
  expect(heroMedia.videoFallback).toBe(false);
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

  await page.goto('/about');
  await expect.poll(() => page.evaluate(() => Boolean(window.__TM_I18N__?.translations?.es))).toBe(true);

  await page.locator('.language-switcher--desktop [data-language-select]').selectOption('es');
  await expect(page.locator('.nav-links a[href="/es/about"]')).toHaveText('Acerca de');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('es');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_language'))).toBe('es');

  await page.locator('.nav-right .btn-tickets').click();
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
  await expect(page).toHaveURL(/\/es\/groups\/corporate$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://www.timemission.com/es/groups/corporate',
  );
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('es');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_language'))).toBe('es');
});

test('explicit US language URLs override the saved preference', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tm_language', 'en'));
  await page.goto('/es/faq');
  await waitForLanguageRuntime(page);

  await expect(page).toHaveURL(/\/es\/faq\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect.poll(() => page.evaluate(() => window.TMI18n.getLanguage())).toBe('es');
  await expect(page.locator('[data-language-select]').first()).toHaveValue('es');

  await page.evaluate(() => localStorage.setItem('tm_language', 'es'));
  await page.goto('/faq');
  await waitForLanguageRuntime(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect.poll(() => page.evaluate(() => window.TMI18n.getLanguage())).toBe('en');
  await expect(page.locator('[data-language-select]').first()).toHaveValue('en');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_language'))).toBe('en');
});

test('selected US language persists across location and FAQ navigation', async ({ page, isMobile }) => {
  await page.goto('/philadelphia');
  await waitForLanguageRuntime(page, true);

  if (isMobile) {
    await page.locator('.nav-menu-btn').click();
    await page.locator('.language-switcher--mobile [data-language-select]').selectOption('es');
  } else {
    await page.locator('.language-switcher--desktop [data-language-select]').selectOption('es');
  }

  await expect(page).toHaveURL(/\/es\/philadelphia\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect.poll(() => page.evaluate(() => window.TMI18n.getLanguage())).toBe('es');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_language'))).toBe('es');

  await page.locator('#locationBtn').click();
  const manassas = page.locator('#locationDropdown a[data-tm-location-slug="manassas"]');
  await expect(manassas).toHaveAttribute('href', '/es/manassas');
  await manassas.click();
  await expect(page).toHaveURL(/\/es\/manassas\/?$/);
  await waitForLanguageRuntime(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect.poll(() => page.evaluate(() => window.TMI18n.getLanguage())).toBe('es');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_language'))).toBe('es');

  if (isMobile) {
    await page.locator('.nav-menu-btn').click();
    await page.locator('#mobileMenu a[data-i18n="nav.faq"]').click();
  } else {
    await page.locator('.nav-links a[data-i18n="nav.faq"]').click();
  }

  await expect(page).toHaveURL(/\/es\/faq\/?$/);
  await waitForLanguageRuntime(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.locator('.faq-question').first()).toBeAttached();
  await expect.poll(() => page.evaluate(() => window.TMI18n.getLanguage())).toBe('es');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_language'))).toBe('es');
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

test('historical .html URLs are served or redirected (preview vs production redirects)', async ({ request }) => {
  // Cloudflare `_redirects` maps `/faq.html` -> `/faq` (301). `astro preview` may serve
  // the built HTML at `/faq.html` with 200. Either behavior keeps old inbound links working.
  const res = await request.get('/faq.html');
  expect(res.status()).toBeLessThan(400);
});
