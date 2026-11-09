import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';
import { LEADERBOARD_PAGE_SNAPSHOT as previous } from '../migration-data/20261025_leaderboard_page_snapshot';
import { LEADERBOARD_DESCRIPTION_SNAPSHOT as page } from '../migration-data/20261106_leaderboard_description_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "site_pages" SET "seo_meta_description" = ${page.metaDescription}
    WHERE "path" = ${page.path} AND "seo_meta_description" = ${previous.metaDescription};
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Preserve editor changes and avoid restoring unsupported scoring claims.
  await db.execute(sql`SELECT 1;`);
}
