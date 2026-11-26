import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';
import { HOLIDAY_HOURS_VA_IL_SNAPSHOT as snapshot } from '../migration-data/20261126_holiday_hours_va_il_snapshot';

const { idPrefix, locations, specialHours } = snapshot;

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const [order, hours] of specialHours.entries()) {
    await db.execute(sql`
      INSERT INTO "location_details_special_hours" (
        "_order", "_parent_id", "id", "date", "name", "label", "open", "close"
      )
      SELECT
        ${order},
        details."id",
        ${`${idPrefix}-${hours.date}-`} || details."location_slug"::text,
        ${hours.date},
        ${hours.name},
        ${hours.label},
        ${hours.open},
        ${hours.close}
      FROM "location_details" details
      WHERE details."location_slug"::text IN (${locations[0]}, ${locations[1]}, ${locations[2]})
      ON CONFLICT ("id") DO NOTHING;
    `);
  }

  await db.execute(sql`
    UPDATE "location_details"
    SET "updated_at" = now()
    WHERE "location_slug"::text IN (${locations[0]}, ${locations[1]}, ${locations[2]});
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "location_details_special_hours"
    WHERE "id" LIKE ${`${idPrefix}-%`};
  `);
}
