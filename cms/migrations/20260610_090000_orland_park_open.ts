import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "published" = true,
      "hours_mon_open" = '10:00',
      "hours_mon_close" = '21:00',
      "hours_mon_label" = '10am - 9pm',
      "hours_tue_open" = '10:00',
      "hours_tue_close" = '21:00',
      "hours_tue_label" = '10am - 9pm',
      "hours_wed_open" = '10:00',
      "hours_wed_close" = '21:00',
      "hours_wed_label" = '10am - 9pm',
      "hours_thu_open" = '10:00',
      "hours_thu_close" = '21:00',
      "hours_thu_label" = '10am - 9pm',
      "hours_fri_open" = '10:00',
      "hours_fri_close" = '00:00',
      "hours_fri_label" = '10am - Midnight',
      "hours_sat_open" = '10:00',
      "hours_sat_close" = '00:00',
      "hours_sat_label" = '10am - Midnight',
      "hours_sun_open" = '10:00',
      "hours_sun_close" = '20:00',
      "hours_sun_label" = '10am - 8pm',
      "updated_at" = now()
    WHERE "location_slug" = 'orland-park';

    UPDATE "site_pages"
    SET
      "title" = 'Time Mission Orland Park - 25+ Interactive Mission Rooms',
      "seo_meta_title" = 'Time Mission Orland Park - 25+ Interactive Mission Rooms',
      "seo_meta_description" = 'Time Mission Orland Park is now open in Orland Park, IL. Book 25+ immersive mission rooms for teams of 2-5, birthdays, and group events.',
      "updated_at" = now()
    WHERE "path" = '/orland-park';

    WITH stale_orland_promos AS (
      SELECT DISTINCT banners."id"
      FROM "announcement_banners" banners
      LEFT JOIN "announcement_banners_target_locations" locations
        ON locations."_parent_id" = banners."id"
      WHERE
        (
          lower(banners."message") LIKE '%orland%grand opening%'
          OR lower(banners."message") LIKE '%opening june 11%'
          OR lower(banners."message") LIKE '%june 11%'
        )
        AND (
          locations."location_slug" = 'orland-park'
          OR lower(banners."title") LIKE '%orland%'
          OR lower(banners."message") LIKE '%orland%'
        )
    )
    UPDATE "announcement_banners"
    SET
      "message" = 'ORLAND PARK NOW OPEN',
      "ticker_behavior" = 'static'::"public"."enum_announcement_banners_ticker_behavior",
      "updated_at" = now()
    WHERE "id" IN (SELECT "id" FROM stale_orland_promos);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`SELECT 1;`)
}
