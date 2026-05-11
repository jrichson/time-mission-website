import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_landings_template" ADD VALUE IF NOT EXISTS 'paid_social_campaign';
    ALTER TYPE "public"."enum_landings_template" ADD VALUE IF NOT EXISTS 'local_venue_city';
    CREATE TYPE "public"."enum_landings_strategy_launch_state" AS ENUM('open', 'coming_soon');

    ALTER TABLE "landings"
      ADD COLUMN IF NOT EXISTS "strategy_audience" varchar,
      ADD COLUMN IF NOT EXISTS "strategy_campaign_goal" varchar,
      ADD COLUMN IF NOT EXISTS "strategy_offer_type" varchar,
      ADD COLUMN IF NOT EXISTS "strategy_location_or_city" varchar,
      ADD COLUMN IF NOT EXISTS "strategy_event_type" varchar,
      ADD COLUMN IF NOT EXISTS "strategy_launch_state" "enum_landings_strategy_launch_state" DEFAULT 'open',
      ADD COLUMN IF NOT EXISTS "strategy_proof_angle" varchar,
      ADD COLUMN IF NOT EXISTS "strategy_cta_intent" varchar,
      ADD COLUMN IF NOT EXISTS "paid_social_source_promise" varchar,
      ADD COLUMN IF NOT EXISTS "paid_social_friction_reducer" varchar,
      ADD COLUMN IF NOT EXISTS "local_venue_city_proof" varchar,
      ADD COLUMN IF NOT EXISTS "local_venue_venue_confidence" varchar,
      ADD COLUMN IF NOT EXISTS "local_venue_opening_note" varchar,
      ADD COLUMN IF NOT EXISTS "group_event_planner_reassurance" varchar,
      ADD COLUMN IF NOT EXISTS "group_event_group_size" varchar,
      ADD COLUMN IF NOT EXISTS "group_event_logistics_note" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "landings"
      DROP COLUMN IF EXISTS "strategy_audience",
      DROP COLUMN IF EXISTS "strategy_campaign_goal",
      DROP COLUMN IF EXISTS "strategy_offer_type",
      DROP COLUMN IF EXISTS "strategy_location_or_city",
      DROP COLUMN IF EXISTS "strategy_event_type",
      DROP COLUMN IF EXISTS "strategy_launch_state",
      DROP COLUMN IF EXISTS "strategy_proof_angle",
      DROP COLUMN IF EXISTS "strategy_cta_intent",
      DROP COLUMN IF EXISTS "paid_social_source_promise",
      DROP COLUMN IF EXISTS "paid_social_friction_reducer",
      DROP COLUMN IF EXISTS "local_venue_city_proof",
      DROP COLUMN IF EXISTS "local_venue_venue_confidence",
      DROP COLUMN IF EXISTS "local_venue_opening_note",
      DROP COLUMN IF EXISTS "group_event_planner_reassurance",
      DROP COLUMN IF EXISTS "group_event_group_size",
      DROP COLUMN IF EXISTS "group_event_logistics_note";

    DROP TYPE IF EXISTS "public"."enum_landings_strategy_launch_state";
  `)
}
