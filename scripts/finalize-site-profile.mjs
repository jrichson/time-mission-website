#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isInternalLocation,
  localizedOutputFile,
  localizedPath,
  resolveSiteProfile,
} from '../config/site-profiles.mjs';
import {
  compileRegionalHtmlRoutes,
  localeHtmlLang,
  locationForCanonicalPath,
} from './lib/regional-html-routes.mjs';
import pageI18n from '../src/data/site/page-i18n.json' with { type: 'json' };
import { localizePageCopy } from './lib/page-i18n.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const profile = resolveSiteProfile(process.env);
const routesDocument = JSON.parse(fs.readFileSync(path.join(root, 'src/data/routes.json'), 'utf8'));
const locationsDocument = JSON.parse(fs.readFileSync(path.join(root, 'data/locations.json'), 'utf8'));
const i18n = JSON.parse(fs.readFileSync(path.join(root, 'src/data/site/i18n.json'), 'utf8'));
const locations = Array.isArray(locationsDocument.locations) ? locationsDocument.locations : [];

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function routeOutputPath(route) {
  return path.join(distDir, String(route.outputFile || '').replace(/^\/+/, ''));
}

function routeIsIncluded(route) {
  const location = locationForCanonicalPath(route.canonicalPath, locations);
  return !location || isInternalLocation(location, profile);
}

function replaceTranslatedAttributes(html, translations) {
  return html.replace(/<[^>]+>/g, (tag) => {
    let rendered = tag;
    for (const attr of ['aria-label', 'alt', 'placeholder', 'title', 'value']) {
      const marker = new RegExp(`\\sdata-i18n-${attr}=(["'])([^"']+)\\1`);
      const match = rendered.match(marker);
      const translated = match && translations[match[2]];
      if (typeof translated !== 'string') continue;
      const escaped = htmlEscape(translated);
      const current = new RegExp(`\\s${attr}=(["'])[^"']*\\1`);
      rendered = current.test(rendered)
        ? rendered.replace(current, ` ${attr}="${escaped}"`)
        : rendered.replace(/>$/, ` ${attr}="${escaped}">`);
    }
    return rendered;
  });
}

function replaceTranslatedElements(html, translations) {
  let rendered = html;
  for (const [key, value] of Object.entries(translations)) {
    if (typeof value !== 'string') continue;
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const richPattern = new RegExp(
      `(<([a-z][\\w:-]*)\\b[^>]*\\sdata-i18n-html=(["'])${escapedKey}\\3[^>]*>)([\\s\\S]*?)(<\\/\\2>)`,
      'gi',
    );
    rendered = rendered.replace(richPattern, `$1${sanitizeTranslatedHtml(value)}$5`);

    const textPattern = new RegExp(
      `(<([a-z][\\w:-]*)\\b[^>]*\\sdata-i18n=(["'])${escapedKey}\\3[^>]*>)([\\s\\S]*?)(<\\/\\2>)`,
      'gi',
    );
    rendered = rendered.replace(textPattern, `$1${htmlEscape(value)}$5`);
  }

  const statusPattern = /(<([a-z][\w:-]*)\b[^>]*\sdata-i18n-status=(["'])([^"']+)\3[^>]*>)([\s\S]*?)(<\/\2>)/gi;
  rendered = rendered.replace(statusPattern, (full, open, _tag, _quote, key, body, close) => {
    const translated = translations[key];
    if (typeof translated !== 'string') return full;
    const base = body.replace(/\s*\([^()]*\)\s*$/, '');
    return `${open}${base} (${htmlEscape(translated)})${close}`;
  });

  return replaceTranslatedAttributes(rendered, translations);
}

function sanitizeTranslatedHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, (tag) => {
    if (/^<\/?strong>$/i.test(tag)) return tag.toLowerCase();
    if (/^<span class="copy-emphasis">$/i.test(tag)) return '<span class="copy-emphasis">';
    if (/^<\/span>$/i.test(tag)) return '</span>';
    return '';
  });
}

function prefixInternalLinks(html, locale) {
  if (locale === profile.defaultLocale) return html;
  const excluded = /^(?:_astro|api|assets|css|data|fonts|js)(?:\/|$)/;
  return html.replace(/\b(href|action)="\/(?!\/)([^"]*)"/g, (full, attr, rest) => {
    const pathPart = rest.split(/[?#]/, 1)[0];
    if (excluded.test(pathPart) || profile.locales.includes(pathPart.split('/')[0])) return full;
    const value = rest ? `/${locale}/${rest}` : `/${locale}`;
    return `${attr}="${value.replace(/\/{2,}/g, '/')}"`;
  });
}

