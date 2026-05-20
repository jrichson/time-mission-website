import { describe, expect, it } from 'vitest';

import {
  compactLocationSegment,
  locationRouteEntries,
  resolveLocationCanonicalPath,
  resolveLocationRedirectUrl,
  resolveLocationRouteRequest,
} from '../functions/_shared/location-route-normalizer.mjs';

describe('location route normalizer', () => {
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
    expect(resolveLocationCanonicalPath('/Terminal1')).toBe('/brussels');
    expect(resolveLocationCanonicalPath('/Manassas-mall')).toBe('/manassas');
    expect(resolveLocationCanonicalPath('/Philly')).toBe('/philadelphia');
    expect(resolveLocationCanonicalPath('/Mt-Prospect')).toBe('/mount-prospect');
    expect(resolveLocationCanonicalPath('/Experience-factory-antwerp')).toBe('/antwerp');
    expect(resolveLocationCanonicalPath('/Marq-E')).toBe('/houston');
  });

  it('preserves query strings and path suffixes while canonicalizing the location segment', () => {
    expect(resolveLocationRedirectUrl('https://timemission.com/Marq-E?utm_source=test'))
      .toBe('https://timemission.com/houston?utm_source=test');
    expect(resolveLocationRedirectUrl('https://timemission.com/WestNyack/corporate-events?x=1'))
      .toBe('https://timemission.com/west-nyack/groups/corporate?x=1');
  });

  it('passes through already canonical or unrelated paths', () => {
    expect(resolveLocationCanonicalPath('/mount-prospect')).toBe('');
    expect(resolveLocationCanonicalPath('/api/contact')).toBe('');
    expect(resolveLocationCanonicalPath('/assets/logo/TM_Logo_White.svg')).toBe('');
  });

  it('serves shared pages behind a canonical location prefix without redirecting', () => {
    expect(resolveLocationRouteRequest('https://timemission.com/mount-prospect/about'))
      .toEqual({ redirectUrl: '', assetPath: '/about' });
    expect(resolveLocationRouteRequest('https://timemission.com/philadelphia/groups/corporate?utm_source=test'))
      .toEqual({ redirectUrl: '', assetPath: '/groups/corporate' });
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
