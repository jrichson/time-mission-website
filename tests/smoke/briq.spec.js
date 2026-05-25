const { test, expect } = require('@playwright/test');
const { prepareSmokePage } = require('./network');
const { stubBriqWidgetScript } = require('./briq-fixtures');

test.beforeEach(async ({ page }) => {
  await prepareSmokePage(page);
});

test('West Nyack group inquiry CTAs hand off to the Briq widget instead of the raw Briq site', async ({ page }) => {
  const briqScript = await stubBriqWidgetScript(page);
  const briqProviderRequests = [];
  await page.route('https://timemission-palisades.briqbookings.com/**', async (route) => {
    briqProviderRequests.push(route.request().url());
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Unexpected raw Briq navigation</title>',
    });
  });

  await page.goto('/groups');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);
  await page.evaluate(() => window.TM.select('west-nyack'));

  await expect.poll(() => page.evaluate(() => window.TMBooking.resolveIntent({
    kind: 'groups',
    groupType: 'private-events',
    locationId: 'west-nyack',
  })?.href || '')).toBe('#briq-widget-container');

  await page
    .locator('[data-tm-booking-kind="groups"][data-tm-group-type="private-events"]')
    .first()
    .click();

  await expect(page).toHaveURL(/\/groups$/);
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);
  await expect(page.locator('#ticketPanel')).toHaveClass(/ticket-panel--briq/);
  await expect(page.locator('#briq-widget-container')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__briqBookingOpened || 0)).toBeGreaterThan(0);
  expect(briqScript.requests).toBeGreaterThan(0);
  expect(briqProviderRequests).toHaveLength(0);
});

test('West Nyack routes generic booking to the current-page Briq panel', async ({ page }) => {
  const briqScript = await stubBriqWidgetScript(page);

  await page.goto('/?utm_source=paid&utm_campaign=spring&fbclid=fb123');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);
  expect(briqScript.requests).toBe(0);

  await page.evaluate(() => {
    window.TM.select('west-nyack');
    window.TMBooking.open({ kind: 'tickets' });
  });

  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('href', '#');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('data-tm-booking-url', '#briq-widget-container');

  await page.locator('#ticketBookBtn').click();
  await expect(page).toHaveURL(/\/\?utm_source=paid&utm_campaign=spring&fbclid=fb123$/);
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);
  await expect(page.locator('#ticketPanel')).toHaveClass(/ticket-panel--briq/);
  await expect(page.locator('#ticketOverlay')).toHaveClass(/active/);
  await expect(page.locator('#ticketPanel [data-ticket-panel-standard]')).not.toBeVisible();
  await expect(page.locator('#briq-widget-container')).toBeVisible();
  await expect(page.locator('#briq-widget-container')).toHaveClass(/briq-panel-widget/);
  await expect(page.locator('#briq-widget')).toHaveAttribute('data-domain', 'timemission-palisades');
  await expect(page.locator('#briq-widget')).toHaveAttribute('data-button-text', 'BOOK NOW');
  await expect(page.locator('#briq-widget')).toHaveAttribute('data-features', 'hideMainButton');
  await expect(page.locator('#briq-widget')).not.toHaveAttribute('data-request-on-open', /./);
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

test('West Nyack Briq panel shows loading feedback until the widget opens', async ({ page }) => {
  await stubBriqWidgetScript(page, { mountDelayMs: 700 });

  await page.goto('/?utm_source=paid&utm_campaign=spring');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);

  await page.evaluate(() => {
    window.TM.select('west-nyack');
    window.TMBooking.open({ kind: 'tickets' });
  });

  await page.locator('#ticketBookBtn').click();

  const loader = page.locator('#briq-widget-container [data-briq-widget-loader]');
  await expect(page.locator('#ticketPanel')).toHaveClass(/ticket-panel--briq/);
  await expect(page.locator('#briq-widget-container')).toHaveClass(/is-loading/);
  await expect(page.locator('#briq-widget-container')).toHaveAttribute('aria-busy', 'true');
  await expect(loader).toBeVisible();
  await expect(loader).toContainText('Loading booking options');

  await expect.poll(() => page.evaluate(() => window.__briqBookingOpened || 0)).toBeGreaterThan(0);
  await expect(page.locator('#briq-widget-container')).not.toHaveClass(/is-loading/);
  await expect(page.locator('#briq-widget-container')).not.toHaveAttribute('aria-busy', 'true');
  await expect(loader).toBeHidden();
});

test('West Nyack falls back to the Briq site if the widget script fails', async ({ page }) => {
  let widgetScriptRequests = 0;
  const briqProviderRequests = [];
  await page.route('https://widgetcdn.briqbookings.com/widget/widget.js', async (route) => {
    widgetScriptRequests += 1;
    await route.abort('failed');
  });
  await page.route(/https:\/\/timemission-palisades\.briqbookings\.com\/?.*/, async (route) => {
    briqProviderRequests.push(route.request().url());
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Briq fallback</title>',
    });
  });

  await page.goto('/?utm_source=paid&utm_campaign=spring');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);

  await page.evaluate(() => {
    window.TM.select('west-nyack');
    window.TMBooking.open({ kind: 'tickets' });
  });

  await page.locator('#ticketBookBtn').click();

  await expect(page).toHaveURL(
    /https:\/\/timemission-palisades\.briqbookings\.com\/?\?utm_source=paid&utm_campaign=spring/,
    { timeout: 12000 },
  );
  expect(widgetScriptRequests).toBeGreaterThan(0);
  expect(briqProviderRequests).toHaveLength(1);
});

test('West Nyack location page opens Briq inside the booking panel instead of an iframe', async ({ page }) => {
  const briqScript = await stubBriqWidgetScript(page);

  await page.goto('/west-nyack');
  await expect.poll(() => page.evaluate(() => window.TM?.current?.slug || null)).toBe('west-nyack');

  await page.locator('.nav-right .btn-tickets').click();
  await expect.poll(() => briqScript.requests).toBeGreaterThan(0);
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
      viewportWidth: document.documentElement.clientWidth,
    };
  });
  expect(briqPanelStyle.position).toBe('fixed');
  expect(parseFloat(briqPanelStyle.right)).toBe(0);
  expect(briqPanelStyle.overflow).toBe('hidden');
  if (briqPanelStyle.viewportWidth > 650) {
    expect(parseFloat(briqPanelStyle.width)).toBeGreaterThan(600);
  } else {
    expect(parseFloat(briqPanelStyle.width)).toBeGreaterThanOrEqual(Math.min(390, briqPanelStyle.viewportWidth));
  }
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
