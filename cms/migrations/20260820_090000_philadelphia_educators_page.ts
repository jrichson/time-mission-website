import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { PHILADELPHIA_EDUCATORS_PAGE_SNAPSHOT } from '../migration-data/20260820_philadelphia_educators_page_snapshot';

const page = PHILADELPHIA_EDUCATORS_PAGE_SNAPSHOT;

export async function up({ db }: MigrateUpArgs): Promise<void> {
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

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "site_pages"
    WHERE "path" = ${page.path};
  `);
}
