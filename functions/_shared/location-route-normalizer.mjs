const LOCATION_ROUTE_ENTRIES = [
  {
    canonicalPath: '/lincoln',
    officialAlternate: 'r1-indoor-karting',
    compatibilitySources: ['providence'],
  },
  {
    canonicalPath: '/west-nyack',
    officialAlternate: 'palisades-center',
    compatibilitySources: ['westnyack', 'palisades'],
  },
  {
    canonicalPath: '/brussels',
    officialAlternate: 'terminal1',
  },
  {
    canonicalPath: '/manassas',
    officialAlternate: 'manassas-mall',
  },
  {
    canonicalPath: '/philadelphia',
    officialAlternate: 'philly',
  },
  {
    canonicalPath: '/mount-prospect',
    officialAlternate: 'mt-prospect',
    compatibilitySources: ['mountprospect'],
  },
  {
    canonicalPath: '/antwerp',
    officialAlternate: 'experience-factory-antwerp',
  },
  {
    canonicalPath: '/houston',
    officialAlternate: 'marq-e',
  },
  {
    canonicalPath: '/orland-park',
    officialAlternate: '',
    compatibilitySources: ['orlandpark'],
  },
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

function registerSource(map, source, canonicalPath) {
  const key = compactLocationSegment(source);
  if (key) map.set(key, canonicalPath);
}

function buildRouteMap() {
  const map = new Map();
  for (const entry of LOCATION_ROUTE_ENTRIES) {
    const canonicalSegment = entry.canonicalPath.replace(/^\//, '');
    registerSource(map, canonicalSegment, entry.canonicalPath);
    registerSource(map, entry.officialAlternate, entry.canonicalPath);
    for (const source of entry.compatibilitySources || []) {
      registerSource(map, source, entry.canonicalPath);
    }
  }
  return map;
}

const routeByCompactSegment = buildRouteMap();

export function locationRouteEntries() {
  return LOCATION_ROUTE_ENTRIES.map((entry) => ({
    canonicalPath: entry.canonicalPath,
    compatibilitySources: [...(entry.compatibilitySources || [])],
    officialAlternate: entry.officialAlternate || '',
  }));
}

export function resolveLocationCanonicalPath(pathname) {
  const rawPathname = String(pathname || '/');
  const cleanPathname = rawPathname.startsWith('/') ? rawPathname : `/${rawPathname}`;
  const parts = cleanPathname.split('/');
  const firstSegment = parts[1] || '';
  if (!firstSegment) return '';

  const canonicalPath = routeByCompactSegment.get(compactLocationSegment(firstSegment));
  if (!canonicalPath) return '';

  const rest = parts.slice(2).join('/').replace(/\/+$/, '');
  const targetPath = rest ? `${canonicalPath}/${rest}` : canonicalPath;
  const sourcePath = cleanPathname.replace(/\/+$/, '') || '/';
  return sourcePath === targetPath ? '' : targetPath;
}

export function resolveLocationRedirectUrl(requestUrl) {
  const url = new URL(requestUrl);
  const canonicalPath = resolveLocationCanonicalPath(url.pathname);
  if (!canonicalPath) return '';

  const target = new URL(url.toString());
  target.pathname = canonicalPath;
  target.hash = '';
  return target.toString();
}
