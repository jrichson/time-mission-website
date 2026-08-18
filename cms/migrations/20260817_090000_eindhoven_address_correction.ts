import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { EINDHOVEN_ADDRESS_CORRECTION_SNAPSHOT } from '../migration-data/20260817_eindhoven_address_correction_snapshot';

const { location, page } = EINDHOVEN_ADDRESS_CORRECTION_SNAPSHOT;

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "address_zip" = ${location.zip},
      "updated_at" = now()
    WHERE "location_slug"::text = ${location.slug};
  `);

  await db.execute(sql`
    UPDATE "site_pages"
    SET
      "seo_meta_description" = ${page.metaDescription},
      "updated_at" = now()
    WHERE "path" = ${page.path};
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "address_zip" = ${location.previousZip},
      "updated_at" = now()
    WHERE "location_slug"::text = ${location.slug};
  `);

  await db.execute(sql`
    UPDATE "site_pages"
    SET
      "seo_meta_description" = ${page.previousMetaDescription},
      "updated_at" = now()
    WHERE "path" = ${page.path};
  `);
}
