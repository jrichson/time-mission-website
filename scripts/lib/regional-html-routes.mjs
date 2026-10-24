import fs from 'node:fs';
import path from 'node:path';

function walkHtmlFiles(rootDir) {
  const files = [];
  if (!fs.existsSync(rootDir)) return files;

  function visit(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const absolute = path.join(currentDir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.endsWith('.html')) files.push(absolute);
    }
  }

  visit(rootDir);
  return files;
}

export function canonicalPathFromHtml(html, profile) {
  const match = String(html || '').match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  if (!match) return '';
  try {
    const url = new URL(match[1], profile.origin);
    const allowedHosts = new Set([
      new URL(profile.origin).hostname,
      new URL(profile.counterpartOrigin).hostname,
    ]);
    if (!allowedHosts.has(url.hostname)) return '';
    return url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function locationForCanonicalPath(canonicalPath, locations) {
  return locations.find((location) => {
    const locationPath = `/${location.slug}`;
    return canonicalPath === locationPath || canonicalPath.startsWith(`${locationPath}/`);
  });
}

export function localeHtmlLang(locale, canonicalPath, locations) {
  const location = locationForCanonicalPath(canonicalPath, locations);
  if (!location?.countryCode) return locale;
  if (locale === 'nl' && ['BE', 'NL'].includes(location.countryCode)) return `nl-${location.countryCode}`;
  if (locale === 'fr' && location.countryCode === 'BE') return 'fr-BE';
  return locale;
}

// Pages both sites publish (About, Missions, Groups, FAQ...) are regional variants of
// each other, so their hreflang cluster spans timemission.com and timemission.eu.
// The US site takes the bare language codes; the EU site takes country-tagged English
// and Spanish so Google sends Belgian and Dutch searchers to .eu and everyone else to .com.
const COUNTERPART_PROFILES = {
  us: { origin: 'https://www.timemission.com', locales: ['en', 'es'] },
  eu: { origin: 'https://www.timemission.eu', locales: ['en', 'nl', 'fr', 'es'] },
};
const SHARED_ROUTE_LANGS = {
  us: { en: ['en'], es: ['es'] },
  eu: { en: ['en-BE', 'en-NL'], nl: ['nl'], fr: ['fr'], es: ['es-BE', 'es-NL'] },
};

function profileLocalizedPath(canonicalPath, locale) {
  if (locale === 'en') return canonicalPath;
  return canonicalPath === '/' ? `/${locale}` : `/${locale}${canonicalPath}`;
}

// Only canonical paths owned by a registry route qualify: CMS pages found by walking
// dist/ may exist on one site only, and an alternate pointing at a 404 breaks the cluster.
// City-scoped copies (e.g. /antwerp/about) canonicalize to the shared path and follow it.
export function isSharedRegionalRoute(route, locations, registeredRoutes = []) {
  const canonicalPath = route?.canonicalPath;
  if (!canonicalPath || locationForCanonicalPath(canonicalPath, locations)) return false;
  return registeredRoutes.some((registered) => (
    registered?.canonicalPath === canonicalPath && !Array.isArray(registered.siteProfiles)
  ));
}

// Returns the full hreflang cluster for a route as [{ lang, href }], x-default last.
export function hreflangAlternates(route, profile, locations, registeredRoutes = []) {
  const canonicalPath = route.canonicalPath;
  if (!isSharedRegionalRoute(route, locations, registeredRoutes)) {
    const alternates = profile.locales.map((locale) => ({
      lang: localeHtmlLang(locale, canonicalPath, locations),
      href: `${profile.origin}${profileLocalizedPath(canonicalPath, locale)}`,
    }));
    alternates.push({ lang: 'x-default', href: `${profile.origin}${canonicalPath}` });
    return alternates;
  }

  const alternates = [];
  for (const id of ['us', 'eu']) {
    const origin = id === profile.id ? profile.origin : COUNTERPART_PROFILES[id].origin;
    for (const locale of COUNTERPART_PROFILES[id].locales) {
      for (const lang of SHARED_ROUTE_LANGS[id][locale]) {
        alternates.push({ lang, href: `${origin}${profileLocalizedPath(canonicalPath, locale)}` });
      }
    }
  }
  const usOrigin = profile.id === 'us' ? profile.origin : COUNTERPART_PROFILES.us.origin;
  alternates.push({ lang: 'x-default', href: `${usOrigin}${canonicalPath}` });
  return alternates;
}

export function compileRegionalHtmlRoutes(distDir, profile, registeredRoutes = []) {
  const routesByOutput = new Map();
  for (const route of registeredRoutes) {
    if (!route?.outputFile || !route.outputFile.endsWith('.html')) continue;
    routesByOutput.set(String(route.outputFile).replace(/^\/+/, ''), {
      ...route,
      outputFile: String(route.outputFile).replace(/^\/+/, ''),
    });
  }

  for (const absolute of walkHtmlFiles(distDir)) {
    const outputFile = path.relative(distDir, absolute).split(path.sep).join('/');
    const firstSegment = outputFile.split('/')[0];
    const isLocalizedRoute = profile.locales.some((locale) => (
      locale !== profile.defaultLocale
      && (firstSegment === locale || outputFile === `${locale}.html`)
    ));
    if (isLocalizedRoute) continue;
    const html = fs.readFileSync(absolute, 'utf8');
    const canonicalPath = canonicalPathFromHtml(html, profile);
    if (!canonicalPath) continue;
    routesByOutput.set(outputFile, {
      ...(routesByOutput.get(outputFile) || {}),
      canonicalPath,
      outputFile,
    });
  }

  return [...routesByOutput.values()].sort((a, b) => a.outputFile.localeCompare(b.outputFile));
}
