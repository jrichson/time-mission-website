import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

const PHILADELPHIA_CHECKOUT_URL =
  'https://book.philadelphia.timemission.com/timemissionphiladelphiapa/onlinecheckout/en-us/home'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "published" = true,
      "hours_mon_open" = '10:00',
      "hours_mon_close" = '22:00',
      "hours_mon_label" = '10am - 10pm',
      "hours_tue_open" = '10:00',
      "hours_tue_close" = '22:00',
      "hours_tue_label" = '10am - 10pm',
      "hours_wed_open" = '10:00',
      "hours_wed_close" = '22:00',
      "hours_wed_label" = '10am - 10pm',
      "hours_thu_open" = '10:00',
      "hours_thu_close" = '22:00',
      "hours_thu_label" = '10am - 10pm',
      "hours_fri_open" = '10:00',
      "hours_fri_close" = '23:00',
      "hours_fri_label" = '10am - 11pm',
      "hours_sat_open" = '10:00',
      "hours_sat_close" = '23:00',
      "hours_sat_label" = '10am - 11pm',
      "hours_sun_open" = '10:00',
      "hours_sun_close" = '22:00',
      "hours_sun_label" = '10am - 10pm',
      "external_links_booking_url" = ${PHILADELPHIA_CHECKOUT_URL},
      "external_links_roller_checkout_url" = ${PHILADELPHIA_CHECKOUT_URL},
      "updated_at" = now()
    WHERE "location_slug" = 'philadelphia';
  `)

  await db.execute(sql`
    UPDATE "site_pages"
    SET
      "title" = 'Time Mission Philadelphia – 25+ Interactive Mission Rooms',
      "seo_meta_title" = 'Time Mission Philadelphia – 25+ Interactive Mission Rooms',
      "seo_meta_description" = 'Time Mission Philadelphia reopens August 7, 2026. Advance tickets are available now for 25+ immersive mission rooms.',
      "updated_at" = now()
    WHERE "path" = '/philadelphia';
  `)

  await db.execute(sql`
    WITH stale_philadelphia_promos AS (
      SELECT DISTINCT banners."id"
      FROM "announcement_banners" banners
      LEFT JOIN "announcement_banners_target_locations" locations
        ON locations."_parent_id" = banners."id"
      WHERE
        locations."location_slug" = 'philadelphia'
        AND (
          lower(banners."message") LIKE '%temporarily closed%'
          OR lower(banners."message") LIKE '%closure%'
        )
    )
    UPDATE "announcement_banners"
    SET
      "message" = 'PHILADELPHIA OPENING 8/7',
      "ticker_behavior" = 'static'::"public"."enum_announcement_banners_ticker_behavior",
      "updated_at" = now()
    WHERE "id" IN (SELECT "id" FROM stale_philadelphia_promos);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`SELECT 1;`)
}
