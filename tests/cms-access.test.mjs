import { describe, expect, it } from 'vitest';

import { AnnouncementBanners } from '../cms/collections/AnnouncementBanners.js';
import { Landings } from '../cms/collections/Landings.js';
import { LocationDetails } from '../cms/collections/LocationDetails.js';
import { SitePages } from '../cms/collections/SitePages.js';
import { Users, canTriggerCmsDeploy } from '../cms/collections/Users.js';

function accessArgs(role) {
  return {
    req: {
      user: {
        collection: 'users',
        email: 'editor@example.com',
        id: 7,
        ...(role === undefined ? {} : { role }),
      },
    },
  };
}

describe('CMS role access', () => {
  it('requires an explicit admin or editor role for CMS admin access', () => {
    expect(Users.access.admin(accessArgs('admin'))).toBe(true);
    expect(Users.access.admin(accessArgs('editor'))).toBe(true);
    expect(Users.access.admin(accessArgs(undefined))).toBe(false);
    expect(Users.access.admin(accessArgs(null))).toBe(false);
  });

  it('requires explicit roles for landing and site-page management', () => {
    expect(Landings.access.create(accessArgs('editor'))).toBe(true);
    expect(SitePages.access.create(accessArgs('admin'))).toBe(true);
    expect(AnnouncementBanners.access.create(accessArgs('editor'))).toBe(true);
    expect(LocationDetails.access.create(accessArgs('admin'))).toBe(true);
    expect(LocationDetails.access.update(accessArgs('editor'))).toBe(true);
    expect(LocationDetails.access.delete(accessArgs('editor'))).toBe(false);

    expect(Landings.access.create(accessArgs(undefined))).toBe(false);
    expect(SitePages.access.create(accessArgs(undefined))).toBe(false);
    expect(AnnouncementBanners.access.create(accessArgs(undefined))).toBe(false);
    expect(LocationDetails.access.create(accessArgs(undefined))).toBe(false);
    expect(Landings.access.read(accessArgs(undefined))).toEqual({ published: { equals: true } });
    expect(SitePages.access.read(accessArgs(undefined))).toEqual({ published: { equals: true } });
    expect(AnnouncementBanners.access.read(accessArgs(undefined))).toEqual({ published: { equals: true } });
    expect(LocationDetails.access.read(accessArgs(undefined))).toEqual({ published: { equals: true } });
  });

  it('keeps deploy permission separate from CMS role', () => {
    expect(canTriggerCmsDeploy({ req: { user: { collection: 'users', role: 'admin', canDeploy: true } } })).toBe(true);
    expect(canTriggerCmsDeploy({ req: { user: { collection: 'users', role: 'admin', canDeploy: false } } })).toBe(false);
    expect(canTriggerCmsDeploy({ req: { user: { collection: 'users', role: 'editor', canDeploy: true } } })).toBe(false);
    expect(canTriggerCmsDeploy({ req: { user: { collection: 'users', role: 'editor', canDeploy: false } } })).toBe(false);
  });
});
