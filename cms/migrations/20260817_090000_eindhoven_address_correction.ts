import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { EINDHOVEN_ADDRESS_CORRECTION_SNAPSHOT } from '../migration-data/20260817_eindhoven_address_correction_snapshot';

const { location, page } = EINDHOVEN_ADDRESS_CORRECTION_SNAPSHOT;

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "address_zip" = ${location.zip},
      "updated_at" = now()
    WHERE "location_slug"::text = ${location.slug}
      AND "address_zip" = ${location.previousZip};
  `);

  await db.execute(sql`
    UPDATE "site_pages"
    SET
      "seo_meta_description" = replace("seo_meta_description", ${location.previousZip}, ${location.zip}),
      "updated_at" = now()
    WHERE "path" = ${page.path}
      AND position(${location.previousZip} in "seo_meta_description") > 0;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "address_zip" = ${location.previousZip},
      "updated_at" = now()
    WHERE "location_slug"::text = ${location.slug}
      AND "address_zip" = ${location.zip};
  `);

  await db.execute(sql`
    UPDATE "site_pages"
    SET
      "seo_meta_description" = replace("seo_meta_description", ${location.zip}, ${location.previousZip}),
      "updated_at" = now()
    WHERE "path" = ${page.path}
      AND position(${location.zip} in "seo_meta_description") > 0;
  `);
}
