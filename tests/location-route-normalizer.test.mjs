import { describe, expect, it } from 'vitest';

import {
  compactLocationSegment,
  locationRouteEntries,
  resolveLocationCanonicalPath,
  resolveLocationRedirectUrl,
  resolveLocationRouteRequest,
} from '../functions/_shared/location-route-normalizer.mjs';

describe('location route normalizer', () => {
  const sharedPagePaths = [
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

  const migratedSharedPagePaths = ['/missions', '/groups', '/gift-cards'];
  const rootAssetPaths = [
    '/_astro/client.css',
    '/assets/logo/TM_Logo_White.svg',
    '/css/nav.css',
    '/data/locations.json',
    '/fonts/DMSans-Normal.woff2',
    '/js/nav.js',
  ];

  function sourcePrefixesFor(entry) {
    return [
      entry.canonicalPath.replace(/^\//, ''),
      entry.officialAlternate,
      ...(entry.compatibilitySources || []),
    ].filter(Boolean);
  }

  it('normalizes location names by ignoring case and dashes', () => {
    expect(compactLocationSegment('mOuNt-Pros-pect')).toBe('mountprospect');
    expect(resolveLocationCanonicalPath('/MountProspect')).toBe('/mount-prospect');
    expect(resolveLocationCanonicalPath('/Mount-Prospect')).toBe('/mount-prospect');
    expect(resolveLocationCanonicalPath('/mOuNt-Pros-pect')).toBe('/mount-prospect');
    expect(resolveLocationCanonicalPath('/OrlandPark')).toBe('/orland-park');
  });

  it('redirects the single official alternate for each location to the canonical location page', () => {
    const entriesWithAlternates = locationRouteEntries().filter((entry) => entry.officialAlternate);

    expect(entriesWithAlternates).toHaveLength(8);
    expect(resolveLocationCanonicalPath('/R1-indoor-karting')).toBe('/lincoln');
    expect(resolveLocationCanonicalPath('/Palisades-center')).toBe('/west-nyack');
    expect(resolveLocationCanonicalPath('/Terminal1')).toBe('https://www.timemission.eu/brussels');
    expect(resolveLocationCanonicalPath('/Manassas-mall')).toBe('/manassas');
    expect(resolveLocationCanonicalPath('/Philly')).toBe('/philadelphia');
    expect(resolveLocationCanonicalPath('/Mt-Prospect')).toBe('/mount-prospect');
    expect(resolveLocationCanonicalPath('/Experience-factory-antwerp')).toBe('https://www.timemission.eu/antwerp');
    expect(resolveLocationCanonicalPath('/Marq-E')).toBe('/houston');
  });

  it('preserves query strings and path suffixes while canonicalizing the location segment', () => {
    expect(resolveLocationRedirectUrl('https://timemission.com/Marq-E?utm_source=test'))
      .toBe('https://timemission.com/houston?utm_source=test');
    expect(resolveLocationRedirectUrl('https://timemission.com/WestNyack/corporate-events?x=1'))
      .toBe('https://timemission.com/west-nyack/groups/corporate?x=1');
  });

  it('redirects EU location prefixes to the EU site instead of serving local pages', () => {
    expect(resolveLocationRedirectUrl('https://timemission.com/antwerp?utm_source=test#book'))
      .toBe('https://www.timemission.eu/antwerp?utm_source=test');
    expect(resolveLocationRedirectUrl('https://timemission.com/antwerp/groups/corporate?utm_source=test'))
      .toBe('https://www.timemission.eu/antwerp?utm_source=test');
    expect(resolveLocationRedirectUrl('https://timemission.com/brussels?utm_source=test'))
      .toBe('https://www.timemission.eu/brussels?utm_source=test');
    expect(resolveLocationRedirectUrl('https://timemission.com/Terminal1/missions?utm_source=test'))
      .toBe('https://www.timemission.eu/brussels?utm_source=test');
    expect(resolveLocationRouteRequest('https://timemission.com/brussels/css/nav.css?v=17'))
      .toEqual({ redirectUrl: 'https://www.timemission.eu/brussels?v=17', assetPath: '' });
  });

  it('passes through already canonical or unrelated paths', () => {
    expect(resolveLocationCanonicalPath('/mount-prospect')).toBe('');
    expect(resolveLocationCanonicalPath('/edison')).toBe('');
    expect(resolveLocationCanonicalPath('/api/contact')).toBe('');
    expect(resolveLocationCanonicalPath('/assets/logo/TM_Logo_White.svg')).toBe('');
  });

  it('keeps an internal location page local when its CTA uses a third-party venue', () => {
    const edison = locationRouteEntries().find((entry) => entry.canonicalPath === '/edison');

    expect(edison).toMatchObject({
      canonicalPath: '/edison',
      externalUrl: '',
    });
    expect(resolveLocationRouteRequest('https://timemission.com/edison'))
      .toEqual({ redirectUrl: '', assetPath: '' });
  });

  it('serves shared pages behind a canonical location prefix without redirecting', () => {
    expect(resolveLocationRouteRequest('https://timemission.com/mount-prospect/about'))
      .toEqual({ redirectUrl: '', assetPath: '/about' });
    expect(resolveLocationRouteRequest('https://timemission.com/philadelphia/groups/corporate?utm_source=test'))
      .toEqual({ redirectUrl: '', assetPath: '/groups/corporate' });
  });

  it('serves every prefixable shared page behind every canonical location prefix', () => {
    for (const { canonicalPath, externalUrl } of locationRouteEntries()) {
      if (externalUrl) continue;
      for (const sharedPath of sharedPagePaths) {
        expect(resolveLocationRouteRequest(`https://timemission.com${canonicalPath}${sharedPath}`))
          .toEqual({ redirectUrl: '', assetPath: sharedPath });
      }
    }
  });

  it('canonicalizes every alternate location source before serving migrated shared pages', () => {
    for (const entry of locationRouteEntries()) {
      if (entry.externalUrl) continue;
      const alternatePrefixes = sourcePrefixesFor(entry)
        .filter((prefix) => `/${prefix}` !== entry.canonicalPath);

      for (const sourcePrefix of alternatePrefixes) {
        for (const sharedPath of migratedSharedPagePaths) {
          expect(resolveLocationRouteRequest(`https://timemission.com/${sourcePrefix}${sharedPath}?utm_source=test`))
            .toEqual({
              redirectUrl: `https://timemission.com${entry.canonicalPath}${sharedPath}?utm_source=test`,
              assetPath: '',
            });
        }
      }
    }
  });

  it('serves root assets behind every canonical location prefix', () => {
    for (const { canonicalPath, externalUrl } of locationRouteEntries()) {
      if (externalUrl) continue;
      for (const assetPath of rootAssetPaths) {
        expect(resolveLocationRouteRequest(`https://timemission.com${canonicalPath}${assetPath}?v=17`))
          .toEqual({ redirectUrl: '', assetPath });
      }
    }
  });

  it('canonicalizes the location segment before serving location-prefixed assets', () => {
    expect(resolveLocationRouteRequest('https://timemission.com/Philly/css/nav.css?v=17'))
      .toEqual({
        redirectUrl: 'https://timemission.com/philadelphia/css/nav.css?v=17',
        assetPath: '',
      });
  });

  it('canonicalizes location-prefixed shared page aliases before serving assets', () => {
    expect(resolveLocationRouteRequest('https://timemission.com/MountProspect/About.html?x=1'))
      .toEqual({
        redirectUrl: 'https://timemission.com/mount-prospect/about?x=1',
        assetPath: '',
      });
    expect(resolveLocationRouteRequest('https://timemission.com/Palisades-center/corporate-events'))
      .toEqual({
        redirectUrl: 'https://timemission.com/west-nyack/groups/corporate',
        assetPath: '',
      });
  });
});
