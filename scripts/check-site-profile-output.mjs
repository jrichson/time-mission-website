#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isInternalLocation,
  localizedOutputFile,
  localizedPath,
  publicLocationsForProfile,
  resolveSiteProfile,
} from '../config/site-profiles.mjs';
import { LOCATION_ROUTE_ENTRIES } from '../functions/_shared/location-route-manifest.mjs';
import {
  compileRegionalHtmlRoutes,
  localeHtmlLang,
  locationForCanonicalPath,
} from './lib/regional-html-routes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const profile = resolveSiteProfile(process.env);
const routesDocument = readJson(path.join(root, 'src/data/routes.json'));
const locationsDocument = readJson(path.join(root, 'data/locations.json'));
const locations = Array.isArray(locationsDocument.locations) ? locationsDocument.locations : [];
const errors = [];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function routeIsIncluded(route) {
  const location = locationForCanonicalPath(route.canonicalPath, locations);
  return !location || isInternalLocation(location, profile);
}

function assertFileMissing(filePath, label) {
  if (fs.existsSync(filePath)) errors.push(`${label} must not exist`);
}

function checkArtifactIdentity() {
  const markerPath = path.join(distDir, 'data/site-profile.json');
  if (!fs.existsSync(markerPath)) {
    errors.push('data/site-profile.json is missing');
    return;
  }

  const marker = readJson(markerPath);
  for (const [key, expected] of Object.entries({
    profile: profile.id,
    origin: profile.origin,
    pagesProject: profile.pagesProject,
  })) {
    if (marker[key] !== expected) {
      errors.push(`site-profile marker ${key} must be ${JSON.stringify(expected)}`);
    }
  }
  const expectedDeploymentReady = /^(1|true)$/i.test(String(process.env.TM_DEPLOYMENT_BUILD || ''));
  if (marker.deploymentReady !== expectedDeploymentReady) {
    errors.push(`site-profile marker deploymentReady must be ${expectedDeploymentReady}`);
  }
  const turnstileSiteKey = String(process.env.PUBLIC_TURNSTILE_SITE_KEY || '').trim();
  const expectedTurnstileHash = turnstileSiteKey
    ? crypto.createHash('sha256').update(turnstileSiteKey).digest('hex')
    : null;
  if (marker.turnstileSiteKeyHash !== expectedTurnstileHash) {
    errors.push('site-profile marker Turnstile key does not match the browser build variable');
  }
  if (expectedDeploymentReady && !expectedTurnstileHash) {
    errors.push('production artifact is missing PUBLIC_TURNSTILE_SITE_KEY');
  }
}

function checkLocationIsolation() {
  for (const location of locations) {
    if (isInternalLocation(location, profile)) continue;

    assertFileMissing(path.join(distDir, `${location.slug}.html`), `${location.slug}.html`);
    assertFileMissing(path.join(distDir, location.slug), `${location.slug}/`);
    assertFileMissing(
      path.join(distDir, 'group-form-thank-you', location.slug),
      `group-form-thank-you/${location.slug}/`,
    );
    assertFileMissing(
      path.join(distDir, 'groups', 'inquire', location.slug),
      `groups/inquire/${location.slug}/`,
    );
    for (const locale of profile.locales) {
      if (locale === profile.defaultLocale) continue;
      assertFileMissing(
        path.join(distDir, locale, `${location.slug}.html`),
        `${locale}/${location.slug}.html`,
      );
      assertFileMissing(
        path.join(distDir, locale, location.slug),
        `${locale}/${location.slug}/`,
      );
    }
  }

  const publicLocationsPath = path.join(distDir, 'data/locations.json');
  if (!fs.existsSync(publicLocationsPath)) {
    errors.push('data/locations.json is missing');
    return;
  }
  const publicLocations = readJson(publicLocationsPath).locations || [];
  for (const location of publicLocations) {
    if (isInternalLocation(location, profile)) continue;
    const expectedUrl = `${profile.counterpartOrigin}/${location.slug}`;
    if (location.externalUrl !== expectedUrl) {
      errors.push(`${location.slug}: externalUrl must be ${expectedUrl}`);
    }
    if (
      location.pagePath
      || location.bookingUrl
      || location.rollerCheckoutUrl
      || location.groupCheckoutUrl
      || location.groupFormUrls
      || location.briqWidget
    ) {
      errors.push(`${location.slug}: external location exposes local booking or route capabilities`);
    }
  }
}

