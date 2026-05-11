import { describe, expect, it } from 'vitest';

import { Landings } from '../cms/collections/Landings.js';
import { SitePages } from '../cms/collections/SitePages.js';
import { Users } from '../cms/collections/Users.js';

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

    expect(Landings.access.create(accessArgs(undefined))).toBe(false);
    expect(SitePages.access.create(accessArgs(undefined))).toBe(false);
    expect(Landings.access.read(accessArgs(undefined))).toEqual({ published: { equals: true } });
    expect(SitePages.access.read(accessArgs(undefined))).toEqual({ published: { equals: true } });
  });
});
