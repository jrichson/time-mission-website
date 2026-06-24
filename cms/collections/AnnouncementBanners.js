import { isAdminOrEditor } from './Users.js';
import { markCmsDeployNeeded } from '../lib/cms-deploy-gate.js';

const bannerTargetScopeOptions = [
  { label: 'All visitors', value: 'global' },
  { label: 'Regions', value: 'regions' },
  { label: 'Locations', value: 'locations' },
];
const bannerRegionOptions = [
  { label: 'United States', value: 'us' },
  { label: 'Europe', value: 'europe' },
];
const bannerLocationOptions = [
  { label: 'Time Mission Antwerp', value: 'antwerp' },
  { label: 'Time Mission Brussels', value: 'brussels' },
  { label: 'Time Mission Dallas', value: 'dallas' },
  { label: 'Time Mission Eindhoven', value: 'eindhoven' },
  { label: 'Time Mission Houston', value: 'houston' },
  { label: 'Time Mission Lincoln', value: 'lincoln' },
  { label: 'Time Mission Manassas', value: 'manassas' },
  { label: 'Time Mission Mount Prospect', value: 'mount-prospect' },
  { label: 'Time Mission Nashville', value: 'nashville' },
  { label: 'Time Mission Orland Park', value: 'orland-park' },
  { label: 'Time Mission Philadelphia', value: 'philadelphia' },
  { label: 'Time Mission West Nyack', value: 'west-nyack' },
];
const bannerTickerBehaviorOptions = [
  { label: 'Auto', value: 'auto' },
  { label: 'Static centered', value: 'static' },
  { label: 'Animated scrolling', value: 'animated' },
];

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
    defaultColumns: ['title', 'message', 'tickerBehavior', 'published', 'priority', 'targetScope', 'startsAt', 'endsAt', 'updatedAt'],
    description:
      'Text-only top banner messages. Publish in CMS to approve; the public site shows the winning active banner after the next approved deploy. Seeded Current ticker rows are low-priority fallbacks; editor-created banners override them with a higher priority.',
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
            description: 'Higher priority wins when multiple banners are active. Matching priorities use the newest start date. Seeded fallback tickers use -100.',
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
      name: 'tickerBehavior',
      type: 'select',
      defaultValue: 'auto',
      required: true,
      label: 'Ticker behavior',
      options: bannerTickerBehaviorOptions,
      admin: {
        description:
          'Auto keeps short plain messages centered and animates longer messages. Use Static centered or Animated scrolling to force the behavior.',
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
        description: 'The banner is eligible only on these location pages.',
      },
      fields: [
        {
          name: 'locationSlug',
          type: 'select',
          required: true,
          label: 'Location slug',
          options: bannerLocationOptions,
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
      ({ doc, previousDoc, req }) =>
        markCmsDeployNeeded({ action: 'change', collection: 'announcement-banners', doc, previousDoc, req }),
    ],
    afterDelete: [
      ({ doc, req }) => markCmsDeployNeeded({ action: 'delete', collection: 'announcement-banners', doc, req }),
    ],
  },
};
