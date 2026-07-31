const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { prepareSmokePage } = require('./network');

const REPO_ROOT = path.resolve(__dirname, '../..');
const locationRecords = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data', 'locations.json'), 'utf8')).locations || [];
const tmOpsLocations = ['manassas', 'orland-park', 'mount-prospect'];
const formOnlyContactLocations = new Set(tmOpsLocations);
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
  await expect(form.locator('input[name="email"]')).toHaveAttribute('required', '');
  await expect(form.locator('input[name="phone"]')).toHaveAttribute('required', '');
  await expect(form.locator('input[name="phone"]')).toHaveAttribute('autocomplete', 'tel');
  await expect(form.locator('#phone-help')).toContainText('follow up about your inquiry');
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

test('TM Ops location footers open the preselected contact form', async ({ page }) => {
  for (const location of tmOpsLocations) {
    await page.goto(`/${location}`);
    const contactLink = page.locator('footer .footer-links a', { hasText: 'Contact Us' });
    await expect(contactLink).toHaveAttribute(
      'href',
      `/${location}/contact#location=${location}&type=updates`,
    );
    await expect(contactLink).toHaveAttribute(
      'data-tm-location-base-href',
      `/contact#location=${location}&type=updates`,
    );
  }
});

test('supported location footers link to their Connecteam job applications', async ({ page }) => {
  const applicationLink = page.locator('footer .footer-links a', { hasText: 'Join Our Team' });
  const applicationUrls = {
    manassas: 'https://app.connecteam.com/#/apply?link=ac7fa1ce-9e24-4c69-a1ef-bfdbc1bb2a54',
    'mount-prospect': 'https://app.connecteam.com/#/apply?link=1a51944c-ebf3-4927-9cdb-5f212e0210ba',
    'orland-park': 'https://app.connecteam.com/#/apply?link=027bf82b-de3d-4134-b151-fcb8ddbe84d5',
    nashville: 'https://app.connecteam.com/#/apply?link=7d0b94ee-d43c-461f-aad4-424e8544e699',
  };

  for (const [location, applicationUrl] of Object.entries(applicationUrls)) {
    await page.goto(`/${location}`);
    await expect(applicationLink).toHaveAttribute('href', applicationUrl);
    await expect(applicationLink).toHaveAttribute('target', '_blank');
    await expect(applicationLink).toHaveAttribute('rel', 'noopener');
  }

  await page.goto('/houston');
  await expect(applicationLink).toHaveCount(0);
});

test('contact page only shows direct info for the selected location', async ({ page }) => {
  await page.goto('/contact#location=houston&type=updates');

  await expect(page.locator('#location')).toHaveValue('houston');
  await expect(page.locator('[data-location-contact-card]')).toBeVisible();
  await expect(page.locator('[data-location-contact-name]')).toHaveText('Houston');
  await expect(page.locator('[data-location-contact-phone]')).toHaveText('(713) 588-1630');
  await expect(page.locator('[data-location-contact-email-row]')).toBeVisible();
  await expect(page.locator('[data-location-contact-email]')).toHaveText('houston@timemission.com');
  await expect(page.locator('[data-location-contact-email]')).toHaveAttribute(
    'href',
    'mailto:houston@timemission.com',
  );
  await expect(page.locator('[data-location-contact-card]')).not.toContainText('Philadelphia');
  await expect(page.locator('[data-location-contact-card]')).not.toContainText('Mount Prospect');

  await page.locator('#location').selectOption('orland-park');
  await expect(page.locator('[data-location-contact-card]')).toBeVisible();
  await expect(page.locator('[data-location-contact-name]')).toHaveText('Orland Park');
  await expect(page.locator('[data-location-contact-phone]')).toHaveText('(708) 294-8711');
  await expect(page.locator('[data-location-contact-email-row]')).toBeHidden();
  await expect(page.locator('[data-location-contact-card]')).not.toContainText('OrlandPark@TimeMission.com');
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

    if (email && !formOnlyContactLocations.has(loc.slug)) {
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
