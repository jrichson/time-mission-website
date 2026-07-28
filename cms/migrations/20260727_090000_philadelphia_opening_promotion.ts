import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

const PHILADELPHIA_OPENING_PROMOTION = 'OPENING AUGUST 7TH — USE CODE PHILLY50 for 50% OFF';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "announcement_banners"
    SET
      "message" = ${PHILADELPHIA_OPENING_PROMOTION},
      "ticker_behavior" = 'animated'::"public"."enum_announcement_banners_ticker_behavior",
      "updated_at" = now()
    WHERE "id" IN (
      SELECT banners."id"
      FROM "announcement_banners" banners
      INNER JOIN "announcement_banners_target_locations" locations
        ON locations."_parent_id" = banners."id"
      WHERE
        locations."location_slug" = 'philadelphia'
        AND (
          banners."title" = 'Current ticker: Philadelphia'
          OR lower(banners."message") = lower('PHILADELPHIA OPENING 8/7')
          OR lower(banners."message") = lower('PHILADELPHIA TEMPORARILY CLOSED')
        )
    );
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`SELECT 1;`);
}
