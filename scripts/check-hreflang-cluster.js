'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  isInternalLocation,
  localizedPath,
  resolveSiteProfile,
} = require('../config/site-profiles.mjs');

const root = path.resolve(__dirname, '..');
const errors = [];

const locationsRaw = fs.readFileSync(path.join(root, 'data', 'locations.json'), 'utf8');
const { locations } = JSON.parse(locationsRaw);

const manifestRaw = fs.readFileSync(
  path.join(root, 'src', 'data', 'site', 'astro-rendered-output-files.json'),
  'utf8',
);
const { outputFiles } = JSON.parse(manifestRaw);
const routesDocument = JSON.parse(
  fs.readFileSync(path.join(root, 'src', 'data', 'routes.json'), 'utf8'),
);
const profile = resolveSiteProfile(process.env);

const distDir = path.join(root, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('check-hreflang-cluster failed:');
  console.error('- dist/ does not exist — run `npm run build:astro` first');
  process.exit(1);
}

const locationSlugByFile = new Map();
for (const loc of locations) {
  const expected = typeof loc.hreflang === 'string' && loc.hreflang.length > 0 ? loc.hreflang : 'en';
  locationSlugByFile.set(`${loc.slug}.html`, { slug: loc.slug, expected });
}

function locationForCanonicalPath(canonicalPath) {
  return locations.find((location) => {
    const locationPath = `/${location.slug}`;
    return canonicalPath === locationPath || canonicalPath.startsWith(`${locationPath}/`);
  });
}

function localeHtmlLang(locale, canonicalPath) {
  const location = locationForCanonicalPath(canonicalPath);
  if (!location?.countryCode) return locale;
  if (locale === 'nl' && ['BE', 'NL'].includes(location.countryCode)) return `nl-${location.countryCode}`;
  if (locale === 'fr' && location.countryCode === 'BE') return 'fr-BE';
  return locale;
}

const validationEntries = profile.localizedRoutes
  ? (routesDocument.routes || [])
    .filter((route) => {
      const location = locationForCanonicalPath(route.canonicalPath);
      return !location || isInternalLocation(location, profile);
    })
    .flatMap((route) => profile.locales.map((locale) => ({
      canonicalPath: route.canonicalPath,
      locale,
      relPath: locale === profile.defaultLocale
        ? route.outputFile
        : path.join(locale, route.outputFile),
    })))
  : outputFiles
    .filter((relPath) => {
      const route = (routesDocument.routes || []).find((item) => item.outputFile === relPath);
      const location = route && locationForCanonicalPath(route.canonicalPath);
      return !location || isInternalLocation(location, profile);
    })
    .map((relPath) => ({
      canonicalPath: (routesDocument.routes || []).find((route) => route.outputFile === relPath)?.canonicalPath,
      locale: profile.defaultLocale,
      relPath,
    }));

let validated = 0;

for (const { canonicalPath, locale, relPath } of validationEntries) {
  const distPath = path.join(distDir, relPath);
  if (!fs.existsSync(distPath)) {
    errors.push(`${relPath}: file missing from dist/ — manifest claims it should be Astro-rendered`);
    continue;
  }
  const html = fs.readFileSync(distPath, 'utf8');

  // Per-route <html lang> assertion
  const langMatch = html.match(/<html\s[^>]*\blang\s*=\s*"([^"]+)"/i);
  const actualLang = langMatch ? langMatch[1] : null;

  let expectedLang;
  if (profile.localizedRoutes && canonicalPath) {
    expectedLang = localeHtmlLang(locale, canonicalPath);
  } else if (locationSlugByFile.has(relPath)) {
    expectedLang = locationSlugByFile.get(relPath).expected;
  } else {
    expectedLang = 'en';
  }

  if (actualLang !== expectedLang) {
    errors.push(
      `${relPath}: expected <html lang="${expectedLang}"> but found ${actualLang ? `lang="${actualLang}"` : 'no lang attribute'}`,
    );
  }

  const linkAlternateRegex = /<link\s+[^>]*rel\s*=\s*"alternate"[^>]*hreflang\s*=/gi;
  if (!profile.localizedRoutes && linkAlternateRegex.test(html)) {
    errors.push(
      `${relPath}: emits <link rel="alternate" hreflang> tag (forbidden per locked decision D-02 — different cities are not language alternates per Google docs)`,
    );
  }
  if (profile.localizedRoutes && canonicalPath) {
    for (const alternateLocale of profile.locales) {
      const language = localeHtmlLang(alternateLocale, canonicalPath);
      const href = `${profile.origin}${localizedPath(canonicalPath, alternateLocale, profile)}`;
      if (!html.includes(`hreflang="${language}" href="${href}"`)) {
        errors.push(`${relPath}: missing reciprocal ${language} alternate`);
      }
    }
  }

  validated += 1;
}

if (errors.length > 0) {
  console.error('check-hreflang-cluster failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(
  `check-hreflang-cluster passed for ${profile.id}: ${validated} files validated.`,
);
