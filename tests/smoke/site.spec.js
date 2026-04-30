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
  await page.goto('/');

  await page.locator('#locationBtn').click();
  await page.locator('#locationDropdown a[data-city="Philadelphia"]').click();

  await page.waitForURL(/\/philadelphia$/);
  await expect(page.locator('#locationText')).toContainText('Philadelphia');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tm_location'))).toBe('philadelphia');
});

test('faq accordion exposes keyboard accessible controls', async ({ page }) => {
  await page.goto('/faq');

  const firstQuestion = page.locator('.faq-question').first();
  await expect(firstQuestion).toHaveAttribute('role', 'button');
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');

  await firstQuestion.press('Enter');
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
});

test('contact form uses configured submission endpoint', async ({ page }) => {
  await page.goto('/contact');

  const form = page.locator('form.contact-form');
  await expect(form).toHaveAttribute('method', /post/i);
  await expect(form).toHaveAttribute('action', /\/contact-thank-you|formspree|netlify/i);
});

test('contact form focus queues CONTACT_FORM_FOCUS in dataLayer (Phase 6)', async ({ page }) => {
  await page.goto('/contact');
  await page.locator('form.contact-form input#name').click();
  const found = await page.evaluate(() => {
    return (
      Array.isArray(window.dataLayer) &&
      window.dataLayer.some((entry) => entry && entry.event_name === 'CONTACT_FORM_FOCUS')
    );
  });
  expect(found).toBe(true);
});

test('startup tagging config exposes consent profile by route type', async ({ page }) => {
  await page.goto('/houston');
  await page.waitForFunction(() => Array.isArray(window.dataLayer) && window.dataLayer.length > 0);
  const usProfile = await page.evaluate(() => {
    return window.dataLayer.find((entry) => entry && entry.event === 'tm_tagging_config')?.consent_profile || '';
  });
  expect(usProfile).toBe('us_open');

  await page.goto('/faq');
  await page.waitForFunction(() => Array.isArray(window.dataLayer) && window.dataLayer.length > 0);
  const globalProfile = await page.evaluate(() => {
    return window.dataLayer.find((entry) => entry && entry.event === 'tm_tagging_config')?.consent_profile || '';
  });
  expect(globalProfile).toBe('global_strict');
});

test('strict profiles do not persist paid attribution before consent grant', async ({ page }) => {
  await page.goto('/faq?utm_source=google&utm_campaign=spring');
  await page.waitForFunction(() => typeof window.TMConsent === 'object');
  const raw = await page.evaluate(() => localStorage.getItem('tm_attribution_v1'));
  expect(raw).toBeNull();

  await page.evaluate(() => {
    window.TMConsent.update({ ad_storage: 'granted' });
  });
  await page.waitForTimeout(50);
  const afterGrant = await page.evaluate(() => localStorage.getItem('tm_attribution_v1'));
  expect(afterGrant).not.toBeNull();
});

test('legacy .html URLs are served or redirected (preview vs production redirects)', async ({ request }) => {
  // Cloudflare `_redirects` maps `/faq.html` -> `/faq` (301). `astro preview` may serve
  // the built HTML at `/faq.html` with 200. Either behavior keeps legacy links working.
  const res = await request.get('/faq.html');
  expect(res.status()).toBeLessThan(400);
});
