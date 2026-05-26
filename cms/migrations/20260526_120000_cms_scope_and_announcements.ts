import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_announcement_banners_target_scope" AS ENUM('global', 'regions', 'locations');
    CREATE TYPE "public"."enum_announcement_banners_target_regions_region" AS ENUM('us', 'europe');

    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_deploy" boolean DEFAULT false;

    CREATE TABLE "announcement_banners" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "priority" numeric DEFAULT 0,
      "message" varchar NOT NULL,
      "published" boolean DEFAULT false,
      "starts_at" timestamp(3) with time zone,
      "ends_at" timestamp(3) with time zone,
      "target_scope" "enum_announcement_banners_target_scope" DEFAULT 'global' NOT NULL,
      "link_label" varchar,
      "link_url" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE "announcement_banners_target_regions" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "region" "enum_announcement_banners_target_regions_region" NOT NULL
    );

    CREATE TABLE "announcement_banners_target_locations" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "location_slug" varchar NOT NULL
    );

    ALTER TABLE "announcement_banners_target_regions" ADD CONSTRAINT "announcement_banners_target_regions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."announcement_banners"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "announcement_banners_target_locations" ADD CONSTRAINT "announcement_banners_target_locations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."announcement_banners"("id") ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "announcement_banners_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_announcement_banners_fk" FOREIGN KEY ("announcement_banners_id") REFERENCES "public"."announcement_banners"("id") ON DELETE cascade ON UPDATE no action;

    CREATE INDEX "announcement_banners_target_regions_order_idx" ON "announcement_banners_target_regions" USING btree ("_order");
    CREATE INDEX "announcement_banners_target_regions_parent_id_idx" ON "announcement_banners_target_regions" USING btree ("_parent_id");
    CREATE INDEX "announcement_banners_target_locations_order_idx" ON "announcement_banners_target_locations" USING btree ("_order");
    CREATE INDEX "announcement_banners_target_locations_parent_id_idx" ON "announcement_banners_target_locations" USING btree ("_parent_id");
    CREATE INDEX "announcement_banners_updated_at_idx" ON "announcement_banners" USING btree ("updated_at");
    CREATE INDEX "announcement_banners_created_at_idx" ON "announcement_banners" USING btree ("created_at");
    CREATE INDEX "payload_locked_documents_rels_announcement_banners_id_idx" ON "payload_locked_documents_rels" USING btree ("announcement_banners_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_announcement_banners_id_idx";
    DROP INDEX IF EXISTS "announcement_banners_created_at_idx";
    DROP INDEX IF EXISTS "announcement_banners_updated_at_idx";
    DROP INDEX IF EXISTS "announcement_banners_target_locations_parent_id_idx";
    DROP INDEX IF EXISTS "announcement_banners_target_locations_order_idx";
    DROP INDEX IF EXISTS "announcement_banners_target_regions_parent_id_idx";
    DROP INDEX IF EXISTS "announcement_banners_target_regions_order_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_announcement_banners_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "announcement_banners_id";
    DROP TABLE IF EXISTS "announcement_banners_target_locations" CASCADE;
    DROP TABLE IF EXISTS "announcement_banners_target_regions" CASCADE;
    DROP TABLE IF EXISTS "announcement_banners" CASCADE;
    ALTER TABLE "users" DROP COLUMN IF EXISTS "can_deploy";
    DROP TYPE IF EXISTS "public"."enum_announcement_banners_target_regions_region";
    DROP TYPE IF EXISTS "public"."enum_announcement_banners_target_scope";
  `)
}
