const { test, expect } = require('@playwright/test');
const {
  REPO_ROOT,
  expectPopupUrl,
  fingerprintAnalyticsLabels,
  gotoHome,
  groupFormUrl,
  i18nCatalog,
  locationById,
  locationsFingerprintFromRecords,
  path,
  prepareSiteSmoke,
  readTaggingConsentProfile,
  waiverUrl,
} = require('./site-helpers');

test.beforeEach(async ({ page }) => {
  await prepareSiteSmoke(page);
});

test('US deployment exposes its open consent profile on published routes', async ({ page }) => {
  await page.goto('/houston');
  await expect.poll(async () => readTaggingConsentProfile(page)).toBe('us_open');

  await page.goto('/contact');
  await expect.poll(async () => readTaggingConsentProfile(page)).toBe('us_open');

  await page.goto('/contact-thank-you');
  await expect.poll(async () => readTaggingConsentProfile(page)).toBe('us_open');

  await page.goto('/faq');
  await expect.poll(async () => readTaggingConsentProfile(page)).toBe('us_open');

});

test('analytics click delegation tracks phone and email clicks without PII', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => {
    const phone = document.createElement('a');
    phone.id = 'tm-test-phone-link';
    phone.href = 'tel:+12158675309';
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
