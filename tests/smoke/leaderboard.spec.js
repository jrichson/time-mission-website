const { test, expect } = require('@playwright/test');
const { prepareSmokePage } = require('./network');

const scores = (location, page = 0, entries = [{ team: '<img src=x onerror=alert(1)>', score: 12345 }], totalRecords = 11) => ({
  location, page, pageSize: 10, totalRecords,
  entries: entries.map((entry, index) => ({ location: location === 'global' ? 'philadelphia' : location, rank: page * 10 + index + 1, ...entry })),
});
test.beforeEach(async ({ page }) => { await prepareSmokePage(page); });

test('first visit defaults to the US-wide board, renders literal names, searches loaded rows and keeps ranks across pages', async ({ page, isMobile }) => {
  const requests = [];
  await page.route('**/api/leaderboard?*', route => {
    const url = new URL(route.request().url());
    requests.push(url.search);
    const venue = url.searchParams.get('location');
    const number = Number(url.searchParams.get('page'));
    return route.fulfill({ json: scores(venue, number, number ? [{ team: 'Next page crew', score: 900 }] : undefined) });
  });
  await page.goto('/leaderboard');
  const board = page.locator('[data-leaderboard]');
  await expect(board.locator('[data-leaderboard-location]')).toHaveValue('global');
  await expect(board.locator('caption')).toContainText('Global · US venues');
  await expect(board.locator('tbody')).toContainText('Philadelphia');
  if (isMobile) await expect(board.locator('.lb-team-location').first()).toBeVisible();
  else await expect(board.locator('.lb-team-location').first()).toBeHidden();
  await expect(board.getByRole('columnheader', { name: 'Rank', exact: true })).toBeVisible();
  expect(requests).toEqual(['?location=global&page=0']);
  await board.getByRole('combobox', { name: 'Location', exact: true }).selectOption('philadelphia');
  await expect(board.locator('tbody')).toContainText('<img src=x onerror=alert(1)>');
  await expect(board.locator('tbody img')).toHaveCount(0);
  await expect(board.locator('caption')).toContainText('Philadelphia');
  await expect(board.getByRole('tab')).toHaveCount(0);
  await board.getByRole('searchbox').fill('absent');
  await expect(board.locator('[role=status]')).toContainText('No teams match');
  expect(requests).toHaveLength(2);
  await board.getByRole('searchbox').fill('');
  await board.getByRole('button', { name: 'Next page' }).click();
  await expect(board.locator('tbody')).toContainText('Next page crew');
  await expect(board.locator('.lb-rank').first()).toHaveText('11');
  await board.getByRole('button', { name: 'Previous page' }).click();
  await expect(board.locator('tbody')).toContainText('<img');
});

