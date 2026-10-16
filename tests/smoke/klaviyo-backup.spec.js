// @ts-check
const { test, expect } = require('@playwright/test');

const KLAVIYO_SCRIPTS = /https:\/\/static\.klaviyo\.com\/.*/;

test('Dallas signup shows the backup form when Klaviyo is blocked and submits it', async ({ page }) => {
  await page.route(KLAVIYO_SCRIPTS, (route) => route.abort('blockedbyclient'));
  let submitted = null;
  await page.route('**/api/klaviyo-signup', async (route) => {
    submitted = route.request().postData();
    await route.fulfill({ json: { ok: true } });
  });

  await page.goto('/dallas/signup');
  const backup = page.locator('[data-tm-klaviyo-backup="QYqsMS"]');
  await expect(backup).toBeVisible({ timeout: 10000 });
  await expect(backup).toContainText('Msg & data rates may apply');
  await expect(backup.getByRole('img', { name: 'Time Mission Dallas free ticket sign-up' }))
    .toHaveAttribute('src', '/assets/photos/promos/dallas-free-ticket-signup-1200.webp');

  await backup.getByLabel('First name').fill('Ana');
  await backup.getByLabel('Email *').fill('ana@example.com');
  await backup.getByLabel('Phone Number').fill('214-555-0100');
  await backup.getByRole('button', { name: 'Unlock Free Tickets!' }).click();

  await expect(page.locator('[data-tm-klaviyo-backup-success]')).toBeVisible();
  await expect(backup).toBeHidden();
  expect(submitted).toContain('klaviyo_form_id=QYqsMS');
  expect(submitted).toContain('email=ana%40example.com');
});

test('backup form stays hidden when Klaviyo renders its own form', async ({ page }) => {
  await page.route('https://static.klaviyo.com/onsite/js/klaviyo.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: "document.querySelectorAll('[data-klaviyo-form-embed]').forEach(function (el) { el.appendChild(document.createElement('form')); });",
  }));

  await page.goto('/dallas/signup');
  await page.waitForTimeout(7000);
  await expect(page.locator('[data-tm-klaviyo-backup="QYqsMS"]')).toBeHidden();
});

test('educator backup form asks for the school email', async ({ page }) => {
  await page.route(KLAVIYO_SCRIPTS, (route) => route.abort('blockedbyclient'));

  await page.goto('/houston/educators');
  const backup = page.locator('[data-tm-klaviyo-backup="YsG3eB"]');
  await expect(backup).toBeVisible({ timeout: 10000 });
  await expect(backup.getByLabel('School Email (edu email) *')).toHaveAttribute('required', '');
  await expect(backup.getByRole('button', { name: 'SIGN-UP FOR FIRST ACCESS' })).toBeVisible();
  await expect(backup).not.toContainText('Msg & data rates');
});
