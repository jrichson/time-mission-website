const { test, expect } = require('@playwright/test');
const { prepareSiteSmoke } = require('./site-helpers');

const SCHOOL_NIGHT_CHECKOUT = 'https://ecom.roller.app/TimeMissionHouston/onlinecheckout/en-US/products?code=SCHOOLNIGHT';

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
  }

  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
}

test('School Night page publishes the corrected offer and coded checkout', async ({ page, isMobile }) => {
  const decoratedCheckout = `${SCHOOL_NIGHT_CHECKOUT}&_gl=test-linker`;
  let trackedEvents = [];

  await page.addInitScript(({ checkoutUrl }) => {
    document.addEventListener('click', (event) => {
      const promoCta = event.target?.closest?.('[data-tm-promo-cta="school_night_book_now"]');
      if (!promoCta) return;
      promoCta.setAttribute('href', checkoutUrl);
      event.preventDefault();
    }, true);
  }, { checkoutUrl: decoratedCheckout });
  await page.exposeFunction('__captureSchoolNightEvents', (events) => {
    trackedEvents = events;
  });
  await page.route('https://ecom.roller.app/**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Roller progressive checkout</title>',
    });
  });

  await page.goto('/houston/school-night');

  await expect(page).toHaveTitle('School Night Sale | Time Mission Houston');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/School Nights\s+Are on Sale/i);
  await expect(page.locator('.tm-promo-landing__copy')).toContainText('Get $10 off 90 and 120 minute missions');
  await expect(page.locator('.tm-promo-landing__terms')).toContainText('60 minute sessions excluded');
  await expect(page.locator('.tm-promo-landing__terms')).toContainText('September 5 through September 7');
  await expect(page.locator('.tm-promo-landing__image-status')).toHaveCount(0);
  const promoCta = page.locator('.tm-promo-landing__cta');
  await expect(promoCta).toHaveAttribute('href', SCHOOL_NIGHT_CHECKOUT);
  await expect(promoCta).not.toHaveAttribute('data-tm-booking-trigger', '');
  await expect(promoCta).not.toHaveAttribute('data-tm-booking-presentation', 'roller');
  await expect(promoCta).not.toHaveAttribute('data-tm-booking-url', SCHOOL_NIGHT_CHECKOUT);
  await expectResponsivePromoSplit(page, isMobile);

  await page.evaluate(() => {
    document.addEventListener('click', () => {
      window.__captureSchoolNightEvents(window.dataLayer
        .filter((entry) => entry?.parameters?.CTA_ID === 'school_night_book_now')
        .map((entry) => entry.event));
    }, { capture: true, once: true });
  });
  await Promise.all([
    page.waitForURL(decoratedCheckout),
    promoCta.click(),
  ]);
  await expect(page).toHaveTitle('Roller progressive checkout');
  expect(trackedEvents).toEqual(['BOOKING_CLICK', 'CHECKOUT_START']);
});

test('Educators page exposes the supplied image, copy, and Klaviyo embed', async ({ page, isMobile }) => {
  await page.goto('/houston/educators');

  await expect(page).toHaveTitle('Educators Free Through September 30 | Time Mission Houston');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Educators Free\s+Through Sept 30/i);
  await expect(page.locator('script[src="https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=TNQysU"]')).toHaveCount(1);
  await expect(page.locator('[data-klaviyo-form-embed]')).toHaveClass(/klaviyo-form-YsG3eB/);
  await expect(page.getByRole('heading', { name: 'Get your promo code' })).toHaveCount(0);
  await expect(page.locator('.tm-promo-form')).toHaveCSS('border-top-style', 'none');
  await expect(page.locator('.tm-promo-landing__media img')).toHaveAttribute('src', '/assets/photos/promos/houston-educators-control-room-1200.webp');
  await expect(page.locator('.tm-promo-landing__terms')).toContainText('Available to K-12 teachers, administrators, and school staff');
  await expect(page.locator('.tm-promo-landing__terms')).toContainText('including the School Night Sale');
  await expectResponsivePromoSplit(page, isMobile);
});

test('Philadelphia educators page matches the Houston offer with the Philadelphia form', async ({ page, isMobile }) => {
  await page.goto('/philadelphia/educators');

  await expect(page).toHaveTitle('Educators Free Through September 30 | Time Mission Philadelphia');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Educators Free\s+Through Sept 30/i);
  await expect(page.locator('.tm-promo-landing__back')).toHaveAttribute('href', '/philadelphia');
  await expect(page.locator('.tm-promo-landing__back')).toContainText('Philadelphia');
  await expect(page.locator('script[src="https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=TNQysU"]')).toHaveCount(1);
  await expect(page.locator('[data-klaviyo-form-embed]')).toHaveClass(/klaviyo-form-YAhjX2/);
  await expect(page.locator('.tm-promo-landing__copy')).toContainText('Time Mission Philadelphia');
  await expect(page.locator('.tm-promo-landing__terms')).toContainText('Valid at Time Mission Philadelphia only');
  await expectResponsivePromoSplit(page, isMobile);
});
