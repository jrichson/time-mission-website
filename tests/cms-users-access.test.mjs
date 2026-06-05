import { afterEach, describe, expect, it } from 'vitest';
import { Users } from '../cms/collections/Users.js';

const originalOwnerEmail = process.env.CMS_OWNER_EMAIL;

function userAccessArgs({ email = 'owner@example.com', firstUserId = 1, id = 1, role = 'admin' } = {}) {
  return {
    req: {
      payload: {
        find: async () => ({ docs: [{ id: firstUserId }] }),
      },
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
  it('allows only the configured owner account to manage users', async () => {
    process.env.CMS_OWNER_EMAIL = 'owner@example.com';

    await expect(Users.access.create(userAccessArgs())).resolves.toBe(true);
    await expect(Users.access.create(userAccessArgs({ role: 'editor' }))).resolves.toBe(true);
    await expect(Users.access.update(userAccessArgs())).resolves.toBe(true);
    await expect(Users.access.delete(userAccessArgs())).resolves.toBe(true);
    await expect(Users.access.unlock(userAccessArgs())).resolves.toBe(true);
    await expect(Users.fields[0].access.update(userAccessArgs())).resolves.toBe(true);

    await expect(Users.access.create(userAccessArgs({ email: 'other@example.com' }))).resolves.toBe(false);
    await expect(Users.access.create(userAccessArgs({ email: 'other@example.com', role: 'editor' }))).resolves.toBe(
      false,
    );
  });

  it('falls back to the first CMS user as bootstrap owner if CMS_OWNER_EMAIL is unset', async () => {
    delete process.env.CMS_OWNER_EMAIL;

    await expect(Users.access.create(userAccessArgs({ id: 1, firstUserId: 1 }))).resolves.toBe(true);
    await expect(Users.access.delete(userAccessArgs({ id: 1, firstUserId: 1 }))).resolves.toBe(true);
    await expect(Users.access.unlock(userAccessArgs({ id: 1, firstUserId: 1 }))).resolves.toBe(true);
    await expect(Users.fields[0].access.update(userAccessArgs({ id: 1, firstUserId: 1 }))).resolves.toBe(true);
  });

  it('does not grant bootstrap ownership to later CMS users', async () => {
    delete process.env.CMS_OWNER_EMAIL;

    await expect(Users.access.create(userAccessArgs({ id: 2, firstUserId: 1 }))).resolves.toBe(false);
    await expect(Users.access.delete(userAccessArgs({ id: 2, firstUserId: 1 }))).resolves.toBe(false);
    await expect(Users.access.unlock(userAccessArgs({ id: 2, firstUserId: 1 }))).resolves.toBe(false);
    await expect(Users.fields[0].access.update(userAccessArgs({ id: 2, firstUserId: 1 }))).resolves.toBe(false);
  });

  it('allows logged-in non-owner users to access only their own account record', async () => {
    delete process.env.CMS_OWNER_EMAIL;

    await expect(Users.access.read(userAccessArgs({ firstUserId: 99 }))).resolves.toEqual({ id: { equals: 1 } });
    await expect(Users.access.read({ ...userAccessArgs({ firstUserId: 99, id: 1 }), id: 123 })).resolves.toBe(false);
    await expect(
      Users.access.update(userAccessArgs({ email: 'editor@example.com', firstUserId: 99, role: 'editor' })),
    ).resolves.toEqual({
      id: { equals: 1 },
    });
    await expect(Users.access.update({ ...userAccessArgs({ firstUserId: 99, id: 1 }), id: 1 })).resolves.toBe(true);
    await expect(Users.access.update({ ...userAccessArgs({ firstUserId: 99, id: 1 }), id: 123 })).resolves.toBe(
      false,
    );
  });

  it('still lets editors access the admin panel for landing content', () => {
    expect(Users.access.admin(userAccessArgs({ role: 'editor' }))).toBe(true);
  });
});
