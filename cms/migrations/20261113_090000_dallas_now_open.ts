import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';
import { DALLAS_NOW_OPEN_SNAPSHOT as snapshot } from '../migration-data/20261113_dallas_now_open_snapshot';

const { hours } = snapshot;

// Dallas opened on 13 November 2026.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
        "hours_mon_open" = ${hours.mon.open},
        "hours_mon_close" = ${hours.mon.close},
        "hours_mon_label" = ${hours.mon.label},
        "hours_tue_open" = ${hours.tue.open},
        "hours_tue_close" = ${hours.tue.close},
        "hours_tue_label" = ${hours.tue.label},
        "hours_wed_open" = ${hours.wed.open},
        "hours_wed_close" = ${hours.wed.close},
        "hours_wed_label" = ${hours.wed.label},
        "hours_thu_open" = ${hours.thu.open},
        "hours_thu_close" = ${hours.thu.close},
        "hours_thu_label" = ${hours.thu.label},
        "hours_fri_open" = ${hours.fri.open},
        "hours_fri_close" = ${hours.fri.close},
        "hours_fri_label" = ${hours.fri.label},
        "hours_sat_open" = ${hours.sat.open},
        "hours_sat_close" = ${hours.sat.close},
        "hours_sat_label" = ${hours.sat.label},
        "hours_sun_open" = ${hours.sun.open},
        "hours_sun_close" = ${hours.sun.close},
        "hours_sun_label" = ${hours.sun.label},
        "address_line1" = ${snapshot.addressLine1},
        "updated_at" = now()
    WHERE "location_slug"::text = ${snapshot.slug};
  `);

  await db.execute(sql`
    UPDATE "site_pages"
    SET "title" = ${snapshot.page.title},
        "seo_meta_title" = ${snapshot.page.metaTitle},
        "seo_meta_description" = ${snapshot.page.metaDescription},
        "updated_at" = now()
    WHERE "path" = ${snapshot.page.path};
  `);

  await db.execute(sql`
    UPDATE "site_pages"
    SET "seo_meta_description" = ${snapshot.educatorsPage.metaDescription},
        "updated_at" = now()
    WHERE "path" = ${snapshot.educatorsPage.path};
  `);

  await db.execute(sql`
    UPDATE "announcement_banners"
    SET "message" = ${snapshot.ticker}, "updated_at" = now()
    WHERE "message" = ${snapshot.previousTicker}
      AND "id" IN (
        SELECT "_parent_id" FROM "announcement_banners_target_locations"
        WHERE "location_slug"::text = ${snapshot.slug}
      );
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Opening hours and the corrected address are kept; a venue that has opened should not lose them.
  await db.execute(sql`
    UPDATE "site_pages"
    SET "seo_meta_description" = ${snapshot.previousEducatorsMetaDescription},
        "updated_at" = now()
    WHERE "path" = ${snapshot.educatorsPage.path}
      AND "seo_meta_description" = ${snapshot.educatorsPage.metaDescription};
  `);

  await db.execute(sql`
    UPDATE "site_pages"
    SET "title" = ${snapshot.previousPage.title},
        "seo_meta_title" = ${snapshot.previousPage.metaTitle},
        "seo_meta_description" = ${snapshot.previousPage.metaDescription},
        "updated_at" = now()
    WHERE "path" = ${snapshot.page.path}
      AND "seo_meta_title" = ${snapshot.page.metaTitle};
  `);

  await db.execute(sql`
    UPDATE "announcement_banners"
    SET "message" = ${snapshot.previousTicker}, "updated_at" = now()
    WHERE "message" = ${snapshot.ticker}
      AND "id" IN (
        SELECT "_parent_id" FROM "announcement_banners_target_locations"
        WHERE "location_slug"::text = ${snapshot.slug}
      );
  `);
}
