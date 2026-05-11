import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_landings_template" AS ENUM('campaign', 'paid_social_campaign', 'group_event', 'location_promo', 'local_venue_city', 'coming_soon');
    ALTER TABLE "landings" ADD COLUMN "template" "enum_landings_template" DEFAULT 'paid_social_campaign' NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "landings" DROP COLUMN IF EXISTS "template";
    DROP TYPE IF EXISTS "public"."enum_landings_template";
  `)
}
