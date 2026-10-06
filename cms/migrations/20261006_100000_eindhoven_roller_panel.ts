import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';
import { EINDHOVEN_ROLLER_PANEL_SNAPSHOT as snapshot } from '../migration-data/20261006_eindhoven_roller_panel_snapshot';

// Open Eindhoven's Roller checkout in the booking sidebar, like Brussels.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET "external_links_roller_checkout_url" = ${snapshot.rollerCheckoutUrl}, "updated_at" = now()
    WHERE "location_slug"::text = ${snapshot.slug};
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET "external_links_roller_checkout_url" = NULL, "updated_at" = now()
    WHERE "location_slug"::text = ${snapshot.slug}
      AND "external_links_roller_checkout_url" = ${snapshot.rollerCheckoutUrl};
  `);
}
