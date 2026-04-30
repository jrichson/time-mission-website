'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const MODE_FLAGS = ['--registry', '--redirects', '--sitemap', '--sources', '--dist'];

const SCOPE_FILES = {
  'root-core': [
    'index.html',
    'about.html',
    'missions.html',
    'groups.html',
    'gift-cards.html',
    'faq.html',
    'contact.html',
    'contact-thank-you.html',
    'src/pages/index.astro',
  ],
  'root-legal': [
    'licensing.html',
    'privacy.html',
    'terms.html',
    'code-of-conduct.html',
    'cookies.html',
    'accessibility.html',
    'waiver.html',
    '404.html',
  ],
  locations: [
    'antwerp.html',
    'brussels.html',
    'dallas.html',
    'houston.html',
    'lincoln.html',
    'manassas.html',
    'mount-prospect.html',
    'orland-park.html',
    'philadelphia.html',
    'west-nyack.html',
    'locations/index.html',
    'data/locations.json',
  ],
  groups: [],
  shared: [
    'js/nav.js',
    'js/ticket-panel.js',
    'js/roller-checkout.js',
    'js/locations.js',
    'tests/smoke/site.spec.js',
    'src/pages/index.astro',
  ],
};

function loadGroupsScopeFiles() {
  const dir = path.join(root, 'groups');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => n.endsWith('.html')).map((n) => `groups/${n}`);
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
  const registryPath = path.join(root, 'src/data/routes.json');
  const raw = fs.readFileSync(registryPath, 'utf8');
  return JSON.parse(raw);
}

function normalizePath(p) {
  if (!p || typeof p !== 'string') return '';
  let s = stripQueryAndHash(p.trim());
  if (s.startsWith('https://timemission.com')) {
    s = s.slice('https://timemission.com'.length);
  } else if (s.startsWith('http://timemission.com')) {
    s = s.slice('http://timemission.com'.length);
  }
  if (!s.startsWith('/')) s = `/${s}`;
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

function stripQueryAndHash(value) {
  return String(value).split('#')[0].split('?')[0];
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
  if (registry.baseUrl !== 'https://timemission.com') {
    errors.push(`registry.baseUrl must be https://timemission.com (got ${registry.baseUrl})`);
  }
  if (!Array.isArray(registry.routes)) {
    errors.push('registry.routes must be an array');
    return;
  }

  const canonicalSeen = new Set();
  for (const route of registry.routes) {
    const keys = ['id', 'canonicalPath', 'legacySources', 'outputFile', 'sitemap', 'status'];
    for (const k of keys) {
      if (!(k in route)) errors.push(`route "${route.id || '(missing id)'}" missing key ${k}`);
    }
    if (!Array.isArray(route.legacySources) || route.legacySources.length === 0) {
      errors.push(`route "${route.id}" needs legacySources`);
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

function expectedRedirectPairs(registry) {
  const pairs = [];
  for (const route of registry.routes) {
    const canonicalTarget = route.canonicalPath === '/' ? '/' : route.canonicalPath;
    for (const legacy of route.legacySources) {
      pairs.push({
        source: legacy,
        target: canonicalTarget,
        status: route.status,
      });
    }
  }
  for (const alias of registry.aliases) {
    pairs.push({
      source: alias.source,
      target: alias.target,
      status: alias.status,
    });
  }
  return pairs;
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

  const expected = expectedRedirectPairs(registry);

  for (const pair of expected) {
    const key = redirectRowKey(pair.source, pair.target, pair.status);
    if (!actual.has(key)) {
      errors.push(`missing _redirects row for ${pair.source} -> ${pair.target} (${pair.status})`);
    }

  }

}

function validateSitemap(registry, errors) {
  const sitemapPath = path.join(root, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    errors.push('missing sitemap.xml');
    return;
  }
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const locRe = /<loc>([^<]+)<\/loc>/g;
  const locs = [...xml.matchAll(locRe)].map((m) => m[1]);

  if (locs.some((u) => u.includes('.html'))) {
    errors.push('sitemap.xml contains .html URLs');
  }

  const expected = new Set();
  for (const route of registry.routes) {
    if (!route.sitemap) continue;
    const url =
      route.canonicalPath === '/'
        ? `${registry.baseUrl}/`
        : `${registry.baseUrl}${route.canonicalPath}`;
    expected.add(url);
  }

  for (const url of locs) {
    if (!expected.has(url)) {
      errors.push(`unexpected or unknown sitemap loc ${url}`);
    }
  }

  for (const url of expected) {
    if (!locs.includes(url)) {
      errors.push(`missing sitemap loc ${url}`);
    }
  }
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

function validateUrlSurfaceAgainstRegistry(registry, fileRel, rawUrl, errors, label) {
  if (!rawUrl || EXTERNAL_SCHEME.test(rawUrl) || rawUrl.startsWith('//')) return;
  let pathname = rawUrl.split('#')[0].split('?')[0];
  if (
    (pathname.startsWith('../') || pathname.startsWith('./')) &&
    !pathname.endsWith('.html')
  ) {
    return;
  }
  if (pathname.startsWith('https://timemission.com')) {
    pathname = pathname.slice('https://timemission.com'.length);
  } else if (pathname.startsWith('http://timemission.com')) {
    pathname = pathname.slice('http://timemission.com'.length);
  }

  if (!pathname.startsWith('/') && !pathname.startsWith('.')) return;

  const normalized = normalizePath(pathname);
  if (!normalized || normalized === '/') return;

  if (/^\/(assets|css|js|fonts)(\/|$)/.test(normalized)) return;

  if (normalized.endsWith('.html')) {
    errors.push(`${fileRel}: ${label} still references legacy "${rawUrl}"`);
    return;
  }

  const allowed = new Set(registry.routes.map((r) => r.canonicalPath));
  if (!allowed.has(normalized)) {
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

  const canonicalRe = /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/gi;
  const ogRe = /<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/gi;
  const urlJsonLdRe = /"(?:url|@id)"\s*:\s*"([^"]+)"/g;
  const hrefRe = /\s(?:href)=["']([^"']+)["']/gi;

  for (const rel of files) {
    const fp = path.join(root, rel);
    if (!fs.existsSync(fp)) continue;

    const text = fs.readFileSync(fp, 'utf8');

    for (const m of text.matchAll(canonicalRe)) {
      validateUrlSurfaceAgainstRegistry(registry, rel, m[1].trim(), errors, 'canonical');
    }
    for (const m of text.matchAll(ogRe)) {
      validateUrlSurfaceAgainstRegistry(registry, rel, m[1].trim(), errors, 'og:url');
    }
    for (const m of text.matchAll(urlJsonLdRe)) {
      validateUrlSurfaceAgainstRegistry(registry, rel, m[1].trim(), errors, 'JSON-LD url/@id');
    }
    for (const m of text.matchAll(hrefRe)) {
      validateUrlSurfaceAgainstRegistry(registry, rel, m[1].trim(), errors, 'href');
    }

    if (rel.endsWith('.json')) {
      const urls = text.match(/https:\/\/timemission\.com[^\s"'<>]+/g) || [];
      for (const u of urls) {
        validateUrlSurfaceAgainstRegistry(registry, rel, u, errors, 'locations JSON URL');
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

  for (const route of registry.routes) {
    const target = path.join(distRoot, route.outputFile);
    if (!fs.existsSync(target)) {
      errors.push(`missing dist output for ${route.canonicalPath}: dist/${route.outputFile}`);
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
