const { test, expect } = require('@playwright/test');
const { prepareSiteSmoke } = require('./site-helpers');

test.beforeEach(async ({ page }) => {
  await prepareSiteSmoke(page);
});

test('press releases render both supplied announcements in an editorial layout', async ({ page, isMobile }) => {
  await page.goto('/press/releases');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('PRESS RELEASES');
  const bostonRelease = page.locator('.tm-resource-release', {
    has: page.getByRole('heading', {
      name: "Time Mission Announces New Immersive Adventure Steps from Boston's Faneuil Hall",
    }),
  });
  const globalRelease = page.locator('.tm-resource-release', {
    has: page.getByRole('heading', {
      name: 'Time Mission announces major global expansion with 15 to 20 new locations planned for 2027',
    }),
  });
  await expect(bostonRelease).toContainText('8,600-square-foot venue at Marketplace Center');
  await expect(globalRelease).toContainText(
    '15 to 20 new locations planned for 2027 and venues currently under construction',
  );

  for (const [release, slug] of [
    [bostonRelease, 'boston-announcement'],
    [globalRelease, 'time-mission-global-expansion-2027'],
  ]) {
    const expectedHref = `/blog/${slug}`;

    await expect(release.locator('.tm-resource-release-media')).toHaveAttribute('href', expectedHref);
    const releaseImage = release.locator('.tm-resource-release-media img');
    await expect(releaseImage).toBeVisible();
    await expect.poll(() => releaseImage.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(release.locator('.tm-resource-button')).toHaveText('Read Press Release');
    await expect(release.locator('.tm-resource-button')).toHaveAttribute('href', expectedHref);
  }

  const layout = await bostonRelease.evaluate((release) => {
    const media = release.querySelector('.tm-resource-release-media').getBoundingClientRect();
    const copy = release.querySelector('.tm-resource-release-copy').getBoundingClientRect();
    return {
      mediaBottom: media.bottom,
      mediaLeft: media.left,
      copyLeft: copy.left,
      copyTop: copy.top,
    };
  });
  if (isMobile) expect(layout.mediaBottom).toBeLessThanOrEqual(layout.copyTop + 1);
  else expect(layout.mediaLeft).toBeLessThan(layout.copyLeft);
});

test('press release detail pages retain the full supplied articles', async ({ page }) => {
  await page.goto('/blog/boston-announcement');
  await expect(page).toHaveTitle(/Time Mission Announces Boston Location/);
  await expect(page.locator('body')).toHaveClass(/tm-press-article-page/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    "Time Mission Announces New Immersive Adventure Steps from Boston's Faneuil Hall",
  );
  await expect(page.locator('.tm-blog-body')).toContainText(
    '8,600-square-foot venue at Marketplace Center',
  );
  await expect(page.locator('.tm-blog-body')).toContainText(
    'Rob Cooper, CEO of LOL Entertainment',
  );

  await page.goto('/blog/time-mission-global-expansion-2027');
  await expect(page).toHaveTitle(/Time Mission Announces Global Expansion/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Time Mission announces major global expansion with 15 to 20 new locations planned for 2027',
  );
  await expect(page.locator('.tm-blog-body')).toContainText('Eindhoven, Netherlands');
  await expect(page.locator('.tm-blog-body')).toContainText(
    'Pieter Martens, CEO and Founder of Time Mission',
  );
});
