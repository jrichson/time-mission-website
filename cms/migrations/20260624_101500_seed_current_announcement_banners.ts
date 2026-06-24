import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    WITH seed("location_slug", "title", "message") AS (
      VALUES
        ('mount-prospect', 'Current ticker: Mount Prospect', 'SUMMER ADVENTURES AT TIME MISSION MOUNT PROSPECT'),
        ('philadelphia', 'Current ticker: Philadelphia', 'PHILADELPHIA TEMPORARILY CLOSED'),
        ('west-nyack', 'Current ticker: West Nyack', 'SUMMER ADVENTURES AT TIME MISSION WEST NYACK'),
        ('lincoln', 'Current ticker: Lincoln', 'SUMMER ADVENTURES AT TIME MISSION LINCOLN'),
        ('manassas', 'Current ticker: Manassas', 'SUMMER ADVENTURES AT TIME MISSION MANASSAS'),
        ('houston', 'Current ticker: Houston', 'HOUSTON NOW OPEN'),
        ('antwerp', 'Current ticker: Antwerp', 'SUMMER ADVENTURES AT TIME MISSION ANTWERP'),
        ('orland-park', 'Current ticker: Orland Park', 'ORLAND PARK NOW OPEN'),
        ('brussels', 'Current ticker: Brussels', 'BRUSSELS NOW OPEN'),
        ('eindhoven', 'Current ticker: Eindhoven', 'EINDHOVEN COMING SOON'),
        ('dallas', 'Current ticker: Dallas', 'DALLAS COMING SOON'),
        ('nashville', 'Current ticker: Nashville', 'NASHVILLE COMING SOON')
    ),
    inserted AS (
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
        seed."title",
        -100,
        seed."message",
        true,
        'locations'::"public"."enum_announcement_banners_target_scope",
        'auto'::"public"."enum_announcement_banners_ticker_behavior",
        now(),
        now()
      FROM seed
      WHERE NOT EXISTS (
        SELECT 1
        FROM "announcement_banners" banners
        INNER JOIN "announcement_banners_target_locations" locations
          ON locations."_parent_id" = banners."id"
        WHERE
          locations."location_slug" = seed."location_slug"
          AND lower(banners."message") = lower(seed."message")
      )
      RETURNING "id", "title", "message"
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
      'current-ticker-' || inserted."id",
      seed."location_slug"
    FROM inserted
    INNER JOIN seed
      ON seed."title" = inserted."title"
      AND seed."message" = inserted."message"
    ON CONFLICT ("id") DO NOTHING;
  `)
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
        banners."title" LIKE 'Current ticker:%'
        AND locations."id" LIKE 'current-ticker-%'
    );
  `)
}
