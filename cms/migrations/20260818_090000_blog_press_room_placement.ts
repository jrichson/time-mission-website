import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "blog_posts"
      ADD COLUMN IF NOT EXISTS "show_in_press_room" boolean DEFAULT false NOT NULL;

    ALTER TABLE "blog_posts" ALTER COLUMN "location_slug" DROP NOT NULL;

    INSERT INTO "blog_posts" (
      "title",
      "slug",
      "location_slug",
      "publish_date",
      "published",
      "include_in_sitemap",
      "show_in_press_room",
      "excerpt",
      "body",
      "post_type"
    )
    VALUES (
      'Time Mission Is Coming to Boston',
      'boston-announcement',
      'boston'::"enum_blog_posts_location_slug",
      '2026-08-18T00:00:00.000Z',
      true,
      true,
      true,
      jsonb_build_object(
        'root', jsonb_build_object(
          'type', 'root', 'format', '', 'indent', 0, 'version', 1,
          'children', jsonb_build_array(
            jsonb_build_object(
              'type', 'paragraph', 'format', '', 'indent', 0, 'version', 1,
              'children', jsonb_build_array(
                jsonb_build_object(
                  'detail', 0, 'format', 0, 'mode', 'normal', 'style', '',
                  'text', 'Time Mission Boston is coming soon at 200 State St, Boston, MA 02109. Follow the official Boston location page for confirmed opening and ticket updates.',
                  'type', 'text', 'version', 1
                )
              )
            )
          )
        )
      ),
      jsonb_build_object(
        'root', jsonb_build_object(
          'type', 'root', 'format', '', 'indent', 0, 'version', 1,
          'children', jsonb_build_array(
            jsonb_build_object(
              'type', 'paragraph', 'format', '', 'indent', 0, 'version', 1,
              'children', jsonb_build_array(
                jsonb_build_object(
                  'detail', 0, 'format', 0, 'mode', 'normal', 'style', '',
                  'text', 'Time Mission is preparing to bring its social gaming adventure to 200 State St in Boston. Visit the Boston location page for confirmed opening and ticket updates.',
                  'type', 'text', 'version', 1
                )
              )
            )
          )
        )
      ),
      'article'::"enum_blog_posts_post_type"
    )
    ON CONFLICT ("slug") DO UPDATE
    SET "show_in_press_room" = true;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM "blog_posts" WHERE "location_slug" IS NULL) THEN
        ALTER TABLE "blog_posts" ALTER COLUMN "location_slug" SET NOT NULL;
      END IF;
    END $$;

    ALTER TABLE "blog_posts"
      DROP COLUMN IF EXISTS "show_in_press_room";
  `);
}
