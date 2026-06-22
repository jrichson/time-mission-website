import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "site_pages"
    SET
      "title" = 'Time Mission Brussels - 25+ Interactive Mission Rooms',
      "seo_meta_title" = 'Time Mission Brussels - 25+ Interactive Mission Rooms',
      "seo_meta_description" = 'Time Mission Brussels is now open in Bruxelles, Belgium. Visit the EU-hosted site for booking details and 25+ immersive mission rooms.',
      "updated_at" = now()
    WHERE "path" = '/brussels';

    WITH stale_brussels_promos AS (
      SELECT DISTINCT banners."id"
      FROM "announcement_banners" banners
      LEFT JOIN "announcement_banners_target_locations" locations
        ON locations."_parent_id" = banners."id"
      WHERE
        (
          lower(banners."message") LIKE '%brussels%grand opening%'
          OR lower(banners."message") LIKE '%opening june 18%'
          OR lower(banners."message") LIKE '%june 18%'
        )
        AND (
          locations."location_slug" = 'brussels'
          OR lower(banners."title") LIKE '%brussels%'
          OR lower(banners."message") LIKE '%brussels%'
        )
    )
    UPDATE "announcement_banners"
    SET
      "message" = 'BRUSSELS NOW OPEN',
      "ticker_behavior" = 'static'::"public"."enum_announcement_banners_ticker_behavior",
      "updated_at" = now()
    WHERE "id" IN (SELECT "id" FROM stale_brussels_promos);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`SELECT 1;`)
}
