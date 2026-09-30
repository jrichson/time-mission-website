import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';
import { EINDHOVEN_CHECKOUT_SNAPSHOT } from '../migration-data/20260925_eindhoven_checkout_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET "external_links_booking_url" = ${EINDHOVEN_CHECKOUT_SNAPSHOT.bookingUrl},
        "external_links_roller_checkout_url" = NULL,
        "updated_at" = now()
    WHERE "location_slug"::text = ${EINDHOVEN_CHECKOUT_SNAPSHOT.slug};
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET "external_links_booking_url" = '', "updated_at" = now()
    WHERE "location_slug"::text = ${EINDHOVEN_CHECKOUT_SNAPSHOT.slug}
      AND "external_links_booking_url" = ${EINDHOVEN_CHECKOUT_SNAPSHOT.bookingUrl};
  `);
}
