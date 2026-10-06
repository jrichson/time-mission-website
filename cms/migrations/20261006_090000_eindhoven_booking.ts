import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';
import { EINDHOVEN_BOOKING_SNAPSHOT as snapshot } from '../migration-data/20261006_eindhoven_booking_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "site_pages"
    SET "title" = ${snapshot.page.title},
        "seo_meta_title" = ${snapshot.page.metaTitle},
        "seo_meta_description" = ${snapshot.page.metaDescription},
        "updated_at" = now()
    WHERE "path" = ${snapshot.page.path};
  `);

  await db.execute(sql`
    UPDATE "announcement_banners"
    SET "message" = ${snapshot.ticker}, "updated_at" = now()
    WHERE "id" IN (
      SELECT banners."id"
      FROM "announcement_banners" banners
      INNER JOIN "announcement_banners_target_locations" targets
        ON targets."_parent_id" = banners."id"
      WHERE targets."location_slug" = ${snapshot.slug}
        AND banners."title" = 'Current ticker: Eindhoven'
    );
  `);

  // The signup page is retired; /eindhoven/signup now redirects to /eindhoven.
  await db.execute(sql`
    UPDATE "site_pages" SET "published" = false, "updated_at" = now()
    WHERE "path" = ${snapshot.retiredSignupPath};
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Preserve current editorial copy; do not restore the retired signup page.
  await db.execute(sql`SELECT 1;`);
}
