#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveSiteProfile } from '../config/site-profiles.mjs';
import pageI18n from '../src/data/site/page-i18n.json' with { type: 'json' };
import {
  collectPageCopyEntries,
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
      const localizedPath = path.join(distDir, locale, ...route.outputFile.split('/'));
      if (!fs.existsSync(localizedPath)) {
        errors.push(`${locale}${route.canonicalPath}: localized output is missing`);
        continue;
      }
      const translations = pageTranslationsFor(pageI18n, locale, route.canonicalPath);
      const preservedSourceTerms = preservedSourceTermsFor(pageI18n, locale);
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
        const translated = translations[entry.value];
        if (typeof translated !== 'string' || !translated.trim()) {
          errors.push(`${locale}${route.canonicalPath}: missing page translation for ${JSON.stringify(entry.value)}`);
          return;
        }
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
