import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

const LINCOLN_DESCRIPTION =
  'Time Mission Lincoln, 25+ immersive challenge rooms for groups of 2–4. Book your mission today.'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "site_pages"
    SET
      "seo_meta_description" = ${LINCOLN_DESCRIPTION},
      "updated_at" = now()
    WHERE "path" = '/lincoln';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "site_pages"
    SET
      "seo_meta_description" = 'Time Mission Lincoln, 25+ immersive challenge rooms for groups of 2–5. Book your mission today.',
      "updated_at" = now()
    WHERE "path" = '/lincoln';
  `)
}
