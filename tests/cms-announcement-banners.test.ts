import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  announcementBannerDocLooksUsable,
  selectAnnouncementBanner,
  type PayloadAnnouncementBannerDoc,
} from '../src/lib/payload/announcement-banner-contract';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const baseBanner: PayloadAnnouncementBannerDoc = {
  id: 1,
  title: 'Baseline',
  message: 'Houston grand opening June 5',
  published: true,
  priority: 0,
  targetScope: 'global',
};

describe('CMS announcement banners', () => {
  it('registers a text-only Payload collection with deploy-gated wording', () => {
    const collection = read('cms/collections/AnnouncementBanners.js');
    const config = read('cms/payload.config.ts');
    const migration = read('cms/migrations/20260526_120000_cms_scope_and_announcements.ts');

    expect(config).toContain('AnnouncementBanners as CollectionConfig');
    expect(collection).toContain("singular: 'Announcement Banner'");
    expect(collection).toContain('Text-only top banner messages');
    expect(collection).toContain('Published in CMS');
    expect(collection).toContain('Live after deploy');
    expect(collection).toContain("name: 'message'");
    expect(collection).not.toContain("type: 'upload'");
    expect(migration).toContain('CREATE TABLE "announcement_banners"');
    expect(migration).toContain('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_deploy"');
  });

  it('requires text-only published banner content', () => {
    expect(announcementBannerDocLooksUsable(baseBanner)).toBe(true);
    expect(announcementBannerDocLooksUsable({ ...baseBanner, message: '' })).toBe(false);
    expect(announcementBannerDocLooksUsable({ ...baseBanner, published: false })).toBe(false);
  });

  it('selects the highest-priority eligible banner and uses start date as tie-breaker', () => {
    const selected = selectAnnouncementBanner(
      [
        { ...baseBanner, id: 1, priority: 4, startsAt: '2026-05-01T00:00:00.000Z' },
        { ...baseBanner, id: 2, priority: 10, startsAt: '2026-04-01T00:00:00.000Z', message: 'Priority wins' },
        { ...baseBanner, id: 3, priority: 10, startsAt: '2026-05-20T00:00:00.000Z', message: 'Newest wins' },
      ],
      { now: new Date('2026-05-26T12:00:00.000Z') },
    );

    expect(selected?.id).toBe(3);
    expect(selected?.message).toBe('Newest wins');
  });

  it('respects schedule, region, and location targeting', () => {
    const banners: PayloadAnnouncementBannerDoc[] = [
      {
        ...baseBanner,
        id: 1,
        message: 'Past banner',
        endsAt: '2026-05-01T00:00:00.000Z',
      },
      {
        ...baseBanner,
        id: 2,
        message: 'US region banner',
        targetScope: 'regions',
        targetRegions: [{ region: 'us' }],
      },
      {
        ...baseBanner,
        id: 3,
        message: 'Philadelphia banner',
        priority: 5,
        targetScope: 'locations',
        targetLocations: [{ locationSlug: 'philadelphia' }],
      },
    ];

    expect(selectAnnouncementBanner(banners, { now: new Date('2026-05-26T12:00:00.000Z'), region: 'us' })?.id)
      .toBe(2);
    expect(
      selectAnnouncementBanner(banners, {
        locationSlug: 'philadelphia',
        now: new Date('2026-05-26T12:00:00.000Z'),
        region: 'us',
      })?.id,
    ).toBe(3);
    expect(
      selectAnnouncementBanner(banners, {
        locationSlug: 'antwerp',
        now: new Date('2026-05-26T12:00:00.000Z'),
        region: 'europe',
      }),
    ).toBeNull();
  });
});
