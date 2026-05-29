import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_location_details_location_slug" AS ENUM(
      'mount-prospect',
      'philadelphia',
      'west-nyack',
      'lincoln',
      'manassas',
      'houston',
      'antwerp',
      'orland-park',
      'brussels',
      'dallas',
      'nashville'
    );

    CREATE TABLE "location_details" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "location_slug" "enum_location_details_location_slug" NOT NULL,
      "published" boolean DEFAULT true,
      "address_line1" varchar,
      "address_line2" varchar,
      "address_city" varchar NOT NULL,
      "address_state" varchar,
      "address_zip" varchar,
      "address_country" varchar NOT NULL,
      "hours_mon_label" varchar,
      "hours_mon_open" varchar,
      "hours_mon_close" varchar,
      "hours_tue_label" varchar,
      "hours_tue_open" varchar,
      "hours_tue_close" varchar,
      "hours_wed_label" varchar,
      "hours_wed_open" varchar,
      "hours_wed_close" varchar,
      "hours_thu_label" varchar,
      "hours_thu_open" varchar,
      "hours_thu_close" varchar,
      "hours_fri_label" varchar,
      "hours_fri_open" varchar,
      "hours_fri_close" varchar,
      "hours_sat_label" varchar,
      "hours_sat_open" varchar,
      "hours_sat_close" varchar,
      "hours_sun_label" varchar,
      "hours_sun_open" varchar,
      "hours_sun_close" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "location_details_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_location_details_fk" FOREIGN KEY ("location_details_id") REFERENCES "public"."location_details"("id") ON DELETE cascade ON UPDATE no action;

    CREATE UNIQUE INDEX "location_details_location_slug_idx" ON "location_details" USING btree ("location_slug");
    CREATE INDEX "location_details_updated_at_idx" ON "location_details" USING btree ("updated_at");
    CREATE INDEX "location_details_created_at_idx" ON "location_details" USING btree ("created_at");
    CREATE INDEX "payload_locked_documents_rels_location_details_id_idx" ON "payload_locked_documents_rels" USING btree ("location_details_id");

    INSERT INTO "location_details" (
      "title",
      "location_slug",
      "published",
      "address_line1",
      "address_line2",
      "address_city",
      "address_state",
      "address_zip",
      "address_country",
      "hours_mon_open",
      "hours_mon_close",
      "hours_mon_label",
      "hours_tue_open",
      "hours_tue_close",
      "hours_tue_label",
      "hours_wed_open",
      "hours_wed_close",
      "hours_wed_label",
      "hours_thu_open",
      "hours_thu_close",
      "hours_thu_label",
      "hours_fri_open",
      "hours_fri_close",
      "hours_fri_label",
      "hours_sat_open",
      "hours_sat_close",
      "hours_sat_label",
      "hours_sun_open",
      "hours_sun_close",
      "hours_sun_label"
    ) VALUES
      ('Time Mission Mount Prospect', 'mount-prospect', true, '132 Randhurst Village Drive', NULL, 'Mount Prospect', 'IL', '60056', 'United States', '12:00', '21:00', '12pm - 9pm', '12:00', '21:00', '12pm - 9pm', '12:00', '21:00', '12pm - 9pm', '12:00', '21:00', '12pm - 9pm', '12:00', '00:00', '12pm - Midnight', '10:00', '00:00', '10am - Midnight', '10:00', '20:00', '10am - 8pm'),
      ('Time Mission Philadelphia', 'philadelphia', true, '1530 Chestnut Street', NULL, 'Philadelphia', 'PA', '19102', 'United States', NULL, NULL, 'Temporarily closed', NULL, NULL, 'Temporarily closed', NULL, NULL, 'Temporarily closed', NULL, NULL, 'Temporarily closed', NULL, NULL, 'Temporarily closed', NULL, NULL, 'Temporarily closed', NULL, NULL, 'Temporarily closed'),
      ('Time Mission West Nyack', 'west-nyack', true, '3532 Palisades Center Dr', 'Level 3', 'West Nyack', 'NY', '10994', 'United States', '12:00', '21:00', '12pm - 9pm', '12:00', '21:00', '12pm - 9pm', '12:00', '21:00', '12pm - 9pm', '12:00', '21:00', '12pm - 9pm', '12:00', '23:00', '12pm - 11pm', '10:00', '23:00', '10am - 11pm', '10:00', '20:00', '10am - 8pm'),
      ('Time Mission Lincoln', 'lincoln', true, '100 Higginson Ave', NULL, 'Lincoln', 'RI', '02865', 'United States', '12:00', '23:00', '12pm - 11pm', '12:00', '23:00', '12pm - 11pm', '12:00', '23:00', '12pm - 11pm', '12:00', '23:00', '12pm - 11pm', '12:00', '00:00', '12pm - Midnight', '09:00', '00:00', '9am - Midnight', '09:00', '23:00', '9am - 11pm'),
      ('Time Mission Manassas', 'manassas', true, '8300 Sudley Rd', 'Unit A2', 'Manassas', 'VA', '20109', 'United States', '12:00', '21:00', '12pm - 9pm', '12:00', '21:00', '12pm - 9pm', '12:00', '21:00', '12pm - 9pm', '12:00', '21:00', '12pm - 9pm', '12:00', '00:00', '12pm - Midnight', '10:00', '00:00', '10am - Midnight', '10:00', '20:00', '10am - 8pm'),
      ('Time Mission Houston', 'houston', true, '7620 Katy Fwy', 'STE 355', 'Houston', 'TX', '77024', 'United States', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
      ('Time Mission Antwerp', 'antwerp', true, 'Michiganstraat 1', NULL, 'Antwerp', NULL, '2030', 'Belgium', '14:00', '23:00', '2pm - 11pm', '14:00', '23:00', '2pm - 11pm', '14:00', '23:00', '2pm - 11pm', '14:00', '23:00', '2pm - 11pm', '14:00', '23:00', '2pm - 11pm', '11:00', '23:00', '11am - 11pm', '11:00', '23:00', '11am - 11pm'),
      ('Time Mission Orland Park', 'orland-park', true, '66 Orland Square Dr', 'Suite C', 'Orland Park', 'IL', '60462', 'United States', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
      ('Time Mission Brussels', 'brussels', true, 'Av. Impératrice Charlotte', NULL, 'Bruxelles', NULL, '1020', 'Belgium', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
      ('Time Mission Dallas', 'dallas', true, NULL, NULL, 'Dallas', 'TX', NULL, 'United States', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
      ('Time Mission Nashville', 'nashville', true, '209 10th Avenue South', NULL, 'Nashville', 'TN', '37203', 'United States', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
    ON CONFLICT ("location_slug") DO NOTHING;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_location_details_id_idx";
    DROP INDEX IF EXISTS "location_details_created_at_idx";
    DROP INDEX IF EXISTS "location_details_updated_at_idx";
    DROP INDEX IF EXISTS "location_details_location_slug_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_location_details_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "location_details_id";
    DROP TABLE IF EXISTS "location_details" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_location_details_location_slug";
  `)
}