function localizeStructuredData(html, locale) {
  if (locale === profile.defaultLocale) return html;
  const excluded = /^(?:assets|css|data|fonts|js)(?:\/|$)/;

  function localizeValue(value) {
    if (Array.isArray(value)) return value.map(localizeValue);
    if (value && typeof value === 'object') {
      const localized = Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, localizeValue(child)]),
      );
      if (localized['@type'] === 'WebSite') localized.inLanguage = locale;
      return localized;
    }
    if (typeof value !== 'string' || !value.startsWith(profile.origin)) return value;
    try {
      const url = new URL(value);
      const relativePath = url.pathname.replace(/^\/+/, '');
      if (excluded.test(relativePath)) return value;
      url.pathname = localizedPath(url.pathname, locale, profile);
      return url.toString();
    } catch {
      return value;
    }
  }

  return html.replace(
    /(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (full, open, body, close) => {
      try {
        return `${open}${JSON.stringify(localizeValue(JSON.parse(body))).replace(/</g, '\\u003c')}${close}`;
      } catch {
        return full;
      }
    },
  );
}

function localizedUrl(canonicalPath, locale) {
  return `${profile.origin}${localizedPath(canonicalPath, locale, profile)}`;
}

function hreflangMarkup(canonicalPath) {
  const links = profile.locales.map((locale) => {
    const href = localizedUrl(canonicalPath, locale);
    return `<link rel="alternate" hreflang="${localeHtmlLang(locale, canonicalPath, locations)}" href="${href}">`;
  });
  links.push(
    `<link rel="alternate" hreflang="x-default" href="${localizedUrl(canonicalPath, profile.defaultLocale)}">`,
  );
  return links.join('');
}

