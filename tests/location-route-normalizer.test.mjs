import { describe, expect, it } from 'vitest';

import {
  compactLocationSegment,
  locationRouteEntries,
  resolveLocationCanonicalPath,
  resolveLocationRedirectUrl,
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
      .toBe('https://timemission.com/west-nyack/corporate-events?x=1');
  });

  it('passes through already canonical or unrelated paths', () => {
    expect(resolveLocationCanonicalPath('/mount-prospect')).toBe('');
    expect(resolveLocationCanonicalPath('/api/contact')).toBe('');
    expect(resolveLocationCanonicalPath('/assets/logo/TM_Logo_White.svg')).toBe('');
  });
});
