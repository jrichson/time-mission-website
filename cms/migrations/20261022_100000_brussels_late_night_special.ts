import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import {
  BRUSSELS_LATE_NIGHT_SPECIAL_PAGE_SNAPSHOT,
  BRUSSELS_LATE_NIGHT_TICKER_SNAPSHOT,
} from '../migration-data/20261022_brussels_late_night_special_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const page of BRUSSELS_LATE_NIGHT_SPECIAL_PAGE_SNAPSHOT) {
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

  const { slug, previousTicker, ticker, linkLabel, linkUrl } = BRUSSELS_LATE_NIGHT_TICKER_SNAPSHOT;
  await db.execute(sql`
    UPDATE "announcement_banners"
    SET "message" = ${ticker}, "link_label" = ${linkLabel}, "link_url" = ${linkUrl}, "updated_at" = now()
    WHERE "message" = ${previousTicker}
      AND "id" IN (
        SELECT "_parent_id" FROM "announcement_banners_target_locations"
        WHERE "location_slug"::text = ${slug}
      );
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Preserve any subsequent editor changes.
  await db.execute(sql`SELECT 1;`);
}
