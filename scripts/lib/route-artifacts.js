'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadJson, normalizeCanonicalPath } = require('./validation-core');

function loadRouteRegistry(root) {
  return loadJson(root, 'src/data/routes.json');
}

function expectedSitemapUrls(registry) {
  const urls = [];
  for (const route of registry.routes || []) {
    if (!route.sitemap) continue;
    const url = route.canonicalPath === '/'
      ? `${registry.baseUrl}/`
      : `${registry.baseUrl}${route.canonicalPath}`;
    urls.push(url);
  }
  return urls;
}

function compileRouteContract(registry) {
  const baseUrl = String((registry && registry.baseUrl) || '').trim();
  const sitemapUrls = expectedSitemapUrls(registry);
  return {
    registry,
    baseUrl,
    rootHome: `${baseUrl}/`,
    sitemapUrls,
    sitemapUrlSet: new Set(sitemapUrls),
    canonicalToOutput: canonicalToOutputMap(registry),
  };
}

function parseSitemapLocs(xml) {
  const locRe = /<loc>([^<]+)<\/loc>/g;
  return [...String(xml || '').matchAll(locRe)].map((m) => m[1]);
}

function verifySitemapXml(xml, contract, options = {}) {
  const errors = [];
  const opts = {
    requireXmlHeader: false,
    requireXmlns: false,
    requireBaseUrl: false,
    ...options,
  };

  const body = String(xml || '');
  const locs = parseSitemapLocs(body);

  if (opts.requireXmlHeader && !body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('sitemap.xml must start with <?xml version="1.0" encoding="UTF-8"?>');
  }

  if (opts.requireXmlns && !body.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
    errors.push('sitemap.xml must declare sitemap 0.9 xmlns');
  }

  for (const loc of locs) {
    if (loc.includes('.html')) {
      errors.push(`Sitemap contains legacy .html URL: ${loc}`);
    }
    if (loc.endsWith('/') && loc !== contract.rootHome) {
      errors.push(`Sitemap loc must not end with trailing slash except root: ${loc}`);
    }
    if (opts.requireBaseUrl && !loc.startsWith(contract.baseUrl)) {
      errors.push(`Sitemap loc must use base URL ${contract.baseUrl}: ${loc}`);
    }
  }

  for (const url of contract.sitemapUrls) {
    if (!locs.includes(url)) {
      errors.push(`Missing sitemap URL: ${url}`);
    }
  }

  for (const loc of locs) {
    if (!contract.sitemapUrlSet.has(loc)) {
      errors.push(`Unexpected sitemap URL: ${loc}`);
    }
  }

  return { errors, locs };
}

function canonicalToOutputMap(registry) {
  const map = new Map();
  for (const route of registry.routes || []) {
    const canonical = normalizeCanonicalPath(route.canonicalPath || '');
    if (!canonical) continue;
    map.set(canonical, String(route.outputFile || '').replace(/^\//, ''));
  }
  return map;
}

function resolveAbsoluteSiteHref(root, registry, href) {
  const clean = normalizeCanonicalPath(href);
  const map = canonicalToOutputMap(registry);
  const rel = map.get(clean);
  if (!rel) return null;
  return path.join(root, rel);
}

/**
 * Resolve an internal site path against a deploy root: Astro routes.json first,
 * then static path under root (same rules as check-internal-links).
 */
function resolveInternalDeployTarget(deployRoot, registry, href) {
  const clean = normalizeCanonicalPath(href);
  if (!clean || clean === '/') return null;
  const map = registry && registry.routes ? canonicalToOutputMap(registry) : new Map();
  const rel = map.get(clean);
  if (rel) {
    const routed = path.join(deployRoot, rel);
    if (fs.existsSync(routed)) return routed;
    // Mapped output not present in this tree (e.g. source repo vs dist); try static path.
  }
  const tail = clean.replace(/^\//, '');
  if (!tail || tail.includes('..')) return null;
  const staticPath = path.normalize(path.join(deployRoot, tail));
  const deployNorm = path.normalize(deployRoot + path.sep);
  if (!staticPath.startsWith(deployNorm) && staticPath !== path.normalize(deployRoot)) {
    return null;
  }
  return fs.existsSync(staticPath) ? staticPath : null;
}

module.exports = {
  loadRouteRegistry,
  expectedSitemapUrls,
  compileRouteContract,
  parseSitemapLocs,
  verifySitemapXml,
  canonicalToOutputMap,
  resolveAbsoluteSiteHref,
  resolveInternalDeployTarget,
};
