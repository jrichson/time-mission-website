import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../src/pages/sitemap.xml';

const ENV_KEYS = [
  'PAYLOAD_CMS_ALLOWED_HOSTS',
  'PAYLOAD_CMS_BUILD_STRICT',
  'PAYLOAD_CMS_ORIGIN',
] as const;

const publishedPost = {
  id: 1,
  title: 'Houston Opening Notes',
  slug: 'houston-opening-notes',
  excerpt: 'A short local update from Time Mission Houston.',
  body: 'The Houston team is ready for the next mission.',
  publishDate: '2026-07-30T00:00:00.000Z',
  locationSlug: 'houston',
  published: true,
  includeInSitemap: true,
};

function mockCms(blogPosts: unknown[]) {
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
    const url = new URL(String(input));
    const docs = url.pathname === '/api/blog-posts' ? blogPosts : [];
    return {
      ok: true,
      json: async () => ({ docs }),
    };
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const key of ENV_KEYS) delete process.env[key];
});

describe('blog sitemap publication', () => {
  it('adds the blog, populated location index, and published post dynamically', async () => {
    process.env.PAYLOAD_CMS_BUILD_STRICT = 'true';
    process.env.PAYLOAD_CMS_ORIGIN = 'https://blog-sitemap-populated.example';
    mockCms([publishedPost]);

    const response = await GET({} as never);
    const body = await response.text();

    expect(body).toContain('<loc>https://www.timemission.com/blog</loc>');
    expect(body).toContain('<loc>https://www.timemission.com/blog/houston</loc>');
    expect(body).toContain('<loc>https://www.timemission.com/blog/houston-opening-notes</loc>');
    expect(body).not.toContain('<loc>https://www.timemission.com/blog/philadelphia</loc>');
  });

  it('keeps code-backed press releases in the sitemap when the CMS is empty', async () => {
    process.env.PAYLOAD_CMS_BUILD_STRICT = 'true';
    process.env.PAYLOAD_CMS_ORIGIN = 'https://blog-sitemap-empty.example';
    mockCms([]);

    const response = await GET({} as never);
    const body = await response.text();

    expect(body).toContain('<loc>https://www.timemission.com/blog</loc>');
    expect(body).toContain(
      '<loc>https://www.timemission.com/blog/boston-announcement</loc>',
    );
    expect(body).toContain(
      '<loc>https://www.timemission.com/blog/time-mission-global-expansion-2027</loc>',
    );
    expect(body).toContain(
      '<loc>https://www.timemission.com/blog/nashville-announcement</loc>',
    );
    expect(body).not.toContain('<loc>https://www.timemission.com/blog/boston</loc>');
  });
});
