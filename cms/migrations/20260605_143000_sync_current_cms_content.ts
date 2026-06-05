import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    INSERT INTO "location_details" (
      "title",
      "location_slug",
      "published",
      "address_line1",
      "address_line2",
      "address_city",
      "address_state",
      "address_zip",
      "address_country",
      "hours_mon_open",
      "hours_mon_close",
      "hours_mon_label",
      "hours_tue_open",
      "hours_tue_close",
      "hours_tue_label",
      "hours_wed_open",
      "hours_wed_close",
      "hours_wed_label",
      "hours_thu_open",
      "hours_thu_close",
      "hours_thu_label",
      "hours_fri_open",
      "hours_fri_close",
      "hours_fri_label",
      "hours_sat_open",
      "hours_sat_close",
      "hours_sat_label",
      "hours_sun_open",
      "hours_sun_close",
      "hours_sun_label"
    ) VALUES (
      'Time Mission Houston',
      'houston',
      true,
      '7620 Katy Fwy',
      'STE 355',
      'Houston',
      'TX',
      '77024',
      'United States',
      '10:00',
      '22:00',
      '10am - 10pm',
      '10:00',
      '22:00',
      '10am - 10pm',
      '10:00',
      '22:00',
      '10am - 10pm',
      '10:00',
      '22:00',
      '10am - 10pm',
      '10:00',
      '23:00',
      '10am - 11pm',
      '10:00',
      '23:00',
      '10am - 11pm',
      '10:00',
      '22:00',
      '10am - 10pm'
    )
    ON CONFLICT ("location_slug") DO UPDATE
    SET
      "published" = true,
      "address_line1" = EXCLUDED."address_line1",
      "address_line2" = EXCLUDED."address_line2",
      "address_city" = EXCLUDED."address_city",
      "address_state" = EXCLUDED."address_state",
      "address_zip" = EXCLUDED."address_zip",
      "address_country" = EXCLUDED."address_country",
      "hours_mon_open" = EXCLUDED."hours_mon_open",
      "hours_mon_close" = EXCLUDED."hours_mon_close",
      "hours_mon_label" = EXCLUDED."hours_mon_label",
      "hours_tue_open" = EXCLUDED."hours_tue_open",
      "hours_tue_close" = EXCLUDED."hours_tue_close",
      "hours_tue_label" = EXCLUDED."hours_tue_label",
      "hours_wed_open" = EXCLUDED."hours_wed_open",
      "hours_wed_close" = EXCLUDED."hours_wed_close",
      "hours_wed_label" = EXCLUDED."hours_wed_label",
      "hours_thu_open" = EXCLUDED."hours_thu_open",
      "hours_thu_close" = EXCLUDED."hours_thu_close",
      "hours_thu_label" = EXCLUDED."hours_thu_label",
      "hours_fri_open" = EXCLUDED."hours_fri_open",
      "hours_fri_close" = EXCLUDED."hours_fri_close",
      "hours_fri_label" = EXCLUDED."hours_fri_label",
      "hours_sat_open" = EXCLUDED."hours_sat_open",
      "hours_sat_close" = EXCLUDED."hours_sat_close",
      "hours_sat_label" = EXCLUDED."hours_sat_label",
      "hours_sun_open" = EXCLUDED."hours_sun_open",
      "hours_sun_close" = EXCLUDED."hours_sun_close",
      "hours_sun_label" = EXCLUDED."hours_sun_label",
      "updated_at" = now()
    WHERE
      "location_details"."hours_mon_label" IS NULL
      AND "location_details"."hours_fri_label" IS NULL
      AND "location_details"."hours_sun_label" IS NULL;

    UPDATE "site_pages"
    SET
      "title" = 'Time Mission Houston – 25+ Interactive Mission Rooms',
      "seo_meta_title" = 'Time Mission Houston – 25+ Interactive Mission Rooms',
      "seo_meta_description" = 'Time Mission Houston is now open in Houston, TX. Book 25+ immersive mission rooms for teams of 2–5, birthdays, and group events.',
      "updated_at" = now()
    WHERE
      "path" = '/houston'
      AND (
        lower("title") LIKE '%coming soon%'
        OR lower("seo_meta_title") LIKE '%coming soon%'
        OR lower("seo_meta_description") LIKE '%early-access%'
        OR lower("seo_meta_description") LIKE '%coming soon%'
      );

    UPDATE "site_pages"
    SET
      "title" = 'Time Mission Philadelphia | Temporarily Closed',
      "seo_meta_title" = 'Time Mission Philadelphia | Temporarily Closed',
      "seo_meta_description" = 'Time Mission Philadelphia is temporarily closed for the time being, and ticket sales are paused. Stay tuned for reopening updates.',
      "updated_at" = now()
    WHERE
      "path" = '/philadelphia'
      AND (
        "seo_meta_title" = 'Time Mission Philadelphia – 25+ Interactive Mission Rooms'
        OR lower("seo_meta_description") LIKE '%book your adventure today%'
      );

    UPDATE "site_pages"
    SET
      "title" = 'Time Mission Orland Park | Opening June 11, 2026',
      "seo_meta_title" = 'Time Mission Orland Park | Opening June 11, 2026',
      "seo_meta_description" = 'Time Mission Orland Park opens June 11, 2026 in Orland Park, IL. Advance tickets are available for 25+ immersive mission rooms.',
      "updated_at" = now()
    WHERE
      "path" = '/orland-park'
      AND lower("seo_meta_title") LIKE '%coming soon%';

    UPDATE "site_pages"
    SET
      "title" = 'Time Mission Dallas | Coming Soon',
      "seo_meta_title" = 'Time Mission Dallas | Coming Soon',
      "seo_meta_description" = 'Time Mission Dallas is coming soon in Dallas, TX. Contact the location team for launch timing and opening updates.',
      "updated_at" = now()
    WHERE
      "path" = '/dallas'
      AND lower("seo_meta_title") LIKE '%coming soon to texas%';

    UPDATE "site_pages"
    SET
      "title" = 'Time Mission Brussels | Opening June 18, 2026',
      "seo_meta_title" = 'Time Mission Brussels | Opening June 18, 2026',
      "seo_meta_description" = 'Time Mission Brussels opens June 18, 2026 in Bruxelles, Belgium. Advance tickets are available for 25+ immersive mission rooms.',
      "updated_at" = now()
    WHERE
      "path" = '/brussels'
      AND lower("seo_meta_title") LIKE '%coming soon%';

    WITH stale_houston_promos AS (
      SELECT DISTINCT banners."id"
      FROM "announcement_banners" banners
      LEFT JOIN "announcement_banners_target_locations" locations
        ON locations."_parent_id" = banners."id"
      WHERE
        (
          lower(banners."message") LIKE '%open50%'
          OR lower(banners."message") LIKE '%50% off%'
          OR lower(banners."message") LIKE '%grand opening june 5%'
        )
        AND (
          locations."location_slug" = 'houston'
          OR lower(banners."title") LIKE '%houston%'
          OR lower(banners."message") LIKE '%houston%'
        )
    )
    UPDATE "announcement_banners"
    SET
      "message" = 'HOUSTON NOW OPEN',
      "ticker_behavior" = 'static'::"public"."enum_announcement_banners_ticker_behavior",
      "updated_at" = now()
    WHERE "id" IN (SELECT "id" FROM stale_houston_promos);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`SELECT 1;`)
}
