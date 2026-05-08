import { afterEach, describe, expect, it } from 'vitest';
import { Users } from '../cms/collections/Users.js';

const originalOwnerEmail = process.env.CMS_OWNER_EMAIL;

function userAccessArgs({ email = 'owner@example.com', id = 1, role = 'admin' } = {}) {
  return {
    req: {
      user: {
        collection: 'users',
        email,
        id,
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
  it('allows only the configured owner account to manage users', () => {
    process.env.CMS_OWNER_EMAIL = 'owner@example.com';

    expect(Users.access.create(userAccessArgs())).toBe(true);
    expect(Users.access.create(userAccessArgs({ role: 'editor' }))).toBe(true);
    expect(Users.access.update(userAccessArgs())).toBe(true);
    expect(Users.access.delete(userAccessArgs())).toBe(true);
    expect(Users.access.unlock(userAccessArgs())).toBe(true);
    expect(Users.fields[0].access.update(userAccessArgs())).toBe(true);

    expect(Users.access.create(userAccessArgs({ email: 'other@example.com' }))).toBe(false);
    expect(Users.access.create(userAccessArgs({ email: 'other@example.com', role: 'editor' }))).toBe(false);
  });

  it('fails closed for privileged user management if CMS_OWNER_EMAIL is unset', () => {
    delete process.env.CMS_OWNER_EMAIL;

    expect(Users.access.create(userAccessArgs())).toBe(false);
    expect(Users.access.delete(userAccessArgs())).toBe(false);
    expect(Users.access.unlock(userAccessArgs())).toBe(false);
    expect(Users.fields[0].access.update(userAccessArgs())).toBe(false);
  });

  it('allows logged-in users to access only their own account record', () => {
    delete process.env.CMS_OWNER_EMAIL;

    expect(Users.access.read(userAccessArgs())).toEqual({ id: { equals: 1 } });
    expect(Users.access.read({ ...userAccessArgs({ id: 1 }), id: 123 })).toBe(false);
    expect(Users.access.update(userAccessArgs({ email: 'editor@example.com', role: 'editor' }))).toEqual({
      id: { equals: 1 },
    });
    expect(Users.access.update({ ...userAccessArgs({ id: 1 }), id: 1 })).toBe(true);
    expect(Users.access.update({ ...userAccessArgs({ id: 1 }), id: 123 })).toBe(false);
  });

  it('still lets editors access the admin panel for landing content', () => {
    expect(Users.access.admin(userAccessArgs({ role: 'editor' }))).toBe(true);
  });
});
