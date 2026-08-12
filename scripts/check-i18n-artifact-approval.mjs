#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveSiteProfile } from '../config/site-profiles.mjs';
import {
  approvalRecord,
  artifactLanguageDigest,
  extractLanguageSurfaceCopy,
  unchangedLocalizedFields,
} from './lib/i18n-artifact-approval.mjs';
import { compileRegionalHtmlRoutes } from './lib/regional-html-routes.mjs';
import pageI18n from '../src/data/site/page-i18n.json' with { type: 'json' };
import { preservedSourceTermsFor } from './lib/page-i18n.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const profile = resolveSiteProfile(process.env);
const strict = /^(1|true)$/i.test(String(process.env.TM_REQUIRE_TRANSLATION_APPROVAL || ''));
const approvals = JSON.parse(fs.readFileSync(path.join(root, 'src/data/site/i18n-approval.json'), 'utf8'));
const routes = JSON.parse(fs.readFileSync(path.join(root, 'src/data/routes.json'), 'utf8')).routes || [];
const errors = [];

if (strict && profile.localizedRoutes) {
  const regionalRoutes = compileRegionalHtmlRoutes(distDir, profile, routes);
  for (const locale of profile.locales) {
    const record = approvalRecord(approvals?.[profile.id]?.[locale]);
    const actualDigest = artifactLanguageDigest(distDir, profile, locale, routes);
    if (record.status !== 'approved') {
      errors.push(`${locale}: translation approval is ${record.status}, expected approved`);
    } else if (!record.artifactDigest || record.artifactDigest !== actualDigest) {
      errors.push(`${locale}: approved Language Surface digest does not match the built artifact`);
    }

    if (locale === profile.defaultLocale) continue;
    const preservedSourceTerms = preservedSourceTermsFor(pageI18n, locale, { profileId: profile.id });
    for (const route of regionalRoutes) {
      const defaultPath = path.join(distDir, ...route.outputFile.split('/'));
      const localizedPath = path.join(distDir, locale, ...route.outputFile.split('/'));
      if (!fs.existsSync(defaultPath) || !fs.existsSync(localizedPath)) continue;
      const defaultCopy = extractLanguageSurfaceCopy(fs.readFileSync(defaultPath, 'utf8'));
      const localizedCopy = extractLanguageSurfaceCopy(fs.readFileSync(localizedPath, 'utf8'));
      const untranslated = unchangedLocalizedFields(defaultCopy, localizedCopy)
        .filter((field) => !preservedSourceTerms.has(defaultCopy[field]));
      if (untranslated.length) {
        errors.push(`${locale}${route.canonicalPath}: untranslated ${untranslated.join(', ')}`);
      }
    }
  }
}

if (errors.length) {
  console.error('Built translation approval check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  strict && profile.localizedRoutes
    ? `Built translation approvals verified for ${profile.locales.join(', ')}.`
    : 'Built translation approval check skipped for non-production artifact.',
);
