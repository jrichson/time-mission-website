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
  { label: 'Time Mission Boston', value: 'boston' },
  { label: 'Time Mission Brussels', value: 'brussels' },
  { label: 'Time Mission Dallas', value: 'dallas' },
  { label: 'Time Mission Edison', value: 'edison' },
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
  { label: 'Automatic (recommended)', value: 'auto' },
  { label: 'Keep centered', value: 'static' },
  { label: 'Scroll across the screen', value: 'animated' },
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
    singular: 'Website Announcement',
    plural: 'Website Announcements',
  },
  admin: {
    group: 'Website Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'message', 'published', 'targetScope', 'updatedAt'],
    components: {
      beforeList: ['/components/AdminCollectionGuides.tsx#AnnouncementBannersGuide'],
    },
    description:
      'Short messages shown in the ticker at the top of the public website.',
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
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 120,
      admin: { description: 'Editor label only. Visitors will not see this title.' },
    },
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
      type: 'tabs',
      tabs: [
        {
          label: 'Message',
          description: 'Write the public message and choose how it moves.',
          fields: [
            {
              name: 'message',
              type: 'text',
              required: true,
              maxLength: 180,
              admin: {
                description: 'Public message. Keep it short enough to read at a glance.',
              },
            },
            {
              name: 'tickerBehavior',
              type: 'select',
              defaultValue: 'auto',
              required: true,
              label: 'Movement',
              options: bannerTickerBehaviorOptions,
              admin: {
                description:
                  'Automatic keeps short messages centered and scrolls longer messages.',
              },
            },
          ],
        },
        {
          label: 'Audience & schedule',
          description: 'Choose who sees the announcement and when it is eligible to appear.',
          fields: [
            {
              name: 'targetScope',
              type: 'select',
              defaultValue: 'global',
              required: true,
              label: 'Who should see it?',
              options: bannerTargetScopeOptions,
              admin: {
                components: {
                  Cell: '/components/AdminListCells.tsx#AnnouncementAudienceCell',
                },
                description: 'Use All visitors unless this message is specific to a region or location.',
              },
            },
            {
              name: 'targetRegions',
              type: 'array',
              labels: { singular: 'Target region', plural: 'Target regions' },
              admin: {
                condition: (_, siblingData) => siblingData?.targetScope === 'regions',
                description: 'The announcement appears only on pages for these regions.',
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
                description: 'The announcement appears only on these location pages.',
              },
              fields: [
                {
                  name: 'locationSlug',
                  type: 'select',
                  required: true,
                  label: 'Location',
                  options: bannerLocationOptions,
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'startsAt',
                  type: 'date',
                  label: 'Starts',
                  admin: {
                    date: { pickerAppearance: 'dayAndTime' },
                    description: 'Optional. Leave empty to start as soon as the site is deployed.',
                  },
                },
                {
                  name: 'endsAt',
                  type: 'date',
                  label: 'Ends',
                  admin: {
                    date: { pickerAppearance: 'dayAndTime' },
                    description: 'Optional. Leave empty for no scheduled end.',
                  },
                  validate: validateEndDate,
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
                  label: 'Link text',
                  admin: { description: 'Optional. Example: Learn more.' },
                },
                {
                  name: 'linkUrl',
                  type: 'text',
                  maxLength: 2048,
                  label: 'Link destination',
                  admin: { description: 'Optional. Use a website path or secure https URL.' },
                  validate: validateInternalOrHttpsUrl,
                },
              ],
            },
          ],
        },
        {
          label: 'Advanced',
          description: 'Most announcements should keep the default priority.',
          fields: [
            {
              name: 'priority',
              type: 'number',
              defaultValue: 0,
              label: 'Display priority',
              admin: {
                description:
                  'Higher numbers win when more than one announcement is active. Keep 0 unless an announcement must override another.',
              },
            },
          ],
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
