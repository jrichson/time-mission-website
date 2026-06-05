import * as migration_20260508_181551_initial_schema from './20260508_181551_initial_schema';
import * as migration_20260508_193500_site_pages from './20260508_193500_site_pages';
import * as migration_20260508_201500_seed_site_pages from './20260508_201500_seed_site_pages';
import * as migration_20260508_213000_landing_templates from './20260508_213000_landing_templates';
import * as migration_20260508_230000_user_invites from './20260508_230000_user_invites';
import * as migration_20260511_190000_landing_archetype_fields from './20260511_190000_landing_archetype_fields';
import * as migration_20260511_201500_landing_brief_fields from './20260511_201500_landing_brief_fields';
import * as migration_20260526_120000_cms_scope_and_announcements from './20260526_120000_cms_scope_and_announcements';
import * as migration_20260529_090000_location_details from './20260529_090000_location_details';
import * as migration_20260605_101500_announcement_banner_ticker_behavior from './20260605_101500_announcement_banner_ticker_behavior';
import * as migration_20260605_143000_sync_current_cms_content from './20260605_143000_sync_current_cms_content';

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
  {
    up: migration_20260511_201500_landing_brief_fields.up,
    down: migration_20260511_201500_landing_brief_fields.down,
    name: '20260511_201500_landing_brief_fields'
  },
  {
    up: migration_20260526_120000_cms_scope_and_announcements.up,
    down: migration_20260526_120000_cms_scope_and_announcements.down,
    name: '20260526_120000_cms_scope_and_announcements'
  },
  {
    up: migration_20260529_090000_location_details.up,
    down: migration_20260529_090000_location_details.down,
    name: '20260529_090000_location_details'
  },
  {
    up: migration_20260605_101500_announcement_banner_ticker_behavior.up,
    down: migration_20260605_101500_announcement_banner_ticker_behavior.down,
    name: '20260605_101500_announcement_banner_ticker_behavior'
  },
  {
    up: migration_20260605_143000_sync_current_cms_content.up,
    down: migration_20260605_143000_sync_current_cms_content.down,
    name: '20260605_143000_sync_current_cms_content'
  },
];
