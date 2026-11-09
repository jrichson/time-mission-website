const { test, expect } = require('@playwright/test');
const { prepareSmokePage } = require('./network');

test.beforeEach(async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Phone loading and touch feedback policy');
  await prepareSmokePage(page);
});

test('home and venue keep the hero photo without requesting background video on phones', async ({ page }) => {
  const videoRequests = [];
  page.on('request', request => {
    if (/\.mp4(?:[?#]|$)/i.test(request.url())) videoRequests.push(request.url());
  });
  const venuePath = process.env.TM_SITE_PROFILE === 'eu' ? '/antwerp' : '/philadelphia';
  for (const path of ['/', venuePath]) {
    await page.goto(path);
    await expect(page.locator('.hero-video-container.is-video-fallback')).toBeVisible();
    const player = page.locator('#heroVideo');
    await expect(player).not.toHaveAttribute('autoplay');
    await expect(player).toHaveAttribute('preload', 'none');
    await expect(player.locator('source[src]')).toHaveCount(0);
    expect(await player.evaluate(video => video.paused)).toBe(true);
    await expect(page.locator('.mobile-book-bar .mobile-book-btn')).toBeVisible();
  }
  expect(videoRequests).toEqual([]);
});

test('booking press feedback is brief and respects reduced motion', async ({ page }) => {
  await page.goto('/');
  const button = page.locator('.mobile-book-bar .mobile-book-btn');
  await expect(button).toBeVisible();
  expect(await button.evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.locator('.hero-title .line-2').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  const box = await button.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(() => button.evaluate(element => getComputedStyle(element).transform)).not.toBe('none');
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  expect(await button.evaluate(element => getComputedStyle(element).transform)).toBe('none');
  await page.mouse.move(0, 0);
  await page.mouse.up();
});
