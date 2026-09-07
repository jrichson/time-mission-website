import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import {
  US_SCHOOL_NIGHT_ANNOUNCEMENT_SNAPSHOT,
  US_SCHOOL_NIGHT_PAGE_SNAPSHOT,
} from '../migration-data/20260908_school_night_promotions_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const page of US_SCHOOL_NIGHT_PAGE_SNAPSHOT) {
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
        ${page.robots}::"public"."enum_site_pages_seo_robots",
        ${page.ogImage},
        ${page.twitterImage}
      )
      ON CONFLICT ("path") DO NOTHING;
    `);
  }

  for (const announcement of US_SCHOOL_NIGHT_ANNOUNCEMENT_SNAPSHOT) {
    await db.execute(sql`
      WITH inserted AS (
        INSERT INTO "announcement_banners" (
          "title",
          "priority",
          "message",
          "published",
          "starts_at",
          "ends_at",
          "target_scope",
          "ticker_behavior",
          "link_label",
          "link_url",
          "updated_at",
          "created_at"
        )
        SELECT
          ${announcement.title},
          ${announcement.priority},
          ${announcement.message},
          true,
          ${announcement.startsAt}::timestamptz,
          ${announcement.endsAt}::timestamptz,
          'locations'::"public"."enum_announcement_banners_target_scope",
          'animated'::"public"."enum_announcement_banners_ticker_behavior",
          ${announcement.linkLabel},
          ${announcement.linkUrl},
          now(),
          now()
        WHERE NOT EXISTS (
          SELECT 1
          FROM "announcement_banners_target_locations"
          WHERE "id" = ${announcement.targetId}
        )
        RETURNING "id"
      )
      INSERT INTO "announcement_banners_target_locations" (
        "_order",
        "_parent_id",
        "id",
        "location_slug"
      )
      SELECT
        0,
        inserted."id",
        ${announcement.targetId},
        ${announcement.locationSlug}
      FROM inserted;
    `);
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const announcement of US_SCHOOL_NIGHT_ANNOUNCEMENT_SNAPSHOT) {
    await db.execute(sql`
      DELETE FROM "announcement_banners"
      WHERE "id" IN (
        SELECT "_parent_id"
        FROM "announcement_banners_target_locations"
        WHERE "id" = ${announcement.targetId}
      );
    `);
  }

  for (const page of US_SCHOOL_NIGHT_PAGE_SNAPSHOT) {
    await db.execute(sql`
      DELETE FROM "site_pages"
      WHERE "path" = ${page.path};
    `);
  }
}
