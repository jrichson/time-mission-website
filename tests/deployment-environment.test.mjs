import { describe, expect, it } from 'vitest';

import { sourceCheckEnvironment } from '../scripts/lib/deployment-environment.mjs';

describe('deployment source-check environment', () => {
  it('removes deployment-only values without dropping shared build inputs', () => {
    const env = sourceCheckEnvironment({
      EU_D1_DATABASE_ID: 'database-id',
      EU_GTM_CONTAINER_ID: 'GTM-EU',
      EU_TURNSTILE_SITE_KEY: 'site-key',
      PAYLOAD_CMS_BUILD_STRICT: 'true',
      PAYLOAD_CMS_ORIGIN: 'https://cms.example',
      PUBLIC_SITE_ORIGIN: 'https://www.timemission.eu',
      PUBLIC_TM_MEDIA_BASE: 'https://media.example',
      TM_REQUIRE_TRANSLATION_APPROVAL: 'false',
      TM_SITE_PROFILE: 'eu',
    });

    expect(env).toEqual({
      PUBLIC_TM_MEDIA_BASE: 'https://media.example',
    });
  });
});
