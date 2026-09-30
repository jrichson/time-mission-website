const { test, expect } = require('@playwright/test');
const { prepareSiteSmoke } = require('./site-helpers');

test.beforeEach(async ({ page }) => {
  await prepareSiteSmoke(page);
});

async function expectResponsivePromoSplit(page, isMobile) {
  const mediaBox = await page.locator('.tm-promo-landing__media').boundingBox();
  const contentBox = await page.locator('.tm-promo-landing__content').boundingBox();

  expect(mediaBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  if (isMobile) {
    expect(mediaBox.y + mediaBox.height).toBeLessThanOrEqual(contentBox.y + 1);
  } else {
    expect(contentBox.x + contentBox.width).toBeLessThanOrEqual(mediaBox.x + 1);
    if (await page.locator('body.tm-educator-page').count()) {
      const backBox = await page.locator('.tm-promo-landing__back').boundingBox();
      expect(backBox.y - mediaBox.y).toBeGreaterThanOrEqual(24);
      expect(backBox.y - mediaBox.y).toBeLessThanOrEqual(40);
    }
  }

  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
}

test('Educators page exposes the supplied image, copy, and Klaviyo embed', async ({ page, isMobile }) => {
  await page.goto('/houston/educators');

  await expect(page).toHaveTitle('Educators Free Through December 31 | Time Mission Houston');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Educators Free\s+Now Through Dec 31/i);
  await expect(page.locator('script[src="https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=TNQysU"]')).toHaveCount(1);
  await expect(page.locator('[data-klaviyo-form-embed]')).toHaveClass(/klaviyo-form-YsG3eB/);
  await expect(page.getByRole('heading', { name: 'Get your promo code' })).toHaveCount(0);
  await expect(page.locator('.tm-promo-form')).toHaveCSS('border-top-style', 'none');
  await expect(page.locator('.tm-promo-landing__media img')).toHaveAttribute('src', '/assets/photos/promos/houston-educators-control-room-1200.webp');
  await expect(page.locator('.tm-promo-landing__terms')).toContainText('Available to K-12 teachers, administrators, and school staff');
  await expect(page.locator('.tm-promo-landing__copy')).toContainText('Time Mission Houston, now extended through December 31');
  await expect(page.locator('.tm-promo-landing__copy')).toContainText('Limit one free educator ticket per purchase.');
  await expect(page.locator('.tm-promo-landing__terms')).toContainText('valid through December 31, 2026');
  await expect(page.locator('main')).not.toContainText('School Night');

  const completion = await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('klaviyoForms', {
      detail: {
        type: 'submit',
        formId: 'YsG3eB',
        formVersionId: 'smoke-version',
        metaData: { email: 'private@example.com' },
      },
    }));
    return window.dataLayer.find((entry) => (
      entry?.event_name === 'COMPLETE_REGISTRATION'
      && entry?.parameters?.FORM_ID === 'YsG3eB'
    ));
  });
  expect(completion).toMatchObject({
    conversion_source: 'klaviyo_form',
    form_id: 'YsG3eB',
    form_name: 'educator_appreciation',
    form_version_id: 'smoke-version',
    parameters: {
      FORM_ID: 'YsG3eB',
      FORM_NAME: 'educator_appreciation',
      FORM_VERSION_ID: 'smoke-version',
      LOCATION_SLUG: 'houston',
      PROVIDER: 'klaviyo',
    },
  });
  expect(JSON.stringify(completion)).not.toContain('private@example.com');
  await expectResponsivePromoSplit(page, isMobile);
});

test('Philadelphia educators page matches the Houston offer with the Philadelphia form', async ({ page, isMobile }) => {
  await page.goto('/philadelphia/educators');

  await expect(page).toHaveTitle('Educators Free Through December 31 | Time Mission Philadelphia');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Educators Free\s+Now Through Dec 31/i);
  await expect(page.locator('.tm-promo-landing__back')).toHaveAttribute('href', '/philadelphia');
  await expect(page.locator('.tm-promo-landing__back')).toContainText('Philadelphia');
  await expect(page.locator('script[src="https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=TNQysU"]')).toHaveCount(1);
  await expect(page.locator('[data-klaviyo-form-embed]')).toHaveClass(/klaviyo-form-YAhjX2/);
  await expect(page.locator('.tm-promo-landing__copy')).toContainText('Time Mission Philadelphia');
  await expect(page.locator('.tm-promo-landing__terms')).toContainText('Valid at Time Mission Philadelphia only');
  await expectResponsivePromoSplit(page, isMobile);
});