for (const reducedMotion of ['no-preference', 'reduce']) {
  test(`leader styling respects ties and result reveals respect ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    let firstRequest;
    const requested = new Promise(resolve => { firstRequest = resolve; });
    await page.route('**/api/leaderboard?*', route => {
      const number = Number(new URL(route.request().url()).searchParams.get('page'));
      if (!number) return firstRequest(route);
      return route.fulfill({ json: scores('houston', number, [{ team: 'Next crew', score: 700 }], 11) });
    });
    await page.goto('/leaderboard?location=houston');
    const board = page.locator('[data-leaderboard]');
    await expect(board.locator('[role=status]')).toContainText('Loading crew scores');
    await (await requested).fulfill({ json: scores('houston', 0, [
      { team: 'First crew', rank: 1, score: 1000 },
      { team: 'Tied crew', rank: 1, score: 1000 },
      { team: 'Third crew', rank: 3, score: 900 },
      { team: 'Fourth crew', rank: 4, score: 800 },
    ]) });
    await expect(board.locator('.lb-leader-label')).toHaveText(['Score to beat', 'Score to beat']);
    const animations = await board.locator('tbody').evaluate(body => body.getAnimations({ subtree: true }).map(animation => {
      const timing = animation.effect.getTiming();
      return timing.duration + timing.delay;
    }));
    if (reducedMotion === 'reduce') expect(animations).toEqual([]);
    else {
      expect(animations.length).toBeGreaterThan(0);
      expect(Math.max(...animations)).toBeLessThanOrEqual(500);
    }
    await expect(board.locator('.lb-rank')).toHaveText(['1', '1', '3', '4']);
    await expect(board.locator('td.lb-col-score')).toHaveText(['1,000', '1,000', '900', '800']);
    await board.getByRole('searchbox').fill('Third');
    await expect(board.locator('.lb-rank')).toHaveText(['3']);
    await expect(board.locator('.lb-leader-label')).toHaveCount(0);
    expect(await board.locator('tbody').evaluate(body => body.getAnimations({ subtree: true }).length)).toBe(0);
    await board.getByRole('searchbox').fill('');
    await board.getByRole('button', { name: 'Next page' }).click();
    await expect(board.locator('.lb-rank')).toHaveText(['11']);
    await expect(board.locator('.lb-leader-label')).toHaveCount(0);
  });

  test(`pagination brings the next ranks into view with ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.route('**/api/leaderboard?*', route => {
      const number = Number(new URL(route.request().url()).searchParams.get('page'));
      const entries = Array.from({ length: 10 }, (_, index) => ({ team: `Crew ${number * 10 + index + 1}`, score: 1000 - number * 10 - index }));
      return route.fulfill({ json: scores('houston', number, entries, 30) });
    });
    await page.goto('/leaderboard?location=houston');
    const board = page.locator('[data-leaderboard]');
    await expect(board.locator('tbody tr')).toHaveCount(10);
    expect(await page.locator('html').evaluate(html => getComputedStyle(html).scrollBehavior)).toBe(reducedMotion === 'reduce' ? 'auto' : 'smooth');
    await expect(board.getByRole('table')).toHaveAccessibleName('Houston · Page 1');
    expect((await board.locator('caption').boundingBox()).height).toBeLessThanOrEqual(1);

    for (const [button, rank, number] of [['Next page', '11', 2], ['Previous page', '1', 1]]) {
      await board.getByRole('button', { name: button }).click();
      await expect(board.locator('.lb-rank').first()).toHaveText(rank);
      await expect(board.locator('[data-leaderboard-page]')).toHaveText(`Page ${number}`);
      await expect.poll(() => board.locator('.leaderboard-card').evaluate(card =>
        Math.abs(card.getBoundingClientRect().top - parseFloat(getComputedStyle(card).scrollMarginTop))
      )).toBeLessThanOrEqual(2);
      const cardTop = await board.locator('.leaderboard-card').evaluate(card => card.getBoundingClientRect().top);
      const navBottom = await page.locator('.nav').evaluate(nav => nav.getBoundingClientRect().bottom);
      expect(cardTop).toBeGreaterThan(navBottom);
    }
  });
}

test('keyboard focus stays in results through delayed pagination and retry success or failure', async ({ page }) => {
  const pending = [];
  let initial = true;
  await page.route('**/api/leaderboard?*', route => {
    if (initial) {
      initial = false;
      return route.fulfill({ json: scores('houston', 0, [{ team: 'First page crew', score: 100 }]) });
    }
    pending.push(route);
  });
  await page.goto('/leaderboard?location=houston');
  const board = page.locator('[data-leaderboard]');
  const status = board.locator('[data-leaderboard-status]');
  const caption = board.locator('caption');
  const next = board.getByRole('button', { name: 'Next page' });
  const previous = board.getByRole('button', { name: 'Previous page' });
  const retry = board.getByRole('button', { name: 'Retry' });
  await expect(board.locator('tbody')).toContainText('First page crew');

  await next.focus();
  await page.keyboard.press('Enter');
  await expect(status).toContainText('Loading');
  await expect(status).toBeFocused();
  await expect.poll(() => pending.length).toBe(1);
  await pending.shift().fulfill({ json: scores('houston', 1, [{ team: 'Next page crew', score: 90 }]) });
  await expect(board.locator('tbody')).toContainText('Next page crew');
  await expect(caption).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(previous).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(status).toContainText('Loading');
  await expect(status).toBeFocused();
  await expect.poll(() => pending.length).toBe(1);
  await pending.shift().fulfill({ status: 502, json: { error: 'upstream_unavailable' } });
  await expect(status).toContainText('temporarily unavailable');
  await expect(status).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(retry).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(status).toContainText('Loading');
  await expect(status).toBeFocused();
  await expect.poll(() => pending.length).toBe(1);
  await pending.shift().fulfill({ status: 502, json: { error: 'upstream_unavailable' } });
  await expect(status).toContainText('temporarily unavailable');
  await expect(status).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(retry).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(status).toContainText('Loading');
  await expect(status).toBeFocused();
  await expect.poll(() => pending.length).toBe(1);
  await pending.shift().fulfill({ json: scores('houston', 0, [{ team: 'Recovered crew', score: 100 }]) });
  await expect(board.locator('tbody')).toContainText('Recovered crew');
  await expect(caption).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(next).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(status).toBeFocused();
  await expect.poll(() => pending.length).toBe(1);
  const select = board.getByRole('combobox', { name: 'Location', exact: true });
  await select.focus();
  await pending.shift().fulfill({ json: scores('houston', 1, [{ team: 'Next page crew', score: 90 }]) });
  await expect(board.locator('tbody')).toContainText('Next page crew');
  await expect(select).toBeFocused();
});

