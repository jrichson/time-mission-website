import crypto from 'node:crypto';

import { isOwner, normalizeEmail, USER_COLLECTION } from './Users.js';

export const USER_INVITE_COLLECTION = 'user-invites';
export const INVITE_TOKEN_EXPIRATION_MS = 1000 * 60 * 60 * 24;

const SKIP_INVITE_CONTEXT = 'skipUserInviteProcessing';
const DELIVERY_EMAIL = 'email';
const DELIVERY_LINK = 'link';

function userInviteAccess(args) {
  return isOwner(args);
}

function normalizeInviteEmail({ data }) {
  if (data?.email) {
    return {
      ...data,
      email: normalizeEmail(data.email),
    };
  }

  return data;
}

function inviteRole(doc) {
  return doc?.role === 'admin' ? 'admin' : 'editor';
}

function inviteDeliveryMethod(doc) {
  return doc?.deliveryMethod === DELIVERY_LINK ? DELIVERY_LINK : DELIVERY_EMAIL;
}

function randomPassword() {
  return crypto.randomBytes(32).toString('base64url');
}

function adminResetURL(req, token) {
  const config = req.payload.config;
  const serverURL = config.serverURL || process.env.PAYLOAD_SERVER_URL || '';
  const adminRoute = config.routes?.admin || '/admin';
  const resetRoute = config.admin?.routes?.reset || '/reset';

  return `${serverURL.replace(/\/+$/, '')}${adminRoute}${resetRoute}/${encodeURIComponent(token)}`;
}

async function findUserByEmail(req, email) {
  const result = await req.payload.find({
    collection: USER_COLLECTION,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: {
      email: {
        equals: email,
      },
    },
  });

  return result.docs?.[0] || null;
}

async function createOrUpdateInvitedUser({ email, req, role }) {
  const existingUser = await findUserByEmail(req, email);

  if (existingUser) {
    await req.payload.update({
      collection: USER_COLLECTION,
      context: { ...req.context, [SKIP_INVITE_CONTEXT]: true },
      data: { role },
      id: existingUser.id,
      overrideAccess: true,
      req,
    });
    return;
  }

  await req.payload.create({
    collection: USER_COLLECTION,
    context: { ...req.context, [SKIP_INVITE_CONTEXT]: true },
    data: {
      email,
      password: randomPassword(),
      role,
    },
    overrideAccess: true,
    req,
  });
}

function assertEmailDeliveryConfigured(req) {
  if (req.payload.email?.name === 'console') {
    throw new Error('SMTP is not configured. Set SMTP_HOST and related SMTP env vars to send CMS invites.');
  }
}

async function updateInviteStatus({ errorMessage = null, id, req, status }) {
  const isEmailSent = status === 'sent';

  await req.payload.update({
    collection: USER_INVITE_COLLECTION,
    context: { ...req.context, [SKIP_INVITE_CONTEXT]: true },
    data: {
      errorMessage,
      inviteLink: null,
      linkCreatedAt: null,
      sentAt: isEmailSent ? new Date().toISOString() : null,
      status,
    },
    id,
    overrideAccess: true,
    req,
  });
}

async function updateInviteLinkStatus({ id, inviteLink, req }) {
  await req.payload.update({
    collection: USER_INVITE_COLLECTION,
    context: { ...req.context, [SKIP_INVITE_CONTEXT]: true },
    data: {
      errorMessage: null,
      inviteLink,
      linkCreatedAt: new Date().toISOString(),
      sentAt: null,
      status: 'link_created',
    },
    id,
    overrideAccess: true,
    req,
  });
}

function errorMessage(error) {
  if (error instanceof Error) return error.message;
  return 'Unknown invite error';
}

function inviteLinkIsExpired(doc) {
  if (!doc?.linkCreatedAt) return false;
  const createdAt = new Date(doc.linkCreatedAt).getTime();
  if (!Number.isFinite(createdAt)) return true;
  return Date.now() - createdAt >= INVITE_TOKEN_EXPIRATION_MS;
}

