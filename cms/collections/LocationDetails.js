import { isAdminOrEditor } from './Users.js';
import { markCmsDeployNeeded } from '../lib/cms-deploy-gate.js';
import { LOCATION_DETAIL_OPTIONS, LOCATION_HOUR_DAYS, LOCATION_MISSION_OPTIONS } from '../lib/location-details-options.js';

const TIME_24_HOUR_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const GROUP_FORM_KEY_PATTERN = /^[a-z0-9-]+$/;
const INTERNAL_PUBLIC_PATH_PATTERN = /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;

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

function validateOptionalHttpsUrl(value) {
  if (value == null || value === '') return true;
  if (typeof value !== 'string') return 'Use a credential-free https:// URL.';

  const cleaned = value.trim();
  if (!cleaned) return true;
  if (cleaned.length > 2048 || /[<>"'\\\s]/.test(cleaned)) return 'Use a credential-free https:// URL.';

  let url;
  try {
    url = new URL(cleaned);
  } catch {
    return 'Use a credential-free https:// URL.';
  }

  if (url.protocol !== 'https:') return 'External links must use https://.';
  if (url.username || url.password) return 'External links must not include credentials.';

  return true;
}

function validateRequiredGroupFormUrl(value) {
  if (value == null || String(value).trim() === '') {
    return 'Add a same-site /path or credential-free https:// URL.';
  }

  const cleaned = String(value).trim();
  if (INTERNAL_PUBLIC_PATH_PATTERN.test(cleaned)) return true;

  const result = validateOptionalHttpsUrl(cleaned);
  return result === true ? true : 'Use a same-site /path or credential-free https:// URL.';
}

function validateGroupFormKey(value) {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  if (!cleaned) return 'Add the group form key, such as default or bachelor-ette.';

  return GROUP_FORM_KEY_PATTERN.test(cleaned) || 'Use lowercase kebab-case, such as bachelor-ette.';
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
    singular: 'Location',
    plural: 'Locations',
  },
  admin: {
    group: 'Website Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'locationSlug', 'published', 'updatedAt'],
    components: {
      beforeList: ['/components/AdminCollectionGuides.tsx#LocationDetailsGuide'],
    },
    description:
      'Public address, hours, booking links, and mission availability for existing locations.',
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
          admin: { description: 'Editor label only. Visitors will not see this title.' },
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
              'The public location this information belongs to. Only an administrator can change it.',
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
        components: {
          Cell: '/components/AdminListCells.tsx#PublishedStatusCell',
        },
        description:
          'Published in CMS means approved. Address and hours are Live after deploy when the static public site rebuilds.',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Address',
          description: 'Update the public address. The directions link is created from these fields.',
          fields: [
            {
              name: 'address',
              type: 'group',
              label: 'Public address',
              admin: {
                description: 'Booking and inquiry destinations are under the Booking & forms tab.',
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
          ],
        },
        {
          label: 'Hours',
          description: 'Update the text visitors see for each day.',
          fields: [
            {
              name: 'hours',
              type: 'group',
              label: 'Public hours',
              admin: {
                description:
                  'Leave a day blank only when this location does not have public hours yet.',
              },
              fields: LOCATION_HOUR_DAYS.map(dayHoursField),
            },
          ],
        },
        {
          label: 'Booking & forms',
          description: 'Administrative settings for public booking, gift card, waiver, and group inquiry links.',
          fields: [
            {
              name: 'externalLinks',
              type: 'group',
              label: 'Booking and visitor links',
              access: {
                update: ({ req: { user } }) => isCmsAdmin(user),
              },
              admin: {
                description: 'Only administrators can change these destinations.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'bookingUrl',
                      type: 'text',
                      maxLength: 2048,
                      label: 'Ticket booking URL',
                      admin: {
                        description:
                          'Primary ticket checkout. For Roller locations, this is also used when the Roller override is blank.',
                      },
                      validate: validateOptionalHttpsUrl,
                    },
                    {
                      name: 'rollerCheckoutUrl',
                      type: 'text',
                      maxLength: 2048,
                      label: 'Roller checkout override',
                      admin: {
                        description: 'Optional. Leave blank when it should match the ticket booking URL.',
                      },
                      validate: validateOptionalHttpsUrl,
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'giftCardUrl',
                      type: 'text',
                      maxLength: 2048,
                      label: 'Gift card URL',
                      validate: validateOptionalHttpsUrl,
                    },
                    {
                      name: 'waiverUrl',
                      type: 'text',
                      maxLength: 2048,
                      label: 'Waiver URL',
                      validate: validateOptionalHttpsUrl,
                    },
                  ],
                },
                {
                  name: 'externalUrl',
                  type: 'text',
                  maxLength: 2048,
                  label: 'External location page URL',
                  admin: {
                    description:
                      'Use only when this location sends visitors to another public website, such as timemission.eu.',
                  },
                  validate: validateOptionalHttpsUrl,
                },
              ],
            },
            {
              name: 'groupFormUrls',
              type: 'array',
              maxRows: 20,
              labels: { singular: 'Group inquiry destination', plural: 'Group inquiry destinations' },
              access: {
                update: ({ req: { user } }) => isCmsAdmin(user),
              },
              admin: {
                description:
                  'Only administrators can change these destinations. Use a group type such as default, birthdays, corporate, or field-trips.',
              },
              fields: [
                {
                  name: 'formKey',
                  type: 'text',
                  required: true,
                  maxLength: 80,
                  label: 'Group type',
                  admin: {
                    description: 'Lowercase words with hyphens, such as field-trips.',
                  },
                  validate: validateGroupFormKey,
                },
                {
                  name: 'url',
                  type: 'text',
                  required: true,
                  maxLength: 2048,
                  label: 'Form destination',
                  validate: validateRequiredGroupFormUrl,
                },
              ],
            },
          ],
        },
        {
          label: 'Mission availability',
          description: 'Hide mission portals that are not available at this location.',
          fields: [
            {
              name: 'hiddenMissionIds',
              type: 'array',
              maxRows: LOCATION_MISSION_OPTIONS.length,
              label: 'Unavailable missions',
              labels: { singular: 'Unavailable mission', plural: 'Unavailable missions' },
              admin: {
                description:
                  'Selected missions are hidden from this location after deploy. Leave empty to show every mission.',
              },
              fields: [
                {
                  name: 'missionId',
                  type: 'select',
                  required: true,
                  label: 'Mission',
                  options: LOCATION_MISSION_OPTIONS,
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
        markCmsDeployNeeded({ action: 'change', collection: 'location-details', doc, previousDoc, req }),
    ],
    afterDelete: [
      ({ doc, req }) => markCmsDeployNeeded({ action: 'delete', collection: 'location-details', doc, req }),
    ],
  },
};