function checkLocationRouteManifest() {
  const publicLocations = publicLocationsForProfile(locations, profile);
  const entryByPath = new Map(LOCATION_ROUTE_ENTRIES.map((entry) => [entry.canonicalPath, entry]));

  for (const location of publicLocations) {
    const canonicalPath = `/${location.slug}`;
    const entry = entryByPath.get(canonicalPath);
    if (!entry) {
      errors.push(`${canonicalPath}: missing from the Cloudflare location route manifest`);
      continue;
    }

    const expectedExternalUrl = location.pagePath ? '' : (location.externalUrl || '');
    if (entry.externalUrl !== expectedExternalUrl) {
      errors.push(
        `${canonicalPath}: route manifest externalUrl must be ${JSON.stringify(expectedExternalUrl)}`,
      );
    }
  }
}

function checkRegisteredHtml() {
  const regionalRoutes = compileRegionalHtmlRoutes(
    distDir,
    profile,
    routesDocument.routes || [],
  );
  for (const route of regionalRoutes) {
    if (!route.outputFile || !route.outputFile.endsWith('.html') || !routeIsIncluded(route)) continue;

    for (const locale of profile.locales) {
      if (!profile.localizedRoutes && locale !== profile.defaultLocale) continue;
      const relPath = localizedOutputFile(route, locale, profile);
      const outputPath = path.join(distDir, relPath);
      if (!fs.existsSync(outputPath)) {
        errors.push(`${relPath}: registered regional route is missing`);
        continue;
      }

      const html = fs.readFileSync(outputPath, 'utf8');
      const canonicalUrl = `${profile.origin}${localizedPath(route.canonicalPath, locale, profile)}`;
      if (!html.includes(`<link rel="canonical" href="${canonicalUrl}">`)) {
        errors.push(`${relPath}: canonical must be ${canonicalUrl}`);
      }
      const htmlLang = localeHtmlLang(locale, route.canonicalPath, locations);
      if (!new RegExp(`<html\\b[^>]*\\blang="${htmlLang}"`, 'i').test(html)) {
        errors.push(`${relPath}: html lang must be ${htmlLang}`);
      }

      const alternatePattern = /<link rel="alternate" hreflang=/;
      if (!profile.localizedRoutes && alternatePattern.test(html)) {
        errors.push(`${relPath}: US profile must not emit language alternates`);
      }
      if (profile.localizedRoutes) {
        for (const alternateLocale of profile.locales) {
          const expectedLang = localeHtmlLang(alternateLocale, route.canonicalPath, locations);
          const expectedUrl = `${profile.origin}${localizedPath(
            route.canonicalPath,
            alternateLocale,
            profile,
          )}`;
          if (!html.includes(`hreflang="${expectedLang}" href="${expectedUrl}"`)) {
            errors.push(`${relPath}: missing reciprocal ${expectedLang} alternate`);
          }
        }
      }

      const localizedLocalePattern = profile.locales
        .filter((candidate) => candidate !== profile.defaultLocale)
        .map((candidate) => candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
      const repeatedLocale = localizedLocalePattern
        ? new RegExp(`^/(${localizedLocalePattern})/\\1(?:/|$)`)
        : null;
      const localeJoinedToAsset = localizedLocalePattern
        ? new RegExp(`^/(?:${localizedLocalePattern})(?:assets|css|data|fonts|js)(?:/|$)`)
        : null;
      const schemaBlocks = [...html.matchAll(
        /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
      )];
      for (const [, schemaBody] of schemaBlocks) {
        let schema;
        try {
          schema = JSON.parse(schemaBody);
        } catch {
          errors.push(`${relPath}: invalid JSON-LD`);
          continue;
        }
        const serialized = JSON.stringify(schema);
        const profileUrls = [...serialized.matchAll(
          new RegExp(`${profile.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^"\\\\]*)`, 'g'),
        )];
        for (const [, suffix] of profileUrls) {
          if (repeatedLocale?.test(suffix) || localeJoinedToAsset?.test(suffix)) {
            errors.push(`${relPath}: malformed localized JSON-LD URL ${profile.origin}${suffix}`);
            continue;
          }
          if (/^\/(?:assets|css|data|fonts|js)(?:\/|$)/.test(suffix)) continue;
          const isLocalized = locale === profile.defaultLocale
            ? (!suffix || suffix.startsWith('/'))
            : suffix.startsWith(`/${locale}`);
          if (!isLocalized) {
            errors.push(`${relPath}: JSON-LD URL is not localized for ${locale}`);
          }
        }
      }
    }
  }
}

function checkTurnstileBuildConfig() {
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  const html = fs.readFileSync(indexPath, 'utf8');
  const embedded = html.match(/"turnstileSiteKey":"([^"]*)"/)?.[1] || '';
  const expected = String(process.env.PUBLIC_TURNSTILE_SITE_KEY || '').trim();
  if (embedded !== expected) {
    errors.push('index.html Turnstile site key does not match PUBLIC_TURNSTILE_SITE_KEY');
  }
}

