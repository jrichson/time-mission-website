import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { PHILADELPHIA_NOW_OPEN_SNAPSHOT } from '../migration-data/20260807_philadelphia_now_open_snapshot';

const { location, page } = PHILADELPHIA_NOW_OPEN_SNAPSHOT;

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "site_pages"
    SET
      "title" = 'Time Mission Philadelphia – 25+ Interactive Mission Rooms',
      "seo_meta_title" = 'Time Mission Philadelphia – 25+ Interactive Mission Rooms',
      "seo_meta_description" = ${page.metaDescription},
      "updated_at" = now()
    WHERE "path" = '/philadelphia';
  `);

  await db.execute(sql`
    UPDATE "announcement_banners"
    SET
      "message" = ${location.ticker},
      "ticker_behavior" = 'static'::"public"."enum_announcement_banners_ticker_behavior",
      "updated_at" = now()
    WHERE "id" IN (
      SELECT banners."id"
      FROM "announcement_banners" banners
      INNER JOIN "announcement_banners_target_locations" locations
        ON locations."_parent_id" = banners."id"
      WHERE
        locations."location_slug" = 'philadelphia'
        AND (
          banners."title" = 'Current ticker: Philadelphia'
          OR lower(banners."message") = lower('PHILADELPHIA OPENING 8/7')
          OR lower(banners."message") = lower('OPENING AUGUST 7TH — USE CODE PHILLY50 for 50% OFF')
        )
    );
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`SELECT 1;`);
}
