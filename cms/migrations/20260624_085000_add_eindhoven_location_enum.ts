import { MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_location_details_location_slug" ADD VALUE IF NOT EXISTS 'eindhoven';
  `);
}

export async function down(): Promise<void> {}
