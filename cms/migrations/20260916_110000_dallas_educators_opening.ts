import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { DALLAS_EDUCATORS_OPENING_PAGE_SNAPSHOT as page } from '../migration-data/20260916_dallas_educators_opening_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "site_pages"
    SET "title" = ${page.title},
        "seo_meta_title" = ${page.metaTitle},
        "seo_meta_description" = ${page.metaDescription},
        "updated_at" = now()
    WHERE "path" = ${page.path};
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Do not restore the incorrect September redemption offer or overwrite later edits.
  await db.execute(sql`SELECT 1;`);
}
