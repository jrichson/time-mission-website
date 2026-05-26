'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  loadRouteRegistry,
  compilePublicUrlSurface,
  verifySitemapLocs,
} = require('./lib/route-artifacts');
const { normalizeCanonicalPath } = require('./lib/validation-core');

const root = path.resolve(__dirname, '..');

const MODE_FLAGS = ['--registry', '--redirects', '--sitemap', '--sources', '--dist'];

const SCOPE_FILES = {
  'root-core': [
    'src/pages/index.astro',
    'src/pages/about.astro',
    'src/pages/missions.astro',
    'src/pages/groups.astro',
    'src/pages/gift-cards.astro',
    'src/pages/faq.astro',
    'src/pages/contact.astro',
    'src/pages/contact-thank-you.astro',
    'src/partials/missions-main.frag.txt',
    'src/partials/groups-main.frag.txt',
    'src/partials/gift-cards-main.frag.txt',
  ],
  'root-legal': [
    'src/pages/404.astro',
    'src/pages/licensing.astro',
    'src/pages/privacy.astro',
    'src/pages/terms.astro',
    'src/pages/code-of-conduct.astro',
    'src/pages/cookies.astro',
    'src/pages/accessibility.astro',
    'src/pages/waiver.astro',
    'src/partials/404-main.frag.txt',
  ],
  locations: [
    'src/pages/antwerp.astro',
    'src/pages/brussels.astro',
    'src/pages/dallas.astro',
    'src/pages/houston.astro',
    'src/pages/lincoln.astro',
    'src/pages/manassas.astro',
    'src/pages/mount-prospect.astro',
    'src/pages/nashville.astro',
    'src/pages/orland-park.astro',
    'src/pages/philadelphia.astro',
    'src/pages/west-nyack.astro',
    'src/pages/locations.astro',
    'data/locations.json',
  ],
  groups: [],
  shared: [
    'js/nav.js',
    'js/ticket-panel.js',
    'js/locations.js',
    'tests/smoke/site.spec.js',
    'src/pages/index.astro',
  ],
};

function loadGroupsScopeFiles() {
  const dir = path.join(root, 'src', 'pages', 'groups');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => n.endsWith('.astro')).map((n) => `src/pages/groups/${n}`);
}

SCOPE_FILES.groups = loadGroupsScopeFiles();

function parseArgs(argv) {
  const modes = {
    registry: false,
    redirects: false,
    sitemap: false,
    sources: false,
    dist: false,
  };
  let scope = 'all';

  for (const arg of argv) {
    if (arg.startsWith('--scope=')) {
      scope = arg.slice('--scope='.length);
      continue;
    }
    if (arg === '--registry') modes.registry = true;
    else if (arg === '--redirects') modes.redirects = true;
    else if (arg === '--sitemap') modes.sitemap = true;
    else if (arg === '--sources') modes.sources = true;
    else if (arg === '--dist') modes.dist = true;
  }

  const explicitMode = argv.some((a) => MODE_FLAGS.includes(a));
  if (!explicitMode) {
    modes.registry = true;
    modes.redirects = true;
    modes.sitemap = true;
    modes.sources = true;
  }

  return { modes, scope };
}

function readRegistry() {
  return loadRouteRegistry(root);
}

function normalizePath(p) {
  return normalizeCanonicalPath(p);
}

function parseRedirects(content) {
  const rows = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length < 3) {
      rows.push({ bad: true, raw: trimmed });
      continue;
    }
    const status = Number(parts[parts.length - 1]);
    const target = parts[parts.length - 2];
    const source = parts.slice(0, parts.length - 2).join(' ');
    rows.push({ source, target, status });
  }
  return rows;
}

function redirectRowKey(source, target, status) {
  return `${source}\t${target}\t${status}`;
}

