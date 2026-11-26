export const HOLIDAY_HOURS_VA_IL_SNAPSHOT = {
  // Holiday hours for Manassas, Mount Prospect and Orland Park, sent by the
  // venue operator on 26 November 2026. Closed days keep a label but no times.
  locations: ['manassas', 'mount-prospect', 'orland-park'],
  idPrefix: '20261126-holiday',
  specialHours: [
    { date: '2026-11-26', name: 'Thanksgiving, Nov 26', open: null, close: null, label: 'Closed' },
    { date: '2026-11-27', name: 'Black Friday, Nov 27', open: '11:00', close: '00:00', label: '11am - Midnight' },
    { date: '2026-12-21', name: 'Mon, Dec 21', open: '11:00', close: '21:00', label: '11am - 9pm' },
    { date: '2026-12-22', name: 'Tue, Dec 22', open: '11:00', close: '21:00', label: '11am - 9pm' },
    { date: '2026-12-23', name: 'Wed, Dec 23', open: '11:00', close: '21:00', label: '11am - 9pm' },
    { date: '2026-12-24', name: 'Christmas Eve, Dec 24', open: '11:00', close: '20:00', label: '11am - 8pm' },
    { date: '2026-12-25', name: 'Christmas Day, Dec 25', open: '12:00', close: '00:00', label: '12pm - Midnight' },
    { date: '2026-12-28', name: 'Mon, Dec 28', open: '11:00', close: '21:00', label: '11am - 9pm' },
    { date: '2026-12-29', name: 'Tue, Dec 29', open: '11:00', close: '21:00', label: '11am - 9pm' },
    { date: '2026-12-30', name: 'Wed, Dec 30', open: '11:00', close: '21:00', label: '11am - 9pm' },
    { date: '2026-12-31', name: "New Year's Eve, Dec 31", open: '11:00', close: '20:00', label: '11am - 8pm' },
    { date: '2027-01-01', name: "New Year's Day, Jan 1", open: '11:00', close: '00:00', label: '11am - Midnight' },
    { date: '2027-01-04', name: 'Mon, Jan 4', open: '11:00', close: '21:00', label: '11am - 9pm' },
    { date: '2027-01-05', name: 'Tue, Jan 5', open: '11:00', close: '21:00', label: '11am - 9pm' },
    { date: '2027-01-06', name: 'Wed, Jan 6', open: '11:00', close: '21:00', label: '11am - 9pm' },
  ],
} as const;
