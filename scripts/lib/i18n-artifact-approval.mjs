import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { compileRegionalHtmlRoutes } from './regional-html-routes.mjs';

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;|&#38;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:x27|39);/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function normalizedText(value) {
  return decodeHtml(value).replace(/\s+/g, ' ').trim();
}

function firstMatch(html, pattern) {
  return normalizedText(String(html || '').match(pattern)?.[1] || '');
}

export function extractLanguageSurfaceCopy(html) {
  const source = String(html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ');
  const attributes = [...source.matchAll(/\s(?:alt|aria-label|placeholder|title)="([^"]+)"/gi)]
    .map((match) => normalizedText(match[1]))
    .filter(Boolean);
  const body = normalizedText(
    (source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '')
      .replace(/<[^>]+>/g, ' '),
  );
  return {
    title: firstMatch(source, /<title>([^<]*)<\/title>/i),
    description: firstMatch(source, /<meta\s+name="description"\s+content="([^"]*)"/i),
    heading: normalizedText(
      (source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '').replace(/<[^>]+>/g, ' '),
    ),
    attributes,
    body,
  };
}

export function artifactLanguageDigest(distDir, profile, locale, registeredRoutes = []) {
  const hash = crypto.createHash('sha256');
  const routes = compileRegionalHtmlRoutes(distDir, profile, registeredRoutes);
  for (const route of routes) {
    const outputFile = locale === profile.defaultLocale
      ? route.outputFile
      : path.posix.join(locale, route.outputFile);
    const absolute = path.join(distDir, ...outputFile.split('/'));
    if (!fs.existsSync(absolute)) continue;
    const copy = extractLanguageSurfaceCopy(fs.readFileSync(absolute, 'utf8'));
    hash.update(route.canonicalPath);
    hash.update('\0');
    hash.update(JSON.stringify(copy));
    hash.update('\0');
  }
  return hash.digest('hex');
}

export function approvalRecord(value) {
  if (typeof value === 'string') return { status: value, artifactDigest: '' };
  return {
    status: String(value?.status || 'missing'),
    artifactDigest: String(value?.artifactDigest || ''),
    reviewer: String(value?.reviewer || ''),
    reviewedAt: String(value?.reviewedAt || ''),
  };
}

export function unchangedLocalizedFields(defaultCopy, localizedCopy) {
  const unchanged = [];
  if (
    defaultCopy.title
    && defaultCopy.title === localizedCopy.title
    && !/^Time Mission(?:\s+[A-Z][\p{L}\p{M}' -]+)?$/u.test(defaultCopy.title)
  ) unchanged.push('title');
  if (
    defaultCopy.description.length >= 30
    && defaultCopy.description === localizedCopy.description
  ) unchanged.push('description');
  if (
    defaultCopy.heading.length >= 8
    && defaultCopy.heading === localizedCopy.heading
    && !/^Time Mission$/i.test(defaultCopy.heading)
  ) unchanged.push('heading');
  return unchanged;
}
