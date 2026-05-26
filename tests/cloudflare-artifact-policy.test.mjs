import { describe, expect, it } from 'vitest';
import {
  OFFLOADED_MP4_FILES,
  planRequiredArtifacts,
  planVideoArtifacts,
  shouldExcludeArtifactPath,
  shouldPruneArtifactEntry,
} from '../scripts/lib/cloudflare-artifact-policy.mjs';

describe('Cloudflare Artifact policy', () => {
  it('plans required files and directories for the Pages artifact', () => {
    expect(planRequiredArtifacts()).toMatchObject({
      rootFiles: expect.arrayContaining(['_headers.tmpl', '_redirects', 'robots.txt']),
      assetDirs: expect.arrayContaining(['assets', 'css', 'js', 'data']),
      requiredDataFiles: ['data/locations.json'],
    });
  });

  it('keeps large MP4 files out of the Pages bundle when media is hosted externally', () => {
    expect(planVideoArtifacts({ mediaBase: 'https://media.timemission.com' })).toMatchObject({
      hostedExternally: true,
      removeFromBundle: OFFLOADED_MP4_FILES,
      requiredInBundle: [],
      missingFromBundle: [],
    });
  });

  it('requires bundled MP4 files when no external media base is configured', () => {
    expect(planVideoArtifacts({ availableFiles: ['TM-Hero-bg-web-hero.mp4'] })).toMatchObject({
      hostedExternally: false,
      removeFromBundle: [],
      requiredInBundle: OFFLOADED_MP4_FILES,
      missingFromBundle: ['TM-Hero-bg-mobile-hero.mp4', 'groups-hero.mp4'],
    });
  });

  it('excludes archived artifacts and prunes Finder duplicates only with original siblings', () => {
    expect(shouldExcludeArtifactPath('assets/extracted/gradient-animated.html')).toBe(true);
    expect(shouldExcludeArtifactPath('assets/mockup-reference/hero.png')).toBe(true);
    expect(shouldExcludeArtifactPath('js 2/nav.js')).toBe(false);
    expect(shouldExcludeArtifactPath('css/site 2.css')).toBe(false);
    expect(shouldExcludeArtifactPath('css/site.css')).toBe(false);
    expect(shouldPruneArtifactEntry('css/site 2.css', 'site 2.css', new Set(['site.css', 'site 2.css']))).toBe(true);
    expect(shouldPruneArtifactEntry('sitemap 2.xml', 'sitemap 2.xml', new Set(['sitemap.xml', 'sitemap 2.xml']))).toBe(true);
    expect(shouldPruneArtifactEntry('js 2', 'js 2', new Set(['js', 'js 2']))).toBe(true);
    expect(shouldPruneArtifactEntry('assets/photos/Class of 2026.jpg', 'Class of 2026.jpg', new Set(['Class of 2026.jpg']))).toBe(false);
  });
});
