const groupFormUrlsFor = (slug: 'houston' | 'philadelphia') => ({
  default: `/groups/inquire/${slug}/default`,
  birthdays: `/groups/inquire/${slug}/birthdays`,
  corporate: `/groups/inquire/${slug}/corporate`,
  'field-trips': `/groups/inquire/${slug}/field-trips`,
  'bachelor-ette': `/groups/inquire/${slug}/bachelor-ette`,
  'private-events': `/groups/inquire/${slug}/private-events`,
  holidays: `/groups/inquire/${slug}/holidays`,
});

export const HOUSTON_PHILADELPHIA_JOTFORM_ROUTES_SNAPSHOT = [
  {
    slug: 'houston',
    groupFormUrls: groupFormUrlsFor('houston'),
    previousGroupFormUrl: 'https://forms.roller.app/#/timemissionhouston/bc80621a90b3417/form',
  },
  {
    slug: 'philadelphia',
    groupFormUrls: groupFormUrlsFor('philadelphia'),
    previousGroupFormUrl: 'https://forms.roller.app/#/timemissionphiladelphiapa/1446ba8be6094ad/form',
  },
] as const;
