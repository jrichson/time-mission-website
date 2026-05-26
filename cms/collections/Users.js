export const USER_COLLECTION = 'users';
const isProduction = process.env.NODE_ENV === 'production';
const INVITE_TOKEN_EXPIRATION_MS = 1000 * 60 * 60 * 24;

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function ownerEmail() {
  return normalizeEmail(process.env.CMS_OWNER_EMAIL);
}

function userRole(user) {
  return user?.role;
}

export function isAdminOrEditor(user) {
  const role = userRole(user);
  return role === 'admin' || role === 'editor';
}

function isAdmin(user) {
  return userRole(user) === 'admin';
}

function isCMSUser(user) {
  if (!user || user.collection !== USER_COLLECTION) return false;
  return true;
}

function canAccessAdmin({ req: { user } }) {
  if (!isCMSUser(user)) return false;

  return isAdminOrEditor(user);
}

export function isOwner({ req: { user } }) {
  if (!isCMSUser(user)) return false;

  const configuredOwnerEmail = ownerEmail();
  if (!configuredOwnerEmail) return false;

  return normalizeEmail(user.email) === configuredOwnerEmail;
}

export function canTriggerCmsDeploy(args) {
  const user = args?.req?.user;
  if (!isCMSUser(user)) return false;
  if (isOwner(args)) return true;
  return isAdmin(user) && user.canDeploy === true;
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

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function adminResetURL(req, token) {
  const config = req.payload.config;
  const serverURL = config.serverURL || process.env.PAYLOAD_SERVER_URL || '';
  const adminRoute = config.routes?.admin || '/admin';
  const resetRoute = config.admin?.routes?.reset || '/reset';

  return `${serverURL.replace(/\/+$/, '')}${adminRoute}${resetRoute}/${encodeURIComponent(token)}`;
}

function generatePasswordEmailHTML({ req, token, user }) {
  const resetURL = adminResetURL(req, token);
  const email = escapeHTML(user.email);

  return `<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #111111;">
    <h1 style="font-size: 20px;">Set your Time Mission CMS password</h1>
    <p>Hello ${email},</p>
    <p>You have been invited to the Time Mission CMS, or a password reset was requested for your account.</p>
    <p><a href="${resetURL}">Set your password</a></p>
    <p>This link expires in 24 hours. If you were not expecting this email, you can ignore it.</p>
  </body>
</html>`;
}

function generatePasswordEmailSubject() {
  return 'Set your Time Mission CMS password';
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
    forgotPassword: {
      expiration: INVITE_TOKEN_EXPIRATION_MS,
      generateEmailHTML: generatePasswordEmailHTML,
      generateEmailSubject: generatePasswordEmailSubject,
    },
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
    {
      name: 'canDeploy',
      type: 'checkbox',
      defaultValue: false,
      access: {
        read: isOwner,
        update: isOwner,
      },
      admin: {
        position: 'sidebar',
        description:
          'Owner-granted permission to publish approved CMS changes to the public site. Roles alone do not grant deploy access.',
      },
      label: 'Can trigger site deploy',
    },
  ],
};
