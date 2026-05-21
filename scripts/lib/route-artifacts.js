'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadJson, normalizeCanonicalPath } = require('./validation-core');
const { loadAstroRenderedOutputFilesSet } = require('./load-astro-rendered-output-files.cjs');

function loadRouteRegistry(root) {
  return loadJson(root, 'src/data/routes.json');
}

function expectedSitemapUrls(registry) {
  return sitemapEntries(registry).map((entry) => entry.url);
}

function publicUrlForCanonical(registry, canonicalPath) {
  const baseUrl = String((registry && registry.baseUrl) || '').replace(/\/+$/, '');
  const canonical = normalizeCanonicalPath(canonicalPath || '/');
  return canonical === '/' ? `${baseUrl}/` : `${baseUrl}${canonical}`;
}

function sitemapEntries(registry) {
  return ((registry && registry.routes) || [])
    .filter((route) => route.sitemap)
    .map((route) => ({
      route,
      canonicalPath: normalizeCanonicalPath(route.canonicalPath || ''),
      url: publicUrlForCanonical(registry, route.canonicalPath),
    }));
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

function normalizeDynamicLandingPrefix(registry) {
  const raw = registry && registry._meta && registry._meta.dynamicLandingPrefix
    ? String(registry._meta.dynamicLandingPrefix)
    : '/c';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function isDynamicLandingPath(registry, pathnameNorm) {
  const prefix = normalizeDynamicLandingPrefix(registry);
  const base = normalizeCanonicalPath(pathnameNorm);
  if (!base.startsWith(`${prefix}/`)) return false;
  const slug = base.slice(prefix.length + 1).replace(/\/+$/, '');
  if (!slug || slug.includes('/') || slug.includes('.')) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function expectedRedirectPairs(registry) {
  const pairs = [];
  for (const route of registry.routes || []) {
    const canonicalTarget = route.externalUrl || (route.canonicalPath === '/' ? '/' : route.canonicalPath);
    for (const legacy of route.legacySources || []) {
      pairs.push({
        source: legacy,
        target: canonicalTarget,
        status: route.status,
      });
    }
  }
  for (const alias of registry.aliases || []) {
    pairs.push({
      source: alias.source,
      target: alias.target,
      status: alias.status,
    });
  }
  return pairs;
}

function compilePublicUrlSurface(registry) {
  const contract = compileRouteContract(registry);
  const routeByCanonical = new Map();
  const canonicalPaths = new Set();
  for (const route of registry.routes || []) {
    const canonical = normalizeCanonicalPath(route.canonicalPath || '');
    if (!canonical) continue;
    canonicalPaths.add(canonical);
    routeByCanonical.set(canonical, route);
  }

  return {
    ...contract,
    routes: registry.routes || [],
    aliases: registry.aliases || [],
    canonicalPaths,
    routeByCanonical,
    sitemapEntries: sitemapEntries(registry),
    redirectPairs: expectedRedirectPairs(registry),
    dynamicLandingPrefix: normalizeDynamicLandingPrefix(registry),
    publicUrlFor(canonicalPath) {
      return publicUrlForCanonical(registry, canonicalPath);
    },
    outputFileFor(canonicalPath) {
      const normalized = normalizeCanonicalPath(canonicalPath);
      return contract.canonicalToOutput.get(normalized) || '';
    },
    routeFor(canonicalPath) {
      return routeByCanonical.get(normalizeCanonicalPath(canonicalPath)) || null;
    },
    isKnownCanonical(value) {
      const normalized = normalizeCanonicalPath(value);
      return canonicalPaths.has(normalized) || isDynamicLandingPath(registry, normalized);
    },
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
