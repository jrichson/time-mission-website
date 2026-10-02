import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';
import { SCOTTSDALE_LOCATION_SNAPSHOT, SCOTTSDALE_PAGE_SNAPSHOT } from '../migration-data/20261001_scottsdale_snapshot';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const location = SCOTTSDALE_LOCATION_SNAPSHOT;
  const page = SCOTTSDALE_PAGE_SNAPSHOT;
  await db.execute(sql`
    INSERT INTO "location_details" (
      "title", "location_slug", "published", "address_line1", "address_city",
      "address_state", "address_zip", "address_country"
    ) VALUES (
      ${location.title}, ${location.slug}::"public"."enum_location_details_location_slug",
      true, ${location.address.line1}, ${location.address.city},
      ${location.address.state}, ${location.address.zip}, ${location.address.country}
    ) ON CONFLICT ("location_slug") DO NOTHING;
  `);

  await db.execute(sql`
    INSERT INTO "site_pages" (
      "title", "path", "published", "seo_meta_title", "seo_meta_description",
      "seo_robots", "seo_og_image", "seo_twitter_image"
    ) VALUES (
      ${page.title}, ${page.path}, true, ${page.metaTitle}, ${page.metaDescription},
      ${page.robots}::"enum_site_pages_seo_robots", ${page.ogImage}, ${page.twitterImage}
    ) ON CONFLICT ("path") DO NOTHING;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Preserve the venue and any subsequent editor changes.
  await db.execute(sql`SELECT 1;`);
}
