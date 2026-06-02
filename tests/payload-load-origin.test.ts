import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getPublishedAnnouncementBanners,
  getPublishedLandings,
  getPublishedSitePages,
} from '../src/lib/payload/load';

const ENV_KEYS = [
  'PAYLOAD_CMS_ALLOWED_HOSTS',
  'PAYLOAD_CMS_BUILD_STRICT',
  'PAYLOAD_CMS_ORIGIN',
  'PAYLOAD_PUBLIC_CMS_ORIGIN',
] as const;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const key of ENV_KEYS) delete process.env[key];
});

describe('Payload CMS origin resolution', () => {
  it('skips required published reads when CMS origin is missing in loose mode', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(getPublishedLandings()).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails required published reads when strict mode has no valid CMS origin', async () => {
    process.env.PAYLOAD_CMS_BUILD_STRICT = 'true';

    await expect(getPublishedSitePages()).rejects.toThrow(
      'PAYLOAD_CMS_BUILD_STRICT is set but PAYLOAD_CMS_ORIGIN is missing, invalid, or not allowed by PAYLOAD_CMS_ALLOWED_HOSTS.',
    );
  });

  it('fetches required published reads through a validated CMS origin', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ docs: [{ id: 1, slug: 'summer-adventures', title: 'Summer Adventures' }] }),
    }));

    await expect(getPublishedLandings('https://origin-load-test.example')).resolves.toEqual([
      { id: 1, slug: 'summer-adventures', title: 'Summer Adventures' },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      'https://origin-load-test.example/api/landings?depth=0&limit=250',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('skips optional published reads with invalid CMS origins', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(getPublishedAnnouncementBanners('ftp://not-http.example')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      '[payload] skipping optional announcement banners: invalid or disallowed PAYLOAD_CMS_ORIGIN',
    );
  });
});
