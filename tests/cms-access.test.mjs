import { afterEach, describe, expect, it } from 'vitest';

import { AnnouncementBanners } from '../cms/collections/AnnouncementBanners.js';
import { BlogPosts } from '../cms/collections/BlogPosts.js';
import { Landings } from '../cms/collections/Landings.js';
import { LocationDetails } from '../cms/collections/LocationDetails.js';
import { SitePages } from '../cms/collections/SitePages.js';
import { Users, canTriggerCmsDeploy } from '../cms/collections/Users.js';

const originalOwnerEmail = process.env.CMS_OWNER_EMAIL;

function accessArgs(role) {
  return {
    req: {
      payload: {
        find: async () => ({ docs: [{ id: 999 }] }),
      },
      user: {
        collection: 'users',
        email: 'editor@example.com',
        id: 7,
        ...(role === undefined ? {} : { role }),
      },
    },
  };
}

afterEach(() => {
  if (originalOwnerEmail == null) {
    delete process.env.CMS_OWNER_EMAIL;
  } else {
    process.env.CMS_OWNER_EMAIL = originalOwnerEmail;
  }
});

describe('CMS role access', () => {
  it('requires an explicit admin or editor role for CMS admin access', () => {
    expect(Users.access.admin(accessArgs('admin'))).toBe(true);
    expect(Users.access.admin(accessArgs('editor'))).toBe(true);
    expect(Users.access.admin(accessArgs(undefined))).toBe(false);
    expect(Users.access.admin(accessArgs(null))).toBe(false);
  });

  it('requires explicit roles for landing and site-page management', () => {
    expect(Landings.access.create(accessArgs('editor'))).toBe(true);
    expect(BlogPosts.access.create(accessArgs('editor'))).toBe(true);
    expect(SitePages.access.create(accessArgs('admin'))).toBe(true);
    expect(AnnouncementBanners.access.create(accessArgs('editor'))).toBe(true);
    expect(LocationDetails.access.create(accessArgs('admin'))).toBe(true);
    expect(LocationDetails.access.update(accessArgs('editor'))).toBe(true);
    expect(LocationDetails.access.delete(accessArgs('editor'))).toBe(false);

    expect(Landings.access.create(accessArgs(undefined))).toBe(false);
    expect(BlogPosts.access.create(accessArgs(undefined))).toBe(false);
    expect(SitePages.access.create(accessArgs(undefined))).toBe(false);
    expect(AnnouncementBanners.access.create(accessArgs(undefined))).toBe(false);
    expect(LocationDetails.access.create(accessArgs(undefined))).toBe(false);
    expect(Landings.access.read(accessArgs(undefined))).toEqual({ published: { equals: true } });
    expect(BlogPosts.access.read(accessArgs(undefined))).toEqual({ published: { equals: true } });
    expect(SitePages.access.read(accessArgs(undefined))).toEqual({ published: { equals: true } });
    expect(AnnouncementBanners.access.read(accessArgs(undefined))).toEqual({ published: { equals: true } });
    expect(LocationDetails.access.read(accessArgs(undefined))).toEqual({ published: { equals: true } });
  });

  it('keeps deploy permission separate from CMS role', async () => {
    process.env.CMS_OWNER_EMAIL = 'owner@example.com';
    const req = {
      payload: {
        find: async () => ({ docs: [{ id: 999 }] }),
      },
    };

    await expect(
      canTriggerCmsDeploy({ req: { ...req, user: { collection: 'users', id: 7, role: 'admin', canDeploy: true } } }),
    ).resolves.toBe(true);
    await expect(
      canTriggerCmsDeploy({ req: { ...req, user: { collection: 'users', id: 7, role: 'admin', canDeploy: false } } }),
    ).resolves.toBe(false);
    await expect(
      canTriggerCmsDeploy({ req: { ...req, user: { collection: 'users', id: 7, role: 'editor', canDeploy: true } } }),
    ).resolves.toBe(false);
    await expect(
      canTriggerCmsDeploy({ req: { ...req, user: { collection: 'users', id: 7, role: 'editor', canDeploy: false } } }),
    ).resolves.toBe(false);
  });
});