function validateRegistry(registry, errors) {
  if (!registry || typeof registry !== 'object') {
    errors.push('registry root must be an object');
    return;
  }
  if (registry.baseUrl !== 'https://www.timemission.com') {
    errors.push(`registry.baseUrl must be https://www.timemission.com (got ${registry.baseUrl})`);
  }
  if (!Array.isArray(registry.routes)) {
    errors.push('registry.routes must be an array');
    return;
  }

  const canonicalSeen = new Set();
  for (const route of registry.routes) {
    const keys = ['id', 'canonicalPath', 'redirectSources', 'outputFile', 'sitemap', 'status'];
    for (const k of keys) {
      if (!(k in route)) errors.push(`route "${route.id || '(missing id)'}" missing key ${k}`);
    }
    if (!Array.isArray(route.redirectSources) || route.redirectSources.length === 0) {
      errors.push(`route "${route.id}" needs redirectSources`);
    }
    const cp = route.canonicalPath;
    if (cp !== '/' && (cp.endsWith('/') || cp.endsWith('.html'))) {
      errors.push(`route "${route.id}" has invalid canonicalPath "${cp}"`);
    }
    if (canonicalSeen.has(cp)) errors.push(`duplicate canonicalPath "${cp}"`);
    canonicalSeen.add(cp);

    const out = route.outputFile;
    if (typeof out !== 'string' || !out.endsWith('.html')) {
      errors.push(`route "${route.id}" outputFile must be a string ending with .html`);
    } else if (out !== 'index.html' && out.endsWith('/index.html')) {
      errors.push(`route "${route.id}" outputFile must not use nested /index.html for non-root routes`);
    }

    if (typeof route.sitemap !== 'boolean') {
      errors.push(`route "${route.id}" sitemap must be boolean`);
    }
  }

  if (!Array.isArray(registry.machineReadableRoutes)) {
    errors.push('registry.machineReadableRoutes must be an array');
  } else {
    for (const route of registry.machineReadableRoutes) {
      const keys = ['id', 'canonicalPath', 'outputFile', 'sitemap'];
      for (const k of keys) {
        if (!(k in route)) errors.push(`machine route "${route.id || '(missing id)'}" missing key ${k}`);
      }
      const cp = route.canonicalPath;
      if (typeof cp !== 'string' || !cp.startsWith('/') || cp.endsWith('/')) {
        errors.push(`machine route "${route.id}" has invalid canonicalPath "${cp}"`);
      }
      if (canonicalSeen.has(cp)) errors.push(`duplicate canonicalPath "${cp}"`);
      canonicalSeen.add(cp);
      const out = route.outputFile;
      if (typeof out !== 'string' || !/\.(txt|md)$/.test(out)) {
        errors.push(`machine route "${route.id}" outputFile must end with .txt or .md`);
      }
      if (route.sitemap !== false) {
        errors.push(`machine route "${route.id}" sitemap must be false`);
      }
    }
  }

  if (!Array.isArray(registry.aliases)) {
    errors.push('registry.aliases must be an array');
    return;
  }

  for (const alias of registry.aliases) {
    if (!alias.source || !alias.target) {
      errors.push('each alias requires source and target');
      continue;
    }
    const t = alias.target;
    if (/^(https?:)?\/\//i.test(t)) {
      if (!alias.allowExternal || !alias.externalAllowlistReason) {
        errors.push(`alias "${alias.source}" targets external URL "${t}" without allowExternal`);
      }
    }
    if (/^(http:\/\/|https:\/\/|\/\/)/.test(t) && !alias.allowExternal) {
      errors.push(`alias "${alias.source}" must not target external "${t}"`);
    }
  }
}

function validateRedirects(registry, errors) {
  const redirectsPath = path.join(root, '_redirects');
  if (!fs.existsSync(redirectsPath)) {
    errors.push('missing _redirects');
    return;
  }
  const content = fs.readFileSync(redirectsPath, 'utf8');
  const parsed = parseRedirects(content);
  const actual = new Map();
  for (const row of parsed) {
    if (row.bad) {
      errors.push(`invalid _redirects row: ${row.raw}`);
      continue;
    }
    actual.set(redirectRowKey(row.source, row.target, row.status), row);
  }

  const expected = compilePublicUrlSurface(registry).redirectPairs;

  for (const pair of expected) {
    const key = redirectRowKey(pair.source, pair.target, pair.status);
    if (!actual.has(key)) {
      errors.push(`missing _redirects row for ${pair.source} -> ${pair.target} (${pair.status})`);
    }
  }
}

function validateSitemap(registry, errors) {
  const surface = compilePublicUrlSurface(registry);
  const result = verifySitemapLocs(surface.sitemapUrls, surface, {
    requireBaseUrl: true,
  });
  result.errors.forEach((error) => {
    errors.push(error.replace(/^Sitemap\s/, 'sitemap '));
  });
}

function resolveScopeFiles(scope) {
  const scopesOk = new Set([
    'root-core',
    'root-legal',
    'root',
    'locations',
    'groups',
    'shared',
    'all',
  ]);
  if (!scopesOk.has(scope)) {
    throw new Error(`unknown scope "${scope}"`);
  }

  if (scope === 'root') {
    return [...SCOPE_FILES['root-core'], ...SCOPE_FILES['root-legal']];
  }

  if (scope === 'all') {
    const set = new Set();
    for (const key of ['root-core', 'root-legal', 'locations', 'groups', 'shared']) {
      for (const f of resolveScopeFiles(key)) set.add(f);
    }
    return [...set];
  }

  return [...SCOPE_FILES[scope]];
}

const EXTERNAL_SCHEME = /^(https?:|mailto:|tel:|sms:|javascript:)/i;

