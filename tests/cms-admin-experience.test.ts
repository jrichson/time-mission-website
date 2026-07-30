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
    const navigation = read('cms/components/AdminNavigation.tsx');
    const importMap = read('cms/app/(payload)/admin/importMap.js');

    expect(config).toContain("beforeNavLinks: ['/components/AdminNavigation.tsx']");
    expect(navigation).toContain('Mission Control');
    expect(navigation).toContain('Make changes live');
    expect(importMap).toContain('/components/AdminNavigation.tsx#default');
    expect(importMap).toContain('/components/AdminListCells.tsx#PublishedStatusCell');
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
          expect.objectContaining({ label: 'Article' }),
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
