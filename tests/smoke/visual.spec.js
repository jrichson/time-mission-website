const { test, expect } = require('@playwright/test');
const { prepareSmokePage } = require('./network');

const VISUAL_MAX_DIFF_PIXELS = 6000;
const REDUCE_MOTION_CSS = `
  *, *::before, *::after {
    animation-delay: 0s !important;
    animation-duration: 0.001s !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-delay: 0s !important;
    transition-duration: 0s !important;
  }

  .hero-video-container {
    display: none !important;
  }
`;

test.beforeEach(async ({ page }) => {
  await prepareSmokePage(page);
  await page.addInitScript(() => {
    const realSetInterval = window.setInterval.bind(window);

    window.setInterval = (handler, timeout, ...args) => {
      if (typeof timeout === 'number' && timeout >= 1000) return 0;
      return realSetInterval(handler, timeout, ...args);
    };
  });
});

/**
 * Stabilize motion-heavy elements before screenshots (VER-04).
 * Hero video and other media can otherwise cause flaky pixel diffs.
 */
async function stabilizeForScreenshot(page) {
  await page.evaluate(async () => {
    const waits = [];
    if (window.LocationContext && typeof window.LocationContext.init === 'function') {
      waits.push(window.LocationContext.init());
    }
    if (window.TMI18n && window.TMI18n.ready) {
      waits.push(window.TMI18n.ready);
    }
    await Promise.race([
      Promise.all(waits),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  });
  await page.addStyleTag({ content: REDUCE_MOTION_CSS });
  await page.evaluate(async () => {
    const decodeImage = (img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      if (typeof img.decode === 'function') return img.decode().catch(() => {});
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    };

    await Promise.all(
      Array.from(document.querySelectorAll('.nav-logo img, .location-dropdown-logo img'))
        .map(decodeImage),
    );

    const heroWordmark = document.querySelector('.hero-title .line-2');
    if (heroWordmark) {
      const style = window.getComputedStyle(heroWordmark);
      const maskImage = style.webkitMaskImage || style.maskImage || '';
      const match = maskImage.match(/url\(["']?(.+?)["']?\)/);
      if (match && match[1]) await fetch(match[1]).catch(() => {});
    }

    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });
  await page.evaluate(() => {
    document.querySelectorAll('video').forEach((v) => {
      try {
        v.pause();
        v.currentTime = 0;
      } catch (_) {
        /* ignore */
      }
    });
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
    document.querySelectorAll('.hit-point').forEach((el) => el.remove());

    const tagline = document.getElementById('taglineText');
    if (tagline) {
      tagline.textContent = 'Social Gaming Adventure';
      tagline.classList.remove('no-cursor');
    }

    const minutes = document.getElementById('minutesCounter');
    if (minutes) minutes.textContent = '60';

    const points = document.getElementById('pointsCounter');
    if (points) points.textContent = '0';
  });
  await page.mouse.move(0, 0);
}

test.describe('visual regression (representative templates)', () => {
  test('homepage', async ({ page }) => {
    test.slow();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('.hero-title').first().waitFor({ state: 'attached', timeout: 10000 });
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: VISUAL_MAX_DIFF_PIXELS,
    });
  });

  test('open location (Mount Prospect)', async ({ page }) => {
    await page.goto('/mount-prospect');
    await expect(page).toHaveTitle(/Mount Prospect/i);
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('location-open.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: VISUAL_MAX_DIFF_PIXELS,
    });
  });

  test('open bookable location (Houston)', async ({ page }) => {
    await page.goto('/houston');
    await expect(page).toHaveTitle(/Houston/i);
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('location-bookable-houston.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: VISUAL_MAX_DIFF_PIXELS,
    });
  });

  test('groups corporate', async ({ page }) => {
    await page.goto('/groups/corporate');
    await expect(page.locator('body')).toBeVisible();
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('groups-corporate.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: VISUAL_MAX_DIFF_PIXELS,
    });
  });

  test('groups birthdays', async ({ page }) => {
    await page.goto('/groups/birthdays');
    await expect(page.locator('body')).toBeVisible();
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('groups-birthdays.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: VISUAL_MAX_DIFF_PIXELS,
    });
  });

  test('faq', async ({ page }) => {
    await page.goto('/faq');
    await page.locator('.faq-question').first().waitFor({ state: 'visible' });
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('faq.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: VISUAL_MAX_DIFF_PIXELS,
    });
  });

  test('contact', async ({ page }) => {
    await page.goto('/contact');
    await page.locator('form.contact-form').waitFor({ state: 'visible' });
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('contact.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixels: VISUAL_MAX_DIFF_PIXELS,
    });
  });
});
