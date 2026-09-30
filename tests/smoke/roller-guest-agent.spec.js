const { test, expect } = require('@playwright/test');
const { prepareSmokePage } = require('./network');

test('Houston alone loads the supplied Guest Agent configuration', async ({ page }) => {
  await prepareSmokePage(page);
  await page.route('https://cdn.rollerdigital.com/scripts/guest-agent/v1/widget.js', route => route.fulfill({ body: '', contentType: 'application/javascript' }));
  await page.goto('/houston');
  expect(await page.evaluate(() => window.RollerGuestAgent)).toMatchObject({
    venueId: 22911, mode: 'hybrid', venueName: 'Time Mission Houston',
    theme: { accent: '#FF6B2C', accent2: '#00E5FF', position: 'bottom-right' },
    welcome: { chips: [{ label: 'Activities' }, { label: 'Prices' }, { label: 'Parties' }, { label: 'Hours' }] },
  });
  for (const route of ['/', '/philadelphia', '/manassas']) {
    await page.goto(route);
    await expect(page.locator('script[src*="guest-agent"]')).toHaveCount(0);
    expect(await page.evaluate(() => window.RollerGuestAgent)).toBeUndefined();
  }
});

// Opt-in: executes the live vendor widget and reads venue configuration.
// It opens the launcher only; it never sends a message or starts a voice call.
test('live Houston Guest Agent opens under the generated security policy', async ({ page }, testInfo) => {
  test.skip(process.env.TM_TEST_LIVE_GUEST_AGENT !== '1', 'Requires explicit approval for live vendor execution');
  const fs = require('node:fs');
  await prepareSmokePage(page);
  const { policy: csp } = JSON.parse(fs.readFileSync('dist/data/content-security-policy.json', 'utf8'));
  await page.addInitScript(() => {
    window.__guestAgentViolations = [];
    document.addEventListener('securitypolicyviolation', event => {
      window.__guestAgentViolations.push({ directive: event.effectiveDirective, blockedURI: event.blockedURI });
    });
  });
  const configResponse = page.waitForResponse(response => response.url().includes('/api/gx-agent-widget/config'));
  const response = await page.goto('/houston');
  expect(response.headers()['content-security-policy']).toBe(csp);
  expect((await configResponse).status()).toBe(200);
  const widget = page.locator('[data-roller-guest-agent]');
  const launcher = widget.locator('button[aria-haspopup="dialog"]');
  await expect(launcher).toBeVisible({ timeout: 15000 });
  await expect(launcher).toContainText('Chat with our AI Assistant');
  await launcher.click();
  await expect(launcher).toHaveAttribute('aria-expanded', 'true');
  await expect(widget.getByText("Hi there! I'm your AI assistant.", { exact: true })).toBeVisible();
  await expect(widget.getByRole('button', { name: 'Prices', exact: true })).toBeVisible();
  const violations = await page.evaluate(() => window.__guestAgentViolations);
  await testInfo.attach('csp-violations', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
  expect(violations.filter(item => /roller|vapi|daily/.test(item.blockedURI) || item.directive === 'style-src-elem')).toEqual([]);
  const logo = widget.locator('img').first();
  await expect(logo).toHaveAttribute('src', '/assets/logo/TM_Favicon.svg');
  await expect(logo).toHaveJSProperty('complete', true);
  expect(await logo.evaluate(image => image.naturalWidth > 0 && image.naturalWidth === image.naturalHeight)).toBe(true);
  await testInfo.attach('widget-images', {
    body: JSON.stringify(await widget.locator('img').evaluateAll(images => images.map(image => ({ src: image.src, loaded: image.naturalWidth > 0 }))), null, 2),
    contentType: 'application/json',
  });
  await page.screenshot({ path: testInfo.outputPath('houston-guest-agent.png'), animations: 'disabled' });
});
