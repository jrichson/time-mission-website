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
    const migrationIndex = read('cms/migrations/index.ts');

    expect(migrationIndex).toContain('20260605_143000_sync_current_cms_content');
    expect(migrationIndex).toContain('20260622_090000_brussels_open');
    expect(migrationIndex).toContain('20260624_090000_blog_press_donation_eindhoven');
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
  });
});
