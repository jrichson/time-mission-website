import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_user_invites_delivery_method" AS ENUM('email', 'link');
    CREATE TYPE "public"."enum_user_invites_role" AS ENUM('admin', 'editor');
    CREATE TYPE "public"."enum_user_invites_status" AS ENUM('pending', 'sent', 'link_created', 'failed');

    CREATE TABLE "user_invites" (
      "id" serial PRIMARY KEY NOT NULL,
      "email" varchar NOT NULL,
      "role" "enum_user_invites_role" DEFAULT 'editor' NOT NULL,
      "delivery_method" "enum_user_invites_delivery_method" DEFAULT 'email' NOT NULL,
      "status" "enum_user_invites_status" DEFAULT 'pending' NOT NULL,
      "sent_at" timestamp(3) with time zone,
      "invite_link" varchar,
      "link_created_at" timestamp(3) with time zone,
      "error_message" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "user_invites_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_user_invites_fk" FOREIGN KEY ("user_invites_id") REFERENCES "public"."user_invites"("id") ON DELETE cascade ON UPDATE no action;

    CREATE INDEX "user_invites_email_idx" ON "user_invites" USING btree ("email");
    CREATE INDEX "user_invites_updated_at_idx" ON "user_invites" USING btree ("updated_at");
    CREATE INDEX "user_invites_created_at_idx" ON "user_invites" USING btree ("created_at");
    CREATE INDEX "payload_locked_documents_rels_user_invites_id_idx" ON "payload_locked_documents_rels" USING btree ("user_invites_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_user_invites_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_user_invites_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "user_invites_id";
    DROP TABLE IF EXISTS "user_invites" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_user_invites_status";
    DROP TYPE IF EXISTS "public"."enum_user_invites_role";
    DROP TYPE IF EXISTS "public"."enum_user_invites_delivery_method";
  `)
}