function redactExpiredInviteLink({ doc }) {
  if (!doc?.inviteLink || !inviteLinkIsExpired(doc)) return doc;
  return {
    ...doc,
    inviteLink: null,
  };
}

async function sendInviteAfterCreate({ doc, operation, req }) {
  if (operation !== 'create' || req.context?.[SKIP_INVITE_CONTEXT]) {
    return doc;
  }

  const email = normalizeEmail(doc?.email);
  if (!email || !doc?.id) {
    return doc;
  }

  try {
    const role = inviteRole(doc);
    const deliveryMethod = inviteDeliveryMethod(doc);

    await createOrUpdateInvitedUser({ email, req, role });

    if (deliveryMethod === DELIVERY_LINK) {
      const token = await req.payload.forgotPassword({
        collection: USER_COLLECTION,
        data: { email },
        disableEmail: true,
        expiration: INVITE_TOKEN_EXPIRATION_MS,
        overrideAccess: true,
        req,
      });
      await updateInviteLinkStatus({ id: doc.id, inviteLink: adminResetURL(req, token), req });

      req.payload.logger.info(`[user-invites] created CMS invite link for ${email}`);
      return doc;
    }

    assertEmailDeliveryConfigured(req);
    await req.payload.forgotPassword({
      collection: USER_COLLECTION,
      data: { email },
      expiration: INVITE_TOKEN_EXPIRATION_MS,
      overrideAccess: true,
      req,
    });
    await updateInviteStatus({ id: doc.id, req, status: 'sent' });

    req.payload.logger.info(`[user-invites] sent CMS invite to ${email}`);
  } catch (error) {
    const message = errorMessage(error);
    req.payload.logger.error(`[user-invites] failed to send CMS invite to ${email}: ${message}`);
    await updateInviteStatus({ errorMessage: message, id: doc.id, req, status: 'failed' });
  }

  return doc;
}

export const UserInvites = {
  slug: USER_INVITE_COLLECTION,
  labels: {
    singular: 'User Invite',
    plural: 'User Invites',
  },
  admin: {
    group: 'Settings',
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'deliveryMethod', 'status', 'sentAt', 'createdAt'],
    description: 'Owner-only invites for CMS access. Send an email or create a copyable password setup link.',
  },
  access: {
    admin: userInviteAccess,
    create: userInviteAccess,
    read: userInviteAccess,
    update: userInviteAccess,
    delete: userInviteAccess,
  },
  hooks: {
    beforeValidate: [normalizeInviteEmail],
    afterChange: [sendInviteAfterCreate],
    afterRead: [redactExpiredInviteLink],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'email',
          type: 'email',
          required: true,
          admin: {
            description: 'The email address that will receive the CMS invite.',
          },
        },
        {
          name: 'role',
          type: 'select',
          required: true,
          defaultValue: 'editor',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
          ],
          admin: {
            description: 'Editors manage page content. Admins can also access admin-level CMS areas.',
          },
        },
      ],
    },
    {
      name: 'deliveryMethod',
      type: 'select',
      required: true,
      defaultValue: DELIVERY_EMAIL,
      options: [
        { label: 'Send email', value: DELIVERY_EMAIL },
        { label: 'Create invite link', value: DELIVERY_LINK },
      ],
      admin: {
        description: 'Use invite link when SMTP is not configured or you want to send the link yourself.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Sent', value: 'sent' },
        { label: 'Link created', value: 'link_created' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'sentAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'inviteLink',
      type: 'textarea',
      admin: {
        condition: (_, siblingData) => siblingData?.status === 'link_created',
        description: 'Copy this link and send it privately. It expires 24 hours after creation and is hidden after expiry.',
        readOnly: true,
      },
    },
    {
      name: 'linkCreatedAt',
      type: 'date',
      admin: {
        condition: (_, siblingData) => siblingData?.status === 'link_created',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'errorMessage',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData?.status === 'failed',
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
};
