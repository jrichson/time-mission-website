import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

const PHILADELPHIA_GROUP_FORM_URL =
  'https://forms.roller.app/#/timemissionphiladelphiapa/1446ba8be6094ad/form';

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
      "external_links_external_url"
    )
    VALUES (
      'Time Mission Edison',
      'edison',
      true,
      '987 US-1',
      NULL,
      'Edison',
      'NJ',
      '08817',
      'United States',
      'https://www.superchargednj.com/'
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
      "address_country" = EXCLUDED."address_country",
      "external_links_external_url" = EXCLUDED."external_links_external_url";
  `);

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
      'Time Mission Edison | Coming Soon',
      '/edison',
      true,
      'Time Mission Edison | Coming Soon',
      'Time Mission Edison is coming soon at Supercharged Entertainment New Jersey, 987 US-1, Edison, NJ 08817.',
      'noindex,follow'::"enum_site_pages_seo_robots",
      '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg',
      '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg'
    )
    ON CONFLICT ("path") DO UPDATE
    SET
      "title" = EXCLUDED."title",
      "published" = EXCLUDED."published",
      "seo_meta_title" = EXCLUDED."seo_meta_title",
      "seo_meta_description" = EXCLUDED."seo_meta_description",
      "seo_robots" = EXCLUDED."seo_robots",
      "seo_og_image" = EXCLUDED."seo_og_image",
      "seo_twitter_image" = EXCLUDED."seo_twitter_image";
  `);

  await db.execute(sql`
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
        'Current ticker: Edison',
        -100,
        'EDISON COMING SOON',
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
          locations."location_slug" = 'edison'
          AND lower(banners."message") = lower('EDISON COMING SOON')
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
      'current-ticker-edison-' || inserted."id",
      'edison'
    FROM inserted
    ON CONFLICT ("id") DO NOTHING;
  `);

  await db.execute(sql`
    INSERT INTO "location_details_group_form_urls" (
      "_order",
      "_parent_id",
      "id",
      "form_key",
      "url"
    )
    SELECT
      seed."_order",
      details."id",
      seed."id",
      seed."form_key",
      ${PHILADELPHIA_GROUP_FORM_URL}
    FROM (
      VALUES
        (0, 'philadelphia-default', 'default'),
        (1, 'philadelphia-birthdays', 'birthdays'),
        (2, 'philadelphia-corporate', 'corporate'),
        (3, 'philadelphia-field-trips', 'field-trips'),
        (4, 'philadelphia-bachelor-ette', 'bachelor-ette'),
        (5, 'philadelphia-private-events', 'private-events'),
        (6, 'philadelphia-holidays', 'holidays')
    ) AS seed("_order", "id", "form_key")
    INNER JOIN "location_details" details
      ON details."location_slug"::text = 'philadelphia'
    ON CONFLICT ("id") DO UPDATE
    SET
      "_order" = EXCLUDED."_order",
      "_parent_id" = EXCLUDED."_parent_id",
      "form_key" = EXCLUDED."form_key",
      "url" = EXCLUDED."url";
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "location_details_group_form_urls"
    WHERE "id" IN (
      'philadelphia-default',
      'philadelphia-birthdays',
      'philadelphia-corporate',
      'philadelphia-field-trips',
      'philadelphia-bachelor-ette',
      'philadelphia-private-events',
      'philadelphia-holidays'
    );

    DELETE FROM "announcement_banners"
    WHERE "id" IN (
      SELECT banners."id"
      FROM "announcement_banners" banners
      INNER JOIN "announcement_banners_target_locations" locations
        ON locations."_parent_id" = banners."id"
      WHERE
        banners."title" = 'Current ticker: Edison'
        AND locations."location_slug" = 'edison'
    );

    DELETE FROM "site_pages"
    WHERE "path" = '/edison';

    DELETE FROM "location_details"
    WHERE "location_slug" = 'edison';
  `);
}
