import { isAdminOrEditor } from './Users.js';
import { markCmsDeployNeeded } from '../lib/cms-deploy-gate.js';
import { LOCATION_DETAIL_OPTIONS } from '../lib/location-details-options.js';
import { DEFAULT_LANDING_HERO_IMAGE, validateOptionalPublicAssetPath } from '../lib/media-library.js';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const reservedBlogSlugs = new Set(LOCATION_DETAIL_OPTIONS.map((option) => option.value));

function canManageBlogPosts({ req: { user } }) {
  if (!user || user.collection !== 'users') return false;

  return isAdminOrEditor(user);
}

function validateBlogSlug(val) {
  if (typeof val !== 'string' || !slugRegex.test(val.trim())) {
    return 'Slug must use lowercase words and hyphens, such as houston-opening-notes.';
  }
  if (reservedBlogSlugs.has(val.trim())) {
    return 'Use a non-location slug. Location blog indexes already use /blog/{location}.';
  }
  return true;
}

export const BlogPosts = {
  slug: 'blog-posts',
  labels: {
    singular: 'Blog Post',
    plural: 'Blog Posts',
  },
  admin: {
    group: 'Pages',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'locationSlug', 'published', 'publishDate', 'updatedAt'],
    description:
      'Location-specific blog posts rendered under /blog/{post-url}. Published posts appear on /blog and their location blog index after deploy.',
  },
  access: {
    admin: canManageBlogPosts,
    read: ({ req }) => (canManageBlogPosts({ req }) ? true : { published: { equals: true } }),
    create: canManageBlogPosts,
    update: canManageBlogPosts,
    delete: canManageBlogPosts,
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
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          label: 'Post URL',
          admin: {
            description: 'The public URL segment after /blog/. Use lowercase words and hyphens.',
          },
          validate: validateBlogSlug,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'locationSlug',
          type: 'select',
          required: true,
          label: 'Location',
          options: LOCATION_DETAIL_OPTIONS,
          admin: {
            description: 'Used for /blog/{location} indexes and local relevance.',
          },
        },
        {
          name: 'publishDate',
          type: 'date',
          required: true,
          label: 'Publish date',
          admin: {
            date: { pickerAppearance: 'dayOnly' },
          },
        },
      ],
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
      label: 'Published in CMS',
      admin: {
        position: 'sidebar',
        description: 'Published in CMS means approved. It is Live after deploy when the static public site rebuilds.',
      },
    },
    {
      name: 'includeInSitemap',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'If off, the post can still exist but will be omitted from sitemap.xml.',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
      maxLength: 260,
      admin: {
        description: 'Short summary shown on blog index pages.',
      },
    },
    {
      name: 'heroImage',
      type: 'text',
      defaultValue: DEFAULT_LANDING_HERO_IMAGE,
      label: 'Hero image',
      admin: {
        description: 'Optional root-relative /assets/... path. Defaults to the Time Mission mission-room image.',
      },
      validate: validateOptionalPublicAssetPath,
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Plain-text article body. Separate paragraphs with blank lines.',
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
          maxLength: 90,
          admin: { description: 'Optional. Defaults to the post title.' },
        },
        {
          name: 'metaDescription',
          type: 'textarea',
          maxLength: 220,
          admin: { description: 'Optional. Defaults to the excerpt.' },
        },
        {
          name: 'robots',
          type: 'select',
          defaultValue: 'index,follow',
          options: [
            { label: 'index, follow', value: 'index,follow' },
            { label: 'noindex, follow', value: 'noindex,follow' },
          ],
        },
        {
          name: 'ogImage',
          type: 'text',
          admin: { description: 'Optional. Defaults to the hero image.' },
          validate: validateOptionalPublicAssetPath,
        },
        {
          name: 'twitterImage',
          type: 'text',
          admin: { description: 'Optional. Defaults to og:image.' },
          validate: validateOptionalPublicAssetPath,
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      ({ doc, previousDoc, req }) =>
        markCmsDeployNeeded({ action: 'change', collection: 'blog-posts', doc, previousDoc, req }),
    ],
    afterDelete: [
      ({ doc, req }) => markCmsDeployNeeded({ action: 'delete', collection: 'blog-posts', doc, req }),
    ],
  },
};
