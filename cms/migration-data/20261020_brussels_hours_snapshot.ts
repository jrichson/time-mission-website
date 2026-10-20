export const BRUSSELS_HOURS_SNAPSHOT = {
  slug: 'brussels',
  // Venue hours supplied by the Brussels team (20 October 2026).
  hours: {
    mon: { open: '12:00', close: '20:00', label: '12:00 – 20:00' },
    tue: { open: '12:00', close: '20:00', label: '12:00 – 20:00' },
    wed: { open: '12:00', close: '20:00', label: '12:00 – 20:00' },
    thu: { open: '14:00', close: '23:00', label: '14:00 – 23:00' },
    fri: { open: '14:00', close: '23:00', label: '14:00 – 23:00' },
    sat: { open: '12:00', close: '23:00', label: '12:00 – 23:00' },
    sun: { open: '10:00', close: '20:00', label: '10:00 – 20:00' },
  },
} as const;
