const { test, expect } = require('@playwright/test');
const registry = require('../../functions/_shared/provider-monitor.json');
test.skip(process.env.TM_SITE_PROFILE === 'eu', 'This registry covers US integrations only.');
const hosts = Object.values(registry.providers).flatMap(provider => provider.hosts);

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
  expect(relevant, 'Provider CSP violations').toEqual([]);
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

test('Houston Roller checkout renders', async ({ page }) => {
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
});
