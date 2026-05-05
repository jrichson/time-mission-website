const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { fingerprintAnalyticsLabels } = require('../../scripts/lib/analytics-labels-fingerprint.cjs');

require('tsx/cjs/api').register();
const { locationsFingerprintFromRecords } = require('../../src/lib/locations-fingerprint.ts');

const REPO_ROOT = path.resolve(__dirname, '../..');

/** Wait for GTM bootstrap push, then read `consent_profile` from `tm_tagging_config`. */
async function readTaggingConsentProfile(page) {
  await page.waitForFunction(() => Array.isArray(window.dataLayer) && window.dataLayer.length > 0);
  return page.evaluate(() => {
    return window.dataLayer.find((entry) => entry && entry.event === 'tm_tagging_config')?.consent_profile || '';
  });
}

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

  const expectedCount = await page.evaluate(() =>
    typeof window.__TM_SITE_CONTRACT__ === 'object' && window.__TM_SITE_CONTRACT__
      ? window.__TM_SITE_CONTRACT__.ticketOptionCount
      : 0
  );
  expect(expectedCount).toBeGreaterThan(0);

  await page.locator('.hero-cta .btn-tickets').click();

  const options = page.locator('#ticketLocation option');
  await expect(options).toHaveCount(expectedCount);

  await page.locator('#ticketLocation').selectOption('orland-park');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('href', '/orland-park?book=1');

  await page.locator('#ticketLocation').selectOption('manassas');
  await expect(page.locator('#ticketBookBtn')).toHaveAttribute('href', '/manassas?book=1');
});

test('embedded site contract analytics slice matches analytics-labels.json', async ({ page }) => {
  const labelsPath = path.join(REPO_ROOT, 'src', 'data', 'site', 'analytics-labels.json');
  const labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
  const expectedFp = fingerprintAnalyticsLabels(labels);
  const expectedEventNames = Object.keys(labels.eventNames).length;
  const expectedParams = Object.keys(labels.parameters).length;

  await page.goto('/');
  const got = await page.evaluate(() => {
    const c = window.__TM_SITE_CONTRACT__;
    return c && c.analytics ? c.analytics : null;
  });
  expect(got).toBeTruthy();
  expect(got.fingerprint).toBe(expectedFp);
  expect(got.eventNameCount).toBe(expectedEventNames);
  expect(got.parameterCount).toBe(expectedParams);
});

test('embedded site contract locationsFingerprint matches data/locations.json roster', async ({ page }) => {
  const locDoc = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data', 'locations.json'), 'utf8'));
  const expected = locationsFingerprintFromRecords(locDoc.locations || []);

  await page.goto('/');
  const got = await page.evaluate(() =>
    window.__TM_SITE_CONTRACT__ ? window.__TM_SITE_CONTRACT__.locationsFingerprint : null
  );
  expect(got).toBe(expected);
  expect(typeof got).toBe('string');
  expect(got.length).toBe(8);
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

test('location selection persists canonical slug', async ({ page, isMobile }) => {
  // Desktop-only: this flow uses the desktop `#locationBtn` in the nav.
  // Mobile location selection lives inside the hamburger menu and is covered
  // by the dedicated `Mobile location selector (P0-7a)` describe block below.
  test.skip(isMobile, 'desktop-only flow (mobile path covered by P0-7a tests)');

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
  await expect.poll(async () => readTaggingConsentProfile(page)).toBe('us_open');

  await page.goto('/faq');
  await expect.poll(async () => readTaggingConsentProfile(page)).toBe('global_strict');
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

test('analytics click delegation tracks phone and email clicks without PII', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => {
    const phone = document.createElement('a');
    phone.id = 'tm-test-phone-link';
    phone.href = 'tel:+15555555555';
    phone.textContent = 'Call Test';
    document.body.appendChild(phone);

    const email = document.createElement('a');
    email.id = 'tm-test-email-link';
    email.href = 'mailto:test@example.com';
    email.textContent = 'Email Test';
    document.body.appendChild(email);
  });

  await page.locator('#tm-test-phone-link').click();
  await page.locator('#tm-test-email-link').click();

  const result = await page.evaluate(() => {
    const phoneEvent = window.dataLayer.find((entry) => entry && entry.event_name === 'PHONE_CLICK');
    const emailEvent = window.dataLayer.find((entry) => entry && entry.event_name === 'EMAIL_CLICK');

    return {
      hasPhone: !!phoneEvent,
      hasEmail: !!emailEvent,
      phoneCtaId: phoneEvent?.parameters?.CTA_ID || '',
      emailCtaId: emailEvent?.parameters?.CTA_ID || '',
    };
  });

  expect(result.hasPhone).toBe(true);
  expect(result.hasEmail).toBe(true);
  expect(result.phoneCtaId).toBe('phone_link');
  expect(result.emailCtaId).toBe('email_link');
});

test('legacy .html URLs are served or redirected (preview vs production redirects)', async ({ request }) => {
  // Cloudflare `_redirects` maps `/faq.html` -> `/faq` (301). `astro preview` may serve
  // the built HTML at `/faq.html` with 200. Either behavior keeps legacy links working.
  const res = await request.get('/faq.html');
  expect(res.status()).toBeLessThan(400);
});

test.describe('Mobile location selector (P0-7a)', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only test');

  test('tapping a location link keeps overlay open and reveals info panel', async ({ page }) => {
    await page.goto('/');
    // Open the location overlay
    await page.locator('#locationBtn').first().click();
    await expect(page.locator('#locationDropdown')).toHaveClass(/open/);

    // Tap the Philadelphia link inside the overlay
    const philly = page.locator('#locationDropdown a[href*="philadelphia"]').first();
    await philly.tap();

    // Assertion 1: location-info panel is visible
    await expect(page.locator('#locationInfo')).toBeVisible();

    // Assertion 2: overlay did NOT auto-close (still has .open class)
    await expect(page.locator('#locationDropdown')).toHaveClass(/open/);
  });
});
