import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      CREATE TYPE "public"."enum_blog_posts_post_type" AS ENUM('article', 'external');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "media" (
      "id" serial PRIMARY KEY NOT NULL,
      "alt" varchar NOT NULL,
      "caption" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "url" varchar,
      "thumbnail_u_r_l" varchar,
      "filename" varchar,
      "mime_type" varchar,
      "filesize" numeric,
      "width" numeric,
      "height" numeric,
      "focal_x" numeric,
      "focal_y" numeric
    );

    ALTER TABLE "blog_posts"
      ADD COLUMN IF NOT EXISTS "post_type" "enum_blog_posts_post_type" DEFAULT 'article' NOT NULL,
      ADD COLUMN IF NOT EXISTS "external_url" varchar,
      ADD COLUMN IF NOT EXISTS "external_publisher" varchar,
      ADD COLUMN IF NOT EXISTS "hero_media_id" integer;

    ALTER TABLE "blog_posts" ALTER COLUMN "body" DROP NOT NULL;

    DO $$
    BEGIN
      ALTER TABLE "blog_posts"
        ADD CONSTRAINT "blog_posts_hero_media_id_media_id_fk"
        FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "blog_posts_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "media_id" integer
    );

    DO $$
    BEGIN
      ALTER TABLE "blog_posts_rels"
        ADD CONSTRAINT "blog_posts_rels_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."blog_posts"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$
    BEGIN
      ALTER TABLE "blog_posts_rels"
        ADD CONSTRAINT "blog_posts_rels_media_fk"
        FOREIGN KEY ("media_id") REFERENCES "public"."media"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "media_id" integer;

    DO $$
    BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_media_fk"
        FOREIGN KEY ("media_id") REFERENCES "public"."media"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "media_updated_at_idx" ON "media" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "media_created_at_idx" ON "media" USING btree ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "media_filename_idx" ON "media" USING btree ("filename");
    CREATE INDEX IF NOT EXISTS "blog_posts_hero_media_idx" ON "blog_posts" USING btree ("hero_media_id");
    CREATE INDEX IF NOT EXISTS "blog_posts_rels_order_idx" ON "blog_posts_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "blog_posts_rels_parent_idx" ON "blog_posts_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "blog_posts_rels_path_idx" ON "blog_posts_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "blog_posts_rels_media_id_idx" ON "blog_posts_rels" USING btree ("media_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_media_id_idx"
      ON "payload_locked_documents_rels" USING btree ("media_id");

    UPDATE "blog_posts"
    SET "post_type" = 'article'::"enum_blog_posts_post_type"
    WHERE "post_type" IS NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "blog_posts"
    SET "body" = jsonb_build_object(
      'root',
      jsonb_build_object(
        'type', 'root',
        'format', '',
        'indent', 0,
        'version', 1,
        'children',
        jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'format', '',
            'indent', 0,
            'version', 1,
            'children',
            jsonb_build_array()
          )
        )
      )
    )
    WHERE "body" IS NULL;

    ALTER TABLE "blog_posts" ALTER COLUMN "body" SET NOT NULL;

    DROP INDEX IF EXISTS "payload_locked_documents_rels_media_id_idx";
    DROP INDEX IF EXISTS "blog_posts_rels_media_id_idx";
    DROP INDEX IF EXISTS "blog_posts_rels_path_idx";
    DROP INDEX IF EXISTS "blog_posts_rels_parent_idx";
    DROP INDEX IF EXISTS "blog_posts_rels_order_idx";
    DROP INDEX IF EXISTS "blog_posts_hero_media_idx";
    DROP INDEX IF EXISTS "media_filename_idx";
    DROP INDEX IF EXISTS "media_created_at_idx";
    DROP INDEX IF EXISTS "media_updated_at_idx";

    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_media_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "media_id";

    DROP TABLE IF EXISTS "blog_posts_rels" CASCADE;

    ALTER TABLE "blog_posts" DROP CONSTRAINT IF EXISTS "blog_posts_hero_media_id_media_id_fk";
    ALTER TABLE "blog_posts"
      DROP COLUMN IF EXISTS "hero_media_id",
      DROP COLUMN IF EXISTS "external_publisher",
      DROP COLUMN IF EXISTS "external_url",
      DROP COLUMN IF EXISTS "post_type";

    DROP TABLE IF EXISTS "media" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_blog_posts_post_type";
  `);
}
