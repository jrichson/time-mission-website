const { test, expect } = require('@playwright/test');
const { prepareSmokePage } = require('./network');

test('Houston alone loads the supplied Guest Agent configuration', async ({ page }) => {
  await prepareSmokePage(page);
  await page.route('https://cdn.rollerdigital.com/scripts/guest-agent/v2/widget.js', route => route.fulfill({ body: '', contentType: 'application/javascript' }));
  await page.goto('/houston');
  expect(await page.evaluate(() => window.RollerGuestAgent)).toEqual({
    venueId: 22911,
    agentId: 'cf759e92-062d-46fe-91d4-fea07876839a',
    bffBase: 'https://gx-chat-us.rolleriq.com',
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
  // The v2 agent reads its look and copy from the Roller dashboard via bffBase.
  const configResponse = page.waitForResponse(response => response.url().startsWith('https://gx-chat-us.rolleriq.com/v1/config'));
  const response = await page.goto('/houston');
  // The response header carries only frame-ancestors; the full policy is the meta tag.
  expect(response.headers()['content-security-policy']).toBe("frame-ancestors 'self'");
  const metaPolicy = await page.locator('meta#tm-static-csp').getAttribute('content');
  expect(metaPolicy).toContain('https://gx-chat-us.rolleriq.com');
  expect(csp).toContain(metaPolicy.split('; ')[0]);
  expect((await configResponse).status()).toBe(200);
  const widget = page.locator('[data-roller-guest-agent]');
  const launcher = widget.locator('button[aria-haspopup="dialog"]');
  await expect(launcher).toBeVisible({ timeout: 15000 });
  await launcher.click();
  await expect(launcher).toHaveAttribute('aria-expanded', 'true');
  const violations = await page.evaluate(() => window.__guestAgentViolations);
  await testInfo.attach('csp-violations', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
  expect(violations.filter(item => /roller|vapi|daily/.test(item.blockedURI) || item.directive === 'style-src-elem')).toEqual([]);
  await testInfo.attach('widget-images', {
    body: JSON.stringify(await widget.locator('img').evaluateAll(images => images.map(image => ({ src: image.src, loaded: image.naturalWidth > 0 }))), null, 2),
    contentType: 'application/json',
  });
  await page.screenshot({ path: testInfo.outputPath('houston-guest-agent.png'), animations: 'disabled' });
});
