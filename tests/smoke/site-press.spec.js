const { test, expect } = require('@playwright/test');
const { path, prepareSiteSmoke, REPO_ROOT } = require('./site-helpers');

const MASSLIVE_ARTICLE_URL = 'https://www.masslive.com/boston/2026/08/new-escape-room-video-game-experience-expected-to-open-in-boston-in-2027.html';

test.beforeEach(async ({ page }) => {
  await prepareSiteSmoke(page);
});

test('press releases render all supplied announcements in an editorial layout', async ({ page, isMobile }) => {
  await page.goto('/press/releases');

  await expect(page).toHaveTitle('Time Mission Press Releases | Company News');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /new locations, venue openings, company milestones/,
  );
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
  const nashvilleRelease = page.locator('.tm-resource-release', {
    has: page.getByRole('heading', {
      name: 'START THE COUNTDOWN: TIME MISSION TO OPEN IN MUSIC CITY THIS YEAR',
    }),
  });
  await expect(bostonRelease).toContainText('8,600-square-foot venue at Marketplace Center');
  await expect(globalRelease).toContainText(
    '15 to 20 new locations planned for 2027 and venues currently under construction',
  );
  await expect(nashvilleRelease).toContainText('12,000-square-foot, 28-mission venue');

  for (const [release, slug] of [
    [nashvilleRelease, 'nashville-announcement'],
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
  await page.goto('/blog/nashville-announcement');
  await expect(page).toHaveTitle(/Time Mission Nashville Opening in 2026/);
  await expect(page.locator('body')).toHaveClass(/tm-press-article-page/);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute(
    'content',
    '2026-08-18T12:00:00.000Z',
  );
  const structuredData = await page.locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) => scripts.map((script) => JSON.parse(script.textContent || '{}')));
  const graphNodes = structuredData.flatMap((block) => block['@graph'] || []);
  const newsArticle = graphNodes.find((node) => node['@type'] === 'NewsArticle');
  expect(newsArticle).toMatchObject({
    headline: 'START THE COUNTDOWN: TIME MISSION TO OPEN IN MUSIC CITY THIS YEAR',
    datePublished: '2026-08-18T12:00:00.000Z',
    publisher: { '@id': 'https://www.timemission.com/#organization' },
  });
  expect(newsArticle.url).toBe('https://www.timemission.com/blog/nashville-announcement');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'START THE COUNTDOWN: TIME MISSION TO OPEN IN MUSIC CITY THIS YEAR',
  );
  await expect(page.locator('.tm-blog-body')).toContainText(
    '12,000 sf and the largest Time Mission location',
  );
  await expect(page.locator('.tm-blog-body')).toContainText(
    'David Larson, Managing Partner at TM Operations',
  );
  await expect(page.locator('.tm-blog-body')).not.toContainText('AUGUST XX');

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

test('in the news shows the MassLive article and its thumbnail', async ({ page }) => {
  await page.route('https://www.masslive.com/resizer/**', (route) => route.fulfill({
    contentType: 'image/jpeg',
    path: path.join(REPO_ROOT, 'assets/photos/TM-Groups.jpg'),
  }));
  await page.goto('/press/in-the-news');

  await expect(page).toHaveTitle('Time Mission in the News | Media Coverage');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /local opening stories, interviews, and editorial features/,
  );
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IN THE NEWS');
  const article = page.locator('.tm-resource-release', {
    has: page.getByRole('heading', {
      name: 'New escape room, video game experience expected to open in Boston in 2027',
    }),
  });
  await expect(article).toContainText('MassLive · August 18, 2026');
  await expect(article).toContainText('Grab your crew and race against the clock');

  const thumbnailLink = article.locator('.tm-resource-release-media');
  await expect(thumbnailLink).toHaveAttribute('href', MASSLIVE_ARTICLE_URL);
  await expect(thumbnailLink).toHaveAttribute('target', '_blank');
  await expect(thumbnailLink).toHaveAttribute('rel', 'noopener noreferrer');

  const thumbnail = thumbnailLink.locator('img');
  await expect(thumbnail).toBeVisible();
  await expect(thumbnail).toHaveAttribute('src', /masslive\.com\/resizer/);
  await expect.poll(() => thumbnail.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);

  const cta = article.getByRole('link', { name: 'Read on MassLive', exact: true });
  await expect(cta).toHaveAttribute('href', MASSLIVE_ARTICLE_URL);
  await expect(cta).toHaveAttribute('target', '_blank');
});
