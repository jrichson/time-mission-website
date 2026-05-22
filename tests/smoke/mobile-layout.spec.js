const { test, expect } = require('@playwright/test');
const { prepareSmokePage } = require('./network');

test.beforeEach(async ({ page }) => {
  await prepareSmokePage(page);
});

test.describe('Mobile location selector', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only test');

  test('logo home navigation preserves the selected location', async ({ page }) => {
    await page.goto('/philadelphia');
    await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBe('philadelphia');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBeNull();

    await page.locator('.nav-logo').first().tap();

    await expect(page).toHaveURL(/\/philadelphia$/);
    await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBe('philadelphia');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBeNull();
    await expect(page.locator('#locationText')).toContainText('Philadelphia');
    await expect.poll(() => page.evaluate(() => document.getElementById('taglineText')?.textContent || ''))
      .toContain('Time Mission Philadelphia');
  });

  test('tapping a location link keeps the current page context', async ({ page }) => {
    await page.goto('/groups');
    await page.locator('#locationBtn').first().click();
    await expect(page.locator('#locationDropdown')).toHaveClass(/open/);

    const philly = page.locator('#locationDropdown a[href*="philadelphia"]').first();
    await expect(philly).toHaveAttribute('href', '/philadelphia/groups');
    await philly.tap();

    await expect(page).toHaveURL(/\/philadelphia\/groups$/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBeNull();
  });

  test('tapping an EU location selects it without leaving the current page', async ({ page }) => {
    await page.goto('/groups?utm_source=paid&utm_campaign=eu');
    await page.locator('#locationBtn').first().click();
    await expect(page.locator('#locationDropdown')).toHaveClass(/open/);

    const brussels = page.locator('#locationDropdown a[data-tm-location-slug="brussels"]').first();
    await expect(brussels).toHaveAttribute('href', 'https://timemission.eu/brussels?utm_source=paid&utm_campaign=eu');
    await brussels.tap();

    await expect(page).toHaveURL(/\/groups\?utm_source=paid&utm_campaign=eu$/);
    await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBe('brussels');
    await expect(page.locator('#locationText')).toContainText('Brussels');
    await expect(page.locator('nav .btn-tickets')).toHaveAttribute('href', 'https://timemission.eu/brussels?utm_source=paid&utm_campaign=eu');
  });
});

test.describe('small mobile (375x667)', () => {
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
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
    });
  }

  test('selected location is visible in the mobile header without overflow', async ({ page }) => {
    await page.goto('/mount-prospect');
    const locBtn = page.locator('.location-btn').first();
    const locationText = page.locator('#locationText');

    await expect(locBtn).toHaveClass(/has-location/);
    await expect(locationText).toBeVisible();
    await expect(locationText).toContainText('Mount Prospect');
    await expect(locBtn).toHaveAttribute('aria-label', 'Change location: Mount Prospect');

    const labelBox = await locationText.evaluate((el) => ({
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
    }));
    expect(labelBox.scrollWidth).toBeLessThanOrEqual(labelBox.clientWidth + 1);

    const box = await locBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    const overflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
  });

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
    expect(wrapInfo.offsetHeight).toBeGreaterThan(20);
  });

  test('location button preserves 44x44 tap target', async ({ page }) => {
    await page.goto('/');
    const locBtn = page.locator('.location-btn').first();
    await locBtn.waitFor({ state: 'visible' });
    await expect(locBtn).not.toHaveClass(/has-location/);
    const box = await locBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test('book-now button preserves 48x44 tap target on small mobile', async ({ page }) => {
    await page.goto('/');
    const ticketsBtn = page.locator('.nav-right .btn-tickets').first();
    await ticketsBtn.waitFor({ state: 'visible' });
    const box = await ticketsBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(48);
  });
});
