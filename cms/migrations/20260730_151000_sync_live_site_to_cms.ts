import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

import {
  LIVE_SITE_LOCATION_SNAPSHOT,
  LIVE_SITE_PAGE_SNAPSHOT,
} from './20260730_150000_live_site_snapshot';

const HOUR_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type HourDay = (typeof HOUR_DAYS)[number];
type HourValue = { close?: string; label?: string; open?: string };
type LocationSnapshot = {
  address: {
    city: string;
    country: string;
    line1: string | null;
    line2: string | null;
    state: string | null;
    zip: string | null;
  };
  externalLinks: {
    bookingUrl: string | null;
    externalUrl: string | null;
    giftCardUrl: string | null;
    rollerCheckoutUrl: string | null;
    waiverUrl: string | null;
  };
  groupFormUrls: Record<string, string>;
  hiddenMissionIds: readonly string[];
  hours: Partial<Record<HourDay, HourValue>>;
  slug: string;
  ticker: string;
  title: string;
};

const locations = LIVE_SITE_LOCATION_SNAPSHOT as readonly LocationSnapshot[];

function hour(location: LocationSnapshot, day: HourDay, field: keyof HourValue): string | null {
  return location.hours[day]?.[field] ?? null;
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const location of locations) {
    await db.execute(sql`
      INSERT INTO "location_details" (
        "title",
        "location_slug",
        "published",
        "address_line1",
        "address_line2",
        "address_city",
        "address_state",
        "address_zip",
        "address_country",
        "hours_mon_open",
        "hours_mon_close",
        "hours_mon_label",
        "hours_tue_open",
        "hours_tue_close",
        "hours_tue_label",
        "hours_wed_open",
        "hours_wed_close",
        "hours_wed_label",
        "hours_thu_open",
        "hours_thu_close",
        "hours_thu_label",
        "hours_fri_open",
        "hours_fri_close",
        "hours_fri_label",
        "hours_sat_open",
        "hours_sat_close",
        "hours_sat_label",
        "hours_sun_open",
        "hours_sun_close",
        "hours_sun_label",
        "external_links_external_url",
        "external_links_booking_url",
        "external_links_roller_checkout_url",
        "external_links_gift_card_url",
        "external_links_waiver_url"
      )
      VALUES (
        ${location.title},
        ${location.slug}::"public"."enum_location_details_location_slug",
        true,
        ${location.address.line1},
        ${location.address.line2},
        ${location.address.city},
        ${location.address.state},
        ${location.address.zip},
        ${location.address.country},
        ${hour(location, 'mon', 'open')},
        ${hour(location, 'mon', 'close')},
        ${hour(location, 'mon', 'label')},
        ${hour(location, 'tue', 'open')},
        ${hour(location, 'tue', 'close')},
        ${hour(location, 'tue', 'label')},
        ${hour(location, 'wed', 'open')},
        ${hour(location, 'wed', 'close')},
        ${hour(location, 'wed', 'label')},
        ${hour(location, 'thu', 'open')},
        ${hour(location, 'thu', 'close')},
        ${hour(location, 'thu', 'label')},
        ${hour(location, 'fri', 'open')},
        ${hour(location, 'fri', 'close')},
        ${hour(location, 'fri', 'label')},
        ${hour(location, 'sat', 'open')},
        ${hour(location, 'sat', 'close')},
        ${hour(location, 'sat', 'label')},
        ${hour(location, 'sun', 'open')},
        ${hour(location, 'sun', 'close')},
        ${hour(location, 'sun', 'label')},
        ${location.externalLinks.externalUrl},
        ${location.externalLinks.bookingUrl},
        ${location.externalLinks.rollerCheckoutUrl},
        ${location.externalLinks.giftCardUrl},
        ${location.externalLinks.waiverUrl}
      )
      ON CONFLICT ("location_slug") DO UPDATE
      SET
        "title" = EXCLUDED."title",
        "published" = EXCLUDED."published",
        "address_line1" = EXCLUDED."address_line1",
        "address_line2" = EXCLUDED."address_line2",
        "address_city" = EXCLUDED."address_city",
        "address_state" = EXCLUDED."address_state",
        "address_zip" = EXCLUDED."address_zip",
        "address_country" = EXCLUDED."address_country",
        "hours_mon_open" = EXCLUDED."hours_mon_open",
        "hours_mon_close" = EXCLUDED."hours_mon_close",
        "hours_mon_label" = EXCLUDED."hours_mon_label",
        "hours_tue_open" = EXCLUDED."hours_tue_open",
        "hours_tue_close" = EXCLUDED."hours_tue_close",
        "hours_tue_label" = EXCLUDED."hours_tue_label",
        "hours_wed_open" = EXCLUDED."hours_wed_open",
        "hours_wed_close" = EXCLUDED."hours_wed_close",
        "hours_wed_label" = EXCLUDED."hours_wed_label",
        "hours_thu_open" = EXCLUDED."hours_thu_open",
        "hours_thu_close" = EXCLUDED."hours_thu_close",
        "hours_thu_label" = EXCLUDED."hours_thu_label",
        "hours_fri_open" = EXCLUDED."hours_fri_open",
        "hours_fri_close" = EXCLUDED."hours_fri_close",
        "hours_fri_label" = EXCLUDED."hours_fri_label",
        "hours_sat_open" = EXCLUDED."hours_sat_open",
        "hours_sat_close" = EXCLUDED."hours_sat_close",
        "hours_sat_label" = EXCLUDED."hours_sat_label",
        "hours_sun_open" = EXCLUDED."hours_sun_open",
        "hours_sun_close" = EXCLUDED."hours_sun_close",
        "hours_sun_label" = EXCLUDED."hours_sun_label",
        "external_links_external_url" = EXCLUDED."external_links_external_url",
        "external_links_booking_url" = EXCLUDED."external_links_booking_url",
        "external_links_roller_checkout_url" = EXCLUDED."external_links_roller_checkout_url",
        "external_links_gift_card_url" = EXCLUDED."external_links_gift_card_url",
        "external_links_waiver_url" = EXCLUDED."external_links_waiver_url",
        "updated_at" = now();
    `);
  }

  await db.execute(sql`
    DELETE FROM "location_details_group_form_urls"
    WHERE "_parent_id" IN (
      SELECT "id"
      FROM "location_details"
      WHERE "location_slug"::text IN (
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
        'nashville',
        'boston',
        'edison'
      )
    );

    DELETE FROM "location_details_hidden_mission_ids"
    WHERE "_parent_id" IN (
      SELECT "id"
      FROM "location_details"
      WHERE "location_slug"::text IN (
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
        'nashville',
        'boston',
        'edison'
      )
    );
  `);

  for (const location of locations) {
    let order = 0;
    for (const [formKey, url] of Object.entries(location.groupFormUrls)) {
      await db.execute(sql`
        INSERT INTO "location_details_group_form_urls" (
          "_order",
          "_parent_id",
          "id",
          "form_key",
          "url"
        )
        SELECT
          ${order},
          details."id",
          ${`${location.slug}-${formKey}`},
          ${formKey},
          ${url}
        FROM "location_details" details
        WHERE details."location_slug"::text = ${location.slug};
      `);
      order += 1;
    }

    for (const [missionOrder, missionId] of location.hiddenMissionIds.entries()) {
      await db.execute(sql`
        INSERT INTO "location_details_hidden_mission_ids" (
          "_order",
          "_parent_id",
          "id",
          "mission_id"
        )
        SELECT
          ${missionOrder},
          details."id",
          ${`${location.slug}-hidden-${missionId}`},
          ${missionId}
        FROM "location_details" details
        WHERE details."location_slug"::text = ${location.slug};
      `);
    }

    await db.execute(sql`
      UPDATE "announcement_banners"
      SET
        "title" = ${`Current ticker: ${location.title.replace(/^Time Mission /, '')}`},
        "priority" = -100,
        "message" = ${location.ticker},
        "published" = true,
        "starts_at" = NULL,
        "ends_at" = NULL,
        "target_scope" = 'locations'::"public"."enum_announcement_banners_target_scope",
        "ticker_behavior" = 'auto'::"public"."enum_announcement_banners_ticker_behavior",
        "link_label" = NULL,
        "link_url" = NULL,
        "updated_at" = now()
      WHERE "id" IN (
        SELECT banners."id"
        FROM "announcement_banners" banners
        INNER JOIN "announcement_banners_target_locations" targets
          ON targets."_parent_id" = banners."id"
        WHERE
          targets."location_slug" = ${location.slug}
          AND banners."title" LIKE 'Current ticker:%'
      );
    `);
  }

  for (const page of LIVE_SITE_PAGE_SNAPSHOT) {
    await db.execute(sql`
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
      VALUES (
        ${page.title},
        ${page.path},
        true,
        ${page.metaTitle},
        ${page.metaDescription},
        ${page.robots}::"public"."enum_site_pages_seo_robots",
        ${page.ogImage},
        ${page.twitterImage}
      )
      ON CONFLICT ("path") DO UPDATE
      SET
        "title" = EXCLUDED."title",
        "published" = EXCLUDED."published",
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
  await db.execute(sql`SELECT 1;`);
}
