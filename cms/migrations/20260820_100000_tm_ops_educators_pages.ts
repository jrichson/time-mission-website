import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { TM_OPS_EDUCATORS_PAGE_SNAPSHOT } from '../migration-data/20260820_tm_ops_educators_pages_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const page of TM_OPS_EDUCATORS_PAGE_SNAPSHOT) {
    await db.execute(sql`
      INSERT INTO "site_pages" (
        "title",
        "path",
        "published",
        "seo_meta_title",
        "seo_meta_description",
        "seo_robots",
        "seo_og_image",
        "seo_twitter_image"
      )
      VALUES (
        ${page.title},
        ${page.path},
        true,
        ${page.metaTitle},
        ${page.metaDescription},
        'index,follow'::"enum_site_pages_seo_robots",
        ${page.ogImage},
        ${page.twitterImage}
      )
      ON CONFLICT ("path") DO NOTHING;
    `);
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const page of TM_OPS_EDUCATORS_PAGE_SNAPSHOT) {
    await db.execute(sql`
      DELETE FROM "site_pages"
      WHERE "path" = ${page.path};
    `);
  }
}
