const { test, expect } = require('@playwright/test');

test('homepage loads core navigation and booking panel', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Time Mission/i);
  await expect(page.locator('.hero-title')).toContainText(/STEP INTO THE/i);
  await expect(page.locator('.hero-title [aria-label="MISSION"]')).toBeVisible();

  await page.locator('.hero-cta .btn-tickets').click();
  await expect(page.locator('#ticketPanel')).toHaveClass(/active/);
  await expect(page.locator('#ticketLocation')).toBeVisible();
  await expect(page.locator('#ticketClose')).toHaveAccessibleName(/close ticket panel/i);
});

test('ticket panel options hydrate from location data', async ({ page }) => {
  await page.goto('/');
  await page.locator('.hero-cta .btn-tickets').click();

  const options = page.locator('#ticketLocation option');
  await expect(options).toHaveCount(10);

  await page.locator('#ticketLocation').selectOption('orland-park');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('href', 'orland-park.html?book=1');

  await page.locator('#ticketLocation').selectOption('manassas');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('href', 'manassas.html?book=1');
});

test('location selection persists canonical slug', async ({ page }) => {
  await page.goto('/');

  await page.locator('#locationBtn').click();
  await page.locator('#locationDropdown a[data-city="Philadelphia"]').click();

  await page.waitForURL(/philadelphia\.html$/);
  await expect(page.locator('#locationText')).toContainText('Philadelphia');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBe('philadelphia');
});

test('faq accordion exposes keyboard accessible controls', async ({ page }) => {
  await page.goto('/faq.html');

  const firstQuestion = page.locator('.faq-question').first();
  await expect(firstQuestion).toHaveAttribute('role', 'button');
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');

  await firstQuestion.press('Enter');
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
});

test('contact form uses configured submission endpoint', async ({ page }) => {
  await page.goto('/contact.html');

  const form = page.locator('form.contact-form');
  await expect(form).toHaveAttribute('method', /post/i);
  await expect(form).toHaveAttribute('action', /\/contact-thank-you|formspree|netlify/i);
});
