const USER_COLLECTION = 'users';
const isProduction = process.env.NODE_ENV === 'production';

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function ownerEmail() {
  return normalizeEmail(process.env.CMS_OWNER_EMAIL);
}

function userRole(user) {
  return user?.role;
}

function isCMSUser(user) {
  if (!user || user.collection !== USER_COLLECTION) return false;
  return true;
}

function canAccessAdmin({ req: { user } }) {
  if (!isCMSUser(user)) return false;

  const role = userRole(user);
  return role === 'admin' || role === 'editor' || role == null;
}

function isOwner({ req: { user } }) {
  if (!isCMSUser(user)) return false;

  const configuredOwnerEmail = ownerEmail();
  if (!configuredOwnerEmail) return false;

  return normalizeEmail(user.email) === configuredOwnerEmail;
}

function isSelf({ req: { user }, id }) {
  if (!isCMSUser(user) || id == null) return false;

  return String(user.id) === String(id);
}

function readOwnerOrSelf(args) {
  if (isOwner(args)) return true;
  if (!isCMSUser(args.req.user)) return false;
  if (args.id != null) return isSelf(args);

  return { id: { equals: args.req.user.id } };
}

function updateOwnerOrSelf(args) {
  if (isOwner(args)) return true;
  if (!isCMSUser(args.req.user)) return false;
  if (args.id != null) return isSelf(args);

  return { id: { equals: args.req.user.id } };
}

export const Users = {
  slug: USER_COLLECTION,
  labels: {
    singular: 'User',
    plural: 'Users',
  },
  admin: {
    group: 'Settings',
    useAsTitle: 'email',
  },
  access: {
    admin: canAccessAdmin,
    create: isOwner,
    read: readOwnerOrSelf,
    update: updateOwnerOrSelf,
    delete: isOwner,
    unlock: isOwner,
  },
  auth: {
    cookies: {
      sameSite: 'Lax',
      secure: isProduction,
    },
    lockTime: 10 * 60 * 1000,
    maxLoginAttempts: 5,
    tokenExpiration: 2 * 60 * 60,
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      access: {
        read: isOwner,
        update: isOwner,
      },
      admin: {
        position: 'sidebar',
        description: 'Only the CMS owner can assign roles. Editors manage landing content only.',
      },
    },
  ],
};
