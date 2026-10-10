import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';
import { EINDHOVEN_DIRECT_CHECKOUT_SNAPSHOT as snapshot } from '../migration-data/20261010_eindhoven_direct_checkout_snapshot';

// iDEAL payments fail inside the Roller overlay, so Book Now goes straight to the checkout page.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET "external_links_booking_url" = ${snapshot.bookingUrl},
        "external_links_roller_checkout_url" = NULL,
        "updated_at" = now()
    WHERE "location_slug"::text = ${snapshot.slug};
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET "external_links_booking_url" = ${snapshot.previousCheckoutUrl},
        "external_links_roller_checkout_url" = ${snapshot.previousCheckoutUrl},
        "updated_at" = now()
    WHERE "location_slug"::text = ${snapshot.slug}
      AND "external_links_booking_url" = ${snapshot.bookingUrl};
  `);
}
