import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

const articleUrl =
  'https://www.masslive.com/boston/2026/08/new-escape-room-video-game-experience-expected-to-open-in-boston-in-2027.html';
const summary =
  'Grab your crew and race against the clock in this new gaming experience coming to Boston next year.';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
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
      "post_type",
      "external_url",
      "external_publisher",
      "hero_image",
      "seo_meta_title",
      "seo_meta_description",
      "seo_robots",
      "seo_og_image",
      "seo_twitter_image"
    )
    VALUES (
      'New escape room, video game experience expected to open in Boston in 2027',
      'masslive-boston-opening-2027',
      NULL,
      '2026-08-18T18:36:54.000Z',
      true,
      false,
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
                  'text', ${summary}, 'type', 'text', 'version', 1
                )
              )
            )
          )
        )
      ),
      NULL,
      'external'::"enum_blog_posts_post_type",
      ${articleUrl},
      'MassLive',
      '/assets/photos/experiences/Time-Mission_Big-Bang-1200.webp',
      'New escape room, video game experience expected to open in Boston in 2027',
      ${summary},
      'noindex,follow'::"enum_blog_posts_seo_robots",
      '/assets/photos/experiences/Time-Mission_Big-Bang-1200.webp',
      '/assets/photos/experiences/Time-Mission_Big-Bang-1200.webp'
    )
    ON CONFLICT ("slug") DO UPDATE
    SET
      "title" = EXCLUDED."title",
      "location_slug" = EXCLUDED."location_slug",
      "publish_date" = EXCLUDED."publish_date",
      "published" = EXCLUDED."published",
      "include_in_sitemap" = EXCLUDED."include_in_sitemap",
      "show_in_press_room" = EXCLUDED."show_in_press_room",
      "excerpt" = EXCLUDED."excerpt",
      "body" = EXCLUDED."body",
      "post_type" = EXCLUDED."post_type",
      "external_url" = EXCLUDED."external_url",
      "external_publisher" = EXCLUDED."external_publisher",
      "hero_image" = EXCLUDED."hero_image",
      "seo_meta_title" = EXCLUDED."seo_meta_title",
      "seo_meta_description" = EXCLUDED."seo_meta_description",
      "seo_robots" = EXCLUDED."seo_robots",
      "seo_og_image" = EXCLUDED."seo_og_image",
      "seo_twitter_image" = EXCLUDED."seo_twitter_image",
      "updated_at" = now();
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "blog_posts"
    WHERE "slug" = 'masslive-boston-opening-2027';
  `);
}
