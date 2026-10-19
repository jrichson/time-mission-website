export const EDISON_HOURS_SNAPSHOT = {
  slug: 'edison',
  // Venue hours from https://www.superchargednj.com/book-time-mission/ (19 October 2026).
  hours: {
    mon: { open: '11:00', close: '00:00', label: '11am - Midnight' },
    tue: { open: '11:00', close: '00:00', label: '11am - Midnight' },
    wed: { open: '11:00', close: '00:00', label: '11am - Midnight' },
    thu: { open: '11:00', close: '00:00', label: '11am - Midnight' },
    fri: { open: '11:00', close: '01:00', label: '11am - 1am' },
    sat: { open: '09:00', close: '01:00', label: '9am - 1am' },
    sun: { open: '09:00', close: '23:00', label: '9am - 11pm' },
  },
} as const;
