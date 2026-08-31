import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { BRUSSELS_OPERATIONAL_DETAILS_SNAPSHOT } from '../migration-data/20260831_brussels_operational_details_snapshot';

const {
  groupFormUrls,
  hours,
  previousHours,
  slug,
} = BRUSSELS_OPERATIONAL_DETAILS_SNAPSHOT;

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
      "updated_at" = now()
    WHERE "location_slug"::text = ${slug};
  `);

  let order = 0;
  for (const [formKey, url] of Object.entries(groupFormUrls)) {
    await db.execute(sql`
      INSERT INTO "location_details_group_form_urls" (
        "_order",
        "_parent_id",
        "id",
        "form_key",
        "url"
      )
      SELECT
        ${order},
        details."id",
        ${`${slug}-${formKey}`},
        ${formKey},
        ${url}
      FROM "location_details" details
      WHERE details."location_slug"::text = ${slug}
      ON CONFLICT ("id") DO UPDATE
      SET
        "_order" = EXCLUDED."_order",
        "_parent_id" = EXCLUDED."_parent_id",
        "form_key" = EXCLUDED."form_key",
        "url" = EXCLUDED."url";
    `);
    order += 1;
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "hours_mon_open" = ${previousHours.mon.open},
      "hours_mon_close" = ${previousHours.mon.close},
      "hours_mon_label" = ${previousHours.mon.label},
      "hours_tue_open" = ${previousHours.tue.open},
      "hours_tue_close" = ${previousHours.tue.close},
      "hours_tue_label" = ${previousHours.tue.label},
      "hours_wed_open" = ${previousHours.wed.open},
      "hours_wed_close" = ${previousHours.wed.close},
      "hours_wed_label" = ${previousHours.wed.label},
      "hours_thu_open" = ${previousHours.thu.open},
      "hours_thu_close" = ${previousHours.thu.close},
      "hours_thu_label" = ${previousHours.thu.label},
      "hours_fri_open" = ${previousHours.fri.open},
      "hours_fri_close" = ${previousHours.fri.close},
      "hours_fri_label" = ${previousHours.fri.label},
      "hours_sat_open" = ${previousHours.sat.open},
      "hours_sat_close" = ${previousHours.sat.close},
      "hours_sat_label" = ${previousHours.sat.label},
      "hours_sun_open" = ${previousHours.sun.open},
      "hours_sun_close" = ${previousHours.sun.close},
      "hours_sun_label" = ${previousHours.sun.label},
      "updated_at" = now()
    WHERE "location_slug"::text = ${slug}
      AND "hours_mon_open" IS NULL
      AND "hours_mon_close" IS NULL
      AND "hours_mon_label" = ${hours.mon.label}
      AND "hours_tue_open" IS NULL
      AND "hours_tue_close" IS NULL
      AND "hours_tue_label" = ${hours.tue.label}
      AND "hours_wed_open" = ${hours.wed.open}
      AND "hours_wed_close" = ${hours.wed.close}
      AND "hours_wed_label" = ${hours.wed.label}
      AND "hours_thu_open" = ${hours.thu.open}
      AND "hours_thu_close" = ${hours.thu.close}
      AND "hours_thu_label" = ${hours.thu.label}
      AND "hours_fri_open" = ${hours.fri.open}
      AND "hours_fri_close" = ${hours.fri.close}
      AND "hours_fri_label" = ${hours.fri.label}
      AND "hours_sat_open" = ${hours.sat.open}
      AND "hours_sat_close" = ${hours.sat.close}
      AND "hours_sat_label" = ${hours.sat.label}
      AND "hours_sun_open" = ${hours.sun.open}
      AND "hours_sun_close" = ${hours.sun.close}
      AND "hours_sun_label" = ${hours.sun.label};
  `);

  for (const [formKey, url] of Object.entries(groupFormUrls)) {
    await db.execute(sql`
      DELETE FROM "location_details_group_form_urls"
      WHERE "id" = ${`${slug}-${formKey}`}
        AND "url" = ${url};
    `);
  }
}
