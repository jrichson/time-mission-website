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
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('href', '/orland-park?book=1');

  await page.locator('#ticketLocation').selectOption('manassas');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('href', '/manassas?book=1');
});

test('open location ?book=1 navigates to https checkout', async ({ page }) => {
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/philadelphia') {
      u.pathname = '/philadelphia.html';
      return route.continue({ url: u.toString() });
    }
    return route.continue();
  });

  // BOOK-04: assert outbound navigation targets https checkout — do not require
  // third-party page load (TLS / corporate proxies may yield chrome-error).
  const checkoutNav = page.waitForRequest(
    (req) => {
      const url = req.url();
      return req.isNavigationRequest() && url.startsWith('https://') && !url.includes('127.0.0.1');
    },
    { timeout: 15_000 }
  );

  await page.goto('/philadelphia?book=1');
  const firstHttps = await checkoutNav;
  expect(firstHttps.url()).toMatch(/^https:\/\//);
  expect(firstHttps.url()).not.toContain('book=1');
});

test('location selection persists canonical slug', async ({ page }) => {
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/philadelphia') {
      u.pathname = '/philadelphia.html';
      return route.continue({ url: u.toString() });
    }
    return route.continue();
  });

  await page.goto('/');

  await page.locator('#locationBtn').click();
  await page.locator('#locationDropdown a[data-city="Philadelphia"]').click();

  await page.waitForURL(/\/philadelphia(?:\.html)?$/);
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
