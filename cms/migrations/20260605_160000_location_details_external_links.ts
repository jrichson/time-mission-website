import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "location_details"
      ADD COLUMN IF NOT EXISTS "external_links_external_url" varchar,
      ADD COLUMN IF NOT EXISTS "external_links_booking_url" varchar,
      ADD COLUMN IF NOT EXISTS "external_links_roller_checkout_url" varchar,
      ADD COLUMN IF NOT EXISTS "external_links_gift_card_url" varchar,
      ADD COLUMN IF NOT EXISTS "external_links_waiver_url" varchar;

    CREATE TABLE IF NOT EXISTS "location_details_group_form_urls" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "form_key" varchar NOT NULL,
      "url" varchar NOT NULL
    );

    DO $$
    BEGIN
      ALTER TABLE "location_details_group_form_urls"
        ADD CONSTRAINT "location_details_group_form_urls_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."location_details"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "location_details_group_form_urls_order_idx"
      ON "location_details_group_form_urls" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "location_details_group_form_urls_parent_id_idx"
      ON "location_details_group_form_urls" USING btree ("_parent_id");

    UPDATE "location_details"
    SET
      "external_links_booking_url" = 'https://book.mountprospect.timemission.com/timemissionmountprospect/onlinecheckout/en-us/home',
      "external_links_roller_checkout_url" = 'https://book.mountprospect.timemission.com/timemissionmountprospect/onlinecheckout/en-us/home',
      "external_links_gift_card_url" = 'https://book.mountprospect.timemission.com/giftcards/en-us/products',
      "external_links_waiver_url" = 'https://waiver.roller.app/TimeMissionMountProspect/home'
    WHERE "location_slug" = 'mount-prospect';

    UPDATE "location_details"
    SET "external_links_booking_url" = 'https://timemission-palisades.briqbookings.com'
    WHERE "location_slug" = 'west-nyack';

    UPDATE "location_details"
    SET
      "external_links_booking_url" = 'https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959',
      "external_links_gift_card_url" = 'https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959'
    WHERE "location_slug" = 'lincoln';

    UPDATE "location_details"
    SET
      "external_links_booking_url" = 'https://book.manassas.timemission.com/timemissionmanassasmall/onlinecheckout/en-us/home',
      "external_links_roller_checkout_url" = 'https://book.manassas.timemission.com/timemissionmanassasmall/onlinecheckout/en-us/home',
      "external_links_gift_card_url" = 'https://book.manassas.timemission.com/giftcards/en-us/products',
      "external_links_waiver_url" = 'https://waiver.roller.app/TimeMissionManassasMall'
    WHERE "location_slug" = 'manassas';

    UPDATE "location_details"
    SET
      "external_links_booking_url" = 'https://book.houston.timemission.com/timemissionhouston/onlinecheckout/en-us/home',
      "external_links_roller_checkout_url" = 'https://book.houston.timemission.com/timemissionhouston/onlinecheckout/en-us/home',
      "external_links_gift_card_url" = 'https://book.houston.timemission.com/giftcards/en-us/products',
      "external_links_waiver_url" = 'https://book.houston.timemission.com/timemissionhouston/onlinecheckout/en-us/home'
    WHERE "location_slug" = 'houston';

    UPDATE "location_details"
    SET
      "external_links_external_url" = 'https://timemission.eu/antwerp',
      "external_links_booking_url" = 'https://www.experience-factory.com/antwerp/online-booking/#your-group=groups-of-friends&your-favorite-experience=time-mission'
    WHERE "location_slug" = 'antwerp';

    UPDATE "location_details"
    SET
      "external_links_booking_url" = 'https://book.orlandpark.timemission.com/timemissionorlandpark/onlinecheckout/en-us/home',
      "external_links_roller_checkout_url" = 'https://book.orlandpark.timemission.com/timemissionorlandpark/onlinecheckout/en-us/home',
      "external_links_gift_card_url" = 'https://book.orlandpark.timemission.com/giftcards/en-us/products',
      "external_links_waiver_url" = 'https://waiver.roller.app/TimeMissionOrlandPark/home'
    WHERE "location_slug" = 'orland-park';

    UPDATE "location_details"
    SET "external_links_external_url" = 'https://timemission.eu/brussels'
    WHERE "location_slug" = 'brussels';

    INSERT INTO "location_details_group_form_urls" (
      "_order",
      "_parent_id",
      "id",
      "form_key",
      "url"
    )
    SELECT seed."_order", details."id", seed."id", seed."form_key", seed."url"
    FROM (
      VALUES
        ('mount-prospect', 0, 'mount-prospect-default', 'default', 'https://webforms.pipedrive.com/f/bXEQpsMHJsOtiIdTnIOIuMINAj2jCuMpbJftCRoKl6naQBGsW8F6S0WOShrlXluKB5'),
        ('mount-prospect', 1, 'mount-prospect-birthdays', 'birthdays', 'https://webforms.pipedrive.com/f/6xKWqqzjoNTaJIqvmk5k2tRDTavPGnfToLuCSJCsKNa5PmDkPpfEWTYgx2MiTMmQjp'),
        ('mount-prospect', 2, 'mount-prospect-corporate', 'corporate', 'https://webforms.pipedrive.com/f/cB8Sz5ot9kA8JtNcE94AnSTFsbTniA4uo164AfyfQQiEUpFkQsd69VgGbk3YXE0syD'),
        ('mount-prospect', 3, 'mount-prospect-field-trips', 'field-trips', 'https://webforms.pipedrive.com/f/6xMNvdcgOovmw2sKGrNi5BlnYH2OZXFFQLriH93v2osZRKm2DjvgYS8uq1QWw3w8aT'),
        ('mount-prospect', 4, 'mount-prospect-bachelor-ette', 'bachelor-ette', 'https://webforms.pipedrive.com/f/6xQQ09bcb0js1I6hTdbWpRqgTSmYVdcrOCpsxG2cNBy4N128E5YWrEQiPOyt66osEP'),
        ('mount-prospect', 5, 'mount-prospect-private-events', 'private-events', 'https://webforms.pipedrive.com/f/6GXSuNhFZD5Ep1YKjgbkzhtyyHT3rtD5bFu3SenbU7WtdMBlNK2ii0rTXXxlXLV5o7'),
        ('mount-prospect', 6, 'mount-prospect-holidays', 'holidays', 'https://webforms.pipedrive.com/f/6rGnRlGiXrnS1NPUnGIZGiMCYrvpr8NrD3AdFSYa2I6qPMyRLsVhIFNrf2JM3vwmJB'),
        ('west-nyack', 0, 'west-nyack-default', 'default', 'https://timemission-palisades.briqbookings.com'),
        ('west-nyack', 1, 'west-nyack-birthdays', 'birthdays', 'https://timemission-palisades.briqbookings.com'),
        ('west-nyack', 2, 'west-nyack-corporate', 'corporate', 'https://timemission-palisades.briqbookings.com'),
        ('west-nyack', 3, 'west-nyack-field-trips', 'field-trips', 'https://timemission-palisades.briqbookings.com'),
        ('west-nyack', 4, 'west-nyack-bachelor-ette', 'bachelor-ette', 'https://timemission-palisades.briqbookings.com'),
        ('west-nyack', 5, 'west-nyack-private-events', 'private-events', 'https://timemission-palisades.briqbookings.com'),
        ('west-nyack', 6, 'west-nyack-holidays', 'holidays', 'https://timemission-palisades.briqbookings.com'),
        ('lincoln', 0, 'lincoln-default', 'default', 'https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959'),
        ('lincoln', 1, 'lincoln-birthdays', 'birthdays', 'https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959'),
        ('lincoln', 2, 'lincoln-corporate', 'corporate', 'https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959'),
        ('lincoln', 3, 'lincoln-field-trips', 'field-trips', 'https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959'),
        ('lincoln', 4, 'lincoln-bachelor-ette', 'bachelor-ette', 'https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959'),
        ('lincoln', 5, 'lincoln-private-events', 'private-events', 'https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959'),
        ('lincoln', 6, 'lincoln-holidays', 'holidays', 'https://bookings.clubspeed.com/R1/R1LINCOLN?filters=959'),
        ('manassas', 0, 'manassas-default', 'default', 'https://webforms.pipedrive.com/f/6WfZe3FsT5CpyAGlGQNeSnD8PZnbw9PpoyBG6Q1lAtqvD4ribAKRsWWceRYG0npA79'),
        ('manassas', 1, 'manassas-birthdays', 'birthdays', 'https://webforms.pipedrive.com/f/6N8EVdwKhZ3emAlRGdOmUEk7TYKvBJm0eSzDnHwSrtksQPBFv9MmERzqt5UAPZYMJZ'),
        ('manassas', 2, 'manassas-corporate', 'corporate', 'https://webforms.pipedrive.com/f/64NrjaZAs4GrLYSqpDDV0mzG46uGMN5cXrzEoAIjKKghJOzCRVmfw4mWkghflYR3Qn'),
        ('manassas', 3, 'manassas-field-trips', 'field-trips', 'https://webforms.pipedrive.com/f/73R7nQP4WEUC6gSinuhaFxCQ1QY1csAtXLwP7HumWL1oK3juIbEGdnPMyK7hAxRsT9'),
        ('manassas', 4, 'manassas-bachelor-ette', 'bachelor-ette', 'https://webforms.pipedrive.com/f/ckkQF1aDmukXN8ONLfXIm42jCyUsBrQWGu9ahvtP9APRYBFhRG3WIiWLoy60tEZXY7'),
        ('manassas', 5, 'manassas-private-events', 'private-events', 'https://webforms.pipedrive.com/f/6rClhKJC878Zy4wEQE4nx3rxHFl2oN1XCAwr5J647D5e6JZyz2dBibV21rAvu5pkn9'),
        ('manassas', 6, 'manassas-holidays', 'holidays', 'https://webforms.pipedrive.com/f/63f1HEKkrC42GkAS68wtfh9HcHWyi8c6TlESzmjbi3nKuXQ3xiIQXnr9WhZuTX5wlR'),
        ('houston', 0, 'houston-default', 'default', 'https://forms.roller.app/#/timemissionhouston/bc80621a90b3417/form'),
        ('houston', 1, 'houston-birthdays', 'birthdays', 'https://forms.roller.app/#/timemissionhouston/bc80621a90b3417/form'),
        ('houston', 2, 'houston-corporate', 'corporate', 'https://forms.roller.app/#/timemissionhouston/bc80621a90b3417/form'),
        ('houston', 3, 'houston-field-trips', 'field-trips', 'https://forms.roller.app/#/timemissionhouston/bc80621a90b3417/form'),
        ('houston', 4, 'houston-bachelor-ette', 'bachelor-ette', 'https://forms.roller.app/#/timemissionhouston/bc80621a90b3417/form'),
        ('houston', 5, 'houston-private-events', 'private-events', 'https://forms.roller.app/#/timemissionhouston/bc80621a90b3417/form'),
        ('houston', 6, 'houston-holidays', 'holidays', 'https://forms.roller.app/#/timemissionhouston/bc80621a90b3417/form'),
        ('antwerp', 0, 'antwerp-default', 'default', 'https://www.experience-factory.com/antwerp/online-booking/#your-group=groups-of-friends&your-favorite-experience=time-mission'),
        ('antwerp', 1, 'antwerp-birthdays', 'birthdays', 'https://www.experience-factory.com/antwerp/online-booking/#your-group=groups-of-friends&your-favorite-experience=time-mission'),
        ('antwerp', 2, 'antwerp-corporate', 'corporate', 'https://www.experience-factory.com/antwerp/online-booking/#your-group=groups-of-friends&your-favorite-experience=time-mission'),
        ('antwerp', 3, 'antwerp-field-trips', 'field-trips', 'https://www.experience-factory.com/antwerp/online-booking/#your-group=groups-of-friends&your-favorite-experience=time-mission'),
        ('antwerp', 4, 'antwerp-bachelor-ette', 'bachelor-ette', 'https://www.experience-factory.com/antwerp/online-booking/#your-group=groups-of-friends&your-favorite-experience=time-mission'),
        ('antwerp', 5, 'antwerp-private-events', 'private-events', 'https://www.experience-factory.com/antwerp/online-booking/#your-group=groups-of-friends&your-favorite-experience=time-mission'),
        ('antwerp', 6, 'antwerp-holidays', 'holidays', 'https://www.experience-factory.com/antwerp/online-booking/#your-group=groups-of-friends&your-favorite-experience=time-mission'),
        ('orland-park', 0, 'orland-park-default', 'default', 'https://webforms.pipedrive.com/f/6qn4HwjvjuHH9aTSI0opXZlY9S6zSaww1No8AKIHefxbmVVTrc2EWOy4D4SWAztcVJ'),
        ('orland-park', 1, 'orland-park-birthdays', 'birthdays', 'https://webforms.pipedrive.com/f/cealFU9H4iBjCwAYVuYu3cD2g1DA23TiYaNMI43BAFymCviOhdYqZvYMJB7HXUz9VV'),
        ('orland-park', 2, 'orland-park-corporate', 'corporate', 'https://webforms.pipedrive.com/f/6N4XiyoDwhtosxmaSQyA8NjzKCVB9VXrPM8fXFI8aM2soYJh5aaV5AgT6IGV7nTInp'),
        ('orland-park', 3, 'orland-park-field-trips', 'field-trips', 'https://webforms.pipedrive.com/f/6NfIZkeDSHm6WL1Aj9drvKC9JjIp9CFDz3bS8aJN6aYNqflvCTiCwT5q4pm6Vu6FvZ'),
        ('orland-park', 4, 'orland-park-bachelor-ette', 'bachelor-ette', 'https://webforms.pipedrive.com/f/clLuJoDhuRydeXauTqwp1lJ8DqEeWOjV9mQ8cfWIRQPZ2ok7o0dzQtcnNlvFuJpLb5'),
        ('orland-park', 5, 'orland-park-private-events', 'private-events', 'https://webforms.pipedrive.com/f/czCBoZIYCV9RLnYgcPalyzr4UrH8eF7EV2LwETaisfp3lEkkuVtnZ6UqTjiZ9w9pSz'),
        ('orland-park', 6, 'orland-park-holidays', 'holidays', 'https://webforms.pipedrive.com/f/6xQQrLhTsFkAoB1Os9dMge6hvvHKlouU8Kz12XSFqwTG4J6HRojT9rKKIMEKMERX0L')
    ) AS seed("location_slug", "_order", "id", "form_key", "url")
    INNER JOIN "location_details" details
      ON details."location_slug"::text = seed."location_slug"
    ON CONFLICT ("id") DO UPDATE
    SET
      "_order" = EXCLUDED."_order",
      "_parent_id" = EXCLUDED."_parent_id",
      "form_key" = EXCLUDED."form_key",
      "url" = EXCLUDED."url";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "location_details_group_form_urls_parent_id_idx";
    DROP INDEX IF EXISTS "location_details_group_form_urls_order_idx";
    ALTER TABLE "location_details_group_form_urls" DROP CONSTRAINT IF EXISTS "location_details_group_form_urls_parent_id_fk";
    DROP TABLE IF EXISTS "location_details_group_form_urls" CASCADE;

    ALTER TABLE "location_details"
      DROP COLUMN IF EXISTS "external_links_waiver_url",
      DROP COLUMN IF EXISTS "external_links_gift_card_url",
      DROP COLUMN IF EXISTS "external_links_roller_checkout_url",
      DROP COLUMN IF EXISTS "external_links_booking_url",
      DROP COLUMN IF EXISTS "external_links_external_url";
  `)
}
