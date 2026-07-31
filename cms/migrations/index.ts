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
import * as migration_20260605_160000_location_details_external_links from './20260605_160000_location_details_external_links';
import * as migration_20260610_090000_orland_park_open from './20260610_090000_orland_park_open';
import * as migration_20260617_090000_location_details_hidden_missions from './20260617_090000_location_details_hidden_missions';
import * as migration_20260622_090000_brussels_open from './20260622_090000_brussels_open';
import * as migration_20260624_085000_add_eindhoven_location_enum from './20260624_085000_add_eindhoven_location_enum';
import * as migration_20260624_090000_blog_press_donation_eindhoven from './20260624_090000_blog_press_donation_eindhoven';
import * as migration_20260624_101500_seed_current_announcement_banners from './20260624_101500_seed_current_announcement_banners';
import * as migration_20260624_120000_orland_park_weekend_hours from './20260624_120000_orland_park_weekend_hours';
import * as migration_20260625_090000_blog_posts_rich_text from './20260625_090000_blog_posts_rich_text';
import * as migration_20260723_090000_philadelphia_reopening from './20260723_090000_philadelphia_reopening';
import * as migration_20260723_100000_add_boston_location_enums from './20260723_100000_add_boston_location_enums';
import * as migration_20260723_101000_seed_boston_location from './20260723_101000_seed_boston_location';
import * as migration_20260727_090000_philadelphia_opening_promotion from './20260727_090000_philadelphia_opening_promotion';
import * as migration_20260730_090000_add_edison_location_enums from './20260730_090000_add_edison_location_enums';
import * as migration_20260730_091000_seed_edison_and_philadelphia_group_form from './20260730_091000_seed_edison_and_philadelphia_group_form';
import * as migration_20260730_151000_sync_live_site_to_cms from './20260730_151000_sync_live_site_to_cms';
import * as migration_20260730_170000_blog_authoring_and_media from './20260730_170000_blog_authoring_and_media';

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
  {
    up: migration_20260605_160000_location_details_external_links.up,
    down: migration_20260605_160000_location_details_external_links.down,
    name: '20260605_160000_location_details_external_links'
  },
  {
    up: migration_20260610_090000_orland_park_open.up,
    down: migration_20260610_090000_orland_park_open.down,
    name: '20260610_090000_orland_park_open'
  },
  {
    up: migration_20260617_090000_location_details_hidden_missions.up,
    down: migration_20260617_090000_location_details_hidden_missions.down,
    name: '20260617_090000_location_details_hidden_missions'
  },
  {
    up: migration_20260622_090000_brussels_open.up,
    down: migration_20260622_090000_brussels_open.down,
    name: '20260622_090000_brussels_open'
  },
  {
    up: migration_20260624_085000_add_eindhoven_location_enum.up,
    down: migration_20260624_085000_add_eindhoven_location_enum.down,
    name: '20260624_085000_add_eindhoven_location_enum'
  },
  {
    up: migration_20260624_090000_blog_press_donation_eindhoven.up,
    down: migration_20260624_090000_blog_press_donation_eindhoven.down,
    name: '20260624_090000_blog_press_donation_eindhoven'
  },
  {
    up: migration_20260624_101500_seed_current_announcement_banners.up,
    down: migration_20260624_101500_seed_current_announcement_banners.down,
    name: '20260624_101500_seed_current_announcement_banners'
  },
  {
    up: migration_20260624_120000_orland_park_weekend_hours.up,
    down: migration_20260624_120000_orland_park_weekend_hours.down,
    name: '20260624_120000_orland_park_weekend_hours'
  },
  {
    up: migration_20260625_090000_blog_posts_rich_text.up,
    down: migration_20260625_090000_blog_posts_rich_text.down,
    name: '20260625_090000_blog_posts_rich_text'
  },
  {
    up: migration_20260723_090000_philadelphia_reopening.up,
    down: migration_20260723_090000_philadelphia_reopening.down,
    name: '20260723_090000_philadelphia_reopening'
  },
  {
    up: migration_20260723_100000_add_boston_location_enums.up,
    down: migration_20260723_100000_add_boston_location_enums.down,
    name: '20260723_100000_add_boston_location_enums'
  },
  {
    up: migration_20260723_101000_seed_boston_location.up,
    down: migration_20260723_101000_seed_boston_location.down,
    name: '20260723_101000_seed_boston_location'
  },
  {
    up: migration_20260727_090000_philadelphia_opening_promotion.up,
    down: migration_20260727_090000_philadelphia_opening_promotion.down,
    name: '20260727_090000_philadelphia_opening_promotion'
  },
  {
    up: migration_20260730_090000_add_edison_location_enums.up,
    down: migration_20260730_090000_add_edison_location_enums.down,
    name: '20260730_090000_add_edison_location_enums'
  },
  {
    up: migration_20260730_091000_seed_edison_and_philadelphia_group_form.up,
    down: migration_20260730_091000_seed_edison_and_philadelphia_group_form.down,
    name: '20260730_091000_seed_edison_and_philadelphia_group_form'
  },
  {
    up: migration_20260730_151000_sync_live_site_to_cms.up,
    down: migration_20260730_151000_sync_live_site_to_cms.down,
    name: '20260730_151000_sync_live_site_to_cms'
  },
  {
    up: migration_20260730_170000_blog_authoring_and_media.up,
    down: migration_20260730_170000_blog_authoring_and_media.down,
    name: '20260730_170000_blog_authoring_and_media'
  },
];
