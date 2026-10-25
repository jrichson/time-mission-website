import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { LEADERBOARD_PAGE_SNAPSHOT as page } from '../migration-data/20261025_leaderboard_page_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    INSERT INTO "site_pages" (
      "title", "path", "published", "seo_meta_title", "seo_meta_description",
      "seo_robots", "seo_og_image", "seo_twitter_image"
    ) VALUES (
      ${page.title}, ${page.path}, true, ${page.metaTitle}, ${page.metaDescription},
      ${page.robots}::"enum_site_pages_seo_robots", ${page.ogImage}, ${page.twitterImage}
    ) ON CONFLICT ("path") DO NOTHING;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Preserve any subsequent editor changes.
  await db.execute(sql`SELECT 1;`);
}
