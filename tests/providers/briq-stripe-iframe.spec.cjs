const { test, expect } = require('@playwright/test');

// Exercise the actual vendor payment iframe without creating a cart, payment
// intent, reservation, or purchase. Loading Stripe.js alone misses this failure.
test('Briq payment iframe initializes under the enforced CSP', async ({ page, request }) => {
  const response = await request.get('https://widgetcdn.briqbookings.com/widget/widget.js');
  expect(response.ok()).toBe(true);
  const source = await response.text();
  const title = source.indexOf('<title>Stripe Payment Frame</title>');
  expect(title, 'Briq payment iframe template must remain inspectable').toBeGreaterThan(0);
  const start = source.lastIndexOf('`<!doctype html>', title);
  const end = source.indexOf('</html>`', title);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const html = source.slice(start + 1, end + '</html>'.length);
  expect(html, 'Review changed vendor template interpolation').not.toContain('${');
  const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(match => !/\bsrc\s*=/.test(match[1]));
  expect(inlineScripts).toHaveLength(1);

  await page.goto('/west-nyack', { waitUntil: 'domcontentloaded' });
  const policy = await page.locator('#tm-static-csp').getAttribute('content');
  expect(policy).toContain("script-src-elem 'self' 'unsafe-inline'");
  expect(policy).toContain("script-src-attr 'none'");
  await page.evaluate(markup => {
    const frame = document.createElement('iframe');
    frame.id = 'briq-payment-csp-check';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-top-navigation allow-forms');
    document.body.appendChild(frame);
    frame.contentDocument.open();
    frame.contentDocument.write(markup);
    frame.contentDocument.close();
  }, html);
  await expect.poll(() => page.evaluate(() => {
    const frame = document.querySelector('#briq-payment-csp-check');
    return { initializer: typeof frame.contentWindow.initStripe, stripe: typeof frame.contentWindow.Stripe };
  })).toEqual({ initializer: 'function', stripe: 'function' });
  const unapprovedRan = await page.evaluate(() => {
    const frame = document.querySelector('#briq-payment-csp-check');
    const button = frame.contentDocument.createElement('button');
    button.setAttribute('onclick', 'window.__unapprovedPaymentHandler = true');
    frame.contentDocument.body.appendChild(button);
    button.click();
    return Boolean(frame.contentWindow.__unapprovedPaymentHandler);
  });
  expect(unapprovedRan, 'Inline event handlers must remain blocked').toBe(false);
});
