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
  // A blocked script is detected right away; no waiting on the timer.
  await expect(backup).toBeVisible({ timeout: 2500 });
  await expect(page.locator('[data-tm-klaviyo-loading]')).toBeHidden();
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
  expect(submitted).toContain('backup_reason=blocked');
  expect(submitted).toMatch(/backup_wait_ms=\d+/);

  const registration = await page.evaluate(() => window.dataLayer.find((entry) => (
    entry?.event_name === 'COMPLETE_REGISTRATION' && entry?.form_id === 'QYqsMS'
  )));
  expect(registration).toMatchObject({
    conversion_source: 'klaviyo_form',
    form_name: 'dallas_ticket_signup',
    parameters: { FORM_ID: 'QYqsMS', LOCATION_SLUG: 'dallas', PROVIDER: 'klaviyo_backup' },
  });
  expect(JSON.stringify(registration)).not.toContain('ana@example.com');
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

test('slow Klaviyo rendering shows a loading message, not the backup', async ({ page }) => {
  await page.route('https://static.klaviyo.com/onsite/js/klaviyo.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: "window.klaviyo = { push: function () {} }; setTimeout(function () { document.querySelectorAll('[data-klaviyo-form-embed]').forEach(function (el) { el.appendChild(document.createElement('form')); }); }, 6000);",
  }));

  await page.goto('/dallas/signup');
  const loading = page.locator('[data-tm-klaviyo-loading]');
  await expect(loading).toBeVisible();
  await expect(loading).toHaveText('Loading sign-up form…');
  await page.waitForTimeout(5000);
  await expect(page.locator('[data-tm-klaviyo-backup="QYqsMS"]')).toBeHidden();
  await expect(page.locator('.klaviyo-form-QYqsMS form')).toBeAttached({ timeout: 4000 });
  await expect(loading).toBeHidden();
  await expect(page.locator('[data-tm-klaviyo-backup="QYqsMS"]')).toBeHidden();
});

test('a Klaviyo script that never answers falls back after four seconds', async ({ page }) => {
  await page.route('https://static.klaviyo.com/onsite/js/klaviyo.js*', () => {});

  // The hung script also holds the load event, so only wait for the document.
  await page.goto('/dallas/signup', { waitUntil: 'domcontentloaded' });
  const backup = page.locator('[data-tm-klaviyo-backup="QYqsMS"]');
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

  await page.goto('/dallas/signup');
  const backup = page.locator('[data-tm-klaviyo-backup="QYqsMS"]');
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

  await backup.getByLabel('Email *').fill('creator@example.com');
  await backup.getByLabel('Instagram or TikTok handle (@yourname) *').fill('@creator');
  await backup.getByLabel('Primary platform *').selectOption('TikTok');
  await backup.getByLabel('Audience size (followers) *').selectOption('5K to 25K');
  await backup.getByRole('button', { name: 'Submit Application' }).click();

  await expect(page.locator('[data-tm-klaviyo-backup-success]')).toContainText('Application received!');
  expect(submitted).toContain('klaviyo_form_id=WKi36B');
  expect(submitted).toContain('creator_location=Orland+Park');
  expect(submitted).toContain('creator_platform=TikTok');
});
