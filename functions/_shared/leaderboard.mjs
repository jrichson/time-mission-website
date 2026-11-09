import locations from './leaderboard-locations.json';

const PAGE_SIZE = 10;
const MAX_RESULTS = 100;
const MAX_BODY_BYTES = 64 * 1024;

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-content-type-options': 'nosniff',
      'cache-control': status === 200 ? 'public, max-age=60' : 'no-store',
      ...headers,
    },
  });
}

async function readPayload(response, signal) {
  signal.throwIfAborted();
  if (!response.ok || !response.body) throw new Error('Unavailable response');
  const reader = response.body.getReader();
  const cancel = () => { reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) throw new Error('Response too large');
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } finally {
    signal.removeEventListener('abort', cancel);
    cancel();
  }
}

async function fetchVenue(location, authentication, signal) {
  const functions = {};
  const variables = {};
  for (let page = 0; page < MAX_RESULTS / PAGE_SIZE; page++) {
    functions[page + 1] = 'select_location_leaderboard';
    variables[page + 1] = { period_type_id: 0, page: String(page) };
  }
  const url = new URL('https://api-1.timemission.com/index.php');
  url.search = new URLSearchParams({
    platform_id: String(locations[location]),
    channel_id: '3003',
    authentication,
    request: JSON.stringify({ functions, variables }),
  }).toString();
  const payload = await fetch(url.toString(), {
    headers: { Origin: 'https://www.timemission.com' },
    redirect: 'manual',
    signal,
  }).then(response => readPayload(response, signal));
  const entries = [];
  let totalRecords;
  for (let page = 0; page < MAX_RESULTS / PAGE_SIZE; page++) {
    const result = payload?.[page + 1]?.select_location_leaderboard;
    if (result?.result_code !== 1 || !Number.isSafeInteger(result.total_records) || result.total_records < 0 ||
        (totalRecords !== undefined && totalRecords !== result.total_records)) {
      throw new Error('Invalid leaderboard');
    }
    totalRecords = result.total_records;
    const expected = Math.min(PAGE_SIZE, Math.max(0, totalRecords - page * PAGE_SIZE));
    // The provider omits entries on empty pages, including pages beyond a venue's last result.
    const rows = expected === 0 && !Object.hasOwn(result, 'entries') ? [] : result.entries;
    if (!Array.isArray(rows) || rows.length !== expected ||
        !rows.every(entry => typeof entry?.team_name === 'string' && Number.isSafeInteger(entry.total_game_score))) {
      throw new Error('Invalid leaderboard');
    }
    entries.push(...rows.map(entry => ({ team: entry.team_name, score: entry.total_game_score, location })));
  }
  return entries;
}

async function fetchLeaderboard(location, authentication) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Upstream deadline exceeded'));
    }, 5000);
  });
  try {
    const entries = await Promise.race([
      Promise.all((location === 'global' ? Object.keys(locations) : [location])
        .map(venue => fetchVenue(venue, authentication, controller.signal))).then(results => results.flat()),
      deadline,
    ]);
    let rank = 0;
    return entries.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS).map((entry, index, sorted) => {
      if (!index || entry.score !== sorted[index - 1].score) rank = index + 1;
      return { ...entry, rank };
    });
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

export async function leaderboard({ request, env, waitUntil }) {
  if (request.method !== 'GET') return json({ error: 'invalid_request' }, 405, { allow: 'GET' });
  const params = new URL(request.url).searchParams;
  const location = params.get('location');
  const pageText = params.get('page') ?? '0';
  if (!location || [...params.keys()].some(key => !['location', 'page'].includes(key) || params.getAll(key).length !== 1) ||
      !/^(?:0|[1-9]\d?)$/.test(pageText)) {
    return json({ error: 'invalid_request' }, 400);
  }
  if (location !== 'global' && !Object.hasOwn(locations, location)) return json({ error: 'unsupported_location' }, 400);
  const authentication = env?.TM_LEADERBOARD_AUTHENTICATION;
  if (typeof authentication !== 'string' || !authentication.trim()) return json({ error: 'configuration_unavailable' }, 503);
  const page = Number(pageText);
  const respond = entries => json({ location, page, pageSize: PAGE_SIZE, totalRecords: entries.length,
    entries: entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) });
  const cacheKey = new Request(new URL(`/api/leaderboard?location=${location}&dataset=top100-v2`, request.url));
  let cache;
  try {
    cache = globalThis.caches?.default;
    const cached = await cache?.match(cacheKey);
    if (cached) return respond(await cached.json());
  } catch { /* Cache availability must not hide verified venue results. */ }
  try {
    const entries = await fetchLeaderboard(location, authentication);
    if (cache) {
      const write = Promise.resolve().then(() => cache.put(cacheKey, json(entries))).catch(() => {});
      if (waitUntil) waitUntil(write);
      else await write;
    }
    return respond(entries);
  } catch {
    return json({ error: 'upstream_unavailable' }, 502);
  }
}
