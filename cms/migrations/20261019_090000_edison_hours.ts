import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';
import { EDISON_HOURS_SNAPSHOT as snapshot } from '../migration-data/20261019_edison_hours_snapshot';

const { hours } = snapshot;

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
    WHERE "location_slug"::text = ${snapshot.slug};
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Opening hours are kept; an open venue should not lose its hours.
  await db.execute(sql`SELECT 1;`);
}
