import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';
import { DALLAS_SIGNUP_RETIREMENT_SNAPSHOT as snapshot } from '../migration-data/20261104_dallas_signup_retirement_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET "external_links_booking_url" = ${snapshot.bookingUrl}, "updated_at" = now()
    WHERE "location_slug"::text = ${snapshot.slug}
      AND COALESCE("external_links_booking_url", '') = '';
  `);
  await db.execute(sql`
    UPDATE "site_pages"
    SET "published" = false, "updated_at" = now()
    WHERE "path" = ${snapshot.path};
  `);
  await db.execute(sql`
    UPDATE "announcement_banners"
    SET "published" = false, "updated_at" = now()
    WHERE "link_url" = ${snapshot.path};
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Do not reopen a retired promotion on rollback.
  await db.execute(sql`SELECT 1;`);
}
