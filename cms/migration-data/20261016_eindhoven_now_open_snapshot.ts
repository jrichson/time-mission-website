export const EINDHOVEN_NOW_OPEN_SNAPSHOT = {
  slug: 'eindhoven',
  ticker: 'EINDHOVEN NOW OPEN!',
  previousTicker: 'OPENING 16 OCTOBER',
  hours: {
    mon: { open: '14:00', close: '22:00', label: '14:00 – 22:00' },
    tue: { open: '14:00', close: '22:00', label: '14:00 – 22:00' },
    wed: { open: '12:00', close: '22:00', label: '12:00 – 22:00' },
    thu: { open: '14:00', close: '22:00', label: '14:00 – 22:00' },
    fri: { open: '12:00', close: '23:00', label: '12:00 – 23:00' },
    sat: { open: '12:00', close: '23:00', label: '12:00 – 23:00' },
    sun: { open: '12:00', close: '22:00', label: '12:00 – 22:00' },
  },
  page: {
    path: '/eindhoven',
    title: 'Time Mission Eindhoven | Now Open!',
    metaTitle: 'Time Mission Eindhoven | Now Open!',
    metaDescription: 'Time Mission Eindhoven is now open at Hermanus Boexstraat 4, 5611 AJ Eindhoven, the first Time Mission location in the Netherlands. Book your mission now.',
  },
  previousPage: {
    title: 'Time Mission Eindhoven | Opens 16th October',
    metaTitle: 'Time Mission Eindhoven | Opens 16th October',
    metaDescription: 'Time Mission Eindhoven opens 16 October at Hermanus Boexstraat 4, 5611 AJ Eindhoven, the first Time Mission location in the Netherlands. Book your mission now.',
  },
} as const;
