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
    if (profile.locales.includes(firstSegment) && firstSegment !== profile.defaultLocale) continue;
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
