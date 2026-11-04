// @ts-check
const { test, expect } = require('@playwright/test');

const KLAVIYO_SCRIPTS = /https:\/\/static\.klaviyo\.com\/.*/;

test('Educator signup shows the backup form when Klaviyo is blocked and submits it', async ({ page }) => {
  await page.route(KLAVIYO_SCRIPTS, (route) => route.abort('blockedbyclient'));
  let submitted = null;
  await page.route('**/api/klaviyo-signup', async (route) => {
    submitted = route.request().postData();
    await route.fulfill({ json: { ok: true } });
  });

  await page.goto('/houston/educators');
  const backup = page.locator('[data-tm-klaviyo-backup="YsG3eB"]');
  // A blocked script is detected right away; no waiting on the timer.
  await expect(backup).toBeVisible({ timeout: 2500 });
  await expect(page.locator('[data-tm-klaviyo-loading]')).toBeHidden();
  await expect(backup).toContainText('Consent is not a condition of purchase');

  await backup.getByLabel('First Name').fill('Ana');
  await backup.getByLabel('Email *', { exact: true }).fill('ana@example.com');
  await backup.getByLabel('School Email (edu email) *').fill('ana@school.org');
  await backup.getByRole('button', { name: 'SIGN-UP FOR FIRST ACCESS' }).click();

  await expect(page.locator('[data-tm-klaviyo-backup-success]')).toBeVisible();
  await expect(backup).toBeHidden();
  expect(submitted).toContain('klaviyo_form_id=YsG3eB');
  expect(submitted).toContain('email=ana%40example.com');
  expect(submitted).toContain('backup_reason=blocked');
  expect(submitted).toMatch(/backup_wait_ms=\d+/);

  const registration = await page.evaluate(() => window.dataLayer.find((entry) => (
    entry?.event_name === 'COMPLETE_REGISTRATION' && entry?.form_id === 'YsG3eB'
  )));
  expect(registration).toMatchObject({
    conversion_source: 'klaviyo_form',
    form_name: 'educator_appreciation',
    parameters: { FORM_ID: 'YsG3eB', LOCATION_SLUG: 'houston', PROVIDER: 'klaviyo_backup' },
  });
  expect(JSON.stringify(registration)).not.toContain('ana@example.com');
});

test('backup form stays hidden when Klaviyo renders its own form', async ({ page }) => {
  await page.route('https://static.klaviyo.com/onsite/js/klaviyo.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: "document.querySelectorAll('[data-klaviyo-form-embed]').forEach(function (el) { el.appendChild(document.createElement('form')); });",
  }));

  await page.goto('/houston/educators');
  await page.waitForTimeout(7000);
  await expect(page.locator('[data-tm-klaviyo-backup="YsG3eB"]')).toBeHidden();
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

test('slow Klaviyo rendering shows a loading message, not the backup', async ({ page }) => {
  await page.route('https://static.klaviyo.com/onsite/js/klaviyo.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: "window.klaviyo = { push: function () {} }; setTimeout(function () { document.querySelectorAll('[data-klaviyo-form-embed]').forEach(function (el) { el.appendChild(document.createElement('form')); }); }, 6000);",
  }));

  await page.goto('/houston/educators');
  const loading = page.locator('[data-tm-klaviyo-loading]');
  await expect(loading).toBeVisible();
  await expect(loading).toHaveText('Loading sign-up form…');
  await page.waitForTimeout(5000);
  await expect(page.locator('[data-tm-klaviyo-backup="YsG3eB"]')).toBeHidden();
  await expect(page.locator('.klaviyo-form-YsG3eB form')).toBeAttached({ timeout: 4000 });
  await expect(loading).toBeHidden();
  await expect(page.locator('[data-tm-klaviyo-backup="YsG3eB"]')).toBeHidden();
});

test('a Klaviyo script that never answers falls back after four seconds', async ({ page }) => {
  await page.route('https://static.klaviyo.com/onsite/js/klaviyo.js*', () => {});

  // The hung script also holds the load event, so only wait for the document.
  await page.goto('/houston/educators', { waitUntil: 'domcontentloaded' });
  const backup = page.locator('[data-tm-klaviyo-backup="YsG3eB"]');
  await page.waitForTimeout(2500);
  await expect(backup).toBeHidden();
  await expect(backup).toBeVisible({ timeout: 4000 });
  await expect(backup.locator('input[name="backup_reason"]')).toHaveValue('no_response');
});

test('a loaded Klaviyo that never draws its form falls back after fifteen seconds', async ({ page }) => {
  test.setTimeout(30000);
  await page.route('https://static.klaviyo.com/onsite/js/klaviyo.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.klaviyo = { push: function () {} };',
  }));

  await page.goto('/houston/educators');
  const backup = page.locator('[data-tm-klaviyo-backup="YsG3eB"]');
  // Past the old eight-second cutoff, slow phones still get the loading message.
  await page.waitForTimeout(10000);
  await expect(backup).toBeHidden();
  await expect(page.locator('[data-tm-klaviyo-loading]')).toBeVisible();
  await expect(backup).toBeVisible({ timeout: 7000 });
  await expect(backup.locator('input[name="backup_reason"]')).toHaveValue('slow_render');
});

test('Creator pages share one form and the backup preselects the page location', async ({ page }) => {
  await page.route(KLAVIYO_SCRIPTS, (route) => route.abort('blockedbyclient'));
  let submitted = null;
  await page.route('**/api/klaviyo-signup', async (route) => {
    submitted = route.request().postData();
    await route.fulfill({ json: { ok: true } });
  });

  await page.goto('/creators');
  await expect(page).toHaveTitle('Time Mission Creator Program');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Time Mission\s+Creator Program/);
  await expect(page.locator('[name="creator_location"]')).toHaveValue('');

  await page.goto('/orland-park/creators');
  await expect(page).toHaveTitle('Creator Program | Time Mission Orland Park');
  await expect(page.locator('.tm-promo-landing__eyebrow')).toHaveText('Orland Park · Creator Program');
  await expect(page.locator('[data-klaviyo-form-embed]')).toHaveClass('klaviyo-form-WKi36B');
  const backup = page.locator('[data-tm-klaviyo-backup="WKi36B"]');
  await expect(backup).toBeVisible({ timeout: 2500 });
  await expect(backup.locator('[name="creator_location"]')).toHaveValue('Orland Park');

  await backup.getByLabel('Email *', { exact: true }).fill('creator@example.com');
  await backup.getByLabel('Instagram or TikTok handle (@yourname) *').fill('@creator');
  await backup.getByLabel('Primary platform *').selectOption('TikTok');
  await backup.getByLabel('Audience size (followers) *').selectOption('5K to 25K');
  await backup.getByRole('button', { name: 'Submit Application' }).click();

  await expect(page.locator('[data-tm-klaviyo-backup-success]')).toContainText('Application received!');
  expect(submitted).toContain('klaviyo_form_id=WKi36B');
  expect(submitted).toContain('creator_location=Orland+Park');
  expect(submitted).toContain('creator_platform=TikTok');
});