test('distinguishes empty, configuration, unsupported and temporary failure with retry', async ({ page }) => {
  let mode = 'configuration_unavailable';
  await page.route('**/api/leaderboard?*', route => route.fulfill(mode === 'empty' ? { json: scores('houston', 0, [], 0) } : { status: 503, json: { error: mode } }));
  await page.goto('/leaderboard?location=houston');
  const board = page.locator('[data-leaderboard]');
  await expect(board.locator('[role=status]')).toContainText('not configured');
  mode = 'upstream_unavailable';
  await board.getByRole('button', { name: 'Retry' }).click();
  await expect(board.locator('[role=status]')).toContainText('temporarily unavailable');
  mode = 'empty';
  await board.getByRole('button', { name: 'Retry' }).click();
  await expect(board.locator('[role=status]')).toContainText('No scores');
  await page.goto('/leaderboard?location=antwerp');
  await expect(board.locator('[role=status]')).toContainText('not available for this venue');
});

test('superseded venue requests cannot overwrite the current venue and selection follows TM clear/restore', async ({ page }) => {
  let release, started, settled;
  const pending = new Promise(resolve => { release = resolve; });
  const requested = new Promise(resolve => { started = resolve; });
  const completed = new Promise(resolve => { settled = resolve; });
  await page.route('**/api/leaderboard?*', async route => {
    const venue = new URL(route.request().url()).searchParams.get('location');
    if (venue === 'philadelphia') { started(); await pending; }
    await route.fulfill({ json: scores(venue, 0, [{ team: venue + ' crew', score: 10 }], 1) }).catch(() => {});
    if (venue === 'philadelphia') settled();
  });
  await page.goto('/leaderboard');
  const board = page.locator('[data-leaderboard]');
  const select = board.getByRole('combobox', { name: 'Location', exact: true });
  await select.selectOption('philadelphia');
  await expect(board.locator('[role=status]')).toContainText('Loading');
  await requested;
  await select.selectOption('houston');
  await expect(board.locator('tbody')).toContainText('houston crew');
  release();
  await completed;
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  await expect(board.locator('tbody')).toContainText('houston crew');
  await expect(board.locator('tbody')).not.toContainText('philadelphia crew');
  await expect(board.locator('caption')).toContainText('Houston');
  await page.evaluate(() => window.TM.clear());
  await expect(select).toHaveValue('global');
  await expect(board.locator('tbody')).toContainText('global crew');
  await page.evaluate(() => window.TM.select('houston', { persist: false }));
  await expect(select).toHaveValue('houston');
  await expect(board.locator('tbody')).toContainText('houston crew');
});

test('malformed successful response becomes unavailable and a valid retry recovers', async ({ page }) => {
  let valid = false;
  await page.route('**/api/leaderboard?*', route => route.fulfill({
    json: scores('houston', 0, [{ team: 'Recovered crew', score: valid ? 100 : '100' }], 1),
  }));
  await page.goto('/leaderboard?location=houston');
  const board = page.locator('[data-leaderboard]');
  await expect(board.locator('[role=status]')).toContainText('temporarily unavailable');
  await expect(board).toHaveAttribute('aria-busy', 'false');
  await expect(board.locator('tbody tr')).toHaveCount(0);
  const retry = board.getByRole('button', { name: 'Retry' });
  await expect(retry).toBeVisible();
  valid = true;
  await retry.click();
  await expect(board.locator('tbody')).toContainText('Recovered crew');
  await expect(board).toHaveAttribute('aria-busy', 'false');
  await expect(retry).toBeHidden();
});

