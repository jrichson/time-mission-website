import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequest } from '../functions/api/social-feed.js';

const env = { INSTAGRAM_ACCESS_TOKEN: 'fixture-instagram-token' };
const post = { id: '1', caption: 'First line\nSecond line', media_type: 'IMAGE', media_url: 'https://scontent.cdninstagram.com/photo.jpg', permalink: 'https://www.instagram.com/p/post/', timestamp: '2026-11-06' };
const response = data => new Response(JSON.stringify({ data }));
const call = (options = {}) => onRequest({ env, request: new Request('https://site.test/api/social-feed'), ...options });
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => response([post])));
  vi.stubGlobal('caches', { default: { match: vi.fn(async () => undefined), put: vi.fn(async () => {}) } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('optional homepage social feed', () => {
  it('preserves static photos without a private token', async () => {
    expect(await (await call({ env: {} })).json()).toEqual({ posts: [] });
    expect(fetch).not.toHaveBeenCalled();
    expect(caches.default.match).not.toHaveBeenCalled();
  });

  it('projects a bounded public feed through the fixed upstream without following redirects', async () => {
    const pending = [];
    const result = await call({ waitUntil: promise => pending.push(promise) });
    await Promise.all(pending);
    expect(await result.json()).toEqual({ posts: [{ id: '1', caption: 'First line', image: post.media_url, link: post.permalink, timestamp: post.timestamp }] });
    const [input, options] = fetch.mock.calls[0];
    const url = new URL(input);
    expect(url.origin + url.pathname).toBe('https://graph.instagram.com/me/media');
    expect(url.searchParams.get('access_token')).toBe(env.INSTAGRAM_ACCESS_TOKEN);
    expect(options.redirect).toBe('manual');
    expect(result.headers.get('x-content-type-options')).toBe('nosniff');
    expect(result.headers.get('set-cookie')).toBeNull();
    expect(caches.default.put).toHaveBeenCalledTimes(1);
  });

  it('keeps only twelve valid HTTPS posts, using thumbnails for videos', async () => {
    fetch.mockResolvedValue(response([
      null,
      { ...post, media_url: 'javascript:alert(1)' },
      { ...post, permalink: 'http://www.instagram.com/p/post/' },
      { ...post, media_url: 'https://user:password@images.test/photo.jpg' },
      { ...post, media_url: '//images.test/photo.jpg' },
      { ...post, media_url: 'https://other.test/photo.jpg' },
      { ...post, permalink: 'https://instagram.com.other.test/post' },
      { ...post, media_type: 'VIDEO', thumbnail_url: 'https://scontent.cdninstagram.com/thumb.jpg' },
      ...Array.from({ length: 20 }, () => post),
    ]));
    const data = await (await call()).json();
    expect(data.posts).toHaveLength(12);
    expect(data.posts[0].image).toBe('https://scontent.cdninstagram.com/thumb.jpg');
    expect(data.posts.every(item => item.image.startsWith('https://') && item.link.startsWith('https://'))).toBe(true);
  });

  it.each([
    () => new Response('private upstream error', { status: 500 }),
    () => new Response('', { status: 302, headers: { location: 'https://other.test' } }),
    () => new Response('not JSON'),
    () => new Response(new Uint8Array([0xc3, 0x28])),
    () => new Response(JSON.stringify({ data: [post], padding: 'x'.repeat(65_537) }), { headers: { 'content-length': '1' } }),
  ])('keeps the static fallback on HTTP, schema or bounded body failures', async makeResponse => {
    fetch.mockResolvedValue(makeResponse());
    expect(await (await call()).json()).toEqual({ posts: [] });
    expect(caches.default.put).not.toHaveBeenCalled();
  });

  it.each(['fetch', 'body'])('bounds stalled %s work to five seconds', async phase => {
    vi.useFakeTimers();
    let cancelled = false;
    fetch.mockImplementation(phase === 'fetch'
      ? () => new Promise(() => {})
      : async () => new Response(new ReadableStream({ cancel() { cancelled = true; } })));
    const pending = call();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await (await pending).json()).toEqual({ posts: [] });
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    if (phase === 'body') expect(cancelled).toBe(true);
    expect(caches.default.put).not.toHaveBeenCalled();
  });

  it('works when the optional cache is absent or unavailable', async () => {
    vi.stubGlobal('caches', undefined);
    expect((await (await call()).json()).posts).toHaveLength(1);
    vi.stubGlobal('caches', { default: { match: async () => { throw new Error('unavailable'); }, put: async () => { throw new Error('unavailable'); } } });
    const pending = [];
    expect((await (await call({ waitUntil: promise => pending.push(promise) })).json()).posts).toHaveLength(1);
    await Promise.all(pending);
  });

  it('rejects other methods before fetching', async () => {
    const result = await call({ request: new Request('https://site.test/api/social-feed', { method: 'POST' }) });
    expect(result.status).toBe(405);
    expect(result.headers.get('allow')).toBe('GET');
    expect(fetch).not.toHaveBeenCalled();
  });
});
