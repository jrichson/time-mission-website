import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { PRESS_SEO_SNAPSHOT } from '../migration-data/20260819_press_seo_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const page of PRESS_SEO_SNAPSHOT) {
    await db.execute(sql`
      UPDATE "site_pages"
      SET
        "title" = ${page.title},
        "seo_meta_title" = ${page.metaTitle},
        "seo_meta_description" = ${page.metaDescription},
        "updated_at" = now()
      WHERE "path" = ${page.path};
    `);
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "site_pages"
    SET
      "title" = 'Press Releases | Time Mission',
      "seo_meta_title" = 'Press Releases | Time Mission',
      "seo_meta_description" = 'Official Time Mission press releases and company announcements.',
      "updated_at" = now()
    WHERE "path" = '/press/releases';
  `);

  await db.execute(sql`
    UPDATE "site_pages"
    SET
      "title" = 'In the News | Time Mission',
      "seo_meta_title" = 'In the News | Time Mission',
      "seo_meta_description" = 'Media coverage and editorial mentions of Time Mission.',
      "updated_at" = now()
    WHERE "path" = '/press/in-the-news';
  `);
}
