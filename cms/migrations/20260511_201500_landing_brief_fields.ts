import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      CREATE TYPE "public"."enum_landings_brief_source_channel" AS ENUM(
        'paid_ad',
        'organic_social',
        'email',
        'local_search',
        'partner',
        'internal',
        'other'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TABLE "landings"
      ADD COLUMN IF NOT EXISTS "brief_source_channel" "enum_landings_brief_source_channel" DEFAULT 'paid_ad',
      ADD COLUMN IF NOT EXISTS "brief_source_name" varchar,
      ADD COLUMN IF NOT EXISTS "brief_source_url" varchar,
      ADD COLUMN IF NOT EXISTS "brief_source_promise" varchar,
      ADD COLUMN IF NOT EXISTS "brief_visitor_intent" varchar,
      ADD COLUMN IF NOT EXISTS "brief_success_metric" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "landings"
      DROP COLUMN IF EXISTS "brief_source_channel",
      DROP COLUMN IF EXISTS "brief_source_name",
      DROP COLUMN IF EXISTS "brief_source_url",
      DROP COLUMN IF EXISTS "brief_source_promise",
      DROP COLUMN IF EXISTS "brief_visitor_intent",
      DROP COLUMN IF EXISTS "brief_success_metric";

    DROP TYPE IF EXISTS "public"."enum_landings_brief_source_channel";
  `);
}
