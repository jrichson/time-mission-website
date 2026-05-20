import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import routes from '../src/data/routes.json';
import {
  compilePublicUrlSurface,
  dynamicLandingPrefix,
  isDynamicLandingPath,
  publicUrlForPath,
  registrySitemapUrls,
  type PublicUrlRegistry,
} from '../src/lib/public-url-surface';

const registry = routes as PublicUrlRegistry;
const require = createRequire(import.meta.url);
const routeArtifacts = require('../scripts/lib/route-artifacts.js') as {
  compilePublicUrlSurface(input: PublicUrlRegistry): {
    sitemapUrls: string[];
    redirectPairs: Array<{ source: string; target: string; status: number }>;
    outputFileFor(pathname: string): string;
    isKnownCanonical(pathname: string): boolean;
  };
};

describe('Public URL Surface', () => {
  it('resolves canonical URLs, dynamic landing paths, and output files from one surface', () => {
    const surface = compilePublicUrlSurface(registry);

    expect(surface.rootHome).toBe('https://timemission.com/');
    expect(surface.publicUrlFor('/philadelphia')).toBe('https://timemission.com/philadelphia');
    expect(surface.outputFileFor('/philadelphia')).toBe('philadelphia.html');
    expect(surface.isKnownCanonical('/philadelphia')).toBe(true);
    expect(surface.isKnownCanonical('/c/summer-adventures-offer')).toBe(true);
    expect(surface.isKnownCanonical('/unknown-page')).toBe(false);
  });

  it('keeps sitemap helpers as thin adapters over compiled surface facts', () => {
    const surface = compilePublicUrlSurface(registry);

    expect(registrySitemapUrls(registry)).toEqual(surface.sitemapUrls);
    expect(surface.sitemapEntries.map((entry) => entry.url)).toEqual(surface.sitemapUrls);
    expect(surface.sitemapUrls).toContain(publicUrlForPath('/locations', registry));
    expect(surface.sitemapUrls).not.toContain(publicUrlForPath('/antwerp', registry));
    expect(surface.sitemapUrls).not.toContain(publicUrlForPath('/brussels', registry));
  });

  it('normalizes the dynamic landing prefix consistently', () => {
    expect(dynamicLandingPrefix(registry)).toBe('/c');
    expect(isDynamicLandingPath('/c/team-night', registry)).toBe(true);
    expect(isDynamicLandingPath('/c/team/night', registry)).toBe(false);
  });

  it('keeps script route artifacts aligned with the typed Public URL Surface', () => {
    const typedSurface = compilePublicUrlSurface(registry);
    const scriptSurface = routeArtifacts.compilePublicUrlSurface(registry);

    expect(scriptSurface.sitemapUrls).toEqual(typedSurface.sitemapUrls);
    expect(scriptSurface.redirectPairs).toEqual(typedSurface.redirectPairs);
    expect(scriptSurface.outputFileFor('/philadelphia')).toBe(typedSurface.outputFileFor('/philadelphia'));
    expect(scriptSurface.isKnownCanonical('/c/team-night')).toBe(typedSurface.isKnownCanonical('/c/team-night'));
  });

  it('keeps official location alternate redirects registered as permanent canonical moves', () => {
    const redirects = compilePublicUrlSurface(registry).redirectPairs;

    expect(redirects).toEqual(expect.arrayContaining([
      { source: '/r1-indoor-karting', target: '/lincoln', status: 301 },
      { source: '/palisades-center', target: '/west-nyack', status: 301 },
      { source: '/terminal1', target: 'https://timemission.eu', status: 301 },
      { source: '/manassas-mall', target: '/manassas', status: 301 },
      { source: '/philly', target: '/philadelphia', status: 301 },
      { source: '/mt-prospect', target: '/mount-prospect', status: 301 },
      { source: '/experience-factory-antwerp', target: 'https://timemission.eu/antwerp', status: 301 },
      { source: '/marq-e', target: '/houston', status: 301 },
      { source: '/antwerp.html', target: 'https://timemission.eu/antwerp', status: 301 },
      { source: '/brussels.html', target: 'https://timemission.eu', status: 301 },
    ]));
  });
});
