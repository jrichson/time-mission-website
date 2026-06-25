import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "excerpt_rich" jsonb;
    ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "body_rich" jsonb;

    UPDATE "blog_posts"
    SET
      "excerpt_rich" = jsonb_build_object(
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
              jsonb_build_array(
                jsonb_build_object(
                  'detail', 0,
                  'format', 0,
                  'mode', 'normal',
                  'style', '',
                  'text', COALESCE("excerpt", ''),
                  'type', 'text',
                  'version', 1
                )
              )
            )
          )
        )
      )
    WHERE "excerpt_rich" IS NULL;

    UPDATE "blog_posts"
    SET
      "body_rich" = jsonb_build_object(
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
              jsonb_build_array(
                jsonb_build_object(
                  'detail', 0,
                  'format', 0,
                  'mode', 'normal',
                  'style', '',
                  'text', COALESCE("body", ''),
                  'type', 'text',
                  'version', 1
                )
              )
            )
          )
        )
      )
    WHERE "body_rich" IS NULL;

    ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "excerpt";
    ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "body";
    ALTER TABLE "blog_posts" RENAME COLUMN "excerpt_rich" TO "excerpt";
    ALTER TABLE "blog_posts" RENAME COLUMN "body_rich" TO "body";
    ALTER TABLE "blog_posts" ALTER COLUMN "excerpt" SET NOT NULL;
    ALTER TABLE "blog_posts" ALTER COLUMN "body" SET NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "excerpt_text" varchar;
    ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "body_text" varchar;

    UPDATE "blog_posts"
    SET
      "excerpt_text" = COALESCE("excerpt" #>> '{root,children,0,children,0,text}', ''),
      "body_text" = COALESCE("body" #>> '{root,children,0,children,0,text}', '')
    WHERE "excerpt_text" IS NULL OR "body_text" IS NULL;

    ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "excerpt";
    ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "body";
    ALTER TABLE "blog_posts" RENAME COLUMN "excerpt_text" TO "excerpt";
    ALTER TABLE "blog_posts" RENAME COLUMN "body_text" TO "body";
    ALTER TABLE "blog_posts" ALTER COLUMN "excerpt" SET NOT NULL;
    ALTER TABLE "blog_posts" ALTER COLUMN "body" SET NOT NULL;
  `);
}
