#!/usr/bin/env node
/**
 * After `astro build`, verify each renderable Payload landing and blog post has
 * a matching HTML artifact in dist/.
 *
 * Skip when `PAYLOAD_CMS_ORIGIN` is unset (local `npm run verify` without CMS).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { validatedCmsOriginBase, PAYLOAD_FETCH_TIMEOUT_MS } from './lib/payload-origin.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
require('tsx/cjs/api').register();
const {
  landingDistOutputCandidates,
  landingDocLooksRenderable,
} = require('../src/lib/payload/landing-contract.ts');
const {
  blogPostCanonicalPath,
  blogPostDocLooksRenderable,
} = require('../src/lib/payload/blog-post-contract.ts');

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

async function fetchPublishedDocs(collection) {
  const url = new URL(`/api/${collection}`, `${base}/`);
  url.searchParams.set('limit', '250');
  url.searchParams.set('depth', '0');
  url.searchParams.sort();

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(PAYLOAD_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`GET ${url} failed (${res.status})`);
  }

  const payload = await res.json();
  return Array.isArray(payload.docs) ? payload.docs : [];
}

let landingDocs;
let blogPostDocs;
try {
  [landingDocs, blogPostDocs] = await Promise.all([
    fetchPublishedDocs('landings'),
    fetchPublishedDocs('blog-posts'),
  ]);
} catch (error) {
  console.error(`check-payload-dist: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'routes.json'), 'utf8'));
const prefixRaw = registry._meta?.dynamicLandingPrefix || '/c';
const prefix = prefixRaw.startsWith('/') ? prefixRaw : `/${prefixRaw}`;

function distLandingExists(slug) {
  return landingDistOutputCandidates(root, prefix, slug).some((candidate) => fs.existsSync(candidate));
}

function distCanonicalPathExists(canonicalPath) {
  const relativePath = String(canonicalPath || '').replace(/^\/+|\/+$/g, '');
  if (!relativePath) return false;

  return [
    path.join(root, 'dist', `${relativePath}.html`),
    path.join(root, 'dist', relativePath, 'index.html'),
  ].some((candidate) => fs.existsSync(candidate));
}

for (const doc of landingDocs) {
  const slug = typeof doc.slug === 'string' ? doc.slug : '';
  if (!landingDocLooksRenderable(doc)) continue;
  if (!distLandingExists(slug)) {
    errors.push(`missing dist output for Payload landing slug "${slug}" (expected dist/${prefix.replace(/^\//, '')}/${slug}.html or dist/${prefix.replace(/^\//, '')}/${slug}/index.html)`);
  }
}

for (const doc of blogPostDocs) {
  const slug = typeof doc.slug === 'string' ? doc.slug : '';
  if (!blogPostDocLooksRenderable(doc)) continue;
  const canonicalPath = blogPostCanonicalPath(slug);
  if (!distCanonicalPathExists(canonicalPath)) {
    errors.push(`missing dist output for Payload blog post slug "${slug}" (expected dist/blog/${slug}.html or dist/blog/${slug}/index.html)`);
  }
}

if (errors.length) {
  console.error('check-payload-dist failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`check-payload-dist passed for ${landingDocs.length} published landing(s) and ${blogPostDocs.length} published blog post(s).`);
