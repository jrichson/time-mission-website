const USER_COLLECTION = 'users';
const isProduction = process.env.NODE_ENV === 'production';

function userRole(user) {
  return user?.role;
}

function isAdmin({ req: { user } }) {
  if (!user || user.collection !== USER_COLLECTION) return false;

  return userRole(user) === 'admin' || userRole(user) == null;
}

export const Users = {
  slug: USER_COLLECTION,
  admin: {
    useAsTitle: 'email',
  },
  access: {
    admin: isAdmin,
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
    unlock: isAdmin,
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
      defaultValue: 'admin',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      access: {
        read: isAdmin,
        update: isAdmin,
      },
      admin: {
        position: 'sidebar',
        description: 'Admins manage users; editors manage landing content only.',
      },
    },
  ],
};
