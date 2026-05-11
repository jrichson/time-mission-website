const pathRegex = /^\/$|^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

const CLOUDFLARE_DEPLOY_HOOK_TIMEOUT_MS = 15_000;

function validateAssetPath(val) {
  if (typeof val !== 'string' || !val.startsWith('/assets/')) {
    return 'Must be a root-relative path starting with /assets/';
  }
  if (val.includes('://') || val.includes('..') || /[<>"'\\\s]/.test(val)) {
    return 'Invalid image path';
  }
  return true;
}

function validateExistingPagePath(val) {
  if (typeof val !== 'string' || !pathRegex.test(val)) {
    return 'Use a clean canonical path such as /about, /groups/birthdays, or /.';
  }
  if (val.startsWith('/c/')) {
    return 'Use Landing Pages for /c/* campaign pages.';
  }
  return true;
}

function deployHookURL() {
  const value = process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL;
  if (!value) {
    console.warn('[site-pages] skip deploy hook: CLOUDFLARE_PAGES_DEPLOY_HOOK_URL unset');
    return null;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    console.warn('[site-pages] skip deploy hook: CLOUDFLARE_PAGES_DEPLOY_HOOK_URL is invalid');
    return null;
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    console.warn('[site-pages] skip deploy hook: CLOUDFLARE_PAGES_DEPLOY_HOOK_URL must be a credential-free https URL');
    return null;
  }

  return url.toString();
}

function triggerPagesDeploy(reason) {
  const url = deployHookURL();
  if (!url) return;

  void fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(CLOUDFLARE_DEPLOY_HOOK_TIMEOUT_MS),
  }).then(
    (res) => console.log('[site-pages] Cloudflare Pages hook:', reason, res.status),
    (err) => console.error('[site-pages] Cloudflare Pages hook failed:', err),
  );
}

function userRole(user) {
  return user?.role;
}

function isAdminOrEditor(user) {
  const role = userRole(user);
  return role === 'admin' || role === 'editor';
}

function canManageSitePages({ req: { user } }) {
  if (!user || user.collection !== 'users') return false;

  return isAdminOrEditor(user);
}

export const SitePages = {
  slug: 'site-pages',
  labels: {
    singular: 'Existing Page',
    plural: 'Existing Pages',
  },
  admin: {
    group: 'Pages',
    useAsTitle: 'title',
    defaultColumns: ['title', 'path', 'published', 'updatedAt'],
    description: 'SEO metadata for static Astro pages. Match the canonical path exactly, such as /about.',
  },
  access: {
    admin: canManageSitePages,
    read: ({ req }) => (canManageSitePages({ req }) ? true : { published: { equals: true } }),
    create: canManageSitePages,
    update: canManageSitePages,
    delete: canManageSitePages,
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
          name: 'path',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          admin: { description: 'Existing page path, e.g. /, /about, /groups/birthdays.' },
          validate: validateExistingPagePath,
        },
      ],
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'When checked, the Astro build can use this metadata for the matching existing page.',
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
          admin: { description: '<title> and og:title for the existing page' },
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
          validate: validateAssetPath,
        },
        {
          name: 'twitterImage',
          type: 'text',
          admin: { description: 'Defaults to og:image if empty' },
          validate: (val) => {
            if (val == null || val === '') return true;
            return validateAssetPath(val);
          },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      ({ doc, previousDoc }) => {
        const pub = Boolean(doc?.published);
        const wasPub = Boolean(previousDoc?.published);
        if (pub || wasPub) triggerPagesDeploy('site-page-change');
      },
    ],
    afterDelete: [
      ({ doc }) => {
        if (Boolean(doc?.published)) triggerPagesDeploy('site-page-delete');
      },
    ],
  },
};
