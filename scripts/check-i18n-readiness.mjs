#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveSiteProfile } from '../config/site-profiles.mjs';
import { approvalRecord } from './lib/i18n-artifact-approval.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/data/site/i18n.json'), 'utf8'));
const approvals = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/site/i18n-approval.json'), 'utf8'),
);
const profile = resolveSiteProfile(process.env);
const strict = /^(1|true)$/i.test(String(process.env.TM_REQUIRE_TRANSLATION_APPROVAL || ''));
const defaultKeys = Object.keys(catalog.translations?.[catalog.defaultLanguage] || {});
const errors = [];
const summary = [];

for (const locale of profile.locales) {
  const translations = catalog.translations?.[locale] || {};
  const missing = defaultKeys.filter((key) => !Object.prototype.hasOwnProperty.call(translations, key));
  const record = approvalRecord(approvals?.[profile.id]?.[locale]);
  const status = record.status;
  summary.push(`${locale}: ${defaultKeys.length - missing.length}/${defaultKeys.length} keys, ${status}`);

  if (!catalog.languages?.some((language) => language.code === locale)) {
    errors.push(`${locale}: missing language metadata`);
  }
  if (strict && status !== 'approved') {
    errors.push(`${locale}: translation approval is ${status}, expected approved`);
  }
  if (strict && status === 'approved' && !record.artifactDigest) {
    errors.push(`${locale}: approved translation is missing an artifact digest`);
  }
  if (strict && missing.length > 0) {
    errors.push(`${locale}: ${missing.length} translation key(s) still fall back to English`);
  }
}

console.log(`[i18n] ${profile.id} profile — ${summary.join('; ')}`);
if (errors.length > 0) {
  console.error('Translation readiness check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
