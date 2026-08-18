const fs = require('node:fs');
const path = require('node:path');

const { test, expect } = require('@playwright/test');
const { prepareSiteSmoke, REPO_ROOT } = require('./site-helpers');

test.beforeEach(async ({ page }) => {
  await prepareSiteSmoke(page);
});

test('press releases render the Boston CMS article or its structured fallback', async ({ page }) => {
  await page.goto('/press/releases');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('PRESS RELEASES');
  const release = page.locator('.tm-resource-release', {
    has: page.getByRole('heading', { name: 'Time Mission Is Coming to Boston' }),
  });
  await expect(release).toBeVisible();
  await expect(release).toContainText(
    'Time Mission Boston is coming soon at 200 State St, Boston, MA 02109.',
  );

  const cmsArticleExists = [
    path.join(REPO_ROOT, 'dist/blog/boston-announcement.html'),
    path.join(REPO_ROOT, 'dist/blog/boston-announcement/index.html'),
  ].some((candidate) => fs.existsSync(candidate));
  const releaseLink = release.getByRole('link');

  await expect(releaseLink).toHaveCount(1);
  await expect(releaseLink).toHaveText(
    cmsArticleExists ? 'Read Press Release' : 'View Boston Location',
  );
  await expect(releaseLink).toHaveAttribute(
    'href',
    cmsArticleExists ? '/blog/boston-announcement' : '/boston',
  );
});
