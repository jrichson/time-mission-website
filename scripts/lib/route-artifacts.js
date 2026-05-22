'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadJson, normalizeCanonicalPath } = require('./validation-core');
const { loadAstroRenderedOutputFilesSet } = require('./load-astro-rendered-output-files.cjs');

require('tsx/cjs/api').register();
const {
  compilePublicUrlSurface: compileTypedPublicUrlSurface,
  dynamicLandingPrefix,
  isDynamicLandingPath: isTypedDynamicLandingPath,
  normalizePublicPath,
  publicUrlForPath,
  publicUrlRedirectPairs,
  publicUrlSitemapEntries,
  registrySitemapUrls,
} = require('../../src/lib/public-url-surface.ts');

function loadRouteRegistry(root) {
  return loadJson(root, 'src/data/routes.json');
}

function expectedSitemapUrls(registry) {
  return registrySitemapUrls(registry);
}

function publicUrlForCanonical(registry, canonicalPath) {
  return publicUrlForPath(canonicalPath, registry);
}

function sitemapEntries(registry) {
  return publicUrlSitemapEntries(registry);
}

function normalizeDynamicLandingPrefix(registry) {
  return dynamicLandingPrefix(registry);
}

function isDynamicLandingPath(registry, pathnameNorm) {
  return isTypedDynamicLandingPath(pathnameNorm, registry);
}

function expectedRedirectPairs(registry) {
  return publicUrlRedirectPairs(registry);
}

function canonicalToOutputMap(registry) {
  const surface = compileTypedPublicUrlSurface(registry);
  const map = new Map();
  for (const route of surface.routes) {
    const canonical = normalizePublicPath(route.canonicalPath || '');
    if (!canonical) continue;
    map.set(canonical, String(route.outputFile || '').replace(/^\//, ''));
  }
  return map;
}

function compilePublicUrlSurface(registry) {
  const surface = compileTypedPublicUrlSurface(registry);
  const sitemapUrls = surface.sitemapUrls || [];
  return {
    ...surface,
    registry,
    sitemapUrlSet: new Set(sitemapUrls),
    canonicalToOutput: canonicalToOutputMap(registry),
  };
}

function compileRouteContract(registry) {
  const surface = compilePublicUrlSurface(registry);
  return {
    registry,
    baseUrl: surface.baseUrl,
    rootHome: surface.rootHome,
    sitemapUrls: surface.sitemapUrls,
    sitemapUrlSet: surface.sitemapUrlSet,
    canonicalToOutput: surface.canonicalToOutput,
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
      errors.push(`Sitemap contains historical .html URL: ${loc}`);
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

  function isDynamicLandingSitemapLoc(loc) {
    const registry = contract.registry || {};
    const base = String(registry.baseUrl || '').replace(/\/+$/, '');
    const prefix = normalizeDynamicLandingPrefix(registry);
    const prefixSlug = prefix.startsWith('/') ? prefix.slice(1) : prefix;
    const expectedPrefixNoSlash = `${base}/${prefixSlug}`;
    if (!loc.startsWith(`${expectedPrefixNoSlash}/`)) return false;
    const slug = loc.slice(expectedPrefixNoSlash.length + 1).replace(/\/+$/, '');
    if (!slug || slug.includes('/') || slug.includes('.')) return false;
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  }

  for (const loc of locs) {
    if (!contract.sitemapUrlSet.has(loc) && !isDynamicLandingSitemapLoc(loc)) {
      errors.push(`Unexpected sitemap URL: ${loc}`);
    }
  }

  return { errors, locs };
}

function resolveAbsoluteSiteHref(root, registry, href) {
  const clean = normalizeCanonicalPath(href);
  const map = canonicalToOutputMap(registry);
  const rel = map.get(clean);
  if (!rel) return null;
  return path.join(root, rel);
}

function astroSourceForOutput(deployRoot, rel) {
  const normalized = String(rel || '').replace(/^\//, '');
  if (!normalized.endsWith('.html')) return null;

  const withoutExt = normalized.replace(/\.html$/, '');
  const pageRel = withoutExt === 'index' ? 'index.astro' : `${withoutExt}.astro`;
  const candidate = path.join(deployRoot, 'src', 'pages', pageRel);
  return fs.existsSync(candidate) ? candidate : null;
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
    const astroRendered = loadAstroRenderedOutputFilesSet(deployRoot);
    if (astroRendered.has(rel)) {
      const astroSource = astroSourceForOutput(deployRoot, rel);
      if (astroSource) return astroSource;
    }
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
  compilePublicUrlSurface,
  publicUrlForCanonical,
  sitemapEntries,
  expectedRedirectPairs,
  normalizeDynamicLandingPrefix,
  isDynamicLandingPath,
  parseSitemapLocs,
  verifySitemapXml,
  canonicalToOutputMap,
  resolveAbsoluteSiteHref,
  resolveInternalDeployTarget,
};
