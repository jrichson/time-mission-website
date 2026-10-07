import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';
import { ANTWERP_TICKER_SNAPSHOT } from '../migration-data/20261007_antwerp_ticker_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const { slug, previousTicker, ticker } = ANTWERP_TICKER_SNAPSHOT;
  await db.execute(sql`
    UPDATE "announcement_banners"
    SET "message" = ${ticker}, "updated_at" = now()
    WHERE "message" = ${previousTicker}
      AND "id" IN (
        SELECT "_parent_id" FROM "announcement_banners_target_locations"
        WHERE "location_slug"::text = ${slug}
      );
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Do not restore an expired promotion or overwrite later editorial changes.
  await db.execute(sql`SELECT 1;`);
}
