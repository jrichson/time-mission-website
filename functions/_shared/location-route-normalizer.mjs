import {
  LOCATION_ROUTE_ENTRIES,
  PREFIXABLE_CANONICAL_PATHS,
  PREFIXABLE_ROUTE_ALIASES,
} from './location-route-manifest.mjs';

const LOCATION_PREFIXED_ASSET_PREFIXES = [
  '/_astro/',
  '/assets/',
  '/css/',
  '/data/',
  '/fonts/',
  '/js/',
];

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function compactLocationSegment(value) {
  return safeDecode(String(value || ''))
    .trim()
    .toLowerCase()
    .replace(/\.html$/i, '')
    .replace(/-/g, '');
}

function registerSource(map, source, entry) {
  const key = compactLocationSegment(source);
  if (key) map.set(key, entry);
}

function buildRouteMap() {
  const map = new Map();
  for (const entry of LOCATION_ROUTE_ENTRIES) {
    const canonicalSegment = entry.canonicalPath.replace(/^\//, '');
    registerSource(map, canonicalSegment, entry);
    registerSource(map, entry.officialAlternate, entry);
    for (const source of entry.compatibilitySources || []) {
      registerSource(map, source, entry);
    }
  }
  return map;
}

const routeByCompactSegment = buildRouteMap();

function normalizePathname(value) {
  const raw = String(value || '/');
  const clean = raw.startsWith('/') ? raw : `/${raw}`;
  return clean.replace(/\/+/g, '/');
}

function trimTrailingSlash(pathname) {
  return pathname.replace(/\/+$/, '') || '/';
}

function compactRoutePath(value) {
  return trimTrailingSlash(
    normalizePathname(safeDecode(value))
      .toLowerCase()
      .replace(/\.html$/i, '')
      .replace(/-/g, ''),
  );
}

function buildSharedRouteMap() {
  const map = new Map();
  for (const canonicalPath of PREFIXABLE_CANONICAL_PATHS) {
    map.set(compactRoutePath(canonicalPath), canonicalPath);
    map.set(compactRoutePath(`${canonicalPath}.html`), canonicalPath);
  }
  for (const [source, target] of PREFIXABLE_ROUTE_ALIASES) {
    map.set(compactRoutePath(source), target);
  }
  return map;
}

const sharedRouteByCompactPath = buildSharedRouteMap();

export function locationRouteEntries() {
  return LOCATION_ROUTE_ENTRIES.map((entry) => ({
    canonicalPath: entry.canonicalPath,
    compatibilitySources: [...(entry.compatibilitySources || [])],
    externalUrl: entry.externalUrl || '',
    officialAlternate: entry.officialAlternate || '',
  }));
}

export function resolveLocationCanonicalPath(pathname) {
  const route = resolveLocationPath(pathname);
  return route.redirectUrl || route.redirectPath;
}

function resolveLocationPath(pathname) {
  const cleanPathname = normalizePathname(pathname);
  const parts = cleanPathname.split('/');
  const firstSegment = parts[1] || '';
  if (!firstSegment) return { redirectPath: '', assetPath: '' };

  const entry = routeByCompactSegment.get(compactLocationSegment(firstSegment));
  if (!entry) return { redirectPath: '', redirectUrl: '', assetPath: '' };

  if (entry.externalUrl) {
    return {
      redirectPath: '',
      redirectUrl: entry.externalUrl,
      assetPath: '',
    };
  }

  const canonicalPath = entry.canonicalPath;

  const suffix = parts.slice(2).join('/');
  const sourcePath = trimTrailingSlash(cleanPathname);
  if (!suffix) {
    return {
      redirectPath: sourcePath === canonicalPath ? '' : canonicalPath,
      assetPath: '',
    };
  }

  const suffixPath = trimTrailingSlash(normalizePathname(suffix));
  const assetPath = LOCATION_PREFIXED_ASSET_PREFIXES.some((prefix) => suffixPath.startsWith(prefix))
    ? suffixPath
    : '';
  if (assetPath) {
    const targetPath = `${canonicalPath}${assetPath}`;
    return {
      redirectPath: sourcePath === targetPath ? '' : targetPath,
      assetPath: sourcePath === targetPath ? assetPath : '',
    };
  }

  const sharedPath = sharedRouteByCompactPath.get(compactRoutePath(suffixPath));
  const targetSuffix = sharedPath ? (sharedPath === '/' ? '' : sharedPath) : suffixPath;
  const targetPath = `${canonicalPath}${targetSuffix}`;

  return {
    redirectPath: sourcePath === targetPath ? '' : targetPath,
    assetPath: sharedPath && sharedPath !== '/' ? sharedPath : '',
  };
}

export function resolveLocationRedirectUrl(requestUrl) {
  const url = new URL(requestUrl);
  const route = resolveLocationPath(url.pathname);
  if (route.redirectUrl) {
    const target = new URL(route.redirectUrl);
    target.search = url.search;
    target.hash = '';
    return target.toString();
  }
  if (!route.redirectPath) return '';

  const target = new URL(url.toString());
  target.pathname = route.redirectPath;
  target.hash = '';
  return target.toString();
}

export function resolveLocationRouteRequest(requestUrl) {
  const url = new URL(requestUrl);
  const route = resolveLocationPath(url.pathname);
  const result = {
    redirectUrl: '',
    assetPath: '',
  };

  if (route.redirectPath) {
    const target = new URL(url.toString());
    target.pathname = route.redirectPath;
    target.hash = '';
    result.redirectUrl = target.toString();
    return result;
  }

  if (route.redirectUrl) {
    const target = new URL(route.redirectUrl);
    target.search = url.search;
    target.hash = '';
    result.redirectUrl = target.toString();
    return result;
  }

  if (route.assetPath) {
    result.assetPath = route.assetPath;
  }
  return result;
}