test('stalled browser request reaches its deadline and a valid retry recovers', async ({ page }) => {
  let stalled;
  let requests = 0;
  await page.route('**/api/leaderboard?*', route => {
    if (++requests === 1) { stalled = route; return; }
    return route.fulfill({ json: scores('houston', 0, [{ team: 'Recovered crew', score: 100 }], 1) });
  });
  await page.goto('/leaderboard?location=houston');
  const board = page.locator('[data-leaderboard]');
  await expect(board.locator('[role=status]')).toContainText('Loading');
  await expect(board).toHaveAttribute('aria-busy', 'true');
  await expect(board.locator('[role=status]')).toContainText('temporarily unavailable', { timeout: 10_000 });
  await expect(board).toHaveAttribute('aria-busy', 'false');
  const retry = board.getByRole('button', { name: 'Retry' });
  await expect(retry).toBeVisible();
  await stalled.abort().catch(() => {});
  await retry.click();
  await expect(board.locator('tbody')).toContainText('Recovered crew');
  await expect(board).toHaveAttribute('aria-busy', 'false');
  await expect(retry).toBeHidden();
  expect(requests).toBe(2);
});

test('home carries the selected venue to the full leaderboard', async ({ page }) => {
  await page.route('**/api/leaderboard?*', route => route.fulfill({ json: scores(new URL(route.request().url()).searchParams.get('location')) }));
  await page.goto('/');
  const board = page.locator('[data-leaderboard]');
  await board.getByRole('combobox', { name: 'Location', exact: true }).selectOption('philadelphia');
  await expect(board.locator('tbody')).toContainText('<img');
  await expect(board.getByRole('link')).toHaveAttribute('href', '/leaderboard?location=philadelphia');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('venue-scoped leaderboard URLs default to that venue, including localized routes', async ({ page }) => {
  await page.route('**/api/leaderboard?*', route => route.fulfill({ json: scores(new URL(route.request().url()).searchParams.get('location')) }));
  for (const [path, venue, name] of [['/philadelphia/leaderboard', 'philadelphia', 'Philadelphia'], ['/es/houston/leaderboard', 'houston', 'Houston']]) {
    await page.goto(path);
    const board = page.locator('[data-leaderboard]');
    await expect(board.locator('[data-leaderboard-location]')).toHaveValue(venue);
    await expect(board.locator('caption')).toContainText(name);
    await expect(board.locator('tbody')).toContainText(name);
  }
});

test('localized home keeps the venue link and leaderboard controls are accessible', async ({ page }) => {
  await page.route('**/api/leaderboard?*', route => route.fulfill({ json: scores('houston', 0, [{ team: 'Test crew', score: 100 }], 1) }));
  await page.goto('/es?location=houston');
  const board = page.locator('[data-leaderboard]');
  await expect(board.locator('tbody')).toContainText('Test crew');
  await expect(board.locator('[data-leaderboard-link]')).toHaveAttribute('href', '/es/leaderboard?location=houston');
  const AxeBuilder = require('@axe-core/playwright').default;
  const result = await new AxeBuilder({ page }).include('[data-leaderboard]').analyze();
  expect(result.violations).toEqual([]);
});

test('a venue chosen before the location catalog finishes loading is preserved', async ({ page }) => {
  let catalogRequest;
  const requested = new Promise(resolve => { catalogRequest = resolve; });
  await page.route('**/data/locations.json*', route => catalogRequest(route));
  await page.route('**/api/leaderboard?*', route => route.fulfill({ json: scores('houston', 0, [{ team: 'Houston crew', score: 100 }], 1) }));
  await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
  const catalog = await requested;
  const board = page.locator('[data-leaderboard]');
  const select = board.getByRole('combobox', { name: 'Location', exact: true });
  await select.selectOption('houston');
  await expect(board.locator('tbody')).toContainText('Houston crew');
  await catalog.fulfill({ path: require('node:path').resolve('dist/data/locations.json'), contentType: 'application/json' });
  await page.evaluate(() => window.TM.ready);
  await expect(select).toHaveValue('houston');
  await expect(board.locator('tbody')).toContainText('Houston crew');
});
