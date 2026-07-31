const DEPLOYMENT_ONLY_ENV_KEYS = [
  'EU_D1_DATABASE_ID',
  'EU_GTM_CONTAINER_ID',
  'EU_SGTM_COLLECT_PATH',
  'EU_SGTM_CONTAINER_URL',
  'EU_TURNSTILE_SITE_KEY',
  'PAYLOAD_CMS_ALLOWED_HOSTS',
  'PAYLOAD_CMS_BUILD_STRICT',
  'PAYLOAD_CMS_ORIGIN',
  'PUBLIC_SITE_ORIGIN',
  'TM_DEPLOYMENT_BUILD',
  'TM_REQUIRE_TRANSLATION_APPROVAL',
  'TM_SITE_PROFILE',
];

export function sourceCheckEnvironment(input = process.env) {
  const env = { ...input };
  for (const key of DEPLOYMENT_ONLY_ENV_KEYS) delete env[key];
  return env;
}
