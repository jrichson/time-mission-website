import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserInvites } from '../cms/collections/UserInvites.js';

const originalOwnerEmail = process.env.CMS_OWNER_EMAIL;

function ownerArgs({ email = 'owner@example.com', role = 'admin' } = {}) {
  return {
    req: {
      payload: {
        find: async () => ({ docs: [{ id: 1 }] }),
      },
      user: {
        collection: 'users',
        email,
        id: 1,
        role,
      },
    },
  };
}

function inviteReq(payload) {
  return {
    context: {},
    payload,
    user: {
      collection: 'users',
      email: 'owner@example.com',
      id: 1,
      role: 'admin',
    },
  };
}

function mockPayload({ existingUser } = {}) {
  return {
    config: {
      admin: { routes: { reset: '/reset' } },
      routes: { admin: '/admin' },
      serverURL: 'https://cms.example.com',
    },
    create: vi.fn().mockResolvedValue({ id: 12 }),
    email: { name: 'nodemailer' },
    find: vi.fn().mockResolvedValue({ docs: existingUser ? [existingUser] : [] }),
    forgotPassword: vi.fn().mockResolvedValue('token'),
    logger: {
      error: vi.fn(),
      info: vi.fn(),
    },
    update: vi.fn().mockResolvedValue({ id: 99 }),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalOwnerEmail == null) {
    delete process.env.CMS_OWNER_EMAIL;
  } else {
    process.env.CMS_OWNER_EMAIL = originalOwnerEmail;
  }
});

describe('CMS user invites', () => {
  it('allows only the configured owner account to manage invites', async () => {
    process.env.CMS_OWNER_EMAIL = 'owner@example.com';

    await expect(UserInvites.access.admin(ownerArgs())).resolves.toBe(true);
    await expect(UserInvites.access.create(ownerArgs())).resolves.toBe(true);
    await expect(UserInvites.access.read(ownerArgs())).resolves.toBe(true);
    await expect(UserInvites.access.delete(ownerArgs())).resolves.toBe(true);

    await expect(UserInvites.access.create(ownerArgs({ email: 'editor@example.com', role: 'editor' }))).resolves.toBe(
      false,
    );
  });

  it('allows the first CMS user to manage invites when CMS_OWNER_EMAIL is unset', async () => {
    delete process.env.CMS_OWNER_EMAIL;

    await expect(UserInvites.access.admin(ownerArgs({ email: 'first@example.com', role: 'editor' }))).resolves.toBe(
      true,
    );
  });

  it('normalizes invite email before validation', () => {
    const data = UserInvites.hooks.beforeValidate[0]({
      data: {
        email: '  NEW.USER@EXAMPLE.COM ',
        role: 'editor',
      },
    });

    expect(data.email).toBe('new.user@example.com');
  });

  it('creates a CMS user and sends a password setup email when an invite is created', async () => {
    const payload = mockPayload();
    const req = inviteReq(payload);

    await UserInvites.hooks.afterChange[0]({
      doc: {
        email: 'new.user@example.com',
        id: 99,
        role: 'editor',
      },
      operation: 'create',
      req,
    });

    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        data: expect.objectContaining({
          email: 'new.user@example.com',
          password: expect.any(String),
          role: 'editor',
        }),
        overrideAccess: true,
        req,
      }),
    );
    expect(payload.forgotPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        data: { email: 'new.user@example.com' },
        expiration: 1000 * 60 * 60 * 24,
        overrideAccess: true,
        req,
      }),
    );
    expect(payload.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        collection: 'user-invites',
        data: expect.objectContaining({
          errorMessage: null,
          sentAt: expect.any(String),
          status: 'sent',
        }),
        id: 99,
        overrideAccess: true,
        req,
      }),
    );
  });

  it('updates an existing CMS user role before resending the invite', async () => {
    const payload = mockPayload({
      existingUser: {
        email: 'existing@example.com',
        id: 12,
        role: 'editor',
      },
    });
    const req = inviteReq(payload);

    await UserInvites.hooks.afterChange[0]({
      doc: {
        email: 'existing@example.com',
        id: 99,
        role: 'admin',
      },
      operation: 'create',
      req,
    });

    expect(payload.create).not.toHaveBeenCalled();
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        data: { role: 'admin' },
        id: 12,
        overrideAccess: true,
        req,
      }),
    );
    expect(payload.forgotPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { email: 'existing@example.com' },
      }),
    );
  });

  it('creates a copyable invite link without sending email', async () => {
    const payload = mockPayload();
    payload.email = { name: 'console' };
    payload.forgotPassword.mockResolvedValue('manual-token');
    const req = inviteReq(payload);

    await UserInvites.hooks.afterChange[0]({
      doc: {
        deliveryMethod: 'link',
        email: 'new.user@example.com',
        id: 99,
        role: 'editor',
      },
      operation: 'create',
      req,
    });

    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        data: expect.objectContaining({
          email: 'new.user@example.com',
          role: 'editor',
        }),
      }),
    );
    expect(payload.forgotPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        data: { email: 'new.user@example.com' },
        disableEmail: true,
        expiration: 1000 * 60 * 60 * 24,
        overrideAccess: true,
        req,
      }),
    );
    expect(payload.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        collection: 'user-invites',
        data: expect.objectContaining({
          errorMessage: null,
          inviteLink: 'https://cms.example.com/reset/manual-token',
          linkCreatedAt: expect.any(String),
          sentAt: null,
          status: 'link_created',
        }),
        id: 99,
      }),
    );
  });

  it('hides expired copyable invite links when records are read', () => {
    const hook = UserInvites.hooks.afterRead[0];
    const fresh = hook({
      doc: {
        inviteLink: 'https://cms.example.com/reset/fresh-token',
        linkCreatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
    });
    const expired = hook({
      doc: {
        inviteLink: 'https://cms.example.com/admin/reset/expired-token',
        linkCreatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      },
    });

    expect(fresh.inviteLink).toBe('https://cms.example.com/reset/fresh-token');
    expect(expired.inviteLink).toBeNull();
  });

  it('marks the invite as failed when SMTP delivery is not configured', async () => {
    const payload = mockPayload();
    payload.email = { name: 'console' };
    const req = inviteReq(payload);

    await UserInvites.hooks.afterChange[0]({
      doc: {
        email: 'new.user@example.com',
        id: 99,
        role: 'editor',
      },
      operation: 'create',
      req,
    });

    expect(payload.forgotPassword).not.toHaveBeenCalled();
    expect(payload.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        collection: 'user-invites',
        data: expect.objectContaining({
          errorMessage: 'SMTP is not configured. Set SMTP_HOST and related SMTP env vars to send CMS invites.',
          sentAt: null,
          status: 'failed',
        }),
        id: 99,
      }),
    );
  });
});
