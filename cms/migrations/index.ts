import * as migration_20260508_181551_initial_schema from './20260508_181551_initial_schema';
import * as migration_20260508_193500_site_pages from './20260508_193500_site_pages';

export const migrations = [
  {
    up: migration_20260508_181551_initial_schema.up,
    down: migration_20260508_181551_initial_schema.down,
    name: '20260508_181551_initial_schema'
  },
  {
    up: migration_20260508_193500_site_pages.up,
    down: migration_20260508_193500_site_pages.down,
    name: '20260508_193500_site_pages'
  },
];
