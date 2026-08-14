#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { localizedOutputFile, resolveSiteProfile } from '../config/site-profiles.mjs';
import pageI18n from '../src/data/site/page-i18n.json' with { type: 'json' };
import {
  collectPageCopyEntries,
  effectivePageTranslation,
  pageTranslationsFor,
  preservedSourceTermsFor,
} from './lib/page-i18n.mjs';
import { compileRegionalHtmlRoutes } from './lib/regional-html-routes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const profile = resolveSiteProfile(process.env);
const routes = JSON.parse(fs.readFileSync(path.join(root, 'src/data/routes.json'), 'utf8')).routes || [];
const errors = [];
let checkedRoutes = 0;
let checkedEntries = 0;

if (profile.localizedRoutes) {
  for (const route of compileRegionalHtmlRoutes(distDir, profile, routes)) {
    const defaultPath = path.join(distDir, ...route.outputFile.split('/'));
    if (!fs.existsSync(defaultPath)) continue;
    const sourceEntries = collectPageCopyEntries(fs.readFileSync(defaultPath, 'utf8'));
    checkedRoutes += 1;

    for (const locale of profile.locales) {
      if (locale === profile.defaultLocale) continue;
      const localizedPath = path.join(
        distDir,
        ...localizedOutputFile(route, locale, profile).split('/'),
      );
      if (!fs.existsSync(localizedPath)) {
        errors.push(`${locale}${route.canonicalPath}: localized output is missing`);
        continue;
      }
      const context = { canonicalPath: route.canonicalPath, profileId: profile.id };
      const translations = pageTranslationsFor(pageI18n, locale, context);
      const preservedSourceTerms = preservedSourceTermsFor(pageI18n, locale, context);
      const localizedEntries = collectPageCopyEntries(fs.readFileSync(localizedPath, 'utf8'));
      if (localizedEntries.length !== sourceEntries.length) {
        errors.push(
          `${locale}${route.canonicalPath}: page-copy structure changed `
          + `(${sourceEntries.length} source entries, ${localizedEntries.length} localized entries)`,
        );
        continue;
      }

      sourceEntries.forEach((entry, index) => {
        checkedEntries += 1;
        const catalogTranslation = translations[entry.value];
        if (typeof catalogTranslation !== 'string' || !catalogTranslation.trim()) {
          errors.push(`${locale}${route.canonicalPath}: missing page translation for ${JSON.stringify(entry.value)}`);
          return;
        }
        const translated = effectivePageTranslation(
          translations,
          preservedSourceTerms,
          entry.value,
        );
        if (translated === entry.value && !preservedSourceTerms.has(entry.value)) {
          errors.push(
            `${locale}${route.canonicalPath}: unchanged page copy is not explicitly preserved: `
            + JSON.stringify(entry.value),
          );
          return;
        }
        const localized = localizedEntries[index];
        if (localized.kind !== entry.kind || localized.value !== translated) {
          errors.push(
            `${locale}${route.canonicalPath}: expected ${JSON.stringify(translated)} `
            + `for ${JSON.stringify(entry.value)}, found ${JSON.stringify(localized.value)}`,
          );
        }
      });
    }
  }
}

if (errors.length) {
  console.error('Built page translation coverage failed:');
  for (const error of errors.slice(0, 100)) console.error(`- ${error}`);
  if (errors.length > 100) console.error(`- ...and ${errors.length - 100} more`);
  process.exit(1);
}

console.log(
  profile.localizedRoutes
    ? `Built page translations verified across ${checkedRoutes} routes and ${checkedEntries} localized entries.`
    : 'Built page translation coverage skipped for non-localized profile.',
);
