import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { generatePublicLocations } from '../scripts/generate-public-locations.mjs';

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.PAYLOAD_CMS_BUILD_STRICT;
});

describe('public location data generator', () => {
  it('writes code-owned locations patched with published CMS address and hours', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-locations-'));
    const outputPath = path.join(tempDir, 'locations.json');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [
            {
              id: 1,
              locationSlug: 'philadelphia',
              published: true,
              address: {
                line1: '1600 Market Street',
                city: 'Philadelphia',
                state: 'PA',
                zip: '19103',
                country: 'United States',
              },
              hours: {
                mon: { label: '1pm - 5pm', open: '13:00', close: '17:00' },
              },
              externalLinks: {
                bookingUrl: 'https://checkout.example/philadelphia',
                rollerCheckoutUrl: 'https://checkout.example/philadelphia/roller',
                giftCardUrl: 'javascript:alert(1)',
              },
              groupFormUrls: [
                { formKey: 'default', url: 'https://forms.example/philadelphia/default' },
                { formKey: 'private-events', url: '/groups/inquire/philadelphia/private-events' },
                { formKey: 'bad key', url: 'https://forms.example/philadelphia/bad' },
                { formKey: 'birthdays', url: 'data:text/html,bad' },
              ],
              hiddenMissionIds: [
                { missionId: '1005' },
                { missionId: 'bad' },
                { missionId: '1011' },
              ],
            },
          ],
        }),
      }),
    );

    const result = await generatePublicLocations({ origin: 'https://cms.example', outputPath });
    const locationsDoc = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const philadelphia = locationsDoc.locations.find((loc) => loc.slug === 'philadelphia');

    expect(result.appliedCount).toBe(1);
    expect(fetch).toHaveBeenCalledWith(
      'https://cms.example/api/location-details?depth=0&limit=250',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
    expect(philadelphia.address).toMatchObject({
      line1: '1600 Market Street',
      city: 'Philadelphia',
      state: 'PA',
      zip: '19103',
    });
    expect(philadelphia.mapUrl).toBe(
      'https://maps.google.com/?q=1600%20Market%20Street%20Philadelphia%20PA%2019103%20United%20States',
    );
    expect(philadelphia.hours.mon).toEqual({ label: '1pm - 5pm', open: '13:00', close: '17:00' });
    expect(philadelphia.status).toBe('coming-soon');
    expect(philadelphia.bookingUrl).toBe('https://checkout.example/philadelphia');
    expect(philadelphia.rollerCheckoutUrl).toBe('https://checkout.example/philadelphia/roller');
    expect(philadelphia.giftCardUrl).toBe('');
    expect(philadelphia.groupFormUrls.default).toBe('https://forms.example/philadelphia/default');
    expect(philadelphia.groupFormUrls['private-events']).toBe(
      '/groups/inquire/philadelphia/private-events',
    );
    expect(philadelphia.groupFormUrls.birthdays).toBe(
      'https://forms.roller.app/#/timemissionphiladelphiapa/1446ba8be6094ad/form',
    );
    expect(philadelphia.hiddenMissionIds).toEqual(['1005', '1011']);

    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('fails in strict CMS build mode when location details cannot be fetched', async () => {
    process.env.PAYLOAD_CMS_BUILD_STRICT = 'true';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    await expect(
      generatePublicLocations({
        origin: 'https://cms.example',
        outputPath: path.join(os.tmpdir(), 'strict-location-data.json'),
      }),
    ).rejects.toThrow('GET https://cms.example/api/location-details?depth=0&limit=250 failed: 503');
  });
});
