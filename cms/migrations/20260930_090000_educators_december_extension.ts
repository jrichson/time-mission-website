import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { EDUCATORS_DECEMBER_EXTENSION_PAGE_SNAPSHOT } from '../migration-data/20260930_educators_december_extension_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const page of EDUCATORS_DECEMBER_EXTENSION_PAGE_SNAPSHOT) {
    await db.execute(sql`
      UPDATE "site_pages"
      SET "title" = ${page.title},
          "seo_meta_title" = ${page.metaTitle},
          "seo_meta_description" = ${page.metaDescription},
          "updated_at" = now()
      WHERE "path" = ${page.path};
    `);
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Do not restore the expired September 30 deadline or overwrite later edits.
  await db.execute(sql`SELECT 1;`);
}
