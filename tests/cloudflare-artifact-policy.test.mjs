import { describe, expect, it } from 'vitest';
import {
  OFFLOADED_MP4_FILES,
  isFinderDuplicateName,
  planRequiredArtifacts,
  planVideoArtifacts,
  shouldExcludeArtifactPath,
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
    expect(planVideoArtifacts({ availableFiles: ['hero-bg-web.mp4'] })).toMatchObject({
      hostedExternally: false,
      removeFromBundle: [],
      requiredInBundle: OFFLOADED_MP4_FILES,
      missingFromBundle: ['hero-bg-mobile.mp4', 'groups-hero.mp4'],
    });
  });

  it('excludes archived and Finder duplicate artifacts consistently', () => {
    expect(shouldExcludeArtifactPath('assets/mockup-reference/hero.png')).toBe(true);
    expect(shouldExcludeArtifactPath('js 2/nav.js')).toBe(true);
    expect(shouldExcludeArtifactPath('css/site 2.css')).toBe(true);
    expect(shouldExcludeArtifactPath('css/site.css')).toBe(false);
    expect(isFinderDuplicateName('sitemap 2.xml')).toBe(true);
  });
});
