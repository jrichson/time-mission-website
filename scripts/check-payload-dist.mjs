#!/usr/bin/env node
/**
 * After `astro build`, verify each Payload-published landing under /c/[slug]
 * has a matching HTML artifact in dist/.
 *
 * Skip when `PAYLOAD_CMS_ORIGIN` is unset (local `npm run verify` without CMS).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validatedCmsOriginBase, PAYLOAD_FETCH_TIMEOUT_MS } from './lib/payload-origin.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const origin = process.env.PAYLOAD_CMS_ORIGIN || process.env.PAYLOAD_PUBLIC_CMS_ORIGIN || '';
const errors = [];

if (!origin.trim()) {
  console.log('check-payload-dist: skipped — PAYLOAD_CMS_ORIGIN not set.');
  process.exit(0);
}

const base = validatedCmsOriginBase(origin);
if (!base) {
  console.error('check-payload-dist: PAYLOAD_CMS_ORIGIN is not a safe/allowed HTTP(S) origin.');
  process.exit(1);
}

const url = new URL('/api/landings', `${base}/`);
url.searchParams.set('limit', '250');
url.searchParams.set('depth', '0');

const res = await fetch(url.toString(), {
  headers: { Accept: 'application/json' },
  signal: AbortSignal.timeout(PAYLOAD_FETCH_TIMEOUT_MS),
});
if (!res.ok) {
  console.error(`check-payload-dist: GET ${url} failed (${res.status})`);
  process.exit(1);
}

const payload = await res.json();
const docs = Array.isArray(payload.docs) ? payload.docs : [];
const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const registry = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'routes.json'), 'utf8'));
const prefixRaw = registry._meta?.dynamicLandingPrefix || '/c';
const prefix = prefixRaw.startsWith('/') ? prefixRaw.slice(1) : prefixRaw;

function distLandingExists(slug) {
  const variantA = path.join(root, 'dist', prefix, `${slug}.html`);
  const variantB = path.join(root, 'dist', prefix, slug, 'index.html');
  return fs.existsSync(variantA) || fs.existsSync(variantB);
}

for (const doc of docs) {
  const slug = typeof doc.slug === 'string' ? doc.slug : '';
  if (!slug || !slugRe.test(slug)) continue;
  if (!distLandingExists(slug)) {
    errors.push(`missing dist output for Payload landing slug "${slug}" (expected dist/${prefix}/${slug}.html or dist/${prefix}/${slug}/index.html)`);
  }
}

if (errors.length) {
  console.error('check-payload-dist failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`check-payload-dist passed for ${docs.length} published landing(s).`);
