import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchPayloadCollection } from '../src/lib/payload/read-adapter';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Payload read adapter', () => {
  it('fetches Payload collection docs through one collection adapter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ docs: [{ id: 1, title: 'Test' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPayloadCollection<{ id: number }>({
      collection: 'landings',
      origin: 'https://cms.example',
      strict: true,
    })).resolves.toEqual([{ id: 1, title: 'Test' }]);

    await expect(fetchPayloadCollection<{ id: number }>({
      collection: 'blog-posts',
      depth: 1,
      origin: 'https://cms.example',
      strict: true,
    })).resolves.toEqual([{ id: 1, title: 'Test' }]);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://cms.example/api/blog-posts?depth=1&limit=250',
      expect.any(Object),
    );
  });

  it('throws in strict mode and returns an empty list for optional reads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(fetchPayloadCollection({
      collection: 'strict-pages',
      origin: 'https://strict.example',
      strict: true,
    })).rejects.toThrow('GET https://strict.example/api/strict-pages?depth=0&limit=250 failed: 404');

    await expect(fetchPayloadCollection({
      collection: 'announcement-banners',
      optionalLabel: 'announcement banners',
      origin: 'https://optional.example',
    })).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('optional announcement banners skipped'));
  });
});
