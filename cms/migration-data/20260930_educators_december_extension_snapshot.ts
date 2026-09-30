const EDUCATOR_LOCATIONS = [
  ['houston', 'Houston'],
  ['philadelphia', 'Philadelphia'],
  ['manassas', 'Manassas'],
  ['mount-prospect', 'Mount Prospect'],
  ['orland-park', 'Orland Park'],
] as const;

export const EDUCATORS_DECEMBER_EXTENSION_PAGE_SNAPSHOT = EDUCATOR_LOCATIONS.map(([slug, name]) => ({
  path: `/${slug}/educators`,
  title: `Educators Free Through December 31 | Time Mission ${name}`,
  metaTitle: `Educators Free Through December 31 | Time Mission ${name}`,
  metaDescription: `${name} K-12 educators, administrators, and school staff can claim one free mission at Time Mission ${name} through December 31, 2026.`,
}));

export const RETIRED_SCHOOL_NIGHT_PATHS = [
  '/houston/school-night',
  '/manassas/school-night',
  '/mount-prospect/school-night',
  '/orland-park/school-night',
] as const;
