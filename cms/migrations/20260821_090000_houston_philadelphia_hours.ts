import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { HOUSTON_PHILADELPHIA_HOURS_SNAPSHOT } from '../migration-data/20260821_houston_philadelphia_hours_snapshot';

const {
  announcement,
  locations,
  previousWeekdayHours,
  specialHours,
  weekdayHours,
} = HOUSTON_PHILADELPHIA_HOURS_SNAPSHOT;

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "location_details_special_hours" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "date" varchar NOT NULL,
      "name" varchar NOT NULL,
      "label" varchar NOT NULL,
      "open" varchar,
      "close" varchar
    );
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      ALTER TABLE "location_details_special_hours"
        ADD CONSTRAINT "location_details_special_hours_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."location_details"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "location_details_special_hours_order_idx"
      ON "location_details_special_hours" USING btree ("_order");
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "location_details_special_hours_parent_id_idx"
      ON "location_details_special_hours" USING btree ("_parent_id");
  `);

  await db.execute(sql`
    INSERT INTO "location_details_special_hours" (
      "_order",
      "_parent_id",
      "id",
      "date",
      "name",
      "label",
      "open",
      "close"
    )
    SELECT
      0,
      details."id",
      ${`20260821-${specialHours.date}-`} || details."location_slug"::text,
      ${specialHours.date},
      ${specialHours.name},
      ${specialHours.label},
      ${specialHours.open},
      ${specialHours.close}
    FROM "location_details" details
    WHERE details."location_slug"::text IN (${locations[0].slug}, ${locations[1].slug})
    ON CONFLICT ("id") DO NOTHING;
  `);

  await db.execute(sql`
    UPDATE "location_details"
    SET
      "hours_mon_open" = ${weekdayHours.mon.open},
      "hours_mon_label" = ${weekdayHours.mon.label},
      "hours_tue_open" = ${weekdayHours.tue.open},
      "hours_tue_label" = ${weekdayHours.tue.label},
      "hours_wed_open" = ${weekdayHours.wed.open},
      "hours_wed_label" = ${weekdayHours.wed.label},
      "hours_thu_open" = ${weekdayHours.thu.open},
      "hours_thu_label" = ${weekdayHours.thu.label},
      "hours_fri_open" = ${weekdayHours.fri.open},
      "hours_fri_label" = ${weekdayHours.fri.label},
      "updated_at" = now()
    WHERE "location_slug"::text IN (${locations[0].slug}, ${locations[1].slug});
  `);

  for (const location of locations) {
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
          "updated_at",
          "created_at"
        )
        SELECT
          ${`${announcement.title}: ${location.label}`},
          ${announcement.priority},
          ${announcement.message},
          true,
          ${announcement.startsAt}::timestamptz,
          ${location.announcementEndsAt}::timestamptz,
          'locations'::"public"."enum_announcement_banners_target_scope",
          'static'::"public"."enum_announcement_banners_ticker_behavior",
          now(),
          now()
        WHERE NOT EXISTS (
          SELECT 1
          FROM "announcement_banners_target_locations"
          WHERE "id" = ${location.announcementTargetId}
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
        ${location.announcementTargetId},
        ${location.slug}
      FROM inserted;
    `);
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "hours_mon_open" = ${previousWeekdayHours.mon.open},
      "hours_mon_label" = ${previousWeekdayHours.mon.label},
      "hours_tue_open" = ${previousWeekdayHours.tue.open},
      "hours_tue_label" = ${previousWeekdayHours.tue.label},
      "hours_wed_open" = ${previousWeekdayHours.wed.open},
      "hours_wed_label" = ${previousWeekdayHours.wed.label},
      "hours_thu_open" = ${previousWeekdayHours.thu.open},
      "hours_thu_label" = ${previousWeekdayHours.thu.label},
      "hours_fri_open" = ${previousWeekdayHours.fri.open},
      "hours_fri_label" = ${previousWeekdayHours.fri.label},
      "updated_at" = now()
    WHERE "location_slug"::text IN (${locations[0].slug}, ${locations[1].slug})
      AND "hours_mon_open" = ${weekdayHours.mon.open}
      AND "hours_mon_label" = ${weekdayHours.mon.label}
      AND "hours_tue_open" = ${weekdayHours.tue.open}
      AND "hours_tue_label" = ${weekdayHours.tue.label}
      AND "hours_wed_open" = ${weekdayHours.wed.open}
      AND "hours_wed_label" = ${weekdayHours.wed.label}
      AND "hours_thu_open" = ${weekdayHours.thu.open}
      AND "hours_thu_label" = ${weekdayHours.thu.label}
      AND "hours_fri_open" = ${weekdayHours.fri.open}
      AND "hours_fri_label" = ${weekdayHours.fri.label};
  `);

  await db.execute(sql`
    DELETE FROM "announcement_banners"
    WHERE "id" IN (
      SELECT "_parent_id"
      FROM "announcement_banners_target_locations"
      WHERE "id" IN (${locations[0].announcementTargetId}, ${locations[1].announcementTargetId})
    );
  `);

  await db.execute(sql`
    DROP INDEX IF EXISTS "location_details_special_hours_parent_id_idx";
  `);

  await db.execute(sql`
    DROP INDEX IF EXISTS "location_details_special_hours_order_idx";
  `);

  await db.execute(sql`
    ALTER TABLE "location_details_special_hours"
      DROP CONSTRAINT IF EXISTS "location_details_special_hours_parent_id_fk";
  `);

  await db.execute(sql`
    DROP TABLE IF EXISTS "location_details_special_hours" CASCADE;
  `);
}
