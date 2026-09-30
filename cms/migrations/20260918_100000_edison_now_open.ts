import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';
import { EDISON_NOW_OPEN_SNAPSHOT } from '../migration-data/20260918_edison_now_open_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const { slug, ticker, bookingUrl, page } = EDISON_NOW_OPEN_SNAPSHOT;
  await db.execute(sql`
    UPDATE "location_details"
    SET "external_links_booking_url" = ${bookingUrl}, "updated_at" = now()
    WHERE "location_slug"::text = ${slug};
  `);
  await db.execute(sql`
    UPDATE "site_pages"
    SET "title" = ${page.title}, "seo_meta_title" = ${page.metaTitle},
        "seo_meta_description" = ${page.metaDescription}, "updated_at" = now()
    WHERE "path" = ${page.path};
  `);
  await db.execute(sql`
    UPDATE "announcement_banners"
    SET "message" = ${ticker}, "updated_at" = now()
    WHERE "id" IN (
      SELECT banners."id" FROM "announcement_banners" banners
      INNER JOIN "announcement_banners_target_locations" locations
        ON locations."_parent_id" = banners."id"
      WHERE locations."location_slug"::text = ${slug}
        AND (banners."title" = 'Current ticker: Edison'
          OR lower(banners."message") = lower('EDISON COMING SOON'))
    );
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`SELECT 1;`);
}
