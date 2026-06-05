import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_announcement_banners_ticker_behavior" AS ENUM('auto', 'static', 'animated');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    ALTER TABLE "announcement_banners"
      ADD COLUMN IF NOT EXISTS "ticker_behavior" "public"."enum_announcement_banners_ticker_behavior" DEFAULT 'auto' NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "announcement_banners" DROP COLUMN IF EXISTS "ticker_behavior";
    DROP TYPE IF EXISTS "public"."enum_announcement_banners_ticker_behavior";
  `)
}
