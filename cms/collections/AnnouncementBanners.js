import { createRequire } from 'node:module';

import { isAdminOrEditor } from './Users.js';

const require = createRequire(import.meta.url);
const locationsDocument = require('../../data/locations.json');

const CLOUDFLARE_DEPLOY_HOOK_TIMEOUT_MS = 15_000;
const bannerTargetScopeOptions = [
  { label: 'All visitors', value: 'global' },
  { label: 'Regions', value: 'regions' },
  { label: 'Locations', value: 'locations' },
];
const bannerRegionOptions = [
  { label: 'United States', value: 'us' },
  { label: 'Europe', value: 'europe' },
];
const locationSlugSet = new Set(
  (locationsDocument?.locations || [])
    .map((location) => String(location?.slug || '').trim())
    .filter(Boolean),
);
const locationExamples = Array.from(locationSlugSet).slice(0, 4).join(', ');

function deployHookURL() {
  const value = process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL;
  if (!value) {
    console.warn('[announcement-banners] skip deploy hook: CLOUDFLARE_PAGES_DEPLOY_HOOK_URL unset');
    return null;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    console.warn('[announcement-banners] skip deploy hook: CLOUDFLARE_PAGES_DEPLOY_HOOK_URL is invalid');
    return null;
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    console.warn('[announcement-banners] skip deploy hook: CLOUDFLARE_PAGES_DEPLOY_HOOK_URL must be a credential-free https URL');
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
    (res) => console.log('[announcement-banners] Cloudflare Pages hook:', reason, res.status),
    (err) => console.error('[announcement-banners] Cloudflare Pages hook failed:', err),
  );
}

function canManageAnnouncementBanners({ req: { user } }) {
  if (!user || user.collection !== 'users') return false;

  return isAdminOrEditor(user);
}

function validateInternalOrHttpsUrl(val) {
  if (val == null || val === '') return true;
  if (typeof val !== 'string') return 'Link must be a clean internal path or an https URL';
  const s = val.trim();
  if (s.length > 2048 || /[<>"'\\\s]/.test(s)) return 'Link is invalid';

  if (/^\/$|^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(s)) return true;

  let url;
  try {
    url = new URL(s);
  } catch {
    return 'Link must be a clean internal path or an https URL';
  }

  if (url.protocol !== 'https:') return 'External links must use https';
  if (url.username || url.password) return 'External links must not include credentials';
  return true;
}

function validateLocationSlug(val) {
  if (typeof val !== 'string' || !val.trim()) return 'Choose a location slug';
  if (!locationSlugSet.has(val.trim())) {
    return `Use an existing location slug such as ${locationExamples}.`;
  }
  return true;
}

function validateEndDate(val, { siblingData } = {}) {
  if (val == null || val === '') return true;
  if (!siblingData?.startsAt) return true;

  const start = new Date(siblingData.startsAt).getTime();
  const end = new Date(val).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return true;
  if (end <= start) return 'End date must be after the start date';
  return true;
}

export const AnnouncementBanners = {
  slug: 'announcement-banners',
  labels: {
    singular: 'Announcement Banner',
    plural: 'Announcement Banners',
  },
  admin: {
    group: 'Site Surfaces',
    useAsTitle: 'title',
    defaultColumns: ['title', 'message', 'published', 'priority', 'targetScope', 'startsAt', 'endsAt', 'updatedAt'],
    description:
      'Text-only top banner messages. Publish in CMS to approve; the public site shows the winning active banner after the next approved deploy.',
  },
  access: {
    admin: canManageAnnouncementBanners,
    read: ({ req }) => (canManageAnnouncementBanners({ req }) ? true : { published: { equals: true } }),
    create: canManageAnnouncementBanners,
    update: canManageAnnouncementBanners,
    delete: canManageAnnouncementBanners,
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
          admin: { description: 'Internal label for editors. This is not shown on the public site.' },
        },
        {
          name: 'priority',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Higher priority wins when multiple banners are active. Matching priorities use the newest start date.',
          },
        },
      ],
    },
    {
      name: 'message',
      type: 'text',
      required: true,
      maxLength: 180,
      admin: {
        description: 'Text-only banner message. Keep it short enough to scan in the moving top banner.',
      },
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
      type: 'row',
      fields: [
        {
          name: 'startsAt',
          type: 'date',
          label: 'Start date',
          admin: {
            date: { pickerAppearance: 'dayAndTime' },
            description: 'Optional. Leave empty to make the banner eligible immediately after deploy.',
          },
        },
        {
          name: 'endsAt',
          type: 'date',
          label: 'End date',
          admin: {
            date: { pickerAppearance: 'dayAndTime' },
            description: 'Optional. Leave empty for no scheduled end.',
          },
          validate: validateEndDate,
        },
      ],
    },
    {
      name: 'targetScope',
      type: 'select',
      defaultValue: 'global',
      required: true,
      label: 'Targeting',
      options: bannerTargetScopeOptions,
      admin: {
        description: 'Use all visitors unless this announcement is specific to a region or location page.',
      },
    },
    {
      name: 'targetRegions',
      type: 'array',
      labels: { singular: 'Target region', plural: 'Target regions' },
      admin: {
        condition: (_, siblingData) => siblingData?.targetScope === 'regions',
        description: 'The banner is eligible only on pages associated with these regions.',
      },
      fields: [
        {
          name: 'region',
          type: 'select',
          required: true,
          options: bannerRegionOptions,
        },
      ],
    },
    {
      name: 'targetLocations',
      type: 'array',
      labels: { singular: 'Target location', plural: 'Target locations' },
      admin: {
        condition: (_, siblingData) => siblingData?.targetScope === 'locations',
        description: `The banner is eligible only on these location pages. Examples: ${locationExamples}.`,
      },
      fields: [
        {
          name: 'locationSlug',
          type: 'text',
          required: true,
          label: 'Location slug',
          validate: validateLocationSlug,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'linkLabel',
          type: 'text',
          maxLength: 80,
          admin: { description: 'Optional text link label. Example: Learn more.' },
        },
        {
          name: 'linkUrl',
          type: 'text',
          maxLength: 2048,
          admin: { description: 'Optional clean internal path or credential-free https URL.' },
          validate: validateInternalOrHttpsUrl,
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      ({ doc, previousDoc }) => {
        const pub = Boolean(doc?.published);
        const wasPub = Boolean(previousDoc?.published);
        if (pub || wasPub) triggerPagesDeploy('announcement-banner-change');
      },
    ],
    afterDelete: [
      ({ doc }) => {
        if (Boolean(doc?.published)) triggerPagesDeploy('announcement-banner-delete');
      },
    ],
  },
};
