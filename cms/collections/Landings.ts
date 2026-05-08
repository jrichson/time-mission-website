import type { CollectionConfig, PayloadRequest } from 'payload';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const assetPathUnsafeRegex = /[<>"'\\\s]/;

const CLOUDFLARE_DEPLOY_HOOK_TIMEOUT_MS = 15_000;

function validateAssetPath(val: unknown) {
  if (typeof val !== 'string' || !val.startsWith('/assets/')) {
    return 'Must be a root-relative path starting with /assets/';
  }
  if (val.includes('://') || val.includes('..') || assetPathUnsafeRegex.test(val)) {
    return 'Invalid image path';
  }
  return true;
}

function validateHttpsUrl(val: unknown, label: string) {
  if (typeof val !== 'string') return `${label} must be an https URL`;
  if (val.length > 2048) return `${label} is too long`;

  let url: URL;
  try {
    url = new URL(val);
  } catch {
    return `${label} must be a valid URL`;
  }

  if (url.protocol !== 'https:') return `${label} must use https`;
  if (url.username || url.password) return `${label} must not include credentials`;
  return true;
}

function deployHookURL() {
  const value = process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL;
  if (!value) {
    console.warn('[landings] skip deploy hook: CLOUDFLARE_PAGES_DEPLOY_HOOK_URL unset');
    return null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    console.warn('[landings] skip deploy hook: CLOUDFLARE_PAGES_DEPLOY_HOOK_URL is invalid');
    return null;
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    console.warn('[landings] skip deploy hook: CLOUDFLARE_PAGES_DEPLOY_HOOK_URL must be a credential-free https URL');
    return null;
  }

  return url.toString();
}

function triggerPagesDeploy(reason: string) {
  const url = deployHookURL();
  if (!url) {
    return;
  }
  void fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(CLOUDFLARE_DEPLOY_HOOK_TIMEOUT_MS),
  }).then(
    (res) =>
      console.log('[landings] Cloudflare Pages hook:', reason, res.status),
    (err) => console.error('[landings] Cloudflare Pages hook failed:', err),
  );
}

function userRole(user: unknown): string | undefined {
  return (user as { role?: string } | null | undefined)?.role;
}

function canManageLandings({ req: { user } }: { req: PayloadRequest }): boolean {
  if (!user || user.collection !== 'users') return false;

  const role = userRole(user);
  return role === 'admin' || role === 'editor' || role == null;
}

export const Landings: CollectionConfig = {
  slug: 'landings',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'published', 'updatedAt'],
  },
  access: {
    admin: canManageLandings,
    read: ({ req }) => (canManageLandings({ req }) ? true : { published: { equals: true } }),
    create: canManageLandings,
    update: canManageLandings,
    delete: canManageLandings,
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
          admin: { description: 'URL segment: /c/{slug} (lowercase, hyphens only)' },
          validate: (val: unknown) => {
            if (typeof val !== 'string' || !slugRegex.test(val)) {
              return 'Slug must match ^[a-z0-9-]+$ (no leading/trailing hyphens)';
            }
            return true;
          },
        },
      ],
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'When checked, this page is included in the public site build.',
      },
    },
    {
      name: 'includeInSitemap',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'If off, page is still built but omitted from sitemap.xml.',
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
          admin: { description: '<title> and og:title' },
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
          name: 'canonicalOverride',
          type: 'text',
          admin: {
            description:
              'Optional full https URL on timemission.com; leave empty for default https://timemission.com/c/{slug}',
          },
          validate: (val: unknown) => {
            if (val == null || val === '') return true;
            if (typeof val !== 'string') return 'Canonical must be empty or an https URL on timemission.com';
            const s = val.trim();
            let u: URL;
            try {
              u = new URL(s);
            } catch {
              return 'Canonical must be a valid URL';
            }
            if (u.protocol !== 'https:') return 'Canonical override must use https';
            if (u.username || u.password) return 'Canonical URL must not include credentials';
            const host = u.hostname.toLowerCase();
            if (host !== 'timemission.com' && host !== 'www.timemission.com') {
              return 'Canonical must be timemission.com or www.timemission.com';
            }
            return true;
          },
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
          validate: (val: unknown) => {
            if (val == null || val === '') return true;
            return validateAssetPath(val);
          },
        },
      ],
    },
    {
      name: 'content',
      type: 'group',
      label: 'Landing content (template v1)',
      fields: [
        { name: 'headline', type: 'text', required: true, maxLength: 160 },
        { name: 'subheadline', type: 'textarea', maxLength: 360 },
        {
          name: 'bullets',
          type: 'array',
          minRows: 0,
          maxRows: 12,
          labels: { singular: 'Bullet', plural: 'Bullets' },
          fields: [{ name: 'text', type: 'text', required: true, maxLength: 200 }],
        },
        { name: 'primaryCtaLabel', type: 'text', required: true, maxLength: 80 },
        {
          name: 'ctaSurface',
          type: 'select',
          required: true,
          defaultValue: 'book_panel',
          options: [
            { label: 'Open booking (ticket panel)', value: 'book_panel' },
            { label: 'Missions page', value: 'missions' },
            { label: 'Groups hub', value: 'groups' },
            { label: 'Contact page', value: 'contact' },
            { label: 'Gift cards', value: 'gift_cards' },
            { label: 'External URL', value: 'external' },
          ],
        },
        {
          name: 'ctaExternalUrl',
          type: 'text',
          admin: {
            condition: (_, siblingData) => siblingData?.ctaSurface === 'external',
            description: 'https://… when CTA surface is External',
          },
          validate: (val: unknown, { siblingData }: { siblingData?: { ctaSurface?: string } }) => {
            if (siblingData?.ctaSurface !== 'external') return true;
            return validateHttpsUrl(val, 'External CTA');
          },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      ({ doc, previousDoc }) => {
        const pub = Boolean((doc as { published?: boolean }).published);
        const wasPub = Boolean((previousDoc as { published?: boolean } | undefined)?.published);
        if (pub || wasPub) triggerPagesDeploy('landing-change');
      },
    ],
    afterDelete: [
      ({ doc }) => {
        if (Boolean((doc as { published?: boolean }).published)) {
          triggerPagesDeploy('landing-delete');
        }
      },
    ],
  },
};
