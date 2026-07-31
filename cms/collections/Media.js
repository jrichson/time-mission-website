import path from 'path';

import { isAdminOrEditor } from './Users.js';

function isCmsAdmin(user) {
  return user?.collection === 'users' && user?.role === 'admin';
}

function canManageMedia({ req: { user } }) {
  if (!user || user.collection !== 'users') return false;

  return isAdminOrEditor(user);
}

const configuredMediaDir = process.env.PAYLOAD_MEDIA_DIR?.trim();
const staticDir = configuredMediaDir || path.resolve(process.cwd(), 'media');

export const Media = {
  slug: 'media',
  labels: {
    singular: 'Image',
    plural: 'Image Library',
  },
  admin: {
    group: 'Website Content',
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'updatedAt'],
    description: 'Approved images for blog articles and other CMS-owned content.',
  },
  access: {
    admin: canManageMedia,
    create: canManageMedia,
    delete: ({ req: { user } }) => isCmsAdmin(user),
    read: () => true,
    update: canManageMedia,
  },
  upload: {
    crop: true,
    focalPoint: true,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    staticDir,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      maxLength: 180,
      label: 'Image description',
      admin: {
        description: 'Describe the image for visitors who cannot see it. Do not start with “image of.”',
      },
    },
    {
      name: 'caption',
      type: 'text',
      maxLength: 240,
      label: 'Caption',
      admin: {
        description: 'Optional text shown beneath the image when it is placed inside an article.',
      },
    },
  ],
};
