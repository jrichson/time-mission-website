const { test, expect } = require('@playwright/test');

/**
 * Stabilize motion-heavy elements before screenshots (VER-04).
 * Hero video and other media can otherwise cause flaky pixel diffs.
 */
async function stabilizeForScreenshot(page) {
  await page.evaluate(() => {
    document.querySelectorAll('video').forEach((v) => {
      try {
        v.pause();
        v.currentTime = 0;
      } catch (_) {
        /* ignore */
      }
    });
  });
  await page.mouse.move(0, 0);
}

test.describe('visual regression (representative templates)', () => {
  test('homepage', async ({ page }) => {
    await page.goto('/');
    await page.locator('.hero-title').first().waitFor({ state: 'visible' });
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: 3000,
    });
  });

  test('open location (Philadelphia)', async ({ page }) => {
    await page.goto('/philadelphia');
    await expect(page).toHaveTitle(/Philadelphia/i);
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('location-open.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: 3000,
    });
  });

  test('coming-soon location (Houston)', async ({ page }) => {
    await page.goto('/houston');
    await expect(page).toHaveTitle(/Houston/i);
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('location-coming-soon.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: 3000,
    });
  });

  test('groups corporate', async ({ page }) => {
    await page.goto('/groups/corporate');
    await expect(page.locator('body')).toBeVisible();
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('groups-corporate.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: 3000,
    });
  });

  test('groups birthdays', async ({ page }) => {
    await page.goto('/groups/birthdays');
    await expect(page.locator('body')).toBeVisible();
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('groups-birthdays.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: 3000,
    });
  });

  test('faq', async ({ page }) => {
    await page.goto('/faq');
    await page.locator('.faq-question').first().waitFor({ state: 'visible' });
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('faq.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: 3000,
    });
  });

  test('contact', async ({ page }) => {
    await page.goto('/contact');
    await page.locator('form.contact-form').waitFor({ state: 'visible' });
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('contact.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: 3000,
    });
  });
});
