const { test, expect } = require('@playwright/test');
const { prepareSiteSmoke, waitForLanguageRuntime } = require('./site-helpers');
const eu = process.env.TM_SITE_PROFILE === 'eu';
const venue = eu ? 'eindhoven' : 'mount-prospect';
const otherVenue = eu ? 'brussels' : 'houston';
const locales = eu ? ['en', 'nl', 'fr', 'es'] : ['en', 'es'];

test.beforeEach(async ({ page }) => prepareSiteSmoke(page));

async function ready(page) {
  await expect(async () => {
    await page.waitForLoadState('domcontentloaded');
    await waitForLanguageRuntime(page, true);
    await page.evaluate(() => window.TMNavigation.refresh());
  }).toPass({ timeout: 15000, intervals: [100, 250, 500] });
}

for (const locale of locales) {
  test(`${locale}: articles keep venue through navigation, refresh, history and location selection`, async ({ page }) => {
    const prefix = locale === 'en' ? '' : `/${locale}`;
    await page.goto(`${prefix}/${venue}/blog`, { waitUntil: 'domcontentloaded' });
    await ready(page);
    const article = page.locator(`a[href^="${prefix}/${venue}/blog/"]`).first();
    const destination = await article.getAttribute('href');
    expect(destination).toBeTruthy();
    await article.click();
    await expect(page).toHaveURL(new RegExp(destination + '$'));
    await ready(page);
    await expect.poll(() => page.evaluate(() => window.TM.current?.slug)).toBe(venue);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready(page);
    await expect(page.locator('html')).toHaveAttribute('lang', new RegExp(`^${locale}(?:-|$)`));
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await ready(page);
    await page.goForward({ waitUntil: 'domcontentloaded' });
    await ready(page);
    await page.locator('#locationBtn').click();
    const link = page.locator(`#locationDropdown [data-tm-location-slug="${otherVenue}"]`);
    await expect(link).toHaveAttribute('href', destination.replace(`/${venue}/`, `/${otherVenue}/`));
    await link.click();
    await expect(page).toHaveURL(new RegExp(destination.replace(`/${venue}/`, `/${otherVenue}/`) + '$'));
    await ready(page);
    await expect.poll(() => page.evaluate(() => window.TM.current?.slug)).toBe(otherVenue);
    // Every internal shared link is also correct before click/new-tab navigation.
    await expect(page.locator('.nav-links a[data-i18n="nav.faq"]')).toHaveAttribute('href', `${prefix}/${otherVenue}/faq`);
  });
}

test('language switch on a scoped article retains the venue and article', async ({ page, isMobile }) => {
  await page.goto(`/${venue}/blog`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const article = page.locator(`a[href^="/${venue}/blog/"]`).first();
  const destination = await article.getAttribute('href');
  await article.click();
  await expect(page).toHaveURL(new RegExp(destination + '$'));
  await ready(page);
  if (isMobile) await page.locator('#locationBtn').click();
  await page.locator(isMobile ? '.language-switcher--overlay [data-language-select]' : '.language-switcher--desktop [data-language-select]').selectOption('es');
  await expect(page).toHaveURL(new RegExp('/es' + destination + '$'));
  await ready(page);
  await expect.poll(() => page.evaluate(() => window.TM.current?.slug)).toBe(venue);
});

test('late booking and contact links preserve language and explicit venue', async ({ page }) => {
  await page.goto(`/es/${venue}/faq`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.evaluate((slug) => {
    const link = document.createElement('a');
    link.id = 'late-contact';
    link.href = `/contact#location=${slug}&type=groups`;
    link.textContent = 'Contact';
    link.style.cssText = 'position:fixed;top:50%;left:40%;z-index:99999;background:white;color:black;padding:16px';
    document.body.prepend(link);
  }, otherVenue);
  await expect(page.locator('#late-contact')).toHaveAttribute('href', `/es/${otherVenue}/contact#location=${otherVenue}&type=groups`);
  await page.locator('#late-contact').click();
  await expect(page).toHaveURL(new RegExp(`/es/${otherVenue}/contact(?:#.*)?$`));
  await ready(page);
  await expect.poll(() => page.evaluate(() => window.TM.current?.slug)).toBe(otherVenue);
  await expect(page.locator('html')).toHaveAttribute('lang', /^es/);
  await expect(page.locator('#location')).toHaveValue(otherVenue);
});

test('US group-form returns recover Spanish and the form venue', async ({ page }) => {
  test.skip(eu);
  const source = 'https://www.timemission.com/es/groups/inquire/mount-prospect/default';
  await page.goto(`/group-form-thank-you/jotform?location=mount-prospect&source=${encodeURIComponent(source)}`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/es\/group-form-thank-you\/jotform\?/);
  await ready(page);
  await expect.poll(() => page.evaluate(() => window.TM.current?.slug)).toBe('mount-prospect');
  await expect(page.locator('[data-group-thank-you-location-link]')).toHaveAttribute('href', '/es/mount-prospect');
});
