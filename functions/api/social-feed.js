// Latest Instagram posts for the homepage "Follow the Mission" grid.
//
// Setup (Cloudflare Pages → Settings → Environment variables, as a secret):
//   INSTAGRAM_ACCESS_TOKEN = long-lived Instagram API token for @timemission
// Long-lived tokens last 60 days; refresh before expiry with
//   GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=<token>
//
// Without a token this returns an empty list and the page keeps its built-in photos.

const GRAPH_URL = 'https://graph.instagram.com/me/media';
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
const POST_LIMIT = 12;
const CACHE_SECONDS = 60 * 60;

function json(body, maxAge) {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${maxAge}`,
      'x-content-type-options': 'nosniff',
    },
  });
}

function safeUrl(value, media = false) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const allowedHost = media
      ? /(?:^|\.)(?:cdninstagram\.com|fbcdn\.net)$/.test(url.hostname)
      : ['instagram.com', 'www.instagram.com'].includes(url.hostname);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && allowedHost ? url.href : null;
  } catch { return null; }
}

function toPost(item) {
  if (!item || typeof item.id !== 'string') return null;
  const image = safeUrl(item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url, true);
  const link = safeUrl(item.permalink);
  if (!image || !link) return null;
  const caption = typeof item.caption === 'string' ? item.caption.split('\n')[0].slice(0, 120) : '';
  return { id: item.id, image, link, caption, timestamp: typeof item.timestamp === 'string' ? item.timestamp : '' };
}

async function readJson(response, signal) {
  signal.throwIfAborted();
  if (!response.ok || !response.body) throw new Error('Unavailable feed');
  const reader = response.body.getReader();
  const cancel = () => { reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64 * 1024) throw new Error('Feed too large');
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    signal.removeEventListener('abort', cancel);
    cancel();
  }
}

async function fetchPosts(token) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Feed deadline exceeded'));
    }, 5000);
  });
  const url = `${GRAPH_URL}?fields=${FIELDS}&limit=${POST_LIMIT}&access_token=${encodeURIComponent(token)}`;
  try {
    const data = await Promise.race([
      fetch(url, { redirect: 'manual', signal: controller.signal }).then(response => readJson(response, controller.signal)),
      deadline,
    ]);
    if (!Array.isArray(data?.data)) throw new Error('Invalid feed');
    return data.data.map(toPost).filter(Boolean).slice(0, POST_LIMIT);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

export async function onRequest({ env, request, waitUntil }) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed.', { headers: { allow: 'GET' }, status: 405 });
  }

  const token = env?.INSTAGRAM_ACCESS_TOKEN;
  if (typeof token !== 'string' || !token.trim()) return json({ posts: [] }, 300);

  const cacheKey = new Request(new URL('/api/social-feed', request.url).toString());
  let cache;
  try {
    cache = globalThis.caches?.default;
    const cached = await cache?.match(cacheKey);
    if (cached) return cached;
  } catch { /* The optional cache must not prevent the static fallback. */ }

  let posts = [];
  try {
    posts = await fetchPosts(token);
  } catch {
    return json({ posts: [] }, 300);
  }

  const response = json({ posts }, CACHE_SECONDS);
  if (cache) {
    const write = Promise.resolve().then(() => cache.put(cacheKey, response.clone())).catch(() => {});
    if (waitUntil) waitUntil(write);
    else await write;
  }
  return response;
}
