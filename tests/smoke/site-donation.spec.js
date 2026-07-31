const { test, expect } = require('@playwright/test');
const { prepareSiteSmoke } = require('./site-helpers');

test.beforeEach(async ({ page }) => {
  await prepareSiteSmoke(page);
  await page.route('https://forms.roller.app/**', async (route) => {
    await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Donation form</title>' });
  });
});

test('donation page embeds only selected donation-enabled locations', async ({ page }) => {
  const url = 'https://forms.roller.app/#/timemissionmountprospect/953cef02271145c/form';

  await page.goto('/donation');
  await expect.poll(() => page.evaluate(() => Boolean(window.TM?.locations?.length))).toBe(true);

  const section = page.locator('[data-donation-form-section]');
  const frame = page.locator('#donationRequestFrame');
  const formButton = page.locator('.btn-donation').first();
  await expect(section).toBeHidden();
  await expect(formButton).toBeVisible();
  await expect(formButton).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('[data-tm-donation-link]')).toBeHidden();

  await page.evaluate(() => window.TM.select('mount-prospect'));
  await expect(section).toBeVisible();
  await expect(frame).toHaveAttribute('src', url);
  await expect(formButton).toBeHidden();
  await expect(page.locator('#donationLocationHint')).toContainText('Mount Prospect');
  await expect(page.locator('[data-tm-donation-link]')).toBeVisible();

  await page.evaluate(() => window.TM.select('houston'));
  await expect(section).toBeHidden();
  expect(await frame.getAttribute('src')).toBeNull();
  await expect(formButton).toBeVisible();
  await expect(formButton).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('[data-tm-donation-link]')).toBeHidden();
});
