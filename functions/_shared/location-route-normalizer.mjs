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
  {
    canonicalPath: '/dallas',
    officialAlternate: '',
  },
];

const PREFIXABLE_CANONICAL_PATHS = [
  '/about',
  '/missions',
  '/groups',
  '/groups/bachelor-ette',
  '/groups/birthdays',
  '/groups/corporate',
  '/groups/field-trips',
  '/groups/holidays',
  '/groups/private-events',
  '/gift-cards',
  '/faq',
  '/contact',
  '/contact-thank-you',
  '/locations',
  '/privacy',
  '/terms',
  '/code-of-conduct',
  '/cookies',
  '/accessibility',
  '/licensing',
  '/waiver',
];

const PREFIXABLE_ROUTE_ALIASES = [
  ['/about.html', '/about'],
  ['/missions.html', '/missions'],
  ['/experiences', '/missions'],
  ['/experiences.html', '/missions'],
  ['/groups.html', '/groups'],
  ['/groups/bachelor-ette.html', '/groups/bachelor-ette'],
  ['/groups/birthdays.html', '/groups/birthdays'],
  ['/groups/corporate.html', '/groups/corporate'],
  ['/groups/field-trips.html', '/groups/field-trips'],
  ['/groups/holidays.html', '/groups/holidays'],
  ['/groups/private-events.html', '/groups/private-events'],
  ['/adult-birthday-parties', '/groups/birthdays'],
  ['/adult-birthday-party', '/groups/birthdays'],
  ['/kids-birthday-party', '/groups/birthdays'],
  ['/corporate-events', '/groups/corporate'],
  ['/corporate-event', '/groups/corporate'],
  ['/school-field-trips', '/groups/field-trips'],
  ['/field-trips', '/groups/field-trips'],
  ['/bachelorette-party', '/groups/bachelor-ette'],
  ['/team-building', '/groups/private-events'],
  ['/youth-group-camp', '/groups/private-events'],
  ['/youth-group', '/groups/private-events'],
  ['/bus-tour', '/groups/private-events'],
  ['/bus-tours', '/groups/private-events'],
  ['/family-gathering', '/groups/holidays'],
  ['/date-night-ideas', '/'],
  ['/date-night', '/'],
  ['/gift-cards.html', '/gift-cards'],
  ['/faq.html', '/faq'],
  ['/contact.html', '/contact'],
  ['/contact-thank-you.html', '/contact-thank-you'],
  ['/locations.html', '/locations'],
  ['/locations/index.html', '/locations'],
  ['/privacy.html', '/privacy'],
  ['/privacy-policy', '/privacy'],
  ['/privacy-policy.html', '/privacy'],
  ['/terms.html', '/terms'],
  ['/terms-and-conditions', '/terms'],
  ['/terms-and-conditions.html', '/terms'],
  ['/code-of-conduct.html', '/code-of-conduct'],
  ['/house-rules', '/code-of-conduct'],
  ['/house-rules.html', '/code-of-conduct'],
  ['/cookies.html', '/cookies'],
  ['/accessibility.html', '/accessibility'],
  ['/licensing.html', '/licensing'],
  ['/waiver.html', '/waiver'],
];

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
    officialAlternate: entry.officialAlternate || '',
  }));
}

export function resolveLocationCanonicalPath(pathname) {
  return resolveLocationPath(pathname).redirectPath;
}

function resolveLocationPath(pathname) {
  const cleanPathname = normalizePathname(pathname);
  const parts = cleanPathname.split('/');
  const firstSegment = parts[1] || '';
  if (!firstSegment) return { redirectPath: '', assetPath: '' };

  const canonicalPath = routeByCompactSegment.get(compactLocationSegment(firstSegment));
  if (!canonicalPath) return { redirectPath: '', assetPath: '' };

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

  if (route.assetPath) {
    result.assetPath = route.assetPath;
  }
  return result;
}
