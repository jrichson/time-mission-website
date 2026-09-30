import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { RETIRED_SCHOOL_NIGHT_PATHS } from '../migration-data/20260930_educators_december_extension_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const path of RETIRED_SCHOOL_NIGHT_PATHS) {
    await db.execute(sql`
      UPDATE "site_pages"
      SET "published" = false, "updated_at" = now()
      WHERE "path" = ${path};
    `);

    // The pages now redirect to the location homepage; stop tickers linking to them.
    await db.execute(sql`
      UPDATE "announcement_banners"
      SET "published" = false, "updated_at" = now()
      WHERE "link_url" = ${path};
    `);
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Do not restore retired promotions or overwrite later editorial changes.
  await db.execute(sql`SELECT 1;`);
}