function checkSitemapAndRedirects() {
  const sitemapPath = path.join(distDir, 'sitemap.xml');
  const robotsPath = path.join(distDir, 'robots.txt');
  const redirectsPath = path.join(distDir, '_redirects');
  for (const requiredPath of [sitemapPath, robotsPath, redirectsPath]) {
    if (!fs.existsSync(requiredPath)) errors.push(`${path.basename(requiredPath)} is missing`);
  }
  if (!fs.existsSync(sitemapPath) || !fs.existsSync(robotsPath) || !fs.existsSync(redirectsPath)) return;

  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const robots = fs.readFileSync(robotsPath, 'utf8');
  const redirects = fs.readFileSync(redirectsPath, 'utf8');
  if (sitemap.includes(profile.counterpartOrigin)) {
    errors.push(`sitemap.xml contains counterpart origin ${profile.counterpartOrigin}`);
  }
  if (!robots.includes(`Sitemap: ${profile.origin}/sitemap.xml`)) {
    errors.push(`robots.txt must point to ${profile.origin}/sitemap.xml`);
  }

  redirects.split('\n').forEach((line, index) => {
    const [source, target] = line.trim().split(/\s+/);
    if (!source || source.startsWith('#') || !target) return;
    if (target === source || target === `${profile.origin}${source}`) {
      errors.push(`_redirects line ${index + 1} redirects ${source} to itself`);
    }
  });

  for (const route of routesDocument.routes || []) {
    const location = locationForCanonicalPath(route.canonicalPath, locations);
    if (!location || isInternalLocation(location, profile)) continue;
    for (const locale of profile.locales) {
      const publicPath = localizedPath(route.canonicalPath, locale, profile);
      if (sitemap.includes(`${profile.origin}${publicPath}`)) {
        errors.push(`sitemap.xml contains external location route ${publicPath}`);
      }
      const sourcePath = locale === profile.defaultLocale
        ? route.canonicalPath
        : `/${locale}${route.canonicalPath}`;
      const redirect = `${sourcePath} ${profile.counterpartOrigin}${route.canonicalPath} 301`;
      if (!redirects.includes(redirect)) {
        errors.push(`_redirects is missing ${redirect}`);
      }
    }
  }
}

if (!fs.existsSync(distDir)) {
  console.error('check-site-profile-output failed: dist/ does not exist');
  process.exit(1);
}

checkArtifactIdentity();
checkLocationIsolation();
checkLocationRouteManifest();
checkRegisteredHtml();
checkSitemapAndRedirects();
checkTurnstileBuildConfig();

if (errors.length > 0) {
  console.error(`check-site-profile-output failed for ${profile.id}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `check-site-profile-output passed for ${profile.id}: ${profile.origin}, ` +
    `${profile.locales.length} locale(s), regional location isolation verified.`,
);
