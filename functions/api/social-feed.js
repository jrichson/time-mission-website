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
    },
  });
}

function toPost(item) {
  const image = item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url;
  if (!image || !item.permalink) return null;
  const caption = typeof item.caption === 'string' ? item.caption.split('\n')[0].slice(0, 120) : '';
  return { id: item.id, image, link: item.permalink, caption, timestamp: item.timestamp || '' };
}

export async function onRequest({ env, request, waitUntil }) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed.', { headers: { allow: 'GET' }, status: 405 });
  }

  const token = env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return json({ posts: [] }, 300);

  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/social-feed', request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const url = `${GRAPH_URL}?fields=${FIELDS}&limit=${POST_LIMIT}&access_token=${encodeURIComponent(token)}`;
  let posts = [];
  try {
    const res = await fetch(url);
    if (!res.ok) return json({ posts: [] }, 300);
    const data = await res.json();
    posts = (Array.isArray(data.data) ? data.data : []).map(toPost).filter(Boolean);
  } catch (e) {
    return json({ posts: [] }, 300);
  }

  const response = json({ posts }, CACHE_SECONDS);
  waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
