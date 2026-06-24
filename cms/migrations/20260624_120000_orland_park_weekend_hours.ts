import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "hours_sat_open" = '11:00',
      "hours_sat_label" = '11am - Midnight',
      "hours_sun_open" = '11:00',
      "hours_sun_label" = '11am - 8pm',
      "updated_at" = now()
    WHERE "location_slug" = 'orland-park';
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "hours_sat_open" = '10:00',
      "hours_sat_label" = '10am - Midnight',
      "hours_sun_open" = '10:00',
      "hours_sun_label" = '10am - 8pm',
      "updated_at" = now()
    WHERE "location_slug" = 'orland-park';
  `);
}
