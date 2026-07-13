const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { prepareSmokePage } = require('./network');

const REPO_ROOT = path.resolve(__dirname, '../..');
const locationRecords = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data', 'locations.json'), 'utf8')).locations || [];
const contactLocations = locationRecords.filter((loc) => {
  const contact = loc.contact || {};
  return !loc.externalUrl && (String(contact.phone || '').trim() || String(contact.email || '').trim());
});

test.beforeEach(async ({ page }) => {
  await prepareSmokePage(page);
});

test('contact form uses configured submission endpoint', async ({ page }) => {
  await page.goto('/contact');

  const form = page.locator('form.contact-form');
  await expect(form).toHaveAttribute('method', /post/i);
  await expect(form).toHaveAttribute('action', /\/api\/contact$/i);
  await expect(form).toHaveAttribute('data-tm-form', 'contact');
  await expect(form.locator('[data-tm-turnstile]')).toHaveCount(1);
});

test('Nashville publishes its direct email on contact surfaces', async ({ page }) => {
  await page.goto('/contact#location=nashville&type=updates');

  await expect(page.locator('#location')).toHaveValue('nashville');
  await expect(page.locator('[data-location-contact-email-row]')).toBeVisible();
  await expect(page.locator('[data-location-contact-email]')).toHaveText('nashville@timemission.com');
  await expect(page.locator('[data-location-contact-email]')).toHaveAttribute(
    'href',
    'mailto:nashville@timemission.com',
  );

  await page.goto('/nashville');
  await expect(page.locator('footer .footer-links a', { hasText: 'Contact Us' })).toHaveAttribute(
    'href',
    'mailto:nashville@timemission.com',
  );
});

test('contact page only shows direct info for the selected location', async ({ page }) => {
  await page.goto('/contact#location=houston&type=updates');

  await expect(page.locator('#location')).toHaveValue('houston');
  await expect(page.locator('[data-location-contact-card]')).toBeVisible();
  await expect(page.locator('[data-location-contact-name]')).toHaveText('Houston');
  await expect(page.locator('[data-location-contact-phone]')).toHaveText('(713) 588-1630');
  await expect(page.locator('[data-location-contact-email-row]')).toBeHidden();
  await expect(page.locator('[data-location-contact-card]')).not.toContainText('Philadelphia');
  await expect(page.locator('[data-location-contact-card]')).not.toContainText('Mount Prospect');

  await page.locator('#location').selectOption('orland-park');
  await expect(page.locator('[data-location-contact-card]')).toBeVisible();
  await expect(page.locator('[data-location-contact-name]')).toHaveText('Orland Park');
  await expect(page.locator('[data-location-contact-phone]')).toHaveText('(708) 294-8711');
  await expect(page.locator('[data-location-contact-email]')).toHaveText('OrlandPark@TimeMission.com');
  await expect(page.locator('[data-location-contact-card]')).not.toContainText('Houston');

  await page.locator('#location').selectOption('dallas');
  await expect(page.locator('[data-location-contact-card]')).toBeHidden();
  await expect(page.locator('[data-location-contact-empty]')).toBeVisible();
  await expect(page.locator('[data-location-contact-empty]')).toContainText('Dallas');
});

test('contact page still accepts historical query prefill links', async ({ page }) => {
  await page.goto('/contact?location=houston&type=updates');

  await expect(page.locator('#location')).toHaveValue('houston');
  await expect(page.locator('#subject')).toHaveValue('general');
  await expect(page).toHaveURL(/\/contact$/);
});

test('contact page follows the active site location', async ({ page }) => {
  await page.goto('/contact');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);

  await page.evaluate(() => window.TM.select('west-nyack'));
  await expect(page.locator('#location')).toHaveValue('west-nyack');
  await expect(page.locator('[data-location-contact-card]')).toBeVisible();
  await expect(page.locator('[data-location-contact-name]')).toHaveText('West Nyack');

  await page.evaluate(() => window.TM.select('philadelphia'));
  await expect(page.locator('#location')).toHaveValue('philadelphia');
  await expect(page.locator('[data-location-contact-name]')).toHaveText('Philadelphia');
});

test('contact page displays configured direct info for every location that has it', async ({ page }) => {
  await page.goto('/contact');
  await expect.poll(() => page.evaluate(() => window.TM?.locations?.length || 0)).toBeGreaterThan(0);

  for (const loc of contactLocations) {
    const contact = loc.contact || {};
    const phone = String(contact.phone || '').trim();
    const email = String(contact.email || '').trim();

    await page.locator('#location').selectOption(loc.id);
    await expect(page.locator('#location')).toHaveValue(loc.id);
    await expect(page.locator('[data-location-contact-card]')).toBeVisible();
    await expect(page.locator('[data-location-contact-name]')).toHaveText(loc.shortName || loc.name);

    if (phone) {
      await expect(page.locator('[data-location-contact-phone-row]')).toBeVisible();
      await expect(page.locator('[data-location-contact-phone]')).toHaveText(phone);
    } else {
      await expect(page.locator('[data-location-contact-phone-row]')).toBeHidden();
    }

    if (email) {
      await expect(page.locator('[data-location-contact-email-row]')).toBeVisible();
      await expect(page.locator('[data-location-contact-email]')).toHaveText(email);
    } else {
      await expect(page.locator('[data-location-contact-email-row]')).toBeHidden();
    }
  }
});

test('contact form focus queues CONTACT_FORM_FOCUS in dataLayer', async ({ page }) => {
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
