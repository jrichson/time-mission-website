import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { US_SCHOOL_NIGHT_ANNOUNCEMENT_SNAPSHOT } from '../migration-data/20260908_school_night_promotions_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const announcement of US_SCHOOL_NIGHT_ANNOUNCEMENT_SNAPSHOT) {
    const message = announcement.locationSlug === 'houston'
      ? '$10 OFF TICKETS – SCHOOL NIGHTS'
      : '20% OFF SCHOOL NIGHTS';

    await db.execute(sql`
      UPDATE "announcement_banners"
      SET "message" = ${message},
          "link_label" = 'Learn more',
          "link_url" = ${`/${announcement.locationSlug}/school-night`},
          "updated_at" = now()
      WHERE "target_scope" = 'locations'
        AND "id" IN (
          SELECT "_parent_id" FROM "announcement_banners_target_locations"
          WHERE "id" = ${announcement.targetId}
            AND "location_slug" = ${announcement.locationSlug}
        );
    `);
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Preserve current editorial copy and links when rolling back schema changes.
  await db.execute(sql`SELECT 1;`);
}
