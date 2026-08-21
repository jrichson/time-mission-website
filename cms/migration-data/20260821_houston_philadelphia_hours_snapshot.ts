export const HOUSTON_PHILADELPHIA_HOURS_SNAPSHOT = {
  announcement: {
    title: 'Labor Day hours: Houston and Philadelphia',
    message: 'LABOR DAY HOURS: 10AM - 10PM',
    priority: 100,
    startsAt: '2026-08-21T00:00:00.000Z',
  },
  locations: [
    {
      slug: 'houston',
      label: 'Houston',
      announcementTargetId: '20260821-labor-day-hours-houston',
      announcementEndsAt: '2026-09-08T05:00:00.000Z',
    },
    {
      slug: 'philadelphia',
      label: 'Philadelphia',
      announcementTargetId: '20260821-labor-day-hours-philadelphia',
      announcementEndsAt: '2026-09-08T04:00:00.000Z',
    },
  ],
  specialHours: {
    date: '2026-09-07',
    name: 'Labor Day',
    open: '10:00',
    close: '22:00',
    label: '10am - 10pm',
  },
  previousWeekdayHours: {
    mon: { open: '10:00', close: '22:00', label: '10am - 10pm' },
    tue: { open: '10:00', close: '22:00', label: '10am - 10pm' },
    wed: { open: '10:00', close: '22:00', label: '10am - 10pm' },
    thu: { open: '10:00', close: '22:00', label: '10am - 10pm' },
    fri: { open: '10:00', close: '23:00', label: '10am - 11pm' },
  },
  weekdayHours: {
    mon: { open: '12:00', close: '22:00', label: '12pm - 10pm' },
    tue: { open: '12:00', close: '22:00', label: '12pm - 10pm' },
    wed: { open: '12:00', close: '22:00', label: '12pm - 10pm' },
    thu: { open: '12:00', close: '22:00', label: '12pm - 10pm' },
    fri: { open: '12:00', close: '23:00', label: '12pm - 11pm' },
  },
} as const;
