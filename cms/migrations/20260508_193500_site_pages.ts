import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_site_pages_seo_robots" AS ENUM('index,follow', 'noindex,follow');

    CREATE TABLE "site_pages" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "path" varchar NOT NULL,
      "published" boolean DEFAULT true,
      "seo_meta_title" varchar NOT NULL,
      "seo_meta_description" varchar NOT NULL,
      "seo_robots" "enum_site_pages_seo_robots" DEFAULT 'index,follow',
      "seo_og_image" varchar NOT NULL,
      "seo_twitter_image" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor';
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "site_pages_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_site_pages_fk" FOREIGN KEY ("site_pages_id") REFERENCES "public"."site_pages"("id") ON DELETE cascade ON UPDATE no action;

    CREATE UNIQUE INDEX "site_pages_path_idx" ON "site_pages" USING btree ("path");
    CREATE INDEX "site_pages_updated_at_idx" ON "site_pages" USING btree ("updated_at");
    CREATE INDEX "site_pages_created_at_idx" ON "site_pages" USING btree ("created_at");
    CREATE INDEX "payload_locked_documents_rels_site_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("site_pages_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_site_pages_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_site_pages_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "site_pages_id";
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'admin';
    DROP TABLE IF EXISTS "site_pages" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_site_pages_seo_robots";
  `)
}
