import { markCmsDeployNeeded } from '../lib/cms-deploy-gate.js';
import { validateOptionalPublicAssetPath, validatePublicAssetPath } from '../lib/media-library.js';

const pathRegex = /^\/$|^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

function validateExistingPagePath(val) {
  if (typeof val !== 'string' || !pathRegex.test(val)) {
    return 'Use a clean canonical path such as /about, /groups/birthdays, or /.';
  }
  if (val.startsWith('/c/')) {
    return 'Use Landing Pages for /c/* campaign pages.';
  }
  return true;
}

function userRole(user) {
  return user?.role;
}

function isAdminOrEditor(user) {
  const role = userRole(user);
  return role === 'admin' || role === 'editor';
}

function isAdmin(user) {
  return userRole(user) === 'admin';
}

function canManageSitePages({ req: { user } }) {
  if (!user || user.collection !== 'users') return false;

  return isAdminOrEditor(user);
}

function canCreateOrDeleteSitePages({ req: { user } }) {
  if (!user || user.collection !== 'users') return false;

  return isAdmin(user);
}

function canManageSensitiveSeoFields({ req: { user } }) {
  if (!user || user.collection !== 'users') return false;

  return isAdmin(user);
}

export const SitePages = {
  slug: 'site-pages',
  labels: {
    singular: 'Page SEO Override',
    plural: 'Page SEO Overrides',
  },
  admin: {
    group: 'Site Surfaces',
    useAsTitle: 'title',
    defaultColumns: ['title', 'path', 'published', 'updatedAt'],
    description:
      'Search and social metadata for code-owned public pages. This does not change page body copy or layout.',
  },
  access: {
    admin: canManageSitePages,
    read: ({ req }) => (canManageSitePages({ req }) ? true : { published: { equals: true } }),
    create: canCreateOrDeleteSitePages,
    update: canManageSitePages,
    delete: canCreateOrDeleteSitePages,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          maxLength: 120,
          admin: { description: 'Internal label for this SEO override. It is not page body content.' },
        },
        {
          name: 'path',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          label: 'Code-owned page path',
          access: {
            update: canManageSensitiveSeoFields,
          },
          admin: {
            description:
              'Admin-only. Match a known code-owned page path, e.g. /, /about, /groups/birthdays. Landing pages use /c/* instead.',
          },
          validate: validateExistingPagePath,
        },
      ],
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: true,
      label: 'Published in CMS',
      admin: {
        position: 'sidebar',
        description:
          'Published in CMS means this metadata is approved. It is Live after deploy when the static public site rebuilds.',
      },
    },
    {
      name: 'seo',
      type: 'group',
      label: 'SEO',
      fields: [
        {
          name: 'metaTitle',
          type: 'text',
          required: true,
          maxLength: 90,
          admin: { description: '<title> and og:title for the code-owned page' },
        },
        {
          name: 'metaDescription',
          type: 'textarea',
          required: true,
          maxLength: 220,
        },
        {
          name: 'robots',
          type: 'select',
          defaultValue: 'index,follow',
          access: {
            update: canManageSensitiveSeoFields,
          },
          admin: {
            description: 'Admin-only. Indexing changes can affect crawlability.',
          },
          options: [
            { label: 'index, follow', value: 'index,follow' },
            { label: 'noindex, follow', value: 'noindex,follow' },
          ],
        },
        {
          name: 'ogImage',
          type: 'text',
          required: true,
          admin: { description: 'Root-relative path, e.g. /assets/photos/...' },
          validate: validatePublicAssetPath,
        },
        {
          name: 'twitterImage',
          type: 'text',
          admin: { description: 'Defaults to og:image if empty' },
          validate: validateOptionalPublicAssetPath,
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      ({ doc, previousDoc, req }) =>
        markCmsDeployNeeded({ action: 'change', collection: 'site-pages', doc, previousDoc, req }),
    ],
    afterDelete: [
      ({ doc, req }) => markCmsDeployNeeded({ action: 'delete', collection: 'site-pages', doc, req }),
    ],
  },
};
