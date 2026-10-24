import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { LOCATION_SEARCH_TITLES_PAGE_SNAPSHOT as pages } from '../migration-data/20261024_location_search_titles_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const page of pages) {
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
  // Do not overwrite later editor changes to location titles and descriptions.
  await db.execute(sql`SELECT 1;`);
}
