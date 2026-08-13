import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { HOUSTON_BACK_TO_SCHOOL_PAGE_SNAPSHOT } from '../migration-data/20260811_houston_back_to_school_pages_snapshot';

const [schoolNightPage, educatorsPage] = HOUSTON_BACK_TO_SCHOOL_PAGE_SNAPSHOT;

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
    VALUES
      (
        ${schoolNightPage.title},
        ${schoolNightPage.path},
        true,
        ${schoolNightPage.metaTitle},
        ${schoolNightPage.metaDescription},
        'index,follow'::"enum_site_pages_seo_robots",
        ${schoolNightPage.ogImage},
        ${schoolNightPage.twitterImage}
      ),
      (
        ${educatorsPage.title},
        ${educatorsPage.path},
        true,
        ${educatorsPage.metaTitle},
        ${educatorsPage.metaDescription},
        'index,follow'::"enum_site_pages_seo_robots",
        ${educatorsPage.ogImage},
        ${educatorsPage.twitterImage}
      )
    ON CONFLICT ("path") DO NOTHING;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "site_pages"
    WHERE "path" IN (
      ${schoolNightPage.path},
      ${educatorsPage.path}
    );
  `);
}
