import fs from 'node:fs';
import path from 'node:path';

export function renderEuWranglerConfig(root, env = process.env, options = {}) {
  const d1Id = String(env.EU_D1_DATABASE_ID || '').trim();
  const turnstileSiteKey = String(env.EU_TURNSTILE_SITE_KEY || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(d1Id)) {
    throw new Error('EU_D1_DATABASE_ID must be the UUID of a D1 database created with jurisdiction=eu.');
  }
  if (options.requireTurnstile !== false && !turnstileSiteKey) {
    throw new Error('EU_TURNSTILE_SITE_KEY is required for the EU Pages configuration.');
  }

  const template = fs.readFileSync(path.join(root, 'wrangler.eu.toml.tmpl'), 'utf8');
  const rendered = template
    .replaceAll('{{EU_D1_DATABASE_ID}}', d1Id)
    .replaceAll(
      '{{EU_TURNSTILE_SITE_KEY}}',
      (turnstileSiteKey || 'migration-only').replace(/"/g, '\\"'),
    );
  if (rendered.includes('{{')) throw new Error('EU Wrangler template substitution is incomplete.');

  return rendered;
}
