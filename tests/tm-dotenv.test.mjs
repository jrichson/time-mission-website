import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  applyTmDotEnvToProcess,
  mergeTmPublicBuildEnvFromDisk,
  parseTmWranglerPublicVarsBody,
} from '../scripts/tm-dotenv.mjs';

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tm-env-'));
}

describe('public build env loading', () => {
  it('reads public vars from Wrangler config and ignores non-public vars', () => {
    const vars = parseTmWranglerPublicVarsBody(`
[vars]
PUBLIC_TURNSTILE_SITE_KEY = "site-key"
SECRET_TOKEN = "do-not-read"

[env.production.vars]
PUBLIC_TM_MEDIA_BASE = 'https://media.example'
`);

    expect(vars).toEqual({
      PUBLIC_TM_MEDIA_BASE: 'https://media.example',
      PUBLIC_TURNSTILE_SITE_KEY: 'site-key',
    });
  });

  it('lets local env files override public Wrangler defaults', () => {
    const root = tempRoot();
    fs.writeFileSync(path.join(root, 'wrangler.toml'), `
[vars]
PUBLIC_TM_MEDIA_BASE = "https://wrangler.example"
PUBLIC_TURNSTILE_SITE_KEY = "site-key"
`);
    fs.writeFileSync(path.join(root, '.env.production'), 'PUBLIC_TM_MEDIA_BASE=https://env.example\n');

    expect(mergeTmPublicBuildEnvFromDisk(root)).toMatchObject({
      PUBLIC_TM_MEDIA_BASE: 'https://env.example',
      PUBLIC_TURNSTILE_SITE_KEY: 'site-key',
    });
  });

  it('hydrates missing process env without overwriting explicit shell values', () => {
    const root = tempRoot();
    fs.writeFileSync(path.join(root, 'wrangler.toml'), `
[vars]
PUBLIC_TURNSTILE_SITE_KEY = "wrangler-key"
`);

    const oldValue = process.env.PUBLIC_TURNSTILE_SITE_KEY;
    try {
      process.env.PUBLIC_TURNSTILE_SITE_KEY = 'shell-key';
      applyTmDotEnvToProcess(root);
      expect(process.env.PUBLIC_TURNSTILE_SITE_KEY).toBe('shell-key');

      delete process.env.PUBLIC_TURNSTILE_SITE_KEY;
      applyTmDotEnvToProcess(root);
      expect(process.env.PUBLIC_TURNSTILE_SITE_KEY).toBe('wrangler-key');
    } finally {
      if (oldValue === undefined) delete process.env.PUBLIC_TURNSTILE_SITE_KEY;
      else process.env.PUBLIC_TURNSTILE_SITE_KEY = oldValue;
    }
  });
});
