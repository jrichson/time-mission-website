/**
 * Production deployment targets shared by scripts/release.mjs,
 * scripts/deploy-pages-profile.mjs, and scripts/verify-live.mjs.
 *
 * Values here are public identifiers (they appear in served HTML or URLs).
 * Secrets stay in the environment.
 */

export const CMS_PRODUCTION = {
  origin: 'https://time-mission-website-production.up.railway.app',
  allowedHosts: 'railway.app',
  railway: {
    projectId: '67b4aee6-8abf-4c02-9bd3-2857c091e570',
    environment: 'production',
    service: 'time-mission-website',
  },
};

/** Both regions publish the same GTM container. */
export const GTM_CONTAINER_ID = 'GTM-WQPWRNJB';

/** Public EU build values used when the environment does not set them. */
export const EU_PUBLIC_BUILD_DEFAULTS = {
  EU_GTM_CONTAINER_ID: GTM_CONTAINER_ID,
  EU_TURNSTILE_SITE_KEY: '0x4AAAAAAEDDeAmW4IWKH4vD',
};

/** Looked up with `wrangler d1 list` when EU_D1_DATABASE_ID is not set. */
export const EU_D1_DATABASE_NAME = 'time-mission-forms-eu';

export const RELEASE_PROFILES = ['us', 'eu'];
