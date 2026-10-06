const { test, expect } = require('@playwright/test');

test('US and consented EU tracking runs while CSP boundaries stay enforced', async ({ page }) => {
  test.slow();
  await page.addInitScript(() => {
    window.__trackingCsp = [];
    document.addEventListener('securitypolicyviolation', event => {
      window.__trackingCsp.push({ directive: event.effectiveDirective, blocked: event.blockedURI.split('?')[0] });
    });
  });
  for (const url of ['https://www.timemission.com/philadelphia/educators', 'https://www.timemission.eu/nl/eindhoven']) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (url.includes('.eu/')) {
      await expect.poll(() => page.evaluate(() => window.__TM_CONSENT_STATE__?.analytics_storage)).toBe('denied');
      // Accept only in this isolated browser session; preserve the site's consent code.
      await page.waitForFunction(() => window.TMConsent?.update);
      await page.evaluate(() => window.TMConsent.update({ analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' }));
      await expect.poll(() => page.evaluate(() => window.__TM_CONSENT_STATE__?.analytics_storage)).toBe('granted');
    }
    await expect.poll(() => page.evaluate(() => Boolean(window.google_tag_manager?.['GTM-WQPWRNJB']))).toBe(true);
    // Capture delayed tag execution as well as initial page scripts.
    await page.waitForTimeout(10000);
    expect(await page.evaluate(() => window.__trackingCsp), url + ' CSP violations').toEqual([]);
    const boundaries = await page.evaluate(async () => {
      const button = document.createElement('button');
      button.setAttribute('onclick', 'window.__forbiddenCspHandler = true');
      document.body.appendChild(button);
      button.click();
      button.remove();
      const blockedExternal = await new Promise(resolve => {
        const timeout = setTimeout(() => { document.removeEventListener('securitypolicyviolation', listener); resolve(false); }, 3000);
        function listener(event) {
          if (event.blockedURI.startsWith('https://csp-check.invalid/')) {
            clearTimeout(timeout);
            document.removeEventListener('securitypolicyviolation', listener);
            resolve(true);
          }
        }
        document.addEventListener('securitypolicyviolation', listener);
        const script = document.createElement('script');
        script.src = 'https://csp-check.invalid/never-load.js';
        document.head.appendChild(script);
      });
      return { handlerBlocked: !window.__forbiddenCspHandler, blockedExternal };
    });
    expect(boundaries).toEqual({ handlerBlocked: true, blockedExternal: true });
  }
});