function localizeHtml(source, route, locale) {
  const canonicalUrl = localizedUrl(route.canonicalPath, locale);
  const translations = {
    ...(i18n.translations?.[i18n.defaultLanguage] || {}),
    ...(i18n.translations?.[locale] || {}),
  };

  let html = source
    .replace(
      /(<html\b[^>]*\blang=)(["'])[^"']*\2/i,
      `$1"${localeHtmlLang(locale, route.canonicalPath, locations)}"`,
    )
    .replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${canonicalUrl}">${hreflangMarkup(route.canonicalPath)}`,
    )
    .replace(/(<meta property="og:url" content=")[^"]*(">)/i, `$1${canonicalUrl}$2`);

  html = replaceTranslatedElements(html, translations);
  html = localizePageCopy(html, locale, pageI18n, {
    canonicalPath: route.canonicalPath,
    profileId: profile.id,
  });
  html = localizeStructuredData(html, locale);
  html = prefixInternalLinks(html, locale);
  return html;
}

function writeLocalizedRoutes() {
  if (!profile.localizedRoutes) return;

  const regionalRoutes = compileRegionalHtmlRoutes(
    distDir,
    profile,
    routesDocument.routes || [],
  );
  for (const route of regionalRoutes) {
    if (!routeIsIncluded(route)) continue;
    const sourcePath = routeOutputPath(route);
    if (!route.outputFile || !fs.existsSync(sourcePath)) continue;
    const source = fs.readFileSync(sourcePath, 'utf8');

    fs.writeFileSync(
      sourcePath,
      localizeHtml(source, route, profile.defaultLocale),
      'utf8',
    );

    for (const locale of profile.locales) {
      if (locale === profile.defaultLocale) continue;
      const destination = path.join(distDir, localizedOutputFile(route, locale, profile));
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, localizeHtml(source, route, locale), 'utf8');
    }
  }
}

function removeExternalLocationArtifacts() {
  for (const location of locations) {
    if (isInternalLocation(location, profile)) continue;

    const generatedPaths = [
      path.join(distDir, `${location.slug}.html`),
      path.join(distDir, location.slug),
      path.join(distDir, 'group-form-thank-you', location.slug),
      path.join(distDir, 'groups', 'inquire', location.slug),
      ...profile.locales.flatMap((locale) => [
        path.join(distDir, locale, `${location.slug}.html`),
        path.join(distDir, locale, location.slug),
      ]),
    ];

    for (const generatedPath of generatedPaths) {
      if (fs.existsSync(generatedPath)) {
        fs.rmSync(generatedPath, { force: true, recursive: true });
      }
    }
  }
}

function writeProfileRedirects() {
  const redirectsPath = path.join(distDir, '_redirects');
  if (!fs.existsSync(redirectsPath)) return;
  let redirects = fs.readFileSync(redirectsPath, 'utf8')
    .replaceAll('https://timemission.eu', 'https://www.timemission.eu');

  const internalRedirectTargets = new Map(
    locations
      .filter((location) => isInternalLocation(location, profile))
      .map((location) => [`${profile.origin}/${location.slug}`, `/${location.slug}`]),
  );
  redirects = redirects
    .split('\n')
    .map((line) => {
      const [source, target, ...rest] = line.trim().split(/\s+/);
      const localTarget = internalRedirectTargets.get(target);
      if (!localTarget) return line;
      if (source === localTarget) return null;
      return [source, localTarget, ...rest].join(' ');
    })
    .filter((line) => line !== null)
    .join('\n');

  const externalLocations = locations.filter((location) => !isInternalLocation(location, profile));
  const externalRoutes = new Map(
    externalLocations.map((location) => [
      `/${location.slug}`,
      String(location.counterpartUrl || '').trim(),
    ]),
  );
  for (const route of routesDocument.routes || []) {
    const location = locationForCanonicalPath(route.canonicalPath, locations);
    if (location && !isInternalLocation(location, profile)) {
      externalRoutes.set(route.canonicalPath, String(location.counterpartUrl || '').trim());
    }
  }

  const regionalRedirects = [];
  for (const [canonicalPath, counterpartUrl] of externalRoutes) {
    const target = counterpartUrl || `${profile.counterpartOrigin}${canonicalPath}`;
    regionalRedirects.push(
      `${canonicalPath} ${target} 301`,
    );
    for (const locale of profile.locales) {
      if (locale === profile.defaultLocale) continue;
      regionalRedirects.push(
        `/${locale}${canonicalPath} ${target} 301`,
      );
    }
  }
  fs.writeFileSync(redirectsPath, `${regionalRedirects.join('\n')}\n${redirects}`, 'utf8');
}

function writeProfileRobots() {
  const robotsPath = path.join(distDir, 'robots.txt');
  if (!fs.existsSync(robotsPath)) return;
  const robots = fs.readFileSync(robotsPath, 'utf8')
    .replace(/https:\/\/www\.timemission\.(?:com|eu)/g, profile.origin);
  fs.writeFileSync(robotsPath, robots, 'utf8');
}

function writeProfileMarker() {
  const markerPath = path.join(distDir, 'data/site-profile.json');
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  const turnstileSiteKey = String(process.env.PUBLIC_TURNSTILE_SITE_KEY || '').trim();
  fs.writeFileSync(markerPath, `${JSON.stringify({
    profile: profile.id,
    origin: profile.origin,
    pagesProject: profile.pagesProject,
    locales: profile.locales,
    deploymentReady: /^(1|true)$/i.test(String(process.env.TM_DEPLOYMENT_BUILD || '')),
    turnstileSiteKeyHash: turnstileSiteKey
      ? crypto.createHash('sha256').update(turnstileSiteKey).digest('hex')
      : null,
  }, null, 2)}\n`);
}

removeExternalLocationArtifacts();
writeLocalizedRoutes();
writeProfileRedirects();
writeProfileRobots();
writeProfileMarker();
console.log(
  `[site-profile] finalized ${profile.id} artifact for ${profile.origin}` +
    (profile.localizedRoutes ? ` with ${profile.locales.length} locale(s)` : ''),
);
