import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { EINDHOVEN_GROUP_FORM_SNAPSHOT } from '../migration-data/20260914_eindhoven_group_form_snapshot';

const { slug, groupFormUrls } = EINDHOVEN_GROUP_FORM_SNAPSHOT;

export async function up({ db }: MigrateUpArgs): Promise<void> {
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
  for (const [formKey, url] of Object.entries(groupFormUrls)) {
    await db.execute(sql`
      DELETE FROM "location_details_group_form_urls"
      WHERE "id" = ${`${slug}-${formKey}`}
        AND "url" = ${url};
    `);
  }
}
