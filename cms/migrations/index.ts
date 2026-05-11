import * as migration_20260508_181551_initial_schema from './20260508_181551_initial_schema';
import * as migration_20260508_193500_site_pages from './20260508_193500_site_pages';
import * as migration_20260508_201500_seed_site_pages from './20260508_201500_seed_site_pages';
import * as migration_20260508_213000_landing_templates from './20260508_213000_landing_templates';
import * as migration_20260508_230000_user_invites from './20260508_230000_user_invites';
import * as migration_20260511_190000_landing_archetype_fields from './20260511_190000_landing_archetype_fields';

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
  {
    up: migration_20260508_201500_seed_site_pages.up,
    down: migration_20260508_201500_seed_site_pages.down,
    name: '20260508_201500_seed_site_pages'
  },
  {
    up: migration_20260508_213000_landing_templates.up,
    down: migration_20260508_213000_landing_templates.down,
    name: '20260508_213000_landing_templates'
  },
  {
    up: migration_20260508_230000_user_invites.up,
    down: migration_20260508_230000_user_invites.down,
    name: '20260508_230000_user_invites'
  },
  {
    up: migration_20260511_190000_landing_archetype_fields.up,
    down: migration_20260511_190000_landing_archetype_fields.down,
    name: '20260511_190000_landing_archetype_fields'
  },
];
