import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { MOUNT_PROSPECT_ORLAND_PARK_NOON_HOURS_SNAPSHOT } from '../migration-data/20260907_mount_prospect_orland_park_noon_hours_snapshot';

const {
  locations,
  previousWeekdayHours,
  weekdayHours,
} = MOUNT_PROSPECT_ORLAND_PARK_NOON_HOURS_SNAPSHOT;

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "hours_mon_open" = ${weekdayHours.mon.open},
      "hours_mon_label" = ${weekdayHours.mon.label},
      "hours_tue_open" = ${weekdayHours.tue.open},
      "hours_tue_label" = ${weekdayHours.tue.label},
      "hours_wed_open" = ${weekdayHours.wed.open},
      "hours_wed_label" = ${weekdayHours.wed.label},
      "hours_thu_open" = ${weekdayHours.thu.open},
      "hours_thu_label" = ${weekdayHours.thu.label},
      "hours_fri_open" = ${weekdayHours.fri.open},
      "hours_fri_label" = ${weekdayHours.fri.label},
      "updated_at" = now()
    WHERE "location_slug"::text IN (${locations[0]}, ${locations[1]});
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "hours_mon_open" = ${previousWeekdayHours.mon.open},
      "hours_mon_label" = ${previousWeekdayHours.mon.label},
      "hours_tue_open" = ${previousWeekdayHours.tue.open},
      "hours_tue_label" = ${previousWeekdayHours.tue.label},
      "hours_wed_open" = ${previousWeekdayHours.wed.open},
      "hours_wed_label" = ${previousWeekdayHours.wed.label},
      "hours_thu_open" = ${previousWeekdayHours.thu.open},
      "hours_thu_label" = ${previousWeekdayHours.thu.label},
      "hours_fri_open" = ${previousWeekdayHours.fri.open},
      "hours_fri_label" = ${previousWeekdayHours.fri.label},
      "updated_at" = now()
    WHERE "location_slug"::text IN (${locations[0]}, ${locations[1]})
      AND "hours_mon_open" = ${weekdayHours.mon.open}
      AND "hours_mon_label" = ${weekdayHours.mon.label}
      AND "hours_tue_open" = ${weekdayHours.tue.open}
      AND "hours_tue_label" = ${weekdayHours.tue.label}
      AND "hours_wed_open" = ${weekdayHours.wed.open}
      AND "hours_wed_label" = ${weekdayHours.wed.label}
      AND "hours_thu_open" = ${weekdayHours.thu.open}
      AND "hours_thu_label" = ${weekdayHours.thu.label}
      AND "hours_fri_open" = ${weekdayHours.fri.open}
      AND "hours_fri_label" = ${weekdayHours.fri.label};
  `);
}
