import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('CMS current content sync migration', () => {
  it('brings known stale CMS rows forward to current public content', () => {
    const migration = read('cms/migrations/20260605_143000_sync_current_cms_content.ts');
    const brusselsOpenMigration = read('cms/migrations/20260622_090000_brussels_open.ts');
    const currentTickerMigration = read('cms/migrations/20260624_101500_seed_current_announcement_banners.ts');
    const philadelphiaReopeningMigration = read('cms/migrations/20260723_090000_philadelphia_reopening.ts');
    const bostonEnumsMigration = read('cms/migrations/20260723_100000_add_boston_location_enums.ts');
    const bostonSeedMigration = read('cms/migrations/20260723_101000_seed_boston_location.ts');
    const migrationIndex = read('cms/migrations/index.ts');

    expect(migrationIndex).toContain('20260605_143000_sync_current_cms_content');
    expect(migrationIndex).toContain('20260622_090000_brussels_open');
    expect(migrationIndex).toContain('20260624_090000_blog_press_donation_eindhoven');
    expect(migrationIndex).toContain('20260624_101500_seed_current_announcement_banners');
    expect(migrationIndex).toContain('20260723_090000_philadelphia_reopening');
    expect(migrationIndex).toContain('20260723_100000_add_boston_location_enums');
    expect(migrationIndex).toContain('20260723_101000_seed_boston_location');
    expect(migration).toContain('"location_slug" = \'houston\'');
    expect(migration).toContain("'10am - 10pm'");
    expect(migration).toContain('Time Mission Houston – 25+ Interactive Mission Rooms');
    expect(migration).toContain('Time Mission Philadelphia | Temporarily Closed');
    expect(migration).toContain('Time Mission Orland Park | Opening June 11, 2026');
    expect(migration).toContain('Time Mission Brussels | Opening June 18, 2026');
    expect(migration).toContain("'HOUSTON NOW OPEN'");
    expect(migration).toContain("'static'::\"public\".\"enum_announcement_banners_ticker_behavior\"");
    expect(brusselsOpenMigration).toContain('Time Mission Brussels - 25+ Interactive Mission Rooms');
    expect(brusselsOpenMigration).toContain("'BRUSSELS NOW OPEN'");
    expect(currentTickerMigration).toContain("'locations'::\"public\".\"enum_announcement_banners_target_scope\"");
    expect(currentTickerMigration).toContain("'auto'::\"public\".\"enum_announcement_banners_ticker_behavior\"");
    expect(currentTickerMigration).toContain("'SUMMER ADVENTURES AT TIME MISSION MOUNT PROSPECT'");
    expect(currentTickerMigration).toContain("'BRUSSELS NOW OPEN'");
    expect(currentTickerMigration).toContain("'DALLAS COMING SOON'");
    expect(currentTickerMigration).toContain('"priority"');
    expect(currentTickerMigration).toContain('-100');
    expect(philadelphiaReopeningMigration).toContain('Time Mission Philadelphia – 25+ Interactive Mission Rooms');
    expect(philadelphiaReopeningMigration).toContain('PHILADELPHIA OPENING 8/7');
    expect(philadelphiaReopeningMigration).toContain('external_links_booking_url');
    expect(philadelphiaReopeningMigration).toContain('external_links_roller_checkout_url');
    expect(bostonEnumsMigration).toContain('"enum_location_details_location_slug"');
    expect(bostonEnumsMigration).toContain('"enum_blog_posts_location_slug"');
    expect(bostonEnumsMigration).toContain("'boston'");
    expect(bostonSeedMigration).toContain('Time Mission Boston | Coming Soon');
    expect(bostonSeedMigration).toContain('200 State St');
    expect(bostonSeedMigration).toContain('BOSTON COMING SOON');
  });
});
