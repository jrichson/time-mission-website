import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      CREATE TYPE "public"."enum_blog_posts_location_slug" AS ENUM(
        'mount-prospect',
        'philadelphia',
        'west-nyack',
        'lincoln',
        'manassas',
        'houston',
        'antwerp',
        'orland-park',
        'brussels',
        'eindhoven',
        'dallas',
        'nashville'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$
    BEGIN
      CREATE TYPE "public"."enum_blog_posts_seo_robots" AS ENUM('index,follow', 'noindex,follow');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "blog_posts" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "location_slug" "enum_blog_posts_location_slug" NOT NULL,
      "publish_date" timestamp(3) with time zone NOT NULL,
      "published" boolean DEFAULT false,
      "include_in_sitemap" boolean DEFAULT true,
      "excerpt" varchar NOT NULL,
      "hero_image" varchar DEFAULT '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg',
      "body" varchar NOT NULL,
      "seo_meta_title" varchar,
      "seo_meta_description" varchar,
      "seo_robots" "enum_blog_posts_seo_robots" DEFAULT 'index,follow',
      "seo_og_image" varchar,
      "seo_twitter_image" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "blog_posts_id" integer;

    DO $$
    BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_blog_posts_fk"
        FOREIGN KEY ("blog_posts_id") REFERENCES "public"."blog_posts"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "blog_posts_location_slug_idx" ON "blog_posts" USING btree ("location_slug");
    CREATE INDEX IF NOT EXISTS "blog_posts_publish_date_idx" ON "blog_posts" USING btree ("publish_date");
    CREATE INDEX IF NOT EXISTS "blog_posts_updated_at_idx" ON "blog_posts" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "blog_posts_created_at_idx" ON "blog_posts" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_blog_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_posts_id");

    UPDATE "location_details"
    SET
      "address_line1" = '5307 E. Mockingbird Ln',
      "address_line2" = 'Ste 200 & 201',
      "address_city" = 'Dallas',
      "address_state" = 'TX',
      "address_zip" = '75206',
      "address_country" = 'United States'
    WHERE "location_slug" = 'dallas';

    INSERT INTO "location_details" (
      "title",
      "location_slug",
      "published",
      "address_line1",
      "address_line2",
      "address_city",
      "address_state",
      "address_zip",
      "address_country"
    )
    VALUES
      ('Time Mission Eindhoven', 'eindhoven', true, NULL, NULL, 'Eindhoven', NULL, NULL, 'Netherlands')
    ON CONFLICT ("location_slug") DO UPDATE
    SET
      "title" = EXCLUDED."title",
      "published" = EXCLUDED."published",
      "address_line1" = EXCLUDED."address_line1",
      "address_line2" = EXCLUDED."address_line2",
      "address_city" = EXCLUDED."address_city",
      "address_state" = EXCLUDED."address_state",
      "address_zip" = EXCLUDED."address_zip",
      "address_country" = EXCLUDED."address_country";

    INSERT INTO "site_pages" (
      "title",
      "path",
      "published",
      "seo_meta_title",
      "seo_meta_description",
      "seo_robots",
      "seo_og_image",
      "seo_twitter_image"
    )
    VALUES
      ('Donate | Time Mission', '/donation', true, 'Donate | Time Mission', 'Support Time Mission programs and community partnerships. Donation links are being connected by location.', 'index,follow'::"enum_site_pages_seo_robots", '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg', '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg'),
      ('Blog | Time Mission', '/blog', true, 'Blog | Time Mission', 'Updates from Time Mission locations, including openings, mission notes, group ideas, and local event news.', 'index,follow'::"enum_site_pages_seo_robots", '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg', '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg'),
      ('Press | Time Mission', '/press', true, 'Press | Time Mission', 'Time Mission press resources, including releases, approved images, in-the-news links, and brand guidelines.', 'index,follow'::"enum_site_pages_seo_robots", '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg', '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg'),
      ('Press Releases | Time Mission', '/press/releases', true, 'Press Releases | Time Mission', 'Official Time Mission press releases and company announcements.', 'index,follow'::"enum_site_pages_seo_robots", '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg', '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg'),
      ('Press Images | Time Mission', '/press/images', true, 'Press Images | Time Mission', 'Approved Time Mission images for press and editorial use.', 'index,follow'::"enum_site_pages_seo_robots", '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg', '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg'),
      ('In the News | Time Mission', '/press/in-the-news', true, 'In the News | Time Mission', 'Media coverage and editorial mentions of Time Mission.', 'index,follow'::"enum_site_pages_seo_robots", '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg', '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg'),
      ('Brand Guidelines | Time Mission', '/press/brand-guidelines', true, 'Brand Guidelines | Time Mission', 'Time Mission logos, brand guidance, and press usage notes.', 'index,follow'::"enum_site_pages_seo_robots", '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg', '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg'),
      ('Time Mission Eindhoven | Coming Soon', '/eindhoven', true, 'Time Mission Eindhoven | Coming Soon', 'Time Mission Eindhoven is coming soon in the Netherlands. Contact the location team for launch timing and opening updates.', 'index,follow'::"enum_site_pages_seo_robots", '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg', '/assets/photos/experiences/Time-Mission_Magma_Mayhem-2.jpg')
    ON CONFLICT ("path") DO NOTHING;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "site_pages"
    WHERE "path" IN (
      '/donation',
      '/blog',
      '/press',
      '/press/releases',
      '/press/images',
      '/press/in-the-news',
      '/press/brand-guidelines',
      '/eindhoven'
    );

    DELETE FROM "location_details"
    WHERE "location_slug" = 'eindhoven';

    UPDATE "location_details"
    SET
      "address_line1" = NULL,
      "address_line2" = NULL,
      "address_city" = 'Dallas',
      "address_state" = 'TX',
      "address_zip" = NULL,
      "address_country" = 'United States'
    WHERE "location_slug" = 'dallas';

    DROP INDEX IF EXISTS "payload_locked_documents_rels_blog_posts_id_idx";
    DROP INDEX IF EXISTS "blog_posts_created_at_idx";
    DROP INDEX IF EXISTS "blog_posts_updated_at_idx";
    DROP INDEX IF EXISTS "blog_posts_publish_date_idx";
    DROP INDEX IF EXISTS "blog_posts_location_slug_idx";
    DROP INDEX IF EXISTS "blog_posts_slug_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_blog_posts_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "blog_posts_id";
    DROP TABLE IF EXISTS "blog_posts" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_blog_posts_seo_robots";
    DROP TYPE IF EXISTS "public"."enum_blog_posts_location_slug";
  `);
}
