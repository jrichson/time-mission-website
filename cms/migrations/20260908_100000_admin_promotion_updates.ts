import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { EINDHOVEN_SIGNUP_PAGE_SNAPSHOT as page } from '../migration-data/20260908_admin_promotion_updates_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "announcement_banners"
    SET "link_label" = 'Learn more', "link_url" = '/houston/school-night', "updated_at" = now()
    WHERE "id" IN (
      SELECT "_parent_id" FROM "announcement_banners_target_locations"
      WHERE "id" = 'september-2026-back-to-school-houston'
    );
  `);

  await db.execute(sql`
    INSERT INTO "site_pages" ("title", "path", "published", "seo_meta_title", "seo_meta_description", "seo_robots", "seo_og_image", "seo_twitter_image")
    VALUES (${page.title}, ${page.path}, true, ${page.metaTitle}, ${page.metaDescription}, ${page.robots}::"public"."enum_site_pages_seo_robots", ${page.ogImage}, ${page.twitterImage})
    ON CONFLICT ("path") DO NOTHING;
  `);

  // Remove these locations from shared banners without disabling other venues.
  await db.execute(sql`
    UPDATE "announcement_banners" SET "published" = false, "updated_at" = now()
    WHERE "target_scope" = 'locations'
      AND "id" IN (
        SELECT "_parent_id" FROM "announcement_banners_target_locations"
        WHERE "location_slug" IN ('west-nyack', 'lincoln')
      )
      AND "id" NOT IN (
        SELECT "_parent_id" FROM "announcement_banners_target_locations"
        WHERE "location_slug" NOT IN ('west-nyack', 'lincoln')
      );
    DELETE FROM "announcement_banners_target_locations"
    WHERE "location_slug" IN ('west-nyack', 'lincoln');
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Do not restore expired promotions or overwrite later editorial changes.
  await db.execute(sql`SELECT 1;`);
}
