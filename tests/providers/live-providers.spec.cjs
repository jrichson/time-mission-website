const { test, expect } = require('@playwright/test');
const registry = require('../../functions/_shared/provider-monitor.json');
test.skip(process.env.TM_SITE_PROFILE === 'eu', 'This registry covers US integrations only.');
const hosts = Object.values(registry.providers).flatMap(provider => provider.hosts);

for (const [url, venue] of [
  ['https://www.timemission.com/houston/faq', 'houston'],
  ['https://www.timemission.com/west-nyack/gift-cards', 'west-nyack'],
  ['https://www.timemission.eu/nl/eindhoven/contact', 'eindhoven'],
  ['https://www.timemission.eu/fr/brussels/faq', 'brussels'],
]) {
  test(`nested route ${new URL(url).pathname} stays available`, async ({ page }) => {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.TM?.current?.slug)).toBe(venue);
    await expect(page.locator('#tm-static-csp')).toHaveCount(1);
  });
}

// These tests intentionally use real providers. Never use the mocked smoke helpers.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__providerCsp = [];
    document.addEventListener('securitypolicyviolation', event => {
      window.__providerCsp.push({ blocked: event.blockedURI, source: event.sourceFile, directive: event.effectiveDirective });
    });
  });
});

async function checkProviderCsp(page) {
  const violations = await page.evaluate(() => window.__providerCsp || []);
  const relevant = violations.filter(event => [event.blocked, event.source].some(value => {
    try { const hostname = new URL(value).hostname; return hosts.some(host => hostname === host || hostname.endsWith('.' + host)); }
    catch { return false; }
  }));
  // Briq's Sentry replay is optional telemetry. Keep it blocked by CSP and
  // record it without treating it as a checkout outage. All other blocks fail.
  const optionalTelemetry = relevant.filter(event => {
    if (event.source !== 'https://widgetcdn.briqbookings.com/widget/widget.js') return false;
    if (event.directive === 'worker-src' && event.blocked === 'blob') return true;
    try {
      const url = new URL(event.blocked);
      return event.directive === 'connect-src' && url.origin === 'https://o223617.ingest.sentry.io'
        && url.pathname === '/api/4506388506083328/envelope/';
    } catch { return false; }
  });
  if (optionalTelemetry.length) await test.info().attach('blocked-optional-briq-telemetry', {
    body: JSON.stringify(optionalTelemetry), contentType: 'application/json',
  });
  expect(relevant.filter(event => !optionalTelemetry.includes(event)), 'Required provider CSP violations').toEqual([]);
}

for (const venue of registry.educators) {
  test(`educator ${venue} renders styled fields`, async ({ page }) => {
    const response = await page.goto(`/${venue}/educators`, { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBe(200);
    const form = page.locator('[data-klaviyo-form-embed]');
    const input = form.locator('input[type="email"]').first();
    await expect(input).toBeVisible();
    await expect(form.getByRole('button', { name: /GET MY EDUCATOR CODE|SIGN.UP FOR FIRST ACCESS/i })).toBeVisible();
    expect(await input.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(28);
    await checkProviderCsp(page);
  });
}

test('Palisades opens Briq and loads Stripe', async ({ page }) => {
  await page.goto('/west-nyack?book=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Weekend (FRI - SUN) - 90 min TimeMission', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => typeof window.Stripe)).toBe('function');
  await checkProviderCsp(page);
});

test('Briq return link opens the correct venue', async ({ page }) => {
  // Exercise the state Briq sends back; do not create a cart or reserve inventory.
  await page.goto('/#bwr=o|is|true', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/west-nyack/);
  await expect(page.getByRole('heading', { name: 'Weekend (FRI - SUN) - 90 min TimeMission', exact: true })).toBeVisible();
  await checkProviderCsp(page);
});

test('Houston Roller checkout renders', async ({ page, baseURL }) => {
  // Roller sends frame-ancestors https:, so its checkout cannot render inside a local http:// server.
  test.skip(!String(baseURL).startsWith('https://'), 'Roller checkout only frames into HTTPS pages');
  await page.goto('/houston?book=1', { waitUntil: 'domcontentloaded' });
  const frame = page.locator('iframe').filter({ visible: true }).first();
  await expect(frame).toBeVisible();
  await expect.poll(async () => {
    for (const child of page.frames()) {
      if (/roller\.app|book\.houston\.timemission\.com/.test(child.url())) {
        const text = await child.locator('body').innerText().catch(() => '');
        if (/ticket|book|session|product|admission/i.test(text) && text.length > 100) return true;
      }
    }
    return false;
  }).toBe(true);
  await checkProviderCsp(page);
  for (const venue of ['philadelphia', 'houston']) {
    await page.goto('https://book.' + venue + '.timemission.com/giftcards/en-us/products', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Time Mission Gift Cards', { exact: true }).first()).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/giftcards/en-us/products');
  }
});

for (const origin of ['https://www.timemission.com', 'https://www.timemission.eu']) {
  test(`native submission APIs respond on ${new URL(origin).hostname}`, async ({ request }) => {
    // No customer data, subscriptions or emails: GET must reject with 405.
    for (const endpoint of ['/api/contact', '/api/newsletter']) {
      const response = await request.get(origin + endpoint);
      expect(response.status(), endpoint + ' must reach the form handler').toBe(405);
      expect(response.headers().allow).toBe('POST');
    }
  });
}
for (const locale of ['', '/nl']) {
  test(`Eindhoven ${locale || 'English'} signup redirects to booking`, async ({ page, baseURL }) => {
    // The signup page was retired when booking opened; old links land on the bookable page.
    // The pre-deploy gate serves the new build locally, but this checks production directly.
    test.skip(!String(baseURL).startsWith('https://'), 'Checks the live EU site only after release');
    const response = await page.goto('https://www.timemission.eu' + locale + '/eindhoven/signup', { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBe(200);
    expect(new URL(page.url()).pathname).toMatch(new RegExp('^' + locale + '/eindhoven/?$'));
    const checkout = 'https://ecom.roller.app/timemissioneindhoven/onlinecheckout/en/home';
    // Book Now carries the checkout as a link or, for the sidebar, as its booking URL.
    const book = page.locator('.hero-cta a.btn-primary');
    await expect.poll(async () => [await book.getAttribute('href'), await book.getAttribute('data-tm-booking-url')]).toContain(checkout);
    await expect(page.locator('[data-tm-klaviyo-form-trigger]')).toHaveCount(0);
    await checkProviderCsp(page);
  });
}
for (const venue of ['mount-prospect', 'philadelphia', 'manassas', 'houston', 'orland-park']) {
  test(`group inquiry ${venue} loads without Worker routing`, async ({ page }) => {
    const response = await page.goto(`/groups/inquire/${venue}/default`, { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBe(200);
    await expect(page.locator('form input[type="email"]').first()).toBeVisible();
    await expect(page.locator('form[action*="jotform.com"]')).toHaveCount(1);
    await checkProviderCsp(page);
  });
}
