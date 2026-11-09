import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequest } from '../functions/api/leaderboard.js';

const env = { TM_LEADERBOARD_AUTHENTICATION: 'fixture-private-key' };
const team = '<img src=x onerror=alert(1)>';
const teams = Array.from({ length: 100 }, (_, index) => ({ team_name: index ? `Crew ${index}` : team, total_game_score: 1234 - index }));
function payload(entries = teams, total = entries.length) {
  return Object.fromEntries(Array.from({ length: 10 }, (_, page) => [String(page + 1), {
    select_location_leaderboard: { total_records: total, entries: entries.slice(page * 10, (page + 1) * 10), result_code: 1 },
  }]));
}
function upstream(body = payload(), options = {}) {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'text/html' }, ...options });
}
function call(query = 'location=philadelphia', options = {}) {
  return onRequest({ request: new Request(`https://site.test/api/leaderboard?${query}`, { method: options.method || 'GET' }), env, ...options });
}
async function error(response, status, code) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ error: code });
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
}

beforeEach(() => vi.stubGlobal('fetch', vi.fn(async () => upstream())));
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('public venue leaderboard', () => {
  it('projects venue ranks and text and batches the capped results in one private request', async () => {
    const response = await call('location=philadelphia&page=1');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toMatchObject({ location: 'philadelphia', page: 1, pageSize: 10, totalRecords: 100 });
    expect(data.entries).toHaveLength(10);
    expect(data.entries[0]).toEqual({ team: 'Crew 10', score: 1224, location: 'philadelphia', rank: 11 });
    expect(data.entries[9].rank).toBe(20);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('set-cookie')).toBeNull();
    const [input, options] = fetch.mock.calls[0];
    const url = new URL(input);
    expect(url.origin + url.pathname).toBe('https://api-1.timemission.com/index.php');
    expect(url.searchParams.get('platform_id')).toBe('1005');
    expect(url.searchParams.get('channel_id')).toBe('3003');
    expect(url.searchParams.get('authentication')).toBe(env.TM_LEADERBOARD_AUTHENTICATION);
    const batch = JSON.parse(url.searchParams.get('request'));
    expect(Object.values(batch.functions)).toEqual(Array(10).fill('select_location_leaderboard'));
    expect(batch.variables['1']).toEqual({ period_type_id: 0, page: '0' });
    expect(batch.variables['10']).toEqual({ period_type_id: 0, page: '9' });
    expect(options.redirect).toBe('manual');
    expect(new Headers(options.headers).get('origin')).toBe('https://www.timemission.com');
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it.each(Object.entries({ lincoln: 1001, 'west-nyack': 1002, manassas: 1004, philadelphia: 1005, 'mount-prospect': 1006, houston: 1008, 'orland-park': 1009, edison: 1011, dallas: 1012 }))('allows only the canonical %s mapping', async (location, venue) => {
    expect((await call(`location=${location}`)).status).toBe(200);
    expect(new URL(fetch.mock.calls[0][0]).searchParams.get('platform_id')).toBe(String(venue));
  });

  it('defaults to page zero and accepts the final bounded page', async () => {
    expect((await (await call()).json()).page).toBe(0);
    expect((await (await call('location=philadelphia&page=99')).json()).page).toBe(99);
  });

  it.each(['', 'page=0', 'location=', 'location=philadelphia&page=', 'location=philadelphia&page=-1', 'location=philadelphia&page=1.0', 'location=philadelphia&page=01', 'location=philadelphia&page=100', 'location=philadelphia&page=1e1', 'location=philadelphia&page=%2B1', 'location=philadelphia&page=1&page=2', 'location=philadelphia&location=houston', 'location=philadelphia&url=https://other.test', 'location=philadelphia&platform_id=1002', 'location=global&dataset=top100-v2'])('rejects malformed or excessive query %s before fetching', async query => {
    await error(await call(query), 400, 'invalid_request');
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['antwerp', '1005', 'Philadelphia', 'toString', '__proto__'])('rejects unsupported venue %s', async location => {
    await error(await call(`location=${location}`), 400, 'unsupported_location');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects non-GET methods without contacting the provider', async () => {
    const response = await call(undefined, { method: 'POST' });
    await error(response, 405, 'invalid_request');
    expect(response.headers.get('allow')).toBe('GET');
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([{}, { TM_LEADERBOARD_AUTHENTICATION: '' }, { TM_LEADERBOARD_AUTHENTICATION: ' ' }])('identifies missing private configuration', async configuration => {
    await error(await call(undefined, { env: configuration }), 503, 'configuration_unavailable');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts a genuinely empty result', async () => {
    fetch.mockResolvedValue(upstream(payload([], 0)));
    expect(await (await call()).json()).toEqual({ location: 'philadelphia', page: 0, pageSize: 10, totalRecords: 0, entries: [] });
  });

  it('normalizes the provider-observed Dallas empty result with omitted entries', async () => {
    const body = payload([], 0);
    Object.values(body).forEach(result => { delete result.select_location_leaderboard.entries; });
    fetch.mockResolvedValue(upstream(body));
    expect(await (await call('location=dallas')).json()).toEqual({ location: 'dallas', page: 0, pageSize: 10, totalRecords: 0, entries: [] });
  });

  it.each([
    { total_records: 1, result_code: 1 },
    { total_records: 0, result_code: 0 },
    { total_records: '0', result_code: 1 },
    { total_records: 0, result_code: 1, entries: null },
    { total_records: 0, result_code: 1, entries: {} },
    { total_records: 0, result_code: 1, entries: '' },
  ])('rejects missing positive entries and malformed empty shapes: %j', async result => {
    const body = payload([], 0);
    body['1'].select_location_leaderboard = result;
    fetch.mockResolvedValue(upstream(body));
    await error(await call(), 502, 'upstream_unavailable');
  });

  it.each([
    () => new Response('Access Forbidden'),
    () => new Response('{}', { status: 500 }),
    () => new Response('', { status: 302, headers: { location: 'https://other.test' } }),
    () => upstream({}),
    () => upstream({ '1': { select_location_leaderboard: { ...payload()['1'].select_location_leaderboard, result_code: 0 } } }),
    () => upstream(payload([{ team_name: 'team', total_game_score: '100' }])),
    () => upstream(payload([{ team_name: 3, total_game_score: 100 }])),
    () => upstream(payload([{ team_name: 'team', total_game_score: 1.5 }])),
    () => upstream(payload([], -1)),
    () => upstream({ ...payload(), '1': { select_location_leaderboard: { total_records: 100, result_code: 1, entries: Array(11).fill({ team_name: 'team', total_game_score: 1 }) } } }),
    () => new Response(new Uint8Array([0xc3, 0x28])),
    () => new Response(' '.repeat(65_537)),
  ])('fails closed on HTTP, redirect, text, schema, UTF-8 or body failures', async makeResponse => {
    fetch.mockResolvedValue(makeResponse());
    const response = await call();
    await error(response, 502, 'upstream_unavailable');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('bounds actual streamed bytes without requiring or trusting Content-Length', async () => {
    let cancelled = false;
    fetch.mockResolvedValue(new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(40_000)); controller.enqueue(new Uint8Array(40_000)); },
      cancel() { cancelled = true; },
    }), { headers: { 'content-length': '1' } }));
    await error(await call(), 502, 'upstream_unavailable');
    expect(cancelled).toBe(true);
  });

  it('does not expose network errors or private URLs', async () => {
    fetch.mockRejectedValue(new Error(`failed ${env.TM_LEADERBOARD_AUTHENTICATION}`));
    await error(await call(), 502, 'upstream_unavailable');
  });

  it('aborts a stalled fetch after five seconds', async () => {
    vi.useFakeTimers();
    fetch.mockImplementation(() => new Promise(() => {}));
    const pending = call();
    await vi.advanceTimersByTimeAsync(5_000);
    await error(await pending, 502, 'upstream_unavailable');
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('applies the same deadline to a stalled response body and cancels it', async () => {
    vi.useFakeTimers();
    let cancelled = false;
    fetch.mockResolvedValue(new Response(new ReadableStream({ cancel() { cancelled = true; } })));
    const pending = call();
    await vi.advanceTimersByTimeAsync(5_000);
    await error(await pending, 502, 'upstream_unavailable');
    expect(cancelled).toBe(true);
  });

  it('reuses a verified top-100 snapshot across pages and never caches errors or credentials', async () => {
    const stored = new Map();
    const cache = { match: vi.fn(async key => stored.get(key.url)?.clone()), put: vi.fn(async (key, response) => { stored.set(key.url, response); }) };
    vi.stubGlobal('caches', { default: cache });
    const pending = [];
    const options = { waitUntil: promise => pending.push(promise) };
    await call('page=1&location=philadelphia', options);
    await Promise.all(pending);
    await call('location=philadelphia&page=1', options);
    await call('location=houston&page=1', options);
    await call('location=philadelphia&page=2', options);
    await Promise.all(pending);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(cache.put).toHaveBeenCalledTimes(2);
    for (const [key, response] of stored) {
      expect(key).not.toContain(env.TM_LEADERBOARD_AUTHENTICATION);
      expect(await response.clone().text()).not.toContain(env.TM_LEADERBOARD_AUTHENTICATION);
      expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    }
    fetch.mockResolvedValue(new Response('Access Forbidden'));
    await error(await call('location=manassas&page=3', options), 502, 'upstream_unavailable');
    expect(cache.put).toHaveBeenCalledTimes(2);
  });

  it('keeps ties at the same rank across a page boundary and skips the following positions', async () => {
    fetch.mockResolvedValue(upstream(payload(Array.from({ length: 12 }, (_, index) => ({
      team_name: `Crew ${index}`, total_game_score: index < 8 ? 1000 - index : index < 11 ? 500 : 400,
    })))));
    const data = await (await call('location=philadelphia&page=1')).json();
    expect(data.entries.map(entry => entry.rank)).toEqual([9, 12]);
  });

  it('builds and caches a global top 100 from every connected venue, including results beyond their first page', async () => {
    const stored = new Map();
    vi.stubGlobal('caches', { default: {
      match: async key => stored.get(key.url)?.clone(),
      put: async (key, response) => { stored.set(key.url, response); },
    } });
    fetch.mockImplementation(async input => {
      const platform = new URL(input).searchParams.get('platform_id');
      return upstream(payload(teams.map((entry, index) => ({ ...entry,
        total_game_score: (platform === '1005' ? 2000 : 1000) - index,
      }))));
    });
    const first = await (await call('location=global')).json();
    expect(first).toMatchObject({ location: 'global', totalRecords: 100 });
    expect(first.entries[0]).toEqual({ team, score: 2000, rank: 1, location: 'philadelphia' });
    const last = await (await call('location=global&page=9')).json();
    expect(last.entries.map(entry => entry.rank)).toEqual([91, 92, 93, 94, 95, 96, 97, 98, 99, 100]);
    expect(last.entries[9]).toMatchObject({ score: 1901, location: 'philadelphia' });
    expect(fetch).toHaveBeenCalledTimes(9);
    expect(new Set(fetch.mock.calls.map(([input]) => new URL(input).searchParams.get('platform_id'))).size).toBe(9);
  });

  it('shares ranks across tied venues and fails the global view if any connected venue fails', async () => {
    fetch.mockImplementation(async input => {
      const platform = new URL(input).searchParams.get('platform_id');
      return upstream(payload([{ team_name: `Team ${platform}`, total_game_score: ['1002', '1005'].includes(platform) ? 600 : 100 }]));
    });
    const result = await (await call('location=global')).json();
    expect(result.entries.slice(0, 3).map(entry => entry.rank)).toEqual([1, 1, 3]);
    fetch.mockImplementation(async input => new URL(input).searchParams.get('platform_id') === '1008'
      ? new Response('Platform database error 1045') : upstream());
    await error(await call('location=global'), 502, 'upstream_unavailable');
  });

  it('aborts the whole global request within one five-second deadline when a venue stalls', async () => {
    vi.useFakeTimers();
    fetch.mockImplementation(input => new URL(input).searchParams.get('platform_id') === '1012'
      ? new Promise(() => {}) : Promise.resolve(upstream()));
    const pending = call('location=global');
    await vi.advanceTimersByTimeAsync(5_000);
    await error(await pending, 502, 'upstream_unavailable');
    expect(fetch).toHaveBeenCalledTimes(9);
    expect(fetch.mock.calls.every(([, options]) => options.signal.aborted)).toBe(true);
  });

  it('accepts omitted empty tail pages but rejects a missing page or changing totals', async () => {
    const body = payload(teams.slice(0, 61));
    Object.values(body).forEach(result => { if (!result.select_location_leaderboard.entries.length) delete result.select_location_leaderboard.entries; });
    fetch.mockResolvedValue(upstream(body));
    const data = await (await call('location=lincoln&page=6')).json();
    expect(data.totalRecords).toBe(61);
    expect(data.entries.map(entry => entry.rank)).toEqual([61]);
    delete body['10'];
    fetch.mockResolvedValue(upstream(body));
    await error(await call(), 502, 'upstream_unavailable');
    const changed = payload();
    changed['2'].select_location_leaderboard.total_records = 99;
    fetch.mockResolvedValue(upstream(changed));
    await error(await call(), 502, 'upstream_unavailable');
  });

  it('keeps serving verified results when cache reads or writes fail', async () => {
    vi.stubGlobal('caches', { default: { match: vi.fn(async () => { throw new Error('cache unavailable'); }), put: vi.fn(async () => { throw new Error('cache unavailable'); }) } });
    const pending = [];
    expect((await call(undefined, { waitUntil: promise => pending.push(promise) })).status).toBe(200);
    await Promise.all(pending);
  });
});
