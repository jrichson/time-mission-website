'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadJson, normalizeCanonicalPath } = require('./validation-core');
const {
  astroRenderedManifestPath,
  loadAstroRenderedOutputFilesSet,
} = require('./load-astro-rendered-output-files.cjs');

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

function isDynamicLandingSitemapLoc(loc, contract) {
  const pathname = localizedSitemapPathname(loc, contract);
  if (!pathname) return false;
  const registry = contract.registry || {};
  const prefix = normalizeDynamicLandingPrefix(registry);
  if (!pathname.startsWith(`${prefix}/`)) return false;
  const slug = pathname.slice(prefix.length + 1).replace(/\/+$/, '');
  if (!slug || slug.includes('/') || slug.includes('.')) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function isDynamicBlogSitemapLoc(loc, contract) {
  const pathname = localizedSitemapPathname(loc, contract);
  if (!pathname) return false;
  if (pathname === '/blog') return true;
  if (!pathname.startsWith('/blog/')) return false;
  const slug = pathname.slice('/blog/'.length).replace(/\/+$/, '');
  if (!slug || slug.includes('/') || slug.includes('.')) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function localizedSitemapPathname(loc, contract) {
  let url;
  let base;
  try {
    url = new URL(String(loc || ''));
    base = new URL(String(contract.baseUrl || contract.registry?.baseUrl || ''));
  } catch {
    return '';
  }
  if (url.origin !== base.origin) return '';

  const segments = url.pathname.split('/').filter(Boolean);
  const defaultLocale = String(contract.defaultLocale || '');
  const localizedLocales = new Set(
    (contract.locales || [])
      .map((locale) => String(locale || '').trim())
      .filter((locale) => locale && locale !== defaultLocale),
  );
  if (localizedLocales.has(segments[0])) segments.shift();
  return segments.length ? `/${segments.join('/')}` : '/';
}

function verifySitemapLocs(locs, contract, options = {}) {
  const errors = [];
  const opts = {
    requireBaseUrl: false,
    ...options,
  };
  const list = locs.map((loc) => String(loc || ''));
  const seen = new Set();

  for (const loc of list) {
    if (seen.has(loc)) errors.push(`Duplicate sitemap URL: ${loc}`);
    seen.add(loc);
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
    if (!seen.has(url)) {
      errors.push(`Missing sitemap URL: ${url}`);
    }
  }

  for (const loc of list) {
    if (
      !contract.sitemapUrlSet.has(loc)
      && !isDynamicLandingSitemapLoc(loc, contract)
      && !isDynamicBlogSitemapLoc(loc, contract)
    ) {
      errors.push(`Unexpected sitemap URL: ${loc}`);
    }
  }

  return { errors, locs: list };
}

function verifySitemapXml(xml, contract, options = {}) {
  const errors = [];
  const opts = {
    requireXmlHeader: false,
    requireXmlns: false,
    ...options,
  };
  const body = String(xml || '');

  if (opts.requireXmlHeader && !body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('sitemap.xml must start with <?xml version="1.0" encoding="UTF-8"?>');
  }

  if (opts.requireXmlns && !body.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
    errors.push('sitemap.xml must declare sitemap 0.9 xmlns');
  }

  const result = verifySitemapLocs(parseSitemapLocs(body), contract, options);
  errors.push(...result.errors);
  return { errors, locs: result.locs };
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

function redirectFileForSource(deployRoot, canonicalPath) {
  const redirectsPath = path.join(deployRoot, '_redirects');
  if (!fs.existsSync(redirectsPath)) return null;

  const hasExactSource = fs.readFileSync(redirectsPath, 'utf8')
    .split(/\r?\n/)
    .some((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return false;
      const [source, target, status] = trimmed.split(/\s+/);
      return source === canonicalPath && Boolean(target) && /^\d{3}$/.test(status || '');
    });

  return hasExactSource ? redirectsPath : null;
}

/**
 * Resolve an internal site path against a deploy root: Astro routes.json first,
 * then static path under root (same rules as check-internal-links).
 */
function resolveInternalDeployTarget(deployRoot, registry, href) {
  const clean = normalizeCanonicalPath(href);
  if (!clean || clean === '/') return null;
  const renderedManifest = astroRenderedManifestPath(deployRoot);
  const hasRenderedManifest = fs.existsSync(renderedManifest);
  const map = registry && registry.routes ? canonicalToOutputMap(registry) : new Map();
  const rel = map.get(clean);
  if (rel) {
    const routed = path.join(deployRoot, rel);
    if (fs.existsSync(routed)) return routed;

    if (hasRenderedManifest) {
      const astroRendered = loadAstroRenderedOutputFilesSet(deployRoot);
      if (astroRendered.has(rel)) {
        const astroSource = astroSourceForOutput(deployRoot, rel);
        if (astroSource) return astroSource;
      }
    }
    // Mapped output not present in this tree (e.g. source repo vs dist); try static path.
  }

  if (!hasRenderedManifest) {
    const redirectFile = redirectFileForSource(deployRoot, clean);
    if (redirectFile) return redirectFile;
  }

  const tail = clean.replace(/^\//, '');
  if (!tail || tail.includes('..')) return null;
  const staticPath = path.normalize(path.join(deployRoot, tail));
  const deployNorm = path.normalize(deployRoot + path.sep);
  if (!staticPath.startsWith(deployNorm) && staticPath !== path.normalize(deployRoot)) {
    return null;
  }
  if (fs.existsSync(staticPath)) return staticPath;
  const staticHtmlPath = path.normalize(path.join(deployRoot, `${tail}.html`));
  if (staticHtmlPath.startsWith(deployNorm) && fs.existsSync(staticHtmlPath)) return staticHtmlPath;
  return null;
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
  verifySitemapLocs,
  verifySitemapXml,
  canonicalToOutputMap,
  resolveAbsoluteSiteHref,
  resolveInternalDeployTarget,
};
