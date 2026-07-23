import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

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
      "address_country"
    )
    VALUES (
      'Time Mission Boston',
      'boston',
      true,
      '200 State St',
      NULL,
      'Boston',
      'MA',
      '02109',
      'United States'
    )
    ON CONFLICT ("location_slug") DO UPDATE
    SET
      "title" = EXCLUDED."title",
      "published" = EXCLUDED."published",
      "address_line1" = EXCLUDED."address_line1",
      "address_line2" = EXCLUDED."address_line2",
      "address_city" = EXCLUDED."address_city",
      "address_state" = EXCLUDED."address_state",
      "address_zip" = EXCLUDED."address_zip",
      "address_country" = EXCLUDED."address_country";

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
      'Time Mission Boston | Coming Soon',
      '/boston',
      true,
      'Time Mission Boston | Coming Soon',
      'Time Mission Boston is coming soon in Boston, MA. Contact the location team for launch timing and opening updates.',
      'index,follow'::"enum_site_pages_seo_robots",
      '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg',
      '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg'
    )
    ON CONFLICT ("path") DO NOTHING;

    WITH inserted AS (
      INSERT INTO "announcement_banners" (
        "title",
        "priority",
        "message",
        "published",
        "target_scope",
        "ticker_behavior",
        "updated_at",
        "created_at"
      )
      SELECT
        'Current ticker: Boston',
        -100,
        'BOSTON COMING SOON',
        true,
        'locations'::"public"."enum_announcement_banners_target_scope",
        'auto'::"public"."enum_announcement_banners_ticker_behavior",
        now(),
        now()
      WHERE NOT EXISTS (
        SELECT 1
        FROM "announcement_banners" banners
        INNER JOIN "announcement_banners_target_locations" locations
          ON locations."_parent_id" = banners."id"
        WHERE
          locations."location_slug" = 'boston'
          AND lower(banners."message") = lower('BOSTON COMING SOON')
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
      'current-ticker-boston-' || inserted."id",
      'boston'
    FROM inserted
    ON CONFLICT ("id") DO NOTHING;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "announcement_banners"
    WHERE "id" IN (
      SELECT banners."id"
      FROM "announcement_banners" banners
      INNER JOIN "announcement_banners_target_locations" locations
        ON locations."_parent_id" = banners."id"
      WHERE
        banners."title" = 'Current ticker: Boston'
        AND locations."location_slug" = 'boston'
    );

    DELETE FROM "site_pages"
    WHERE "path" = '/boston';

    DELETE FROM "location_details"
    WHERE "location_slug" = 'boston';
  `);
}
