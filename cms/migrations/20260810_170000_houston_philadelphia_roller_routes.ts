import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { HOUSTON_PHILADELPHIA_JOTFORM_ROUTES_SNAPSHOT } from '../migration-data/20260810_houston_philadelphia_jotform_routes_snapshot';

async function writeGroupFormUrls(
  db: MigrateUpArgs['db'] | MigrateDownArgs['db'],
  useRollerUrl: boolean,
): Promise<void> {
  for (const location of HOUSTON_PHILADELPHIA_JOTFORM_ROUTES_SNAPSHOT) {
    let order = 0;
    for (const [formKey, jotformRoute] of Object.entries(location.groupFormUrls)) {
      const url = useRollerUrl ? location.previousGroupFormUrl : jotformRoute;
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
          ${`${location.slug}-${formKey}`},
          ${formKey},
          ${url}
        FROM "location_details" details
        WHERE details."location_slug"::text = ${location.slug}
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
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await writeGroupFormUrls(db, true);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await writeGroupFormUrls(db, false);
}
