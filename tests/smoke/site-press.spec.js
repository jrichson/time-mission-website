const { test, expect } = require('@playwright/test');
const { path, prepareSiteSmoke, REPO_ROOT } = require('./site-helpers');

const MASSLIVE_ARTICLE_URL = 'https://www.masslive.com/boston/2026/08/new-escape-room-video-game-experience-expected-to-open-in-boston-in-2027.html';

async function expectReleaseImage(page, src) {
  const image = page.locator('.tm-blog-article-media img');
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', src);
  await expect.poll(() => image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0);
}

test.beforeEach(async ({ page }) => {
  await prepareSiteSmoke(page);
});

test('press releases render all supplied announcements in an editorial layout', async ({ page }) => {
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

  for (const [release, slug, imageSrc] of [
    [nashvilleRelease, 'nashville-announcement', '/assets/photos/venue/_Time-Mission_0042-1200.webp'],
    [bostonRelease, 'boston-announcement', '/assets/photos/experiences/Time-Mission_Control-Room-1200.webp'],
    [globalRelease, 'time-mission-global-expansion-2027', '/assets/photos/TM-Groups-1200.webp'],
  ]) {
    const expectedHref = `/blog/${slug}`;

    await expect(release.locator('.tm-resource-release-media')).toHaveAttribute('href', expectedHref);
    const releaseImage = release.locator('.tm-resource-release-media img');
    await expect(releaseImage).toBeHidden();
    await expect(releaseImage).toHaveAttribute('src', imageSrc);
    await expect(release.locator('.tm-resource-release-title-link')).toBeVisible();
    await expect(release.locator('.tm-resource-release-title-link')).toHaveAttribute('href', expectedHref);
    await expect(release.locator('.tm-resource-button')).toHaveText('Read Press Release');
    await expect(release.locator('.tm-resource-button')).toHaveAttribute('href', expectedHref);
  }

  const layout = await bostonRelease.evaluate((release) => {
    const row = release.getBoundingClientRect();
    const date = release.querySelector('.tm-resource-kicker').getBoundingClientRect();
    const title = release.querySelector('h2').getBoundingClientRect();
    return {
      rowLeft: row.left,
      rowRight: row.right,
      dateBottom: date.bottom,
      titleTop: title.top,
      viewportWidth: window.innerWidth,
    };
  });
  expect(layout.dateBottom).toBeLessThanOrEqual(layout.titleTop + 1);
  expect(layout.rowLeft).toBeGreaterThanOrEqual(0);
  expect(layout.rowRight).toBeLessThanOrEqual(layout.viewportWidth);
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
  await expectReleaseImage(page, '/assets/photos/venue/_Time-Mission_0042-1200.webp');

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
  await expectReleaseImage(page, '/assets/photos/experiences/Time-Mission_Control-Room-1200.webp');

  await page.goto('/blog/time-mission-global-expansion-2027');
  await expect(page).toHaveTitle(/Time Mission Announces Global Expansion/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Time Mission announces major global expansion with 15 to 20 new locations planned for 2027',
  );
  await expect(page.locator('.tm-blog-body')).toContainText('Eindhoven, Netherlands');
  await expect(page.locator('.tm-blog-body')).toContainText(
    'Pieter Martens, CEO and Founder of Time Mission',
  );
  await expectReleaseImage(page, '/assets/photos/TM-Groups-1200.webp');
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
  await expect(thumbnailLink).toHaveAttribute('data-tm-analytics-event', 'press_coverage_click');
  await expect(thumbnailLink).toHaveAttribute('data-tm-analytics-partner', 'MassLive');
  await expect(thumbnailLink).toHaveAttribute(
    'data-tm-analytics-content-id',
    'masslive-boston-opening-2027',
  );
  await expect(thumbnailLink).toHaveAttribute('data-tm-analytics-link-surface', 'thumbnail');

  const thumbnail = thumbnailLink.locator('img');
  await expect(thumbnail).toBeVisible();
  await expect(thumbnail).toHaveAttribute('src', /masslive\.com\/resizer/);
  await expect(thumbnail).toHaveAttribute('alt', 'Three people play a Time Mission challenge surrounded by exercise balls.');
  await expect.poll(() => thumbnail.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);

  const cta = article.locator('.tm-resource-release-title-link');
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href', MASSLIVE_ARTICLE_URL);
  await expect(cta).toHaveAttribute('target', '_blank');
  await expect(cta).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(cta).toHaveAttribute('data-tm-analytics-link-surface', 'title');

  await cta.click();
  const pressClick = await page.evaluate(() => window.dataLayer.find(
    (entry) => entry && entry.event_name === 'PRESS_COVERAGE_CLICK',
  ));
  expect(pressClick.parameters).toMatchObject({
    CONTENT_ID: 'masslive-boston-opening-2027',
    LINK_PATH: MASSLIVE_ARTICLE_URL,
    LINK_SURFACE: 'title',
    PARTNER_NAME: 'MassLive',
  });
});
