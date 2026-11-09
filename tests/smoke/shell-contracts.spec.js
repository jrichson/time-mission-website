const { test, expect } = require('@playwright/test');
const { prepareSmokePage } = require('./network');

test.beforeEach(async ({ page }) => {
  await prepareSmokePage(page);
});

test('nearby sorting requires an explicit action and preserves the booking venue', async ({ page, isMobile }) => {
  await page.addInitScript(() => {
    window.__locationRequests = 0;
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      getCurrentPosition(success) {
        window.__locationRequests += 1;
        success({ coords: { latitude: 29.7, longitude: -95.5 } });
      },
    } });
  });
  await page.goto('/mount-prospect');
  await expect.poll(() => page.evaluate(() => window.TM?.current?.slug)).toBe('mount-prospect');
  const opener = page.locator(isMobile ? '#utilityLocationName' : '#utilityChange');
  await opener.click();
  const picker = page.locator('#locationDropdown');
  await expect(picker).toHaveClass(/open/);
  expect(await page.evaluate(() => window.__locationRequests)).toBe(0);
  await picker.locator('[data-location-use-mine]').click();
  expect(await page.evaluate(() => window.__locationRequests)).toBe(1);
  await expect(picker.locator('.is-nearest')).toHaveAttribute('data-tm-location-slug', 'houston');
  expect(await page.evaluate(() => window.TM.current.slug)).toBe('mount-prospect');
  expect(await page.evaluate(() => localStorage.getItem('tm_geo_position'))).toBeNull();
  await page.keyboard.press('Escape');
  await expect(picker).not.toHaveClass(/open/);
  await expect(opener).toBeFocused();
});

test('desktop mega menus support focus, ArrowDown and Escape', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop navigation');
  await page.goto('/');
  const trigger = page.locator('.nav-links > .has-mega > a').first();
  const panel = page.locator('#' + await trigger.getAttribute('aria-controls'));
  await trigger.focus();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();
  await trigger.press('ArrowDown');
  await expect(panel.locator('a[href]:visible').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toBeHidden();
});

test('mobile menu traps focus and restores the menu button on Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile navigation');
  await page.goto('/');
  const button = page.locator('.nav-menu-btn');
  const menu = page.locator('#mobileMenu');
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => menu.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  const firstFocused = await page.evaluate(() => document.activeElement.outerHTML);
  const last = menu.locator('.mobile-menu-socials a').last();
  await last.focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement.outerHTML)).toBe(firstFocused);
  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).not.toHaveClass(/open/);
  expect(await menu.evaluate((element) => element.inert)).toBe(true);
});

test('special-date hours stay separate from the recurring weekday schedule', async ({ page }) => {
  await page.goto('/philadelphia');
  await expect.poll(() => page.evaluate(() => window.TM?.current?.slug)).toBe('philadelphia');
  await page.evaluate(() => {
    const location = window.TM.current;
    location.specialHours = [{ date: '2099-12-25', name: 'Holiday', label: '12pm - 9pm' }];
    location.hours = { mon: { label: '12pm - 9pm' }, tue: { label: '12pm - 9pm' } };
    window.TM.select(location.id);
  });
  await page.locator('#utilityLocationName').click();
  const rows = page.locator('#locationInfo .location-hours-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('Holiday');
  await expect(rows.first()).not.toContainText('Mon');
  await expect(rows.last()).toContainText('Mon – Tue');
});

test.describe('booking labels before hydration', () => {
  test.use({ javaScriptEnabled: false });

  for (const [path, label, href] of [
    ['/dallas', 'Book Now', 'https://ecom.roller.app/TimeMissiondallas/onlinecheckout/en-US/products'],
    ['/nashville', 'Contact Us', '/contact#location=nashville&type=updates'],
  ]) {
    test(`preserves ${label} on every shell CTA at ${path}`, async ({ page }) => {
      await page.goto(path);
      for (const selector of ['.nav-right .btn-tickets', '.mobile-book-btn', '.mobile-menu-cta .btn-tickets']) {
        await expect(page.locator(selector)).toHaveText(label);
        await expect(page.locator(selector)).toHaveAttribute('href', href);
        await expect(page.locator(selector)).not.toHaveAttribute('data-tm-booking-trigger');
      }
    });
  }
});
