import { describe, expect, it } from 'vitest';
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

describe('Public URL Surface', () => {
  it('resolves canonical URLs, dynamic landing paths, and output files from one surface', () => {
    const surface = compilePublicUrlSurface(registry);

    expect(surface.rootHome).toBe('https://timemission.com/');
    expect(surface.publicUrlFor('/philadelphia')).toBe('https://timemission.com/philadelphia');
    expect(surface.outputFileFor('/philadelphia')).toBe('philadelphia.html');
    expect(surface.isKnownCanonical('/philadelphia')).toBe(true);
    expect(surface.isKnownCanonical('/c/spring-break-offer')).toBe(true);
    expect(surface.isKnownCanonical('/unknown-page')).toBe(false);
  });

  it('keeps sitemap helpers as thin adapters over compiled surface facts', () => {
    const surface = compilePublicUrlSurface(registry);

    expect(registrySitemapUrls(registry)).toEqual(surface.sitemapUrls);
    expect(surface.sitemapEntries.map((entry) => entry.url)).toEqual(surface.sitemapUrls);
    expect(surface.sitemapUrls).toContain(publicUrlForPath('/locations', registry));
  });

  it('normalizes the dynamic landing prefix consistently', () => {
    expect(dynamicLandingPrefix(registry)).toBe('/c');
    expect(isDynamicLandingPath('/c/team-night', registry)).toBe(true);
    expect(isDynamicLandingPath('/c/team/night', registry)).toBe(false);
  });
});
