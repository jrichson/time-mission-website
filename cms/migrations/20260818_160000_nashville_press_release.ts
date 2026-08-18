import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import { PRESS_RELEASES_SNAPSHOT } from '../migration-data/20260818_press_releases_snapshot';

const nashvilleRelease = PRESS_RELEASES_SNAPSHOT.find(
  (release) => release.slug === 'nashville-announcement',
)!;

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
      "hero_image",
      "seo_meta_title",
      "seo_meta_description",
      "seo_robots",
      "seo_og_image",
      "seo_twitter_image"
    )
    VALUES (
      ${nashvilleRelease.title},
      ${nashvilleRelease.slug},
      ${nashvilleRelease.locationSlug}::"enum_blog_posts_location_slug",
      ${nashvilleRelease.publishDate},
      true,
      true,
      true,
      ${JSON.stringify(nashvilleRelease.excerpt)}::jsonb,
      ${JSON.stringify(nashvilleRelease.body)}::jsonb,
      'article'::"enum_blog_posts_post_type",
      ${nashvilleRelease.heroImage},
      ${nashvilleRelease.seo.metaTitle},
      ${nashvilleRelease.seo.metaDescription},
      'index,follow'::"enum_blog_posts_seo_robots",
      ${nashvilleRelease.heroImage},
      ${nashvilleRelease.heroImage}
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

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "blog_posts"
    WHERE "slug" = 'nashville-announcement';
  `);
}
