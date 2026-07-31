import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { AnnouncementBanners } from '../cms/collections/AnnouncementBanners.js';
import { BlogPosts } from '../cms/collections/BlogPosts.js';
import { LocationDetails } from '../cms/collections/LocationDetails.js';
import { SitePages } from '../cms/collections/SitePages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('CMS admin experience', () => {
  it('keeps Mission Control accessible from the Payload admin', () => {
    const config = read('cms/payload.config.ts');
    const home = read('cms/app/page.tsx');
    const navigation = read('cms/components/AdminNavigation.tsx');
    const importMap = read('cms/app/(payload)/admin/importMap.js');
    const nextConfig = read('cms/next.config.mjs');

    expect(config).toContain("beforeNavLinks: ['/components/AdminNavigation.tsx']");
    expect(navigation).toContain('Mission Control');
    expect(navigation).toContain('Make changes live');
    expect(importMap).toContain('/components/AdminNavigation.tsx#default');
    expect(importMap).toContain('/components/AdminListCells.tsx#PublishedStatusCell');
    expect(home).toContain("href: '/locations/bulk'");
    expect(home).toContain('Edit locations in bulk');
    expect(nextConfig).toContain(
      "style-src 'self' 'unsafe-inline'${publicSiteOrigin ? ` ${publicSiteOrigin}` : ''}",
    );
    expect(nextConfig).toContain(
      "font-src 'self' data:${publicSiteOrigin ? ` ${publicSiteOrigin}` : ''}",
    );
  });

  it('provides an atomic bulk workspace for location operations', () => {
    const bulkPage = read('cms/app/locations/bulk/page.tsx');
    const bulkStyles = read('cms/app/locations/bulk/page.module.css');
    const guides = read('cms/components/AdminCollectionGuides.tsx');

    expect(bulkPage).toContain('Save all location changes');
    expect(bulkPage).toContain('payload.db.beginTransaction()');
    expect(bulkPage).toContain('payload.db.commitTransaction(transactionID)');
    expect(bulkPage).toContain('payload.db.rollbackTransaction(transactionID)');
    expect(bulkPage).toContain("overrideAccess: false");
    expect(bulkPage).toContain("user.role === 'admin'");
    expect(guides).toContain('actionHref="/locations/bulk"');
    expect(bulkStyles).toContain('@media (max-width: 520px)');
    expect(bulkStyles).toContain(':focus-visible');
  });

  it('organizes website collections around editor tasks', () => {
    for (const collection of [AnnouncementBanners, BlogPosts, LocationDetails, SitePages]) {
      expect(collection.admin.group).toBe('Website Content');
      expect(collection.admin.components.beforeList).toHaveLength(1);
    }

    expect(AnnouncementBanners.fields).toContainEqual(
      expect.objectContaining({
        type: 'tabs',
        tabs: expect.arrayContaining([
          expect.objectContaining({ label: 'Message' }),
          expect.objectContaining({ label: 'Audience & schedule' }),
        ]),
      }),
    );
    expect(BlogPosts.fields).toContainEqual(
      expect.objectContaining({
        type: 'tabs',
        tabs: expect.arrayContaining([
          expect.objectContaining({ label: 'Write' }),
          expect.objectContaining({ label: 'Image & search' }),
        ]),
      }),
    );
    expect(LocationDetails.fields).toContainEqual(
      expect.objectContaining({
        type: 'tabs',
        tabs: expect.arrayContaining([
          expect.objectContaining({ label: 'Address' }),
          expect.objectContaining({ label: 'Hours' }),
          expect.objectContaining({ label: 'Booking & forms' }),
          expect.objectContaining({ label: 'Mission availability' }),
        ]),
      }),
    );
  });

  it('uses flatter admin surfaces and responsive tables', () => {
    const chrome = read('cms/app/(payload)/custom/admin-chrome.scss');
    const guides = read('cms/app/(payload)/custom/admin-guides.scss');

    expect(chrome).toContain('min-width: 760px');
    expect(chrome).not.toContain('min-width: 980px');
    expect(chrome).toContain('.tabs-field {');
    expect(guides).toContain('.tm-collection-guide');
    expect(guides).toContain(':focus-visible');
    expect(guides).toContain('@media (max-width: 768px)');
  });

  it('shows editor-facing list states instead of raw booleans', () => {
    const cells = read('cms/components/AdminListCells.tsx');

    expect(cells).toContain("'Approved'");
    expect(cells).toContain("'Draft'");
    expect(cells).toContain("'All visitors'");
    expect(AnnouncementBanners.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'published',
          admin: expect.objectContaining({
            components: {
              Cell: '/components/AdminListCells.tsx#PublishedStatusCell',
            },
          }),
        }),
      ]),
    );
  });
});
