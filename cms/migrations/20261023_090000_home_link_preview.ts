import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { HOME_LINK_PREVIEW_PAGE_SNAPSHOT as page } from '../migration-data/20261023_home_link_preview_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "site_pages"
    SET "seo_og_image" = ${page.ogImage},
        "seo_twitter_image" = ${page.twitterImage},
        "updated_at" = now()
    WHERE "path" = ${page.path};
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Do not overwrite later editor changes to the homepage share image.
  await db.execute(sql`SELECT 1;`);
}
