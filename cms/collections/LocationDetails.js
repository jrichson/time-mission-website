import { isAdminOrEditor } from './Users.js';
import { markCmsDeployNeeded } from '../lib/cms-deploy-gate.js';
import { LOCATION_DETAIL_OPTIONS, LOCATION_HOUR_DAYS } from '../lib/location-details-options.js';

const TIME_24_HOUR_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isCmsAdmin(user) {
  return user?.collection === 'users' && user?.role === 'admin';
}

function canManageLocationDetails({ req: { user } }) {
  if (!user || user.collection !== 'users') return false;

  return isAdminOrEditor(user);
}

function canCreateOrDeleteLocationDetails({ req: { user } }) {
  return isCmsAdmin(user);
}

function validateOptionalTime(value) {
  if (value == null || value === '') return true;
  if (typeof value !== 'string') return 'Use 24-hour HH:mm, for example 09:00 or 23:30.';

  return TIME_24_HOUR_PATTERN.test(value.trim()) || 'Use 24-hour HH:mm, for example 09:00 or 23:30.';
}

function validateHoursLabel(value, { siblingData } = {}) {
  const label = typeof value === 'string' ? value.trim() : '';
  const hasTime = Boolean(String(siblingData?.open ?? '').trim() || String(siblingData?.close ?? '').trim());
  if (hasTime && !label) return 'Add display text when open or close times are set.';

  return true;
}

function dayHoursField(day) {
  return {
    name: day.name,
    type: 'group',
    label: day.label,
    admin: {
      description: 'Display text is public. Open and close times use 24-hour HH:mm for open-now calculations.',
    },
    fields: [
      {
        name: 'label',
        type: 'text',
        maxLength: 80,
        admin: {
          description: 'Public display text. Examples: 12pm - 9pm, Temporarily closed, or Closed.',
        },
        validate: validateHoursLabel,
      },
      {
        type: 'row',
        fields: [
          {
            name: 'open',
            type: 'text',
            maxLength: 5,
            admin: { description: 'Optional 24-hour opening time, such as 12:00.' },
            validate: validateOptionalTime,
          },
          {
            name: 'close',
            type: 'text',
            maxLength: 5,
            admin: { description: 'Optional 24-hour closing time, such as 21:00 or 00:00.' },
            validate: validateOptionalTime,
          },
        ],
      },
    ],
  };
}

export const LocationDetails = {
  slug: 'location-details',
  labels: {
    singular: 'Location Detail',
    plural: 'Location Details',
  },
  admin: {
    group: 'Site Surfaces',
    useAsTitle: 'title',
    defaultColumns: ['title', 'locationSlug', 'published', 'updatedAt'],
    description:
      'Address and hours for existing code-owned locations only. This does not create new public pages or change booking settings.',
  },
  access: {
    admin: canManageLocationDetails,
    read: ({ req }) => (canManageLocationDetails({ req }) ? true : { published: { equals: true } }),
    create: canCreateOrDeleteLocationDetails,
    update: canManageLocationDetails,
    delete: canCreateOrDeleteLocationDetails,
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
          name: 'locationSlug',
          type: 'select',
          required: true,
          unique: true,
          label: 'Existing location',
          options: LOCATION_DETAIL_OPTIONS,
          access: {
            update: ({ req: { user } }) => isCmsAdmin(user),
          },
          admin: {
            description:
              'Maps this address and hours to an existing code-owned location. It does not create a new location page.',
          },
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
          'Published in CMS means approved. Address and hours are Live after deploy when the static public site rebuilds.',
      },
    },
    {
      name: 'address',
      type: 'group',
      label: 'Address',
      admin: {
        description:
          'Public address text for the existing location. The directions link is generated from this address; booking URLs and contact settings stay code-owned.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'line1',
              type: 'text',
              maxLength: 160,
              label: 'Address line 1',
            },
            {
              name: 'line2',
              type: 'text',
              maxLength: 120,
              label: 'Address line 2',
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'city',
              type: 'text',
              required: true,
              maxLength: 120,
            },
            {
              name: 'state',
              type: 'text',
              maxLength: 80,
              label: 'State / province',
            },
            {
              name: 'zip',
              type: 'text',
              maxLength: 32,
              label: 'ZIP / postal code',
            },
            {
              name: 'country',
              type: 'text',
              required: true,
              maxLength: 80,
            },
          ],
        },
      ],
    },
    {
      name: 'hours',
      type: 'group',
      label: 'Hours',
      admin: {
        description:
          'Public hours display for each day. Leave a day blank only when that location does not have public hours yet.',
      },
      fields: LOCATION_HOUR_DAYS.map(dayHoursField),
    },
  ],
  hooks: {
    afterChange: [
      ({ doc, previousDoc, req }) =>
        markCmsDeployNeeded({ action: 'change', collection: 'location-details', doc, previousDoc, req }),
    ],
    afterDelete: [
      ({ doc, req }) => markCmsDeployNeeded({ action: 'delete', collection: 'location-details', doc, req }),
    ],
  },
};
