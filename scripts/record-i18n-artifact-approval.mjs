#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveSiteProfile } from '../config/site-profiles.mjs';
import { artifactLanguageDigest } from './lib/i18n-artifact-approval.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profileId = String(process.argv[2] || '').trim().toLowerCase();
const locale = String(process.argv[3] || '').trim().toLowerCase();
const reviewer = String(process.argv[4] || '').trim();
const allowUnchangedFields = process.argv.includes('--allow-unchanged-fields');
const profile = resolveSiteProfile({ TM_SITE_PROFILE: profileId });
if (!profile.locales.includes(locale) || !reviewer) {
  console.error(
    'Usage: node scripts/record-i18n-artifact-approval.mjs '
      + '<profile> <locale> <reviewer> [--allow-unchanged-fields]',
  );
  process.exit(1);
}

const markerPath = path.join(root, 'dist/data/site-profile.json');
const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
if (marker.profile !== profile.id || marker.origin !== profile.origin) {
  console.error(`dist artifact does not match the ${profile.id} profile.`);
  process.exit(1);
}

const routes = JSON.parse(fs.readFileSync(path.join(root, 'src/data/routes.json'), 'utf8')).routes || [];
const approvalPath = path.join(root, 'src/data/site/i18n-approval.json');
const approvals = JSON.parse(fs.readFileSync(approvalPath, 'utf8'));
approvals[profile.id] ||= {};
approvals[profile.id][locale] = {
  status: 'approved',
  artifactDigest: artifactLanguageDigest(path.join(root, 'dist'), profile, locale, routes),
  reviewer,
  reviewedAt: new Date().toISOString(),
  ...(allowUnchangedFields ? {
    allowUnchangedFields: true,
    approvalNote: 'Site owner approved the current language surface for launch.',
  } : {}),
};
fs.writeFileSync(approvalPath, `${JSON.stringify(approvals, null, 2)}\n`);
console.log(`Recorded ${profile.id}/${locale} approval for ${reviewer}.`);
