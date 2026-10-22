export const BRUSSELS_LATE_NIGHT_SPECIAL_PAGE_SNAPSHOT = [
  {
    path: '/brussels/late-night-special',
    title: 'Late Night Special | Time Mission Brussels',
    metaTitle: 'Late Night Special | Time Mission Brussels',
    metaDescription: 'Every Thursday to Saturday from 6 PM, get 90 minutes across 25+ interactive mission rooms plus a robot-made cocktail for €31.99 per person.',
    robots: 'index,follow',
    ogImage: '/assets/photos/promos/brussels-late-night-1200.webp',
    twitterImage: '/assets/photos/promos/brussels-late-night-1200.webp',
  },
] as const;

// The evergreen Brussels ticker now promotes the Late Night Special and links to its page.
export const BRUSSELS_LATE_NIGHT_TICKER_SNAPSHOT = {
  slug: 'brussels',
  previousTicker: 'BRUSSELS NOW OPEN',
  ticker: 'LATE NIGHT SPECIAL 🍸 – THU - SAT',
  linkLabel: 'Learn more',
  linkUrl: '/brussels/late-night-special',
} as const;
