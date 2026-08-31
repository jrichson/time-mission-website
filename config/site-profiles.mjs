const PROFILE_NAMES = new Set(['us', 'eu']);

const PROFILE_DEFINITIONS = {
  us: {
    id: 'us',
    origin: 'https://www.timemission.com',
    counterpartOrigin: 'https://www.timemission.eu',
    internalRegion: 'us',
    locales: ['en', 'es'],
    defaultLocale: 'en',
    consentProfile: 'us_open',
    localizedRoutes: true,
    pagesProject: 'time-mission-website',
    d1DatabaseName: 'time-mission-forms',
    turnstileSiteKeyEnv: 'PUBLIC_TURNSTILE_SITE_KEY',
    gtmContainerIdEnv: 'PUBLIC_GTM_CONTAINER_ID',
  },
  eu: {
    id: 'eu',
    origin: 'https://www.timemission.eu',
    counterpartOrigin: 'https://www.timemission.com',
    internalRegion: 'europe',
    locales: ['en', 'nl', 'fr', 'es'],
    defaultLocale: 'en',
    consentProfile: 'eu_strict',
    localizedRoutes: true,
    pagesProject: 'time-mission-website-eu',
    d1DatabaseName: 'time-mission-forms-eu',
    turnstileSiteKeyEnv: 'EU_TURNSTILE_SITE_KEY',
    gtmContainerIdEnv: 'EU_GTM_CONTAINER_ID',
  },
};

function cleanOrigin(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return '';

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/') return '';
    return url.origin;
  } catch {
    return '';
  }
}

function isSameSiteOrigin(value, expected) {
  try {
    const actualUrl = new URL(value);
    const expectedUrl = new URL(expected);
    return actualUrl.protocol === expectedUrl.protocol
      && actualUrl.hostname.replace(/^www\./, '') === expectedUrl.hostname.replace(/^www\./, '')
      && actualUrl.port === expectedUrl.port;
  } catch {
    return false;
  }
}

export function resolveSiteProfile(env = process.env) {
  const requested = String(env.TM_SITE_PROFILE || 'us').trim().toLowerCase();
  if (!PROFILE_NAMES.has(requested)) {
    throw new Error(`TM_SITE_PROFILE must be "us" or "eu" (received ${JSON.stringify(requested)})`);
  }

  const definition = PROFILE_DEFINITIONS[requested];
  const configuredOrigin = cleanOrigin(env.PUBLIC_SITE_ORIGIN);
  if (env.PUBLIC_SITE_ORIGIN && !configuredOrigin) {
    throw new Error('PUBLIC_SITE_ORIGIN must be an HTTPS origin without a path, query, or credentials');
  }

  return Object.freeze({
    ...definition,
    origin: configuredOrigin || definition.origin,
    locales: Object.freeze([...definition.locales]),
  });
}

export function localizedPath(pathname, locale, profile = resolveSiteProfile()) {
  const path = String(pathname || '/').startsWith('/') ? String(pathname || '/') : `/${pathname}`;
  const normalizedPath = path === '/' ? '/' : path.replace(/\/+$/, '');
  if (!profile.localizedRoutes || locale === profile.defaultLocale) return normalizedPath;
  return normalizedPath === '/' ? `/${locale}` : `/${locale}${normalizedPath}`;
}

export function localizedOutputFile(route, locale, profile = resolveSiteProfile()) {
  const outputFile = String(route?.outputFile || '').replace(/^\/+/, '');
  if (!profile.localizedRoutes || locale === profile.defaultLocale) return outputFile;
  return route?.canonicalPath === '/' ? `${locale}.html` : `${locale}/${outputFile}`;
}

export function publicLocationForProfile(location, profile = resolveSiteProfile()) {
  const slug = String(location?.slug || location?.id || '').trim();
  if (!slug) return location;

  const isInternal = location.region === profile.internalRegion;
  const internalPath = `/${slug}`;
  const externalOrigin = profile.counterpartOrigin.replace(/\/+$/, '');
  const currentExternalUrl = String(location.externalUrl || '').trim();
  const counterpartUrl = String(location.counterpartUrl || '').trim();
  const selfReferentialExternal = isInternal
    && currentExternalUrl
    && isSameSiteOrigin(new URL(currentExternalUrl, profile.origin).origin, profile.origin);
  const currentBookingUrl = String(location.bookingUrl || '').trim();
  const selfReferentialBooking = isInternal
    && currentBookingUrl
    && isSameSiteOrigin(new URL(currentBookingUrl, profile.origin).origin, profile.origin)
    && new URL(currentBookingUrl, profile.origin).pathname.replace(/\/+$/, '') === internalPath;

  return {
    ...location,
    pagePath: isInternal ? internalPath : undefined,
    externalUrl: isInternal
      ? (selfReferentialExternal ? undefined : location.externalUrl)
      : (counterpartUrl || `${externalOrigin}${internalPath}`),
    counterpartUrl: undefined,
    bookingUrl: isInternal && !selfReferentialBooking ? location.bookingUrl : '',
    rollerCheckoutUrl: isInternal ? location.rollerCheckoutUrl : undefined,
    groupCheckoutUrl: isInternal ? location.groupCheckoutUrl : undefined,
    groupCheckoutUrls: isInternal ? location.groupCheckoutUrls : undefined,
    groupInquiryLabels: isInternal ? location.groupInquiryLabels : undefined,
    donationUrl: isInternal ? location.donationUrl : undefined,
    groupFormUrls: isInternal ? location.groupFormUrls : undefined,
    groupFormPresentation: isInternal ? location.groupFormPresentation : undefined,
    giftCardUrl: isInternal ? location.giftCardUrl : '',
    waiverUrl: isInternal ? location.waiverUrl : '',
    bookingProvider: isInternal ? location.bookingProvider : undefined,
    briqWidgetDomain: isInternal ? location.briqWidgetDomain : undefined,
    briqWidget: isInternal ? location.briqWidget : undefined,
  };
}

export function publicLocationsForProfile(locations, profile = resolveSiteProfile()) {
  return (Array.isArray(locations) ? locations : []).map((location) =>
    publicLocationForProfile(location, profile),
  );
}

export function profileLocationsDocument(document, options = {}) {
  const {
    alreadyProfiled = false,
    profile = resolveSiteProfile(),
  } = options;
  if (alreadyProfiled) return document;

  return {
    ...document,
    locations: publicLocationsForProfile(document?.locations, profile),
  };
}

export function locationsDocumentProfileState(document, profile = resolveSiteProfile()) {
  const documentProfile = String(document?.siteProfile || '').trim().toLowerCase();
  if (!documentProfile) return 'raw';
  return documentProfile === profile.id ? 'profiled' : 'mismatched';
}

export function isInternalLocation(location, profile = resolveSiteProfile()) {
  return location?.region === profile.internalRegion;
}

export const SITE_PROFILE_IDS = Object.freeze([...PROFILE_NAMES]);
