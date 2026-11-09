const { test, expect } = require('@playwright/test');
const { prepareSiteSmoke } = require('./site-helpers');

test.beforeEach(async ({ page }) => {
  await prepareSiteSmoke(page);
  await page.route('https://forms.roller.app/**', async (route) => {
    await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Donation form</title><h1>Donation form</h1>' });
  });
});

test('donation page embeds only selected donation-enabled locations', async ({ page, isMobile }) => {
  const url = 'https://forms.roller.app/#/timemissionmountprospect/953cef02271145c/form';

  await page.goto('/donation');
  await expect.poll(() => page.evaluate(() => Boolean(window.TM?.locations?.length))).toBe(true);

  const section = page.locator('[data-donation-form-section]');
  const frame = page.locator('#donationRequestFrame');
  const formButton = page.locator('.btn-donation').first();
  const hint = page.locator('#donationLocationHint');
  const contact = page.getByRole('link', { name: 'Contact Time Mission', exact: true });
  await expect(section).toBeHidden();
  expect(await frame.getAttribute('src')).toBeNull();
  await expect(formButton).toBeHidden();
  await expect(formButton).toHaveAttribute('aria-disabled', 'true');
  await expect(formButton).toHaveAttribute('href', '#');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('not ready yet');
  await expect(contact).toBeVisible();
  await expect(contact).toHaveAttribute('href', '/contact');
  await expect(page.locator('[data-tm-donation-link]')).toBeHidden();

  await page.locator('#utilityChoose').click();
  await page.locator('#locationDropdown [data-tm-location-slug="mount-prospect"]').click();
  await expect(page).toHaveURL(/\/mount-prospect\/donation$/);
  await expect.poll(() => page.evaluate(() => window.TM?.current?.slug)).toBe('mount-prospect');
  await expect(section).toBeVisible();
  await expect(frame).toHaveAttribute('src', url);
  await frame.scrollIntoViewIfNeeded();
  await expect(page.frameLocator('#donationRequestFrame').getByRole('heading', { name: 'Donation form' })).toBeVisible();
  await expect(formButton).toBeHidden();
  await expect(formButton).not.toHaveAttribute('aria-disabled', 'true');
  await expect(formButton).toHaveAttribute('href', url);
  await expect(hint).toContainText('Mount Prospect');
  await expect(page.locator('[data-tm-donation-link]')).toBeVisible();
  await expect(page.locator('[data-tm-donation-link] a')).toHaveAttribute('href', '/mount-prospect/donation');

  await page.locator(isMobile ? '#utilityLocationName' : '#utilityChange').click();
  await page.locator('#locationDropdown [data-tm-location-slug="houston"]').click();
  await expect(page).toHaveURL(/\/houston\/donation$/);
  await expect.poll(() => page.evaluate(() => window.TM?.current?.slug)).toBe('houston');
  await expect(section).toBeHidden();
  expect(await frame.getAttribute('src')).toBeNull();
  await expect(formButton).toBeHidden();
  await expect(formButton).toHaveAttribute('aria-disabled', 'true');
  await expect(formButton).toHaveAttribute('href', '#');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('not ready for Houston yet');
  await expect(contact).toBeVisible();
  await expect(contact).toHaveAttribute('href', '/houston/contact');
  await expect(page.locator('[data-tm-donation-link]')).toBeHidden();
});
