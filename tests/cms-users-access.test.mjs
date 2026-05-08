import { afterEach, describe, expect, it } from 'vitest';
import { Users } from '../cms/collections/Users.js';

const originalOwnerEmail = process.env.CMS_OWNER_EMAIL;

function userAccessArgs({ email = 'owner@example.com', role = 'admin' } = {}) {
  return {
    req: {
      user: {
        collection: 'users',
        email,
        role,
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

describe('CMS users access control', () => {
  it('allows only the configured owner admin to manage users', () => {
    process.env.CMS_OWNER_EMAIL = 'owner@example.com';

    expect(Users.access.create(userAccessArgs())).toBe(true);
    expect(Users.access.update(userAccessArgs())).toBe(true);
    expect(Users.access.delete(userAccessArgs())).toBe(true);
    expect(Users.access.unlock(userAccessArgs())).toBe(true);
    expect(Users.fields[0].access.update(userAccessArgs())).toBe(true);

    expect(Users.access.create(userAccessArgs({ email: 'other@example.com' }))).toBe(false);
    expect(Users.access.create(userAccessArgs({ role: 'editor' }))).toBe(false);
  });

  it('fails closed for user management if CMS_OWNER_EMAIL is unset', () => {
    delete process.env.CMS_OWNER_EMAIL;

    expect(Users.access.create(userAccessArgs())).toBe(false);
    expect(Users.access.read(userAccessArgs())).toBe(false);
    expect(Users.fields[0].access.update(userAccessArgs())).toBe(false);
  });

  it('still lets editors access the admin panel for landing content', () => {
    expect(Users.access.admin(userAccessArgs({ role: 'editor' }))).toBe(true);
  });
});