for (const educatorPage of [
  {
    formId: 'TwcrHA',
    locationName: 'Manassas',
    locationSlug: 'manassas',
  },
  {
    formId: 'XmbdNb',
    locationName: 'Mount Prospect',
    locationSlug: 'mount-prospect',
  },
  {
    formId: 'SmY6Us',
    locationName: 'Orland Park',
    locationSlug: 'orland-park',
  },
]) {
  test(`${educatorPage.locationName} educators page uses its supplied Klaviyo form`, async ({ page, isMobile }) => {
    await page.goto(`/${educatorPage.locationSlug}/educators`);

    await expect(page).toHaveTitle(
      `Educators Free Through December 31 | Time Mission ${educatorPage.locationName}`,
    );
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Educators Free\s+Now Through Dec 31/i);
    await expect(page.locator('.tm-promo-landing__back'))
      .toHaveAttribute('href', `/${educatorPage.locationSlug}`);
    await expect(page.locator('.tm-promo-landing__back')).toContainText(educatorPage.locationName);
    await expect(page.locator('[data-klaviyo-form-embed]'))
      .toHaveClass(new RegExp(`klaviyo-form-${educatorPage.formId}`));
    await expect(page.locator('.tm-promo-landing__copy'))
      .toContainText(`Time Mission ${educatorPage.locationName}`);
    await expect(page.locator('.tm-promo-landing__terms'))
      .toContainText(`Valid at Time Mission ${educatorPage.locationName} only`);
    await expectResponsivePromoSplit(page, isMobile);
  });
}


test('Nashville educators register before opening for January 2027 play', async ({ page, isMobile }) => {
  await page.goto('/nashville/educators');
  await expect(page).toHaveTitle('Nashville Teacher Pass: Free Play January 5–29, 2027 | Time Mission');
  await expect(page.locator('.tm-promo-landing__eyebrow')).toHaveText('Nashville · Opening December 2026');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Big Things.\s+This December!/);
  await expect(page.getByRole('heading', { name: 'Calling All Teachers: Play for FREE January 5–29, 2027!' })).toBeVisible();
  await expect(page.locator('.tm-promo-landing__copy').first()).toContainText('Register by October 8, 2026');
  await expect(page.locator('.tm-promo-landing__terms')).toContainText('redeemable January 5–29, 2027');
  await expect(page.locator('[data-klaviyo-form-embed]')).toHaveClass('klaviyo-form-WC5BHF');
  await expect(page.locator('main')).not.toContainText('Through Sept 30');
  await expect(page.locator('main')).not.toContainText('valid through September 30');
  await expect(page.getByRole('link', { name: 'Claim Your Free Teacher Pass Now' })).toHaveCount(0);
  await expect(page.locator('#teacher-signup + .tm-promo-landing__copy h2'))
    .toHaveText("Don't Miss Out—Register by October 8!");
  await expectResponsivePromoSplit(page, isMobile);
});

test('Dallas educators can register for opening offer updates', async ({ page, isMobile }) => {
  await page.goto('/dallas/educators');
  await expect(page).toHaveTitle('Dallas Educator Offers: Be the First to Know | Time Mission');
  await expect(page.locator('.tm-promo-landing__eyebrow')).toHaveText('Dallas · Opening November 2026');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Be the First to Know');
  await expect(page.locator('.tm-promo-landing__back')).toHaveAttribute('href', '/dallas');
  await expect(page.locator('.tm-promo-landing__copy')).toContainText('Sign up now to get first access to an exclusive teacher and educator offer!');
  await expect(page.locator('[data-klaviyo-form-embed]')).toHaveClass('klaviyo-form-TzbcnW');
  await expect(page.locator('.tm-promo-landing__terms')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('September 30');
  await expectResponsivePromoSplit(page, isMobile);
});
