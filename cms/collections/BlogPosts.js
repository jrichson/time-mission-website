import { isAdminOrEditor } from './Users.js';
import {
  FixedToolbarFeature,
  UploadFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import { markCmsDeployNeeded } from '../lib/cms-deploy-gate.js';
import { LOCATION_DETAIL_OPTIONS } from '../lib/location-details-options.js';
import { DEFAULT_LANDING_HERO_IMAGE, validateOptionalPublicAssetPath } from '../lib/media-library.js';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const reservedBlogSlugs = new Set(LOCATION_DETAIL_OPTIONS.map((option) => option.value));
const POST_TYPE_ARTICLE = 'article';
const POST_TYPE_EXTERNAL = 'external';

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

function validateOptionalHttpsUrl(value) {
  if (value == null || String(value).trim() === '') return true;

  const cleaned = String(value).trim();
  if (cleaned.length > 2048 || /[<>"'\\\s]/.test(cleaned)) {
    return 'Use a credential-free https:// URL.';
  }

  let url;
  try {
    url = new URL(cleaned);
  } catch {
    return 'Use a credential-free https:// URL.';
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    return 'Use a credential-free https:// URL.';
  }

  return true;
}

function validateExternalPostUrl(value, { data, siblingData } = {}) {
  const postType = data?.postType ?? siblingData?.postType;
  if (postType !== POST_TYPE_EXTERNAL) return validateOptionalHttpsUrl(value);
  const published = data?.published ?? siblingData?.published;
  if (published !== true && !String(value ?? '').trim()) return true;
  if (!String(value ?? '').trim()) return 'Add the external article or press release URL.';

  return validateOptionalHttpsUrl(value);
}

function validateBlogLocation(value, { data, siblingData } = {}) {
  const locationSlug = String(value || '').trim();
  if (reservedBlogSlugs.has(locationSlug)) return true;

  const showInPressRoom = data?.showInPressRoom ?? siblingData?.showInPressRoom;
  if (!locationSlug && showInPressRoom === true) return true;
  return 'Choose a location, or mark this as a company-wide Press Room post.';
}

function richTextHasText(value) {
  const children = value?.root?.children;
  if (!Array.isArray(children)) return false;

  const containsText = (node) => {
    if (typeof node?.text === 'string' && node.text.trim()) return true;
    return Array.isArray(node?.children) && node.children.some(containsText);
  };

  return children.some(containsText);
}

function validateArticleBody(value, { data, siblingData } = {}) {
  const postType = data?.postType ?? siblingData?.postType;
  if (postType === POST_TYPE_EXTERNAL) return true;
  const published = data?.published ?? siblingData?.published;
  if (published !== true && !richTextHasText(value)) return true;

  return richTextHasText(value) || 'Write the article body before publishing this post.';
}

const articleEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures,
    FixedToolbarFeature(),
    UploadFeature({
      enabledCollections: ['media'],
      maxDepth: 1,
      collections: {
        media: {
          fields: [
            {
              name: 'caption',
              type: 'text',
              maxLength: 240,
              label: 'Caption',
            },
          ],
        },
      },
    }),
  ],
});

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
    preview: (data) => (data?.id ? `/preview/blog/${data.id}` : null),
    description:
      'Original Time Mission articles and Press Room shared links that go live after deploy.',
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
        description: 'Applies to original articles and shared links outside Press Room. In the News links are always omitted.',
      },
    },
    {
      name: 'showInPressRoom',
      type: 'checkbox',
      defaultValue: false,
      label: 'Show in Press Room',
      admin: {
        position: 'sidebar',
        description:
          'If on, original articles appear under Press Releases and shared links appear under In the News after deploy.',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Write',
          description: 'Choose an original article or shared link, then add the public content.',
          fields: [
            {
              name: 'postType',
              type: 'radio',
              required: true,
              defaultValue: POST_TYPE_ARTICLE,
              label: 'Post type',
              options: [
                {
                  label: 'Original article',
                  value: POST_TYPE_ARTICLE,
                },
                {
                  label: 'Shared link',
                  value: POST_TYPE_EXTERNAL,
                },
              ],
              admin: {
                description:
                  'Original articles are published on Time Mission. Shared links shown in Press Room appear under In the News and open the source directly.',
              },
            },
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
                  label: 'Location',
                  options: LOCATION_DETAIL_OPTIONS,
                  admin: {
                    description: 'Original articles also appear on this location’s blog. Leave blank for company-wide Press Room content.',
                  },
                  validate: validateBlogLocation,
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
              type: 'row',
              admin: {
                condition: (data) => data?.postType === POST_TYPE_EXTERNAL,
              },
              fields: [
                {
                  name: 'externalUrl',
                  type: 'text',
                  maxLength: 2048,
                  label: 'Article or press release URL',
                  admin: {
                    description: 'The public post will show this as a prominent embedded source card.',
                  },
                  validate: validateExternalPostUrl,
                },
                {
                  name: 'externalPublisher',
                  type: 'text',
                  maxLength: 120,
                  label: 'Publisher',
                  admin: {
                    description: 'Examples: PR Newswire, Chicago Tribune, or a partner organization.',
                  },
                },
              ],
            },
            {
              name: 'body',
              type: 'richText',
              label: 'Article',
              editor: articleEditor,
              admin: {
                condition: (data) => data?.postType !== POST_TYPE_EXTERNAL,
                description:
                  'Write and format the full article. Use the image button in the fixed toolbar to place uploaded images inside the story.',
              },
              validate: validateArticleBody,
            },
          ],
        },
        {
          label: 'Image & search',
          description: 'Keep the defaults unless this post needs a custom image or search preview.',
          fields: [
            {
              name: 'heroMedia',
              type: 'upload',
              relationTo: 'media',
              label: 'Hero image',
              admin: {
                description: 'Shown at the top of the post and on blog cards.',
              },
            },
            {
              name: 'heroImage',
              type: 'text',
              defaultValue: DEFAULT_LANDING_HERO_IMAGE,
              label: 'Legacy hero image path',
              admin: {
                description: 'Fallback for older posts. A selected hero image above takes priority.',
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
