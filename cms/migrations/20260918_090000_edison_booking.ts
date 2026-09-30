import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { EDISON_BOOKING_SNAPSHOT } from '../migration-data/20260918_edison_booking_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET "external_links_external_url" = ${EDISON_BOOKING_SNAPSHOT.externalUrl}
    WHERE "location_slug"::text = ${EDISON_BOOKING_SNAPSHOT.slug};
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET "external_links_external_url" = 'https://www.superchargednj.com/'
    WHERE "location_slug"::text = ${EDISON_BOOKING_SNAPSHOT.slug}
      AND "external_links_external_url" = ${EDISON_BOOKING_SNAPSHOT.externalUrl};
  `);
}
