const { test, expect } = require('@playwright/test');
const { prepareSiteSmoke } = require('./site-helpers');

test.beforeEach(async ({ page }) => {
  await prepareSiteSmoke(page);
});

test('press releases render the structured Boston fallback', async ({ page }) => {
  await page.goto('/press/releases');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('PRESS RELEASES');
  const release = page.locator('.tm-resource-release', {
    has: page.getByRole('heading', { name: 'Time Mission Is Coming to Boston' }),
  });
  await expect(release).toBeVisible();
  await expect(release.getByRole('link', { name: 'View Boston Location' }))
    .toHaveAttribute('href', '/boston');
});
