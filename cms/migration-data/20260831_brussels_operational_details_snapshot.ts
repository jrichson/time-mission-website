const inquiryFormUrl = 'https://forms.roller.app/#/terminal1/4fc51060f1c8424/form';

export const BRUSSELS_OPERATIONAL_DETAILS_SNAPSHOT = {
  slug: 'brussels',
  hours: {
    mon: { open: null, close: null, label: 'Closed' },
    tue: { open: null, close: null, label: 'Closed' },
    wed: { open: '14:00', close: '20:00', label: '14:00 – 20:00' },
    thu: { open: '16:00', close: '23:00', label: '16:00 – 23:00' },
    fri: { open: '16:00', close: '23:00', label: '16:00 – 23:00' },
    sat: { open: '12:00', close: '23:00', label: '12:00 – 23:00' },
    sun: { open: '10:00', close: '20:00', label: '10:00 – 20:00' },
  },
  previousHours: {
    mon: { open: '12:00', close: '18:00', label: '12:00 - 18:00' },
    tue: { open: '12:00', close: '18:00', label: '12:00 - 18:00' },
    wed: { open: '12:00', close: '20:00', label: '12:00 - 20:00' },
    thu: { open: '12:00', close: '20:00', label: '12:00 - 20:00' },
    fri: { open: '12:00', close: '22:00', label: '12:00 - 22:00' },
    sat: { open: '10:00', close: '22:00', label: '10:00 - 22:00' },
    sun: { open: '10:00', close: '20:00', label: '10:00 - 20:00' },
  },
  groupFormUrls: {
    default: inquiryFormUrl,
    birthdays: inquiryFormUrl,
    corporate: inquiryFormUrl,
    'field-trips': inquiryFormUrl,
    'bachelor-ette': inquiryFormUrl,
    'private-events': inquiryFormUrl,
    holidays: inquiryFormUrl,
  },
} as const;
