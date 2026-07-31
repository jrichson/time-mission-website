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
  it('makes custom Mission Control the only editor-facing admin', () => {
    const home = read('cms/app/page.tsx');
    const proxy = read('cms/proxy.ts');
    const login = read('cms/app/login/page.tsx');
    const setup = read('cms/app/setup/page.tsx');
    const blog = read('cms/app/blog/page.tsx');
    const announcements = read('cms/app/announcements/page.tsx');
    const search = read('cms/app/search/page.tsx');
    const access = read('cms/app/access/page.tsx');
    const payloadAdmin = read('cms/app/(payload)/admin/[[...segments]]/page.tsx');
    const payloadLayout = read('cms/app/(payload)/layout.tsx');
    const nextConfig = read('cms/next.config.mjs');

    expect(proxy).toContain('export function proxy');
    expect(proxy).toContain("matcher: ['/admin/:path*']");
    expect(proxy).toContain("collection === 'blog-posts'");
    expect(proxy).toContain("destination = record === 'create'");
    expect(proxy).toContain("'/blog/new'");
    expect(home).not.toContain('/admin/collections/');
    expect(home).toContain("href: '/locations/bulk'");
    expect(home).toContain("href: '/blog'");
    expect(home).toContain("href: '/announcements'");
    expect(home).toContain("href: '/search'");
    expect(home).toContain("href: '/access'");
    expect(home).toContain('Edit locations in bulk');
    expect(login).toContain('Enter Mission Control');
    expect(setup).toContain('Create the CMS owner.');
    expect(setup).toContain('no CMS users');
    expect(blog).toContain('Stories, not database records.');
    expect(announcements).toContain('Edit every announcement together.');
    expect(search).toContain('Edit page previews in bulk.');
    expect(access).toContain('CMS access without the control panel.');
    expect(payloadAdmin).toContain('DeprecatedPayloadAdminPage');
    expect(payloadAdmin).toContain("redirect('/')");
    expect(payloadAdmin).not.toContain('RootPage');
    expect(payloadLayout).not.toContain('RootLayout');
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

  it('uses responsive custom task workspaces instead of native collection forms', () => {
    const blogStyles = read('cms/app/blog/blog.module.css');
    const authoringStyles = read('cms/components/BlogAuthoringForm.module.css');
    const announcementStyles = read('cms/app/announcements/page.module.css');
    const searchStyles = read('cms/app/search/page.module.css');

    for (const stylesheet of [blogStyles, authoringStyles, announcementStyles, searchStyles]) {
      expect(stylesheet).toContain(':focus-visible');
      expect(stylesheet).toContain('@media');
    }
    expect(authoringStyles).toContain('min-height: 46px');
    expect(announcementStyles).toContain('.targets');
    expect(searchStyles).toContain('.pageList');
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
