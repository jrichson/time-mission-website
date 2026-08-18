import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { PRESS_RELEASES_SNAPSHOT } from '../migration-data/20260818_press_releases_snapshot';
import { plainTextLexicalState } from '../lib/blog-authoring';

const bostonPlaceholderExcerpt = plainTextLexicalState(
  'Time Mission Boston is coming soon at 200 State St, Boston, MA 02109. Follow the official Boston location page for confirmed opening and ticket updates.',
);
const bostonPlaceholderBody = plainTextLexicalState(
  'Time Mission is preparing to bring its social gaming adventure to 200 State St in Boston. Visit the Boston location page for confirmed opening and ticket updates.',
);

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const release of PRESS_RELEASES_SNAPSHOT) {
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
        "hero_image",
        "seo_meta_title",
        "seo_meta_description",
        "seo_robots",
        "seo_og_image",
        "seo_twitter_image"
      )
      VALUES (
        ${release.title},
        ${release.slug},
        ${release.locationSlug}::"enum_blog_posts_location_slug",
        ${release.publishDate},
        true,
        true,
        true,
        ${JSON.stringify(release.excerpt)}::jsonb,
        ${JSON.stringify(release.body)}::jsonb,
        'article'::"enum_blog_posts_post_type",
        ${release.heroImage},
        ${release.seo.metaTitle},
        ${release.seo.metaDescription},
        'index,follow'::"enum_blog_posts_seo_robots",
        ${release.heroImage},
        ${release.heroImage}
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
        "hero_image" = EXCLUDED."hero_image",
        "seo_meta_title" = EXCLUDED."seo_meta_title",
        "seo_meta_description" = EXCLUDED."seo_meta_description",
        "seo_robots" = EXCLUDED."seo_robots",
        "seo_og_image" = EXCLUDED."seo_og_image",
        "seo_twitter_image" = EXCLUDED."seo_twitter_image",
        "updated_at" = now();
    `);
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "blog_posts"
    WHERE "slug" = 'time-mission-global-expansion-2027';
  `);

  await db.execute(sql`
    UPDATE "blog_posts"
    SET
      "title" = 'Time Mission Is Coming to Boston',
      "publish_date" = '2026-08-18T00:00:00.000Z',
      "hero_image" = '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg',
      "excerpt" = ${JSON.stringify(bostonPlaceholderExcerpt)}::jsonb,
      "body" = ${JSON.stringify(bostonPlaceholderBody)}::jsonb,
      "seo_meta_title" = NULL,
      "seo_meta_description" = NULL,
      "seo_og_image" = NULL,
      "seo_twitter_image" = NULL,
      "updated_at" = now()
    WHERE "slug" = 'boston-announcement';
  `);
}
