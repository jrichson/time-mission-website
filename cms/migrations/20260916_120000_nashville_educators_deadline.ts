import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { NASHVILLE_EDUCATORS_DEADLINE_PAGE_SNAPSHOT as page } from '../migration-data/20260916_nashville_educators_deadline_snapshot';

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
  // Do not restore the previous registration deadline or overwrite later edits.
  await db.execute(sql`SELECT 1;`);
}
