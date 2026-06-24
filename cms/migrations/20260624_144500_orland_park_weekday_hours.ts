import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "hours_mon_open" = '11:00',
      "hours_mon_label" = '11am - 9pm',
      "hours_tue_open" = '11:00',
      "hours_tue_label" = '11am - 9pm',
      "hours_wed_open" = '11:00',
      "hours_wed_label" = '11am - 9pm',
      "hours_thu_open" = '11:00',
      "hours_thu_label" = '11am - 9pm',
      "hours_fri_open" = '11:00',
      "hours_fri_label" = '11am - Midnight',
      "updated_at" = now()
    WHERE "location_slug" = 'orland-park';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "location_details"
    SET
      "hours_mon_open" = '10:00',
      "hours_mon_label" = '10am - 9pm',
      "hours_tue_open" = '10:00',
      "hours_tue_label" = '10am - 9pm',
      "hours_wed_open" = '10:00',
      "hours_wed_label" = '10am - 9pm',
      "hours_thu_open" = '10:00',
      "hours_thu_label" = '10am - 9pm',
      "hours_fri_open" = '10:00',
      "hours_fri_label" = '10am - Midnight',
      "updated_at" = now()
    WHERE "location_slug" = 'orland-park';
  `)
}
