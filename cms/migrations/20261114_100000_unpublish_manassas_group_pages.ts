import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { MANASSAS_GROUP_PAGES_SNAPSHOT } from '../migration-data/20261113_manassas_group_pages_snapshot';

// The venue-specific Manassas group pages are unpublished; the site serves the shared group
// pages at these paths again. The rows are kept so the pages can be published later.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const page of MANASSAS_GROUP_PAGES_SNAPSHOT) {
    await db.execute(sql`
      UPDATE "site_pages"
      SET "published" = false, "updated_at" = now()
      WHERE "path" = ${page.path};
    `);
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Do not republish on rollback.
  await db.execute(sql`SELECT 1;`);
}