function validateUrlSurfaceAgainstRegistry(surface, fileRel, rawUrl, errors, label) {
  if (!rawUrl || EXTERNAL_SCHEME.test(rawUrl) || rawUrl.startsWith('//')) return;
  let pathname = rawUrl.split('#')[0].split('?')[0];
  if (
    (pathname.startsWith('../') || pathname.startsWith('./')) &&
    !pathname.endsWith('.html')
  ) {
    return;
  }
  if (/^https?:\/\/(?:www\.)?timemission\.com/i.test(pathname)) {
    pathname = pathname.replace(/^https?:\/\/(?:www\.)?timemission\.com/i, '');
  }

  if (!pathname.startsWith('/') && !pathname.startsWith('.')) return;

  const normalized = normalizePath(pathname);
  if (!normalized || normalized === '/') return;

  if (/^\/(assets|css|js|fonts)(\/|$)/.test(normalized)) return;

  if (normalized.endsWith('.html')) {
    errors.push(`${fileRel}: ${label} still references legacy "${rawUrl}"`);
    return;
  }

  if (!surface.isKnownCanonical(normalized)) {
    errors.push(`${fileRel}: ${label} references unknown canonical "${rawUrl}"`);
  }
}

function validateSources(registry, scope, errors) {
  let files;
  try {
    files = resolveScopeFiles(scope);
  } catch (e) {
    errors.push(String(e.message || e));
    return;
  }

  const surface = compilePublicUrlSurface(registry);
  const canonicalRe = /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/gi;
  const ogRe = /<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/gi;
  const urlJsonLdRe = /"(?:url|@id)"\s*:\s*"([^"]+)"/g;
  const hrefRe = /\s(?:href)=["']([^"']+)["']/gi;

  for (const rel of files) {
    const fp = path.join(root, rel);
    if (!fs.existsSync(fp)) continue;

    const text = fs.readFileSync(fp, 'utf8');

    for (const m of text.matchAll(canonicalRe)) {
      validateUrlSurfaceAgainstRegistry(surface, rel, m[1].trim(), errors, 'canonical');
    }
    for (const m of text.matchAll(ogRe)) {
      validateUrlSurfaceAgainstRegistry(surface, rel, m[1].trim(), errors, 'og:url');
    }
    for (const m of text.matchAll(urlJsonLdRe)) {
      validateUrlSurfaceAgainstRegistry(surface, rel, m[1].trim(), errors, 'JSON-LD url/@id');
    }
    for (const m of text.matchAll(hrefRe)) {
      validateUrlSurfaceAgainstRegistry(surface, rel, m[1].trim(), errors, 'href');
    }

    if (rel.endsWith('.json')) {
      const urls = text.match(/https:\/\/timemission\.com[^\s"'<>]+/g) || [];
      for (const u of urls) {
        validateUrlSurfaceAgainstRegistry(surface, rel, u, errors, 'locations JSON URL');
      }
    }
  }
}

function validateDist(registry, errors) {
  const distRoot = path.join(root, 'dist');
  if (!fs.existsSync(distRoot)) {
    errors.push('missing dist/ — run npm run build:astro before --dist checks');
    return;
  }

  const surface = compilePublicUrlSurface(registry);
  for (const route of surface.routes) {
    const outputFile = surface.outputFileFor(route.canonicalPath) || route.outputFile;
    const target = path.join(distRoot, outputFile);
    if (!fs.existsSync(target)) {
      errors.push(`missing dist output for ${route.canonicalPath}: dist/${outputFile}`);
    }
  }

  const redirectsDist = path.join(distRoot, '_redirects');
  if (!fs.existsSync(redirectsDist)) {
    errors.push('missing dist/_redirects');
  }

  const sitemapDist = path.join(distRoot, 'sitemap.xml');
  if (!fs.existsSync(sitemapDist)) {
    errors.push('missing dist/sitemap.xml');
  }
}

function main() {
  const argv = process.argv.slice(2);
  const { modes, scope } = parseArgs(argv);
  const errors = [];

  let registry;
  try {
    registry = readRegistry();
  } catch (e) {
    errors.push(`cannot read registry: ${e.message}`);
    printErrors(errors);
    process.exit(1);
  }

  if (modes.registry) validateRegistry(registry, errors);
  if (modes.redirects) validateRedirects(registry, errors);
  if (modes.sitemap) validateSitemap(registry, errors);
  if (modes.sources) validateSources(registry, scope, errors);
  if (modes.dist) validateDist(registry, errors);

  if (errors.length) {
    printErrors(errors);
    process.exit(1);
  }

  console.log('Route contract check passed.');
}

function printErrors(errors) {
  console.error('Route contract check failed:');
  for (const error of errors) console.error(`- ${error}`);
}

main();
