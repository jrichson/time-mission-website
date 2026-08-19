import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "blog_posts"
    SET
      "location_slug" = NULL,
      "updated_at" = now()
    WHERE "slug" IN ('boston-announcement', 'nashville-announcement');
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "blog_posts"
    SET
      "location_slug" = 'boston'::"enum_blog_posts_location_slug",
      "updated_at" = now()
    WHERE "slug" = 'boston-announcement';
  `);

  await db.execute(sql`
    UPDATE "blog_posts"
    SET
      "location_slug" = 'nashville'::"enum_blog_posts_location_slug",
      "updated_at" = now()
    WHERE "slug" = 'nashville-announcement';
  `);
}
