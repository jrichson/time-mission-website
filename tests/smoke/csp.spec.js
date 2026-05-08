/**
 * csp.spec.js — Playwright smoke tests for post-CSP-hardening functional verification.
 *
 * Tests that reveal animation and footer-toggle still work after extracting
 * site-progressive.js. CSP header enforcement is only meaningful against Cloudflare Pages
 * or `wrangler pages dev` — not astro preview. These tests catch script execution failures.
 *
 * Run: npx playwright test csp.spec.js
 */
const { test, expect } = require('@playwright/test');

const VIDEO_MEDIA_RE = /\.(mp4|webm)(?:\?.*)?$/i;

test.beforeEach(async ({ page }) => {
    await page.route(VIDEO_MEDIA_RE, (route) => route.abort());
});

async function gotoHomeForScriptSmoke(page) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('body').waitFor({ state: 'attached' });
}

test('site-progressive.js: reveal elements get .visible class on scroll', async ({ page }) => {
    test.slow();

    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await gotoHomeForScriptSmoke(page);

    // Trigger IntersectionObserver in page context; Playwright action scrolling can
    // stall on the motion-heavy homepage under parallel smoke runs.
    const firstReveal = page.locator('.reveal').first();
    await firstReveal.evaluate((el) => {
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
    await expect(firstReveal).toBeVisible({ timeout: 5000 });

    // After scroll, IntersectionObserver should have added .visible
    await page.waitForFunction(
        () => document.querySelector('.reveal')?.classList.contains('visible') === true,
        undefined,
        { timeout: 15000 }
    );

    expect(errors, `Page errors on /:\n${errors.join('\n')}`).toHaveLength(0);
});

test('site-progressive.js: footer location toggle opens on click', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await gotoHomeForScriptSmoke(page);

    // Wait for deferred scripts (including site-progressive.js) to execute before clicking.
    // 'load' fires after all resources are fetched and deferred scripts have run.
    await page.waitForLoadState('load');

    const toggle = page.locator('.footer-location-toggle').first();
    await toggle.scrollIntoViewIfNeeded();
    await toggle.click();

    const parent = toggle.locator('..');
    await expect(parent).toHaveClass(/open/, { timeout: 3000 });

    expect(pageErrors, `Page errors on / (footer toggle):\n${pageErrors.join('\n')}`).toHaveLength(0);
});
