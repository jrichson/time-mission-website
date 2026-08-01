import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { EU_LOCATION_OPERATIONAL_SNAPSHOT } from '../migration-data/20260731_eu_location_operational_snapshot';

const antwerp = EU_LOCATION_OPERATIONAL_SNAPSHOT.find((location) => location.slug === 'antwerp')!;
const brussels = EU_LOCATION_OPERATIONAL_SNAPSHOT.find((location) => location.slug === 'brussels')!;

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "hours_mon_open" = ${antwerp.hours.mon.open},
      "hours_mon_close" = ${antwerp.hours.mon.close},
      "hours_mon_label" = ${antwerp.hours.mon.label},
      "hours_tue_open" = ${antwerp.hours.tue.open},
      "hours_tue_close" = ${antwerp.hours.tue.close},
      "hours_tue_label" = ${antwerp.hours.tue.label},
      "hours_wed_open" = ${antwerp.hours.wed.open},
      "hours_wed_close" = ${antwerp.hours.wed.close},
      "hours_wed_label" = ${antwerp.hours.wed.label},
      "hours_thu_open" = ${antwerp.hours.thu.open},
      "hours_thu_close" = ${antwerp.hours.thu.close},
      "hours_thu_label" = ${antwerp.hours.thu.label},
      "hours_fri_open" = ${antwerp.hours.fri.open},
      "hours_fri_close" = ${antwerp.hours.fri.close},
      "hours_fri_label" = ${antwerp.hours.fri.label},
      "hours_sat_open" = ${antwerp.hours.sat.open},
      "hours_sat_close" = ${antwerp.hours.sat.close},
      "hours_sat_label" = ${antwerp.hours.sat.label},
      "hours_sun_open" = ${antwerp.hours.sun.open},
      "hours_sun_close" = ${antwerp.hours.sun.close},
      "hours_sun_label" = ${antwerp.hours.sun.label},
      "updated_at" = now()
    WHERE "location_slug"::text = 'antwerp';
  `);

  await db.execute(sql`
    UPDATE "location_details"
    SET
      "hours_mon_label" = ${brussels.hours.mon.label},
      "hours_tue_label" = ${brussels.hours.tue.label},
      "hours_wed_label" = ${brussels.hours.wed.label},
      "hours_thu_label" = ${brussels.hours.thu.label},
      "hours_fri_label" = ${brussels.hours.fri.label},
      "hours_sat_label" = ${brussels.hours.sat.label},
      "hours_sun_label" = ${brussels.hours.sun.label},
      "external_links_booking_url" = ${brussels.externalLinks.bookingUrl},
      "external_links_roller_checkout_url" = ${brussels.externalLinks.rollerCheckoutUrl},
      "updated_at" = now()
    WHERE "location_slug"::text = 'brussels';
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "hours_mon_open" = '14:00', "hours_mon_close" = '23:00', "hours_mon_label" = '2pm - 11pm',
      "hours_tue_open" = '14:00', "hours_tue_close" = '23:00', "hours_tue_label" = '2pm - 11pm',
      "hours_wed_open" = '14:00', "hours_wed_close" = '23:00', "hours_wed_label" = '2pm - 11pm',
      "hours_thu_open" = '14:00', "hours_thu_close" = '23:00', "hours_thu_label" = '2pm - 11pm',
      "hours_fri_open" = '14:00', "hours_fri_close" = '23:00', "hours_fri_label" = '2pm - 11pm',
      "hours_sat_open" = '11:00', "hours_sat_close" = '23:00', "hours_sat_label" = '11am - 11pm',
      "hours_sun_open" = '11:00', "hours_sun_close" = '23:00', "hours_sun_label" = '11am - 11pm',
      "updated_at" = now()
    WHERE "location_slug"::text = 'antwerp';
  `);

  await db.execute(sql`
    UPDATE "location_details"
    SET
      "hours_mon_label" = '12pm - 6pm',
      "hours_tue_label" = '12pm - 6pm',
      "hours_wed_label" = '12pm - 8pm',
      "hours_thu_label" = '12pm - 8pm',
      "hours_fri_label" = '12pm - 10pm',
      "hours_sat_label" = '10am - 10pm',
      "hours_sun_label" = '10am - 8pm',
      "external_links_booking_url" = 'https://timemission.eu/brussels',
      "external_links_roller_checkout_url" = NULL,
      "updated_at" = now()
    WHERE "location_slug"::text = 'brussels';
  `);
}
