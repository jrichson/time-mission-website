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
    singular: 'Search & Sharing Page',
    plural: 'Search & Sharing',
  },
  admin: {
    group: 'Website Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'path', 'published', 'updatedAt'],
    components: {
      beforeList: ['/components/AdminCollectionGuides.tsx#SitePagesGuide'],
    },
    description:
      'Search-result and social-sharing settings for existing public pages. This does not change page copy or layout.',
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
          admin: { description: 'Editor label only. This does not change the page heading.' },
        },
        {
          name: 'path',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          label: 'Page URL',
          access: {
            update: canManageSensitiveSeoFields,
          },
          admin: {
            description:
              'Administrator setting. Use an existing page path such as /about or /groups/birthdays.',
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
        components: {
          Cell: '/components/AdminListCells.tsx#PublishedStatusCell',
        },
        description:
          'Published in CMS means this metadata is approved. It is Live after deploy when the static public site rebuilds.',
      },
    },
    {
      name: 'seo',
      type: 'group',
      label: 'Search and social preview',
      admin: {
        description: 'How this page is titled and described outside the website.',
      },
      fields: [
        {
          name: 'metaTitle',
          type: 'text',
          required: true,
          maxLength: 90,
          label: 'Search title',
          admin: { description: 'Used in browser tabs, search results, and social shares.' },
        },
        {
          name: 'metaDescription',
          type: 'textarea',
          required: true,
          maxLength: 220,
          label: 'Search description',
        },
        {
          name: 'robots',
          type: 'select',
          defaultValue: 'index,follow',
          label: 'Search visibility',
          access: {
            update: canManageSensitiveSeoFields,
          },
          admin: {
            description: 'Administrator setting. Hiding a page removes it from search results.',
          },
          options: [
            { label: 'Show in search results', value: 'index,follow' },
            { label: 'Hide from search results', value: 'noindex,follow' },
          ],
        },
        {
          name: 'ogImage',
          type: 'text',
          required: true,
          label: 'Social image path',
          admin: { description: 'Use an approved /assets/... image path.' },
          validate: validatePublicAssetPath,
        },
        {
          name: 'twitterImage',
          type: 'text',
          label: 'X / Twitter image path',
          admin: { description: 'Optional. Defaults to the social image.' },
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
