export const EU_LOCATION_OPERATIONAL_SNAPSHOT = [
  {
    slug: 'antwerp',
    hours: {
      mon: { open: '16:00', close: '22:00', label: '16:00 - 22:00' },
      tue: { open: '16:00', close: '22:00', label: '16:00 - 22:00' },
      wed: { open: '14:00', close: '23:00', label: '14:00 - 23:00' },
      thu: { open: '16:00', close: '22:00', label: '16:00 - 22:00' },
      fri: { open: '16:00', close: '00:00', label: '16:00 - 00:00' },
      sat: { open: '11:00', close: '00:00', label: '11:00 - 00:00' },
      sun: { open: '11:00', close: '23:00', label: '11:00 - 23:00' },
    },
  },
  {
    slug: 'brussels',
    hours: {
      mon: { open: '12:00', close: '18:00', label: '12:00 - 18:00' },
      tue: { open: '12:00', close: '18:00', label: '12:00 - 18:00' },
      wed: { open: '12:00', close: '20:00', label: '12:00 - 20:00' },
      thu: { open: '12:00', close: '20:00', label: '12:00 - 20:00' },
      fri: { open: '12:00', close: '22:00', label: '12:00 - 22:00' },
      sat: { open: '10:00', close: '22:00', label: '10:00 - 22:00' },
      sun: { open: '10:00', close: '20:00', label: '10:00 - 20:00' },
    },
    externalLinks: {
      bookingUrl: 'https://ecom.roller.app/terminal1/timemission/nl/products',
      rollerCheckoutUrl: 'https://ecom.roller.app/terminal1/timemission/nl/products',
    },
  },
] as const;
