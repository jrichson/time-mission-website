import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "location_details_hidden_mission_ids" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "mission_id" varchar NOT NULL
    );

    DO $$
    BEGIN
      ALTER TABLE "location_details_hidden_mission_ids"
        ADD CONSTRAINT "location_details_hidden_mission_ids_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."location_details"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "location_details_hidden_mission_ids_order_idx"
      ON "location_details_hidden_mission_ids" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "location_details_hidden_mission_ids_parent_id_idx"
      ON "location_details_hidden_mission_ids" USING btree ("_parent_id");

    INSERT INTO "location_details_hidden_mission_ids" (
      "_order",
      "_parent_id",
      "id",
      "mission_id"
    )
    SELECT seed."_order", details."id", seed."id", seed."mission_id"
    FROM (
      VALUES
        ('mount-prospect', 0, 'mount-prospect-hidden-1005', '1005'),
        ('mount-prospect', 1, 'mount-prospect-hidden-1011', '1011'),
        ('mount-prospect', 2, 'mount-prospect-hidden-1017', '1017'),
        ('mount-prospect', 3, 'mount-prospect-hidden-1025', '1025'),
        ('mount-prospect', 4, 'mount-prospect-hidden-1027', '1027'),
        ('philadelphia', 0, 'philadelphia-hidden-1004', '1004'),
        ('philadelphia', 1, 'philadelphia-hidden-1005', '1005'),
        ('philadelphia', 2, 'philadelphia-hidden-1011', '1011'),
        ('philadelphia', 3, 'philadelphia-hidden-1025', '1025'),
        ('philadelphia', 4, 'philadelphia-hidden-1027', '1027'),
        ('philadelphia', 5, 'philadelphia-hidden-1031', '1031'),
        ('west-nyack', 0, 'west-nyack-hidden-1011', '1011'),
        ('lincoln', 0, 'lincoln-hidden-1004', '1004'),
        ('lincoln', 1, 'lincoln-hidden-1005', '1005'),
        ('lincoln', 2, 'lincoln-hidden-1006', '1006'),
        ('lincoln', 3, 'lincoln-hidden-1017', '1017'),
        ('lincoln', 4, 'lincoln-hidden-1025', '1025'),
        ('lincoln', 5, 'lincoln-hidden-1026', '1026'),
        ('lincoln', 6, 'lincoln-hidden-1027', '1027'),
        ('lincoln', 7, 'lincoln-hidden-1033', '1033'),
        ('manassas', 0, 'manassas-hidden-1005', '1005'),
        ('manassas', 1, 'manassas-hidden-1011', '1011'),
        ('manassas', 2, 'manassas-hidden-1012', '1012'),
        ('manassas', 3, 'manassas-hidden-1025', '1025'),
        ('houston', 0, 'houston-hidden-1005', '1005'),
        ('houston', 1, 'houston-hidden-1011', '1011'),
        ('houston', 2, 'houston-hidden-1020', '1020'),
        ('houston', 3, 'houston-hidden-1025', '1025'),
        ('houston', 4, 'houston-hidden-1027', '1027'),
        ('houston', 5, 'houston-hidden-1030', '1030'),
        ('antwerp', 0, 'antwerp-hidden-1003', '1003'),
        ('antwerp', 1, 'antwerp-hidden-1005', '1005'),
        ('antwerp', 2, 'antwerp-hidden-1012', '1012'),
        ('antwerp', 3, 'antwerp-hidden-1015', '1015'),
        ('antwerp', 4, 'antwerp-hidden-1016', '1016'),
        ('antwerp', 5, 'antwerp-hidden-1020', '1020'),
        ('orland-park', 0, 'orland-park-hidden-1002', '1002'),
        ('orland-park', 1, 'orland-park-hidden-1005', '1005'),
        ('orland-park', 2, 'orland-park-hidden-1006', '1006'),
        ('orland-park', 3, 'orland-park-hidden-1023', '1023'),
        ('orland-park', 4, 'orland-park-hidden-1025', '1025'),
        ('brussels', 0, 'brussels-hidden-1001', '1001'),
        ('brussels', 1, 'brussels-hidden-1005', '1005'),
        ('brussels', 2, 'brussels-hidden-1012', '1012'),
        ('brussels', 3, 'brussels-hidden-1015', '1015'),
        ('brussels', 4, 'brussels-hidden-1016', '1016'),
        ('brussels', 5, 'brussels-hidden-1018', '1018'),
        ('brussels', 6, 'brussels-hidden-1027', '1027')
    ) AS seed("location_slug", "_order", "id", "mission_id")
    INNER JOIN "location_details" details
      ON details."location_slug"::text = seed."location_slug"
    ON CONFLICT ("id") DO UPDATE
    SET
      "_order" = EXCLUDED."_order",
      "_parent_id" = EXCLUDED."_parent_id",
      "mission_id" = EXCLUDED."mission_id";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "location_details_hidden_mission_ids_parent_id_idx";
    DROP INDEX IF EXISTS "location_details_hidden_mission_ids_order_idx";
    ALTER TABLE "location_details_hidden_mission_ids" DROP CONSTRAINT IF EXISTS "location_details_hidden_mission_ids_parent_id_fk";
    DROP TABLE IF EXISTS "location_details_hidden_mission_ids" CASCADE;
  `)
}
