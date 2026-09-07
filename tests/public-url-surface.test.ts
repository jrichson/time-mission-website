import { describe, expect, it } from 'vitest';
import routes from '../src/data/routes.json';
import astroRenderedOutput from '../src/data/site/astro-rendered-output-files.json';
import {
  compilePublicUrlSurface,
  dynamicLandingPrefix,
  isDynamicLandingPath,
  locationScopedCanonicalPaths,
  publicUrlForPath,
  registrySitemapUrls,
  type PublicUrlRegistry,
} from '../src/lib/public-url-surface';

const registry = routes as PublicUrlRegistry;

describe('Public URL Surface', () => {
  it('resolves canonical URLs, dynamic landing paths, and output files from one surface', () => {
    const surface = compilePublicUrlSurface(registry);

    expect(surface.rootHome).toBe('https://www.timemission.com/');
    expect(surface.publicUrlFor('/philadelphia')).toBe('https://www.timemission.com/philadelphia');
    expect(surface.outputFileFor('/philadelphia')).toBe('philadelphia.html');
    expect(surface.isKnownCanonical('/philadelphia')).toBe(true);
    expect(surface.publicUrlFor('/philadelphia/educators')).toBe('https://www.timemission.com/philadelphia/educators');
    expect(surface.outputFileFor('/philadelphia/educators')).toBe('philadelphia/educators.html');
    expect(surface.isKnownCanonical('/philadelphia/educators')).toBe(true);
    for (const locationSlug of ['manassas', 'mount-prospect', 'orland-park']) {
      const canonicalPath = `/${locationSlug}/educators`;
      expect(surface.publicUrlFor(canonicalPath)).toBe(`https://www.timemission.com${canonicalPath}`);
      expect(surface.outputFileFor(canonicalPath)).toBe(`${locationSlug}/educators.html`);
      expect(surface.isKnownCanonical(canonicalPath)).toBe(true);
    }
    for (const locationSlug of ['manassas', 'mount-prospect', 'orland-park']) {
      const canonicalPath = `/${locationSlug}/school-night`;
      expect(surface.publicUrlFor(canonicalPath)).toBe(`https://www.timemission.com${canonicalPath}`);
      expect(surface.outputFileFor(canonicalPath)).toBe(`${locationSlug}/school-night.html`);
      expect(surface.isKnownCanonical(canonicalPath)).toBe(true);
    }
    expect(surface.outputFileFor('/brussels/back-to-school-sale'))
      .toBe('brussels/back-to-school-sale.html');
    expect(surface.isKnownCanonical('/brussels/back-to-school-sale')).toBe(true);
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
    expect(surface.sitemapUrls).not.toContain(publicUrlForPath('/blog', registry));
    expect(surface.sitemapUrls).toContain(publicUrlForPath('/edison', registry));
  });

  it('normalizes the dynamic landing prefix consistently', () => {
    expect(dynamicLandingPrefix(registry)).toBe('/c');
    expect(isDynamicLandingPath('/c/team-night', registry)).toBe(true);
    expect(isDynamicLandingPath('/c/team/night', registry)).toBe(false);
  });

  it('derives runtime scoped paths from the public route surface', () => {
    const paths = locationScopedCanonicalPaths(['/antwerp', '/philadelphia'], registry);

    expect(paths).toContain('/');
    expect(paths).toContain('/locations');
    expect(paths).toContain('/gift-cards');
    expect(paths).not.toContain('/antwerp');
    expect(paths).not.toContain('/philadelphia');
  });

  it('keeps registered output files backed by the compiled Astro route manifest', () => {
    const outputFiles = new Set(astroRenderedOutput.outputFiles);

    for (const route of registry.routes) {
      if (route.outputFile) {
        expect(outputFiles).toContain(route.outputFile.replace(/^\//, ''));
      }
    }
    expect(astroRenderedOutput.dynamicLandingModules).toContain('c/[slug].astro');
  });

  it('keeps registered redirects in the compiled surface', () => {
    const redirects = compilePublicUrlSurface(registry).redirectPairs;
    const expectedRedirects = [
      ...registry.routes.flatMap((route) => (route.redirectSources || []).map((source) => ({
        source,
        target: route.externalUrl || route.canonicalPath,
        status: route.status || 301,
      }))),
      ...(registry.aliases || []).map((alias) => ({
        source: alias.source,
        target: alias.target,
        status: alias.status,
      })),
    ];

    expect(redirects).toEqual(expectedRedirects);
  });
});
