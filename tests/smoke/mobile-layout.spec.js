const { test, expect } = require('@playwright/test');
const { prepareSmokePage } = require('./network');

test.beforeEach(async ({ page }) => {
  await prepareSmokePage(page);
});

test.describe('Mobile location selector', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only test');

  test('logo home navigation preserves the selected location', async ({ page }) => {
    await page.goto('/mount-prospect');
    await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBe('mount-prospect');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBeNull();

    await page.locator('.nav-logo').first().tap();

    await expect(page).toHaveURL(/\/mount-prospect$/);
    await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBe('mount-prospect');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBeNull();
    await expect(page.locator('#locationText')).toContainText('Mount Prospect');
    await expect.poll(() => page.evaluate(() => document.getElementById('taglineText')?.textContent || ''))
      .toContain('Time Mission Mount Prospect');
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

  test('EU locations expose the counterpart-site handoff', async ({ page }) => {
    await page.goto('/groups?utm_source=paid&utm_campaign=eu');
    await page.locator('#locationBtn').first().click();
    await expect(page.locator('#locationDropdown')).toHaveClass(/open/);

    const brussels = page.locator('#locationDropdown a[data-tm-location-slug="brussels"]').first();
    await expect(brussels).toHaveAttribute(
      'href',
      'https://www.timemission.eu/brussels?utm_source=paid&utm_campaign=eu',
    );
    await expect(brussels).toHaveAttribute('target', '_blank');
    await expect(brussels).toHaveAttribute('data-tm-external-location', 'true');
  });

  test('tapping Edison opens its local page and keeps Supercharged as the action destination', async ({ page }) => {
    await page.goto('/?utm_source=paid&utm_campaign=edison');
    await page.locator('#locationBtn').first().click();
    await expect(page.locator('#locationDropdown')).toHaveClass(/open/);

    const edison = page.locator('#locationDropdown a[data-tm-location-slug="edison"]').first();
    await expect(edison).toHaveAttribute('href', '/edison?utm_source=paid&utm_campaign=edison');
    await edison.tap();

    await expect(page).toHaveURL(/\/edison\?utm_source=paid&utm_campaign=edison$/);
    await expect(page.locator('.hero .btn-location-lead')).toHaveAttribute(
      'href',
      'https://www.superchargednj.com/',
    );
    await expect(page.locator('nav .btn-tickets')).toHaveAttribute(
      'href',
      'https://www.superchargednj.com/?utm_source=paid&utm_campaign=edison',
    );
  });
});

test.describe('small mobile (375x667)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  const REPRESENTATIVE_PAGES = ['/', '/houston', '/faq', '/locations'];

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

  test('experience tiles keep the same mobile sizing across public and location pages', async ({ page }) => {
    const urls = ['/', '/philadelphia', '/houston', '/mount-prospect', '/lincoln', '/nashville'];
    const measured = [];

    for (const url of urls) {
      await page.goto(url);
      const firstCard = page.locator('.experience-card').first();
      await firstCard.waitFor({ state: 'visible' });

      const dimensions = await firstCard.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const carousel = el.closest('.experiences-scroll');
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          display: carousel ? window.getComputedStyle(carousel).display : '',
          pageScrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      });

      measured.push({ url, ...dimensions });
    }

    const [baseline] = measured;
    for (const item of measured) {
      expect(item.display, `${item.url} carousel display`).toBe('flex');
      expect(item.width, `${item.url} card width`).toBe(baseline.width);
      expect(item.height, `${item.url} card height`).toBe(baseline.height);
      expect(item.pageScrollWidth, `${item.url} horizontal overflow`).toBeLessThanOrEqual(item.viewportWidth + 1);
    }
  });

  test('intro stat tiles keep the same mobile grid across location pages', async ({ page }) => {
    const urls = ['/', '/philadelphia', '/west-nyack', '/manassas', '/houston', '/orland-park', '/dallas', '/nashville', '/mount-prospect'];
    const measured = [];

    for (const url of urls) {
      await page.goto(url);
      const firstCard = page.locator('.stats-grid .stat-card').first();
      await firstCard.waitFor({ state: 'visible' });

      const dimensions = await firstCard.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const grid = el.closest('.stats-grid');
        const gridStyle = grid ? window.getComputedStyle(grid) : null;
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          columns: gridStyle ? gridStyle.gridTemplateColumns.split(' ').length : 0,
          pageScrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      });

      measured.push({ url, ...dimensions });
    }

    const [baseline] = measured;
    for (const item of measured) {
      expect(item.columns, `${item.url} stat grid columns`).toBe(2);
      expect(item.width, `${item.url} stat tile width`).toBe(baseline.width);
      expect(item.height, `${item.url} stat tile height`).toBe(baseline.height);
      expect(item.pageScrollWidth, `${item.url} horizontal overflow`).toBeLessThanOrEqual(item.viewportWidth + 1);
    }
  });

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

  test('open menu keeps the location label clear of the booking action', async ({ page }) => {
    const viewports = [320, 360, 375, 390, 430];
    const states = [
      { path: '/', label: 'Select Location' },
      { path: '/mount-prospect', label: 'Mount Prospect' },
    ];

    for (const width of viewports) {
      await page.setViewportSize({ width, height: 667 });

      for (const state of states) {
        await page.goto(state.path);
        await page.locator('.nav-menu-btn').click();

        const locationButton = page.locator('#locationBtn');
        const locationText = page.locator('#locationText');
        const navTickets = page.locator('.nav-right .btn-tickets');

        await expect(locationText).toBeVisible();
        await expect(locationText).toContainText(state.label);
        await expect(navTickets).toBeHidden();

        const [buttonBox, labelBox] = await Promise.all([
          locationButton.boundingBox(),
          locationText.boundingBox(),
        ]);
        expect(buttonBox, `${width}px ${state.label} location button`).not.toBeNull();
        expect(labelBox, `${width}px ${state.label} location label`).not.toBeNull();
        expect(labelBox.x, `${width}px ${state.label} left edge`).toBeGreaterThanOrEqual(buttonBox.x - 1);
        expect(labelBox.x + labelBox.width, `${width}px ${state.label} right edge`)
          .toBeLessThanOrEqual(buttonBox.x + buttonBox.width + 1);
      }
    }
  });
});
