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
    group: 'Website Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'locationSlug', 'published', 'publishDate', 'updatedAt'],
    components: {
      beforeList: ['/components/AdminCollectionGuides.tsx#BlogPostsGuide'],
    },
    description:
      'Location updates that appear on the main blog and the selected location blog after deploy.',
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
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
      label: 'Published in CMS',
      admin: {
        position: 'sidebar',
        components: {
          Cell: '/components/AdminListCells.tsx#PublishedStatusCell',
        },
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
      type: 'tabs',
      tabs: [
        {
          label: 'Article',
          description: 'Write the post and choose where it belongs.',
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
                    description: 'The part after /blog/. Use lowercase words and hyphens.',
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
                    description: 'The post will also appear on this location’s blog.',
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
              name: 'excerpt',
              type: 'richText',
              required: true,
              label: 'Short summary',
              admin: {
                description: 'Shown on blog lists. Keep it to one or two sentences.',
              },
            },
            {
              name: 'body',
              type: 'richText',
              required: true,
              label: 'Article',
              admin: {
                description: 'The full blog post.',
              },
            },
          ],
        },
        {
          label: 'Image & search',
          description: 'Keep the defaults unless this post needs a custom image or search preview.',
          fields: [
            {
              name: 'heroImage',
              type: 'text',
              defaultValue: DEFAULT_LANDING_HERO_IMAGE,
              label: 'Hero image path',
              admin: {
                description: 'Keep the default, or use an approved /assets/... image path.',
              },
              validate: validateOptionalPublicAssetPath,
            },
            {
              name: 'seo',
              type: 'group',
              label: 'Search and social preview',
              admin: {
                description: 'Optional overrides. Blank fields use the article title, summary, and hero image.',
              },
              fields: [
                {
                  name: 'metaTitle',
                  type: 'text',
                  maxLength: 90,
                  label: 'Search title',
                  admin: { description: 'Optional. Defaults to the post title.' },
                },
                {
                  name: 'metaDescription',
                  type: 'textarea',
                  maxLength: 220,
                  label: 'Search description',
                  admin: { description: 'Optional. Defaults to the short summary.' },
                },
                {
                  name: 'robots',
                  type: 'select',
                  defaultValue: 'index,follow',
                  label: 'Search visibility',
                  options: [
                    { label: 'Show in search results', value: 'index,follow' },
                    { label: 'Hide from search results', value: 'noindex,follow' },
                  ],
                },
                {
                  name: 'ogImage',
                  type: 'text',
                  label: 'Social image path',
                  admin: { description: 'Optional. Defaults to the hero image.' },
                  validate: validateOptionalPublicAssetPath,
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
